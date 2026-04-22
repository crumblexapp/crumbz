import { NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_SERVER_API_KEY || "";

type Place = {
  id: string;
  googlePlaceId?: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  address: string;
  priceLevel: string;
  openingHours: string[];
  openNow: boolean | null;
  reviews: Array<{ authorName: string; rating: number | null; text: string }>;
};

function normalizeCityKey(cityName: string) {
  return cityName
    .trim()
    .replace(/[łŁ]/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// English name → Polish name for cities where they differ as substrings
const CITY_ALIASES: Record<string, string> = {
  warsaw: "warszawa",
  cracow: "krakow",
  gdansk: "gdansk",
};

function filterByCity(places: Place[], city: string): Place[] {
  if (!city.trim()) return places;

  const normalizedCity = normalizeCityKey(city);
  // Also check the Polish alias (e.g. "warsaw" → "warszawa")
  const aliasCity = CITY_ALIASES[normalizedCity] ?? normalizedCity;

  return places.filter((place) => {
    const normalizedAddress = normalizeCityKey(place.address);
    return normalizedAddress.includes(normalizedCity) || normalizedAddress.includes(aliasCity);
  });
}

function mapGoogleKind(types: string[]): string {
  if (types.some((t) => t.includes("bakery"))) return "bakery";
  if (types.some((t) => t.includes("cafe") || t.includes("coffee"))) return "cafe";
  if (types.some((t) => t.includes("bar") || t.includes("pub") || t.includes("night_club"))) return "bar";
  if (types.some((t) => t.includes("pizza"))) return "pizza";
  if (types.some((t) => t.includes("hamburger") || t.includes("burger"))) return "burger";
  if (types.some((t) => t.includes("ice_cream"))) return "ice cream shop";
  if (types.some((t) => t.includes("dessert") || t.includes("confectionery") || t.includes("chocolate"))) return "dessert shop";
  if (types.some((t) => t.includes("fast_food") || t.includes("meal_takeaway"))) return "fast food";
  if (types.some((t) => t.includes("restaurant"))) return "restaurant";
  if (types.some((t) => t.includes("meal_delivery"))) return "meal delivery";
  if (types.some((t) => t.includes("sandwich"))) return "sandwich shop";
  if (types.some((t) => t.includes("pastry"))) return "pastry shop";
  if (types.some((t) => t.includes("deli"))) return "deli";
  if (types.some((t) => t.includes("shopping") || t.includes("store") || t.includes("shop"))) return "shop";
  return "restaurant";
}

function normalizeGooglePlace(place: any): Place {
  const lat = place.geometry?.location?.lat ?? 0;
  const lon = place.geometry?.location?.lng ?? 0;

  let priceLevel = "";
  if (place.price_level) {
    switch (place.price_level) {
      case 0:
      case 1:
        priceLevel = "PRICE_LEVEL_INEXPENSIVE";
        break;
      case 2:
        priceLevel = "PRICE_LEVEL_MODERATE";
        break;
      case 3:
        priceLevel = "PRICE_LEVEL_EXPENSIVE";
        break;
      case 4:
        priceLevel = "PRICE_LEVEL_VERY_EXPENSIVE";
        break;
    }
  }

  const openingHours = place.opening_hours?.weekday_text ?? [];
  const openNow = place.opening_hours?.open_now ?? null;

  return {
    id: place.place_id || `google-${place.name}-${lat}-${lon}`,
    googlePlaceId: place.place_id,
    name: place.name || "Unknown",
    kind: mapGoogleKind(place.types ?? []),
    lat,
    lon,
    address: place.formatted_address || place.vicinity || "",
    priceLevel,
    openingHours,
    openNow,
    reviews: (place.reviews ?? []).map((r: any) => ({
      authorName: r.author_name,
      rating: r.rating ?? null,
      text: r.text || "",
    })),
  };
}

function dedupePlaces(places: Place[]) {
  const seen = new Map<string, Place>();
  return places.filter((place) => {
    const key = `${place.name.toLowerCase()}|${place.lat.toFixed(4)}|${place.lon.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.set(key, place);
    return true;
  });
}

// Single nearbysearch for one Google place type
async function fetchNearbyByType(lat: number, lon: number, radius: number, type: string): Promise<Place[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lon}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("type", type);
  url.searchParams.set("key", GOOGLE_PLACES_API_KEY);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  return (data.results ?? []).map(normalizeGooglePlace);
}

// Three parallel nearbysearch calls cover restaurant, cafe, and bakery types —
// each type caps at 20 results, so parallel calls give up to ~60 unique markers.
async function googlePlacesNearby(lat: number, lon: number, radius: number, limit: number) {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("Google Places API key not configured");
  }

  const [restaurants, cafes, bakeries] = await Promise.allSettled([
    fetchNearbyByType(lat, lon, radius, "restaurant"),
    fetchNearbyByType(lat, lon, radius, "cafe"),
    fetchNearbyByType(lat, lon, radius, "bakery"),
  ]);

  const allPlaces = [
    ...(restaurants.status === "fulfilled" ? restaurants.value : []),
    ...(cafes.status === "fulfilled" ? cafes.value : []),
    ...(bakeries.status === "fulfilled" ? bakeries.value : []),
  ];

  return dedupePlaces(allPlaces).slice(0, limit);
}

async function googlePlacesTextSearch(query: string, lat: number, lon: number, limit: number, city?: string) {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("Google Places API key not configured");
  }

  // Including the city name in the query string anchors Google to the right city.
  // Relying on location+radius alone is a soft bias and can surface global results
  // for generic terms like "restaurant" or "bar".
  const anchoredQuery = city ? `${query} ${city}` : `${query} near ${lat},${lon}`;

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", anchoredQuery);
  url.searchParams.set("location", `${lat},${lon}`);
  url.searchParams.set("radius", "15000");
  url.searchParams.set("key", GOOGLE_PLACES_API_KEY);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  const places = (data.results ?? []).map(normalizeGooglePlace);
  return dedupePlaces(places).slice(0, limit);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radius = Number(searchParams.get("radius") ?? "5000");
  const city = searchParams.get("city")?.trim() ?? "";
  const limit = Number(searchParams.get("limit") ?? "100");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ ok: false, message: "lat/lon required", places: [] }, { status: 400 });
  }

  try {
    let places: Place[];

    if (query) {
      // Pass city into the query string so Google anchors results to the right location
      places = await googlePlacesTextSearch(query, lat, lon, Math.min(limit, 40), city || undefined);
    } else {
      // Nearby mode (initial map load)
      places = await googlePlacesNearby(lat, lon, Math.min(radius, 15000), limit);
    }

    // Post-filter by city address as a safety net for text search results
    if (city && query) {
      places = filterByCity(places, city);
    }

    return NextResponse.json({ ok: true, places }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "places request failed", places: [] },
      { status: 500 },
    );
  }
}
