import { NextResponse } from "next/server";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapToKind(amenity: string | undefined, shop: string | undefined, cuisine = ""): string {
  const c = cuisine.toLowerCase();
  if (amenity === "restaurant" || amenity === "fast_food") {
    if (c.includes("pizza")) return "pizza";
    if (c.includes("burger") || c.includes("hamburger")) return "burger";
    if (c.includes("sandwich")) return "sandwich shop";
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

function normalizeOverpass(el: OverpassElement): Place | null {
  const tags = el.tags ?? {};
  const name = tags.name ?? tags["name:en"];
  if (!name) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const kind = mapToKind(tags.amenity, tags.shop, tags.cuisine ?? "");

  const parts: string[] = [];
  if (tags["addr:street"] && tags["addr:housenumber"]) parts.push(`${tags["addr:street"]} ${tags["addr:housenumber"]}`);
  else if (tags["addr:street"]) parts.push(tags["addr:street"]);
  const cityPart = tags["addr:city"] ?? tags["addr:suburb"];
  if (cityPart) parts.push(cityPart);

  const openingHoursRaw = tags.opening_hours;

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    kind,
    lat,
    lon,
    address: parts.join(", ") || "Unknown location",
    priceLevel: "",
    openingHours: openingHoursRaw ? [openingHoursRaw] : [],
    openNow: openingHoursRaw === "24/7" ? true : null,
    reviews: [],
  };
}

async function runOverpassQuery(ql: string): Promise<Place[]> {
  let lastError: Error = new Error("no endpoints tried");

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "CrumbzApp/1.0 (contact@crumbz.app)",
        },
        body: `data=${encodeURIComponent(ql)}`,
        cache: "no-store",
      });

      if (!response.ok) {
        lastError = new Error(`Overpass ${endpoint} returned ${response.status}`);
        continue;
      }

      const data = (await response.json()) as { elements?: OverpassElement[]; remark?: string };

      if (typeof data.remark === "string" && (data.remark.includes("timeout") || data.remark.includes("error"))) {
        lastError = new Error(`Overpass: ${data.remark}`);
        continue;
      }

      return (data.elements ?? []).map(normalizeOverpass).filter((p): p is Place => p !== null);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("fetch failed");
    }
  }

  throw lastError;
}

async function textSearch(query: string, lat: number, lon: number): Promise<Place[]> {
  const safe = escapeRegex(query);
  // 10 km radius covers entire city; name filter keeps the query fast
  const ql = `
[out:json][timeout:12];
(
  node["amenity"~"${FOOD_AMENITIES}"]["name"~"${safe}",i](around:10000,${lat},${lon});
  way["amenity"~"${FOOD_AMENITIES}"]["name"~"${safe}",i](around:10000,${lat},${lon});
  node["shop"~"${FOOD_SHOPS}"]["name"~"${safe}",i](around:10000,${lat},${lon});
  way["shop"~"${FOOD_SHOPS}"]["name"~"${safe}",i](around:10000,${lat},${lon});
  node["amenity"~"${safe}"]["name"](around:10000,${lat},${lon});
  way["amenity"~"${safe}"]["name"](around:10000,${lat},${lon});
  node["cuisine"~"${safe}",i]["name"](around:10000,${lat},${lon});
  way["cuisine"~"${safe}",i]["name"](around:10000,${lat},${lon});
);
out center tags 15;
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

async function nearbySearch(lat: number, lon: number, radius: number): Promise<Place[]> {
  const r = Math.min(radius, 3000);
  const ql = `
[out:json][timeout:12];
(
  node["amenity"~"${FOOD_AMENITIES}"]["name"](around:${r},${lat},${lon});
  way["amenity"~"${FOOD_AMENITIES}"]["name"](around:${r},${lat},${lon});
  node["shop"~"${FOOD_SHOPS}"]["name"](around:${r},${lat},${lon});
  way["shop"~"${FOOD_SHOPS}"]["name"](around:${r},${lat},${lon});
);
out center tags 50;
`;
  const places = await runOverpassQuery(ql);
  places.sort((a, b) => (a.lat - lat) ** 2 + (a.lon - lon) ** 2 - ((b.lat - lat) ** 2 + (b.lon - lon) ** 2));
  return places;
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
      places = await textSearch(query, lat, lon);
    } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
      places = await nearbySearch(lat, lon, radius);
    }

    return NextResponse.json({ ok: true, places }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "places request failed", places: [] },
      { status: 500 },
    );
  }
}
