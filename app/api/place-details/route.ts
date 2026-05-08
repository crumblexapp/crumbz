import { NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_SERVER_API_KEY || "";
const PLACE_DETAILS_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_PLACE_DETAILS_CACHE_ENTRIES = 300;

type PlaceDetailsResponse = {
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
  rating: number | null;
  reviews: Array<{ authorName: string; rating: number | null; text: string }>;
};

type GoogleReview = {
  author_name?: string;
  rating?: number | null;
  text?: string;
};

type GooglePlace = {
  place_id?: string;
  name?: string;
  types?: string[];
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  formatted_address?: string;
  vicinity?: string;
  price_level?: number;
  rating?: number | null;
  opening_hours?: {
    weekday_text?: string[];
    open_now?: boolean | null;
  };
  current_opening_hours?: {
    open_now?: boolean | null;
  };
  reviews?: GoogleReview[];
};

type GoogleSearchResponse = {
  results?: GooglePlace[];
};

type GoogleDetailsResponse = {
  status?: string;
  result?: GooglePlace;
};

type PlaceDetailsCacheEntry = {
  expiresAt: number;
  place?: PlaceDetailsResponse;
  pending?: Promise<PlaceDetailsResponse>;
};

const placeDetailsCache = new Map<string, PlaceDetailsCacheEntry>();

function prunePlaceDetailsCache() {
  if (placeDetailsCache.size <= MAX_PLACE_DETAILS_CACHE_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of placeDetailsCache.entries()) {
    if (entry.expiresAt <= now && !entry.pending) placeDetailsCache.delete(key);
  }

  while (placeDetailsCache.size > MAX_PLACE_DETAILS_CACHE_ENTRIES) {
    const oldestKey = placeDetailsCache.keys().next().value;
    if (!oldestKey) return;
    placeDetailsCache.delete(oldestKey);
  }
}

function getPlaceDetailsCacheKey({
  placeId,
  name,
  lat,
  lon,
}: {
  placeId: string | null;
  name: string | null;
  lat: string | null;
  lon: string | null;
}) {
  if (placeId) return `id:${placeId}`;
  return `search:${(name ?? "").trim().toLowerCase()}|${Number(lat ?? 0).toFixed(4)}|${Number(lon ?? 0).toFixed(4)}`;
}

async function getCachedPlaceDetails(cacheKey: string, loadPlaceDetails: () => Promise<PlaceDetailsResponse>) {
  const now = Date.now();
  const cached = placeDetailsCache.get(cacheKey);

  if (cached?.place && cached.expiresAt > now) {
    return cached.place;
  }

  if (cached?.pending) {
    return cached.pending;
  }

  const pending = loadPlaceDetails();
  placeDetailsCache.set(cacheKey, { expiresAt: now + PLACE_DETAILS_CACHE_TTL_MS, pending });

  try {
    const place = await pending;
    placeDetailsCache.set(cacheKey, { expiresAt: Date.now() + PLACE_DETAILS_CACHE_TTL_MS, place });
    prunePlaceDetailsCache();
    return place;
  } catch (error) {
    placeDetailsCache.delete(cacheKey);
    throw error;
  }
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const name = searchParams.get("name");

  if (!placeId && (!name || !lat || !lon)) {
    return NextResponse.json({ ok: false, message: "placeId or name+lat+lon required" }, { status: 400 });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ ok: false, message: "Google Places API key not configured", useFallback: true }, { status: 503 });
  }

  try {
    const cacheKey = getPlaceDetailsCacheKey({ placeId, name, lat, lon });
    const response = await getCachedPlaceDetails(cacheKey, async () => {
      let placeIdToUse = placeId;

      // If no placeId, do a text search to find it.
      if (!placeIdToUse && name && lat && lon) {
        const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
        searchUrl.searchParams.set("query", name);
        searchUrl.searchParams.set("location", `${lat},${lon}`);
        searchUrl.searchParams.set("radius", "500");
        searchUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);

        const searchResponse = await fetch(searchUrl.toString(), { cache: "no-store" });
        const searchData = (await searchResponse.json()) as GoogleSearchResponse;

        const foundPlaceId = searchData.results?.[0]?.place_id;
        if (!foundPlaceId) {
          throw new Error("place not found in Google");
        }
        placeIdToUse = foundPlaceId;
      }

      const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      detailsUrl.searchParams.set("place_id", placeIdToUse!);
      detailsUrl.searchParams.set("fields", "name,formatted_address,geometry,price_level,opening_hours,current_opening_hours,rating,reviews,types");
      detailsUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);

      const detailsResponse = await fetch(detailsUrl.toString(), { cache: "no-store" });
      const detailsData = (await detailsResponse.json()) as GoogleDetailsResponse;

      if (detailsData.status !== "OK" || !detailsData.result) {
        throw new Error(`Google API error: ${detailsData.status}`);
      }

      const result = detailsData.result;
      const openingHours = result.opening_hours?.weekday_text ?? [];
      const openNow = result.current_opening_hours?.open_now ?? result.opening_hours?.open_now ?? null;

      let priceLevel = "";
      if (result.price_level) {
        switch (result.price_level) {
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

      return {
        id: result.place_id || `google-${name}-${lat}-${lon}`,
        googlePlaceId: result.place_id,
        name: result.name || name || "",
        kind: mapGoogleKind(result.types ?? []),
        lat: result.geometry?.location?.lat ?? parseFloat(lat || "0"),
        lon: result.geometry?.location?.lng ?? parseFloat(lon || "0"),
        address: result.formatted_address || result.vicinity || "",
        priceLevel,
        openingHours,
        openNow,
        rating: result.rating ?? null,
        reviews: (result.reviews ?? []).map((r) => ({
          authorName: r.author_name ?? "",
          rating: r.rating ?? null,
          text: r.text || "",
        })),
      };
    });

    return NextResponse.json(
      { ok: true, place: response },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "place details request failed", useFallback: true },
      { status: 500 }
    );
  }
}
