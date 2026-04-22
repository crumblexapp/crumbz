import { NextResponse } from "next/server";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
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

const FOOD_AMENITIES = "restaurant|cafe|bar|fast_food|pub|biergarten|food_court|ice_cream";
const FOOD_SHOPS = "bakery|confectionery|ice_cream|deli|pastry";

function mapOsmToKind(tags: Record<string, string>): string {
  const amenity = tags.amenity?.toLowerCase();
  const shop = tags.shop?.toLowerCase();
  const cuisine = tags.cuisine?.toLowerCase() ?? "";

  if (amenity === "restaurant" || amenity === "fast_food") {
    if (cuisine.includes("pizza")) return "pizza";
    if (cuisine.includes("burger") || cuisine.includes("hamburger")) return "burger";
    if (cuisine.includes("sandwich")) return "sandwich shop";
    if (amenity === "fast_food") return "fast food";
    return "restaurant";
  }
  if (amenity === "cafe") return "cafe";
  if (amenity === "bar" || amenity === "pub" || amenity === "biergarten") return "bar";
  if (amenity === "food_court") return "food court";
  if (amenity === "ice_cream") return "ice cream shop";
  if (shop === "bakery" || shop === "pastry") return "bakery";
  if (shop === "confectionery") return "dessert shop";
  if (shop === "ice_cream") return "ice cream shop";
  if (shop === "deli") return "deli";

  return (amenity ?? shop ?? "restaurant").replace(/_/g, " ");
}

function buildAddress(tags: Record<string, string>): string {
  const parts: string[] = [];
  if (tags["addr:street"] && tags["addr:housenumber"]) {
    parts.push(`${tags["addr:street"]} ${tags["addr:housenumber"]}`);
  } else if (tags["addr:street"]) {
    parts.push(tags["addr:street"]);
  }
  const city = tags["addr:city"] ?? tags["addr:suburb"];
  if (city) parts.push(city);
  return parts.join(", ") || "Unknown location";
}

function normalizeElement(el: OverpassElement): Place | null {
  const tags = el.tags ?? {};
  const name = tags.name ?? tags["name:en"];
  if (!name) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const openingHoursRaw = tags.opening_hours;
  const openNow = openingHoursRaw === "24/7" ? true : null;

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    kind: mapOsmToKind(tags),
    lat,
    lon,
    address: buildAddress(tags),
    priceLevel: "",
    openingHours: openingHoursRaw ? [openingHoursRaw] : [],
    openNow,
    reviews: [],
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function runOverpassQuery(ql: string): Promise<Place[]> {
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "CrumbzApp/1.0 (contact@crumbz.app)",
    },
    body: `data=${encodeURIComponent(ql)}`,
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Overpass error: ${response.status}`);

  const data = (await response.json()) as { elements: OverpassElement[] };
  return data.elements.map(normalizeElement).filter((p): p is Place => p !== null);
}

async function searchByText(query: string, lat: number, lon: number, radius: number): Promise<Place[]> {
  const safe = escapeRegex(query);
  const ql = `
[out:json][timeout:20];
(
  node["amenity"~"${FOOD_AMENITIES}"]["name"~"${safe}",i](around:${radius},${lat},${lon});
  way["amenity"~"${FOOD_AMENITIES}"]["name"~"${safe}",i](around:${radius},${lat},${lon});
  node["shop"~"${FOOD_SHOPS}"]["name"~"${safe}",i](around:${radius},${lat},${lon});
  way["shop"~"${FOOD_SHOPS}"]["name"~"${safe}",i](around:${radius},${lat},${lon});
  node["amenity"~"restaurant|fast_food"]["cuisine"~"${safe}",i](around:${radius},${lat},${lon});
  way["amenity"~"restaurant|fast_food"]["cuisine"~"${safe}",i](around:${radius},${lat},${lon});
);
out center tags;
`;
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const place of await runOverpassQuery(ql)) {
    if (!seen.has(place.id)) {
      seen.add(place.id);
      places.push(place);
    }
  }
  return places;
}

async function searchNearby(lat: number, lon: number, radius: number): Promise<Place[]> {
  const ql = `
[out:json][timeout:20];
(
  node["amenity"~"${FOOD_AMENITIES}"]["name"](around:${radius},${lat},${lon});
  way["amenity"~"${FOOD_AMENITIES}"]["name"](around:${radius},${lat},${lon});
  node["shop"~"${FOOD_SHOPS}"]["name"](around:${radius},${lat},${lon});
  way["shop"~"${FOOD_SHOPS}"]["name"](around:${radius},${lat},${lon});
);
out center tags;
`;
  const places = await runOverpassQuery(ql);
  places.sort((a, b) => {
    const dA = (a.lat - lat) ** 2 + (a.lon - lon) ** 2;
    const dB = (b.lat - lat) ** 2 + (b.lon - lon) ** 2;
    return dA - dB;
  });
  return places.slice(0, 50);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radius = Number(searchParams.get("radius") ?? "7000");

  try {
    let places: Place[] = [];

    if (query && Number.isFinite(lat) && Number.isFinite(lon)) {
      places = await searchByText(query, lat, lon, Math.max(radius, 10000));
    } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
      places = await searchNearby(lat, lon, radius);
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
