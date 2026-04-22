import { NextResponse } from "next/server";

type NominatimResult = {
  place_id: number;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
  class: string;
  type: string;
  address?: Record<string, string>;
  name?: string;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
};

type Place = {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  address: string;
  priceLevel: string;
  openingHours: string[];
  openNow: boolean | null;
  reviews: Array<{
    authorName: string;
    rating: number | null;
    text: string;
  }>;
};

const FOOD_TYPES = [
  "restaurant",
  "cafe",
  "bakery",
  "bar",
  "coffee_shop",
  "fast_food",
  "meal_takeaway",
  "dessert_shop",
  "sandwich_shop",
  "pizza",
  "burger",
  "ice_cream",
];

function isFoodPlace(place: { kind: string; name: string; address: string }) {
  const haystack = `${place.kind} ${place.name} ${place.address}`.toLowerCase();
  return FOOD_TYPES.some((type) => haystack.includes(type.replace(/_/g, " ")));
}

function normalizePlace(result: NominatimResult): Place | null {
  const osmId = result.osm_id;
  const name = result.name || result.address?.amenity || result.address?.shop || "Unknown";
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);

  if (!osmId || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  // Map OSM class/type to our kind field
  const kind = mapOsmClassToKind(result.class, result.type);

  // Build address from available fields
  const address = buildAddress(result);

  return {
    id: `osm-${osmId}`,
    name,
    kind,
    lat,
    lon,
    address,
    priceLevel: "", // Nominatim doesn't provide price levels
    openingHours: [], // Would need separate Overpass query
    openNow: null, // Would need separate Overpass query
    reviews: [], // Using your own review system instead
  };
}

function mapOsmClassToKind(osmClass: string, osmType: string): string {
  const typeLower = osmType.toLowerCase();
  const classLower = osmClass.toLowerCase();

  // Food-related mappings
  if (classLower === "amenity") {
    if (typeLower === "restaurant") return "restaurant";
    if (typeLower === "cafe") return "cafe";
    if (typeLower === "bar") return "bar";
    if (typeLower === "fast_food") return "fast food";
    if (typeLower === "pub") return "bar";
    if (typeLower === "biergarten") return "bar";
    if (typeLower === "food_court") return "food court";
  }

  if (classLower === "shop") {
    if (typeLower === "bakery") return "bakery";
    if (typeLower === "confectionery") return "dessert shop";
    if (typeLower === "ice_cream") return "ice cream shop";
    if (typeLower === "deli") return "deli";
  }

  // Fallback to OSM type, cleaned up
  return osmType.replace(/_/g, " ");
}

function buildAddress(result: NominatimResult): string {
  const addr = result.address || {};
  const parts: string[] = [];

  // Try to get street address first
  if (addr.house_number && addr.road) {
    parts.push(`${addr.road} ${addr.house_number}`);
  } else if (addr.road) {
    parts.push(addr.road);
  } else if (addr.amenity) {
    parts.push(addr.amenity);
  } else if (addr.shop) {
    parts.push(addr.shop);
  }

  // Add city/town
  if (addr.city) {
    parts.push(addr.city);
  } else if (addr.town) {
    parts.push(addr.town);
  } else if (addr.village) {
    parts.push(addr.village);
  } else if (addr.suburb) {
    parts.push(addr.suburb);
  }

  // Add country if we have it
  if (addr.country && parts.length > 0) {
    // Only add country if it's different from the city
    const lastPart = parts[parts.length - 1];
    if (lastPart !== addr.country) {
      // Don't add country for same-country contexts
    }
  }

  return parts.join(", ") || result.display_name || "Unknown location";
}

async function searchNominatim(query: string, lat?: number, lon?: number, limit = 20): Promise<Place[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("dedupe", "1");

  // Bias search near coordinates if provided
  if (typeof lat === "number" && typeof lon === "number") {
    url.searchParams.set("viewbox", `${lon - 0.1},${lat + 0.1},${lon + 0.1},${lat - 0.1}`);
    url.searchParams.set("bounded", "1");
  }

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "CrumbzApp/1.0 (contact@crumbz.app)",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`nominatim search failed: ${response.status} ${response.statusText}`);
  }

  const results = (await response.json()) as NominatimResult[];
  return results.map(normalizePlace).filter((place): place is Place => Boolean(place));
}

async function searchNearbyNominatim(lat: number, lon: number, radius: number): Promise<Place[]> {
  // Nominatim doesn't support true nearby search, so we use a category-based approach
  // Search for food-related categories near the location

  const categories = [
    "restaurant",
    "cafe",
    "fast food",
    "bar",
    "bakery",
    "ice cream",
    "pizza",
    "burger",
  ];

  const searches = await Promise.all(
    categories.map((category) =>
      searchNominatim(category, lat, lon, 15),
    ),
  );

  // Deduplicate by OSM ID
  const seen = new Set<string>();
  const places: Place[] = [];

  for (const result of searches.flat()) {
    if (!seen.has(result.id)) {
      seen.add(result.id);
      places.push(result);
    }
  }

  // Sort by distance from the target location
  places.sort((a, b) => {
    const distA = Math.sqrt(Math.pow(a.lat - lat, 2) + Math.pow(a.lon - lon, 2));
    const distB = Math.sqrt(Math.pow(b.lat - lat, 2) + Math.pow(b.lon - lon, 2));
    return distA - distB;
  });

  return places.slice(0, 50);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radius = Number(searchParams.get("radius") ?? "7000");

  try {
    let places: Place[] = [];

    if (query) {
      // Text search with optional city context
      const searchQuery = city ? `${query} in ${city}` : query;
      places = await searchNominatim(
        searchQuery,
        Number.isFinite(lat) ? lat : undefined,
        Number.isFinite(lon) ? lon : undefined,
      );

      // Filter to food places if the query looks food-related
      const loweredQuery = query.toLowerCase();
      const isFoodQuery = FOOD_TYPES.some((type) => loweredQuery.includes(type));
      if (isFoodQuery) {
        places = places.filter((place) => isFoodPlace(place));
      }
    } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
      // Nearby search
      places = await searchNearbyNominatim(lat, lon, radius);
    }

    return NextResponse.json({ ok: true, places }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "places request failed",
        places: [],
      },
      { status: 500 },
    );
  }
}
