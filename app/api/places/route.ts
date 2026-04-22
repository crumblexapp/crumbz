import { NextResponse } from "next/server";

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY ?? "";
const FSQ_BASE = "https://api.foursquare.com/v3";
const FOOD_CATEGORIES = "13000"; // Foursquare top-level Food category

type FoursquarePlace = {
  fsq_id: string;
  name: string;
  location?: {
    address?: string;
    formatted_address?: string;
  };
  categories?: Array<{ id: number; name: string }>;
  geocodes?: {
    main?: { latitude: number; longitude: number };
  };
  hours?: {
    display?: string;
    open_now?: boolean;
  };
  price?: number;
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
  reviews: Array<{ authorName: string; rating: number | null; text: string }>;
};

function mapFsqCategory(categories: Array<{ name: string }> = []): string {
  const name = (categories[0]?.name ?? "").toLowerCase();
  if (name.includes("pizza")) return "pizza";
  if (name.includes("burger") || name.includes("hamburger")) return "burger";
  if (name.includes("sandwich")) return "sandwich shop";
  if (name.includes("cafe") || name.includes("coffee") || name.includes("tea")) return "cafe";
  if (name.includes("bakery") || name.includes("pastry")) return "bakery";
  if (name.includes("bar") || name.includes("pub") || name.includes("brew")) return "bar";
  if (name.includes("ice cream") || name.includes("gelato")) return "ice cream shop";
  if (name.includes("dessert") || name.includes("confection")) return "dessert shop";
  if (name.includes("fast food")) return "fast food";
  return "restaurant";
}

function mapFsqPrice(price?: number): string {
  switch (price) {
    case 1: return "PRICE_LEVEL_INEXPENSIVE";
    case 2: return "PRICE_LEVEL_MODERATE";
    case 3: return "PRICE_LEVEL_EXPENSIVE";
    case 4: return "PRICE_LEVEL_VERY_EXPENSIVE";
    default: return "";
  }
}

function normalizeFsq(fsq: FoursquarePlace): Place | null {
  if (!fsq.fsq_id || !fsq.name) return null;
  const lat = fsq.geocodes?.main?.latitude;
  const lon = fsq.geocodes?.main?.longitude;
  if (!lat || !lon) return null;

  return {
    id: `fsq-${fsq.fsq_id}`,
    name: fsq.name,
    kind: mapFsqCategory(fsq.categories),
    lat,
    lon,
    address: fsq.location?.formatted_address ?? fsq.location?.address ?? "Unknown location",
    priceLevel: mapFsqPrice(fsq.price),
    openingHours: fsq.hours?.display ? [fsq.hours.display] : [],
    openNow: typeof fsq.hours?.open_now === "boolean" ? fsq.hours.open_now : null,
    reviews: [],
  };
}

async function fsqSearch(params: Record<string, string>): Promise<Place[]> {
  const url = new URL(`${FSQ_BASE}/places/search`);
  url.searchParams.set("fields", "fsq_id,name,location,categories,geocodes,hours,price");
  url.searchParams.set("categories", FOOD_CATEGORIES);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: FSQ_API_KEY,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Foursquare ${response.status}: ${body.slice(0, 120)}`);
  }

  const data = (await response.json()) as { results?: FoursquarePlace[] };
  return (data.results ?? []).map(normalizeFsq).filter((p): p is Place => p !== null);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radius = Number(searchParams.get("radius") ?? "3000");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ ok: false, message: "lat/lon required", places: [] }, { status: 400 });
  }

  try {
    const params: Record<string, string> = {
      ll: `${lat},${lon}`,
      radius: String(Math.min(radius, 10000)),
      limit: query ? "15" : "50",
      sort: "DISTANCE",
    };
    if (query) params.query = query;

    const places = await fsqSearch(params);
    return NextResponse.json({ ok: true, places }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "places request failed", places: [] },
      { status: 500 },
    );
  }
}
