import { NextResponse } from "next/server";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type NominatimResult = {
  osm_id: number;
  osm_type: "node" | "way" | "relation";
  lat: string;
  lon: string;
  class: string;
  type: string;
  name?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
};

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
const AMENITY_FOOD_SET = new Set(["restaurant", "cafe", "bar", "fast_food", "pub", "biergarten", "food_court", "ice_cream"]);
const SHOP_FOOD_SET = new Set(["bakery", "confectionery", "ice_cream", "deli", "pastry"]);

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

// --- Nominatim: fast text search ---

function isFoodNominatim(r: NominatimResult): boolean {
  if (r.class === "amenity" && AMENITY_FOOD_SET.has(r.type)) return true;
  if (r.class === "shop" && SHOP_FOOD_SET.has(r.type)) return true;
  return false;
}

function normalizeNominatim(r: NominatimResult): Place | null {
  if (!isFoodNominatim(r)) return null;
  const name = r.name ?? r.address?.amenity ?? r.address?.shop;
  if (!name) return null;
  const lat = parseFloat(r.lat);
  const lon = parseFloat(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const cuisine = r.extratags?.cuisine ?? "";
  const kind = mapToKind(r.class === "amenity" ? r.type : undefined, r.class === "shop" ? r.type : undefined, cuisine);

  const addr = r.address ?? {};
  const parts: string[] = [];
  if (addr.road && addr.house_number) parts.push(`${addr.road} ${addr.house_number}`);
  else if (addr.road) parts.push(addr.road);
  const cityPart = addr.city ?? addr.town ?? addr.suburb;
  if (cityPart) parts.push(cityPart);

  const openingHoursRaw = r.extratags?.opening_hours;

  return {
    id: `osm-${r.osm_id}`,
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

async function textSearch(query: string, lat: number, lon: number): Promise<Place[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "20");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("dedupe", "1");
  // viewbox as soft preference — no bounded=1 so we still get results outside it
  url.searchParams.set("viewbox", `${lon - 0.2},${lat + 0.2},${lon + 0.2},${lat - 0.2}`);

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "CrumbzApp/1.0 (contact@crumbz.app)",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);

  const results = (await response.json()) as NominatimResult[];
  return results.map(normalizeNominatim).filter((p): p is Place => p !== null);
}

// --- Overpass: nearby map load (returns opening_hours) ---

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

async function nearbySearch(lat: number, lon: number, radius: number): Promise<Place[]> {
  // Cap radius at 3 km so the Overpass query stays fast
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
  const places = data.elements.map(normalizeOverpass).filter((p): p is Place => p !== null);

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
