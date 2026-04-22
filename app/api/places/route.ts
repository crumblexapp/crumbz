import { NextResponse } from "next/server";

const PHOTON_BASE = "https://photon.komoot.io/api";
const OVERPASS_ENDPOINTS = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
] as const;

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

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    osm_type?: string;
    osm_id?: number | string;
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
    osm_key?: string;
    osm_value?: string;
  };
};

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function clampRadius(radius: number) {
  return Math.min(Math.max(radius, 500), 10000);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getAddress(parts: Array<string | undefined>) {
  return normalizeWhitespace(parts.filter(Boolean).join(", ")) || "Unknown location";
}

function mapOsmKind(tags: Record<string, string>) {
  const amenity = (tags.amenity ?? "").toLowerCase();
  const shop = (tags.shop ?? "").toLowerCase();
  const cuisine = (tags.cuisine ?? "").toLowerCase();
  const tourism = (tags.tourism ?? "").toLowerCase();
  const leisure = (tags.leisure ?? "").toLowerCase();
  const office = (tags.office ?? "").toLowerCase();

  const combined = [amenity, shop, cuisine, tourism, leisure, office].filter(Boolean).join(" ");

  if (combined.includes("pizza")) return "pizza";
  if (combined.includes("burger")) return "burger";
  if (combined.includes("sandwich")) return "sandwich shop";
  if (combined.includes("bakery") || combined.includes("pastry")) return "bakery";
  if (combined.includes("cafe") || combined.includes("coffee")) return "cafe";
  if (combined.includes("ice_cream") || combined.includes("gelato")) return "ice cream shop";
  if (combined.includes("dessert") || combined.includes("confectionery") || combined.includes("chocolate")) return "dessert shop";
  if (combined.includes("bar") || combined.includes("pub") || combined.includes("biergarten") || combined.includes("brew")) return "bar";
  if (combined.includes("fast_food") || combined.includes("food_court") || combined.includes("takeaway")) return "fast food";
  if (shop) return "shop";
  return "restaurant";
}

function parseOpeningHours(tags: Record<string, string>) {
  const value = tags.opening_hours?.trim();
  return value ? [value] : [];
}

function normalizePhotonPlace(feature: PhotonFeature): Place | null {
  const props = feature.properties;
  const coordinates = feature.geometry?.coordinates;
  if (!props?.name || !Array.isArray(coordinates) || coordinates.length < 2) return null;

  const [lon, lat] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const tags: Record<string, string> = {};
  if (props.osm_key && props.osm_value) {
    tags[props.osm_key] = props.osm_value;
  }

  return {
    id: `photon-${props.osm_type ?? "feature"}-${props.osm_id ?? props.name}-${lat}-${lon}`,
    name: props.name,
    kind: mapOsmKind(tags),
    lat,
    lon,
    address: getAddress([
      [props.street, props.housenumber].filter(Boolean).join(" ").trim(),
      props.postcode,
      props.city,
      props.state,
      props.country,
    ]),
    priceLevel: "",
    openingHours: [],
    openNow: null,
    reviews: [],
  };
}

function normalizeOverpassPlace(element: OverpassElement): Place | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  const latValue = element.lat ?? element.center?.lat;
  const lonValue = element.lon ?? element.center?.lon;

  if (!name || typeof latValue !== "number" || !Number.isFinite(latValue) || typeof lonValue !== "number" || !Number.isFinite(lonValue)) {
    return null;
  }

  const lat = latValue;
  const lon = lonValue;

  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    kind: mapOsmKind(tags),
    lat,
    lon,
    address: getAddress([
      [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ").trim(),
      tags["addr:postcode"],
      tags["addr:city"],
    ]),
    priceLevel: "",
    openingHours: parseOpeningHours(tags),
    openNow: null,
    reviews: [],
  };
}

function dedupePlaces(places: Place[]) {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = `${place.name.toLowerCase()}|${place.lat.toFixed(5)}|${place.lon.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function distanceInMeters(aLat: number, aLon: number, bLat: number, bLon: number) {
  const earthRadius = 6371000;
  const latDelta = toRadians(bLat - aLat);
  const lonDelta = toRadians(bLon - aLon);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function sortByDistance(places: Place[], lat: number, lon: number) {
  return [...places].sort(
    (left, right) =>
      distanceInMeters(lat, lon, left.lat, left.lon) -
      distanceInMeters(lat, lon, right.lat, right.lon),
  );
}

function filterWithinRadius(places: Place[], lat: number, lon: number, radius: number) {
  return places.filter((place) => distanceInMeters(lat, lon, place.lat, place.lon) <= radius);
}

async function photonSearch(query: string, lat: number, lon: number, limit: number, localRadius: number) {
  const url = new URL(PHOTON_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.max(limit * 4, 24)));
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.append("osm_tag", "amenity:restaurant");
  url.searchParams.append("osm_tag", "amenity:cafe");
  url.searchParams.append("osm_tag", "amenity:bar");
  url.searchParams.append("osm_tag", "amenity:fast_food");
  url.searchParams.append("osm_tag", "shop:bakery");
  url.searchParams.append("osm_tag", "shop:coffee");
  url.searchParams.append("osm_tag", "shop:confectionery");
  url.searchParams.append("osm_tag", "shop:ice_cream");
  url.searchParams.append("osm_tag", "shop:supermarket");
  url.searchParams.append("osm_tag", "shop:convenience");

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Photon ${response.status}: ${body.slice(0, 120)}`);
  }

  const payload = (await response.json()) as { features?: PhotonFeature[] };
  const normalized = dedupePlaces((payload.features ?? []).map(normalizePhotonPlace).filter((place): place is Place => place !== null));
  const strictLocal = sortByDistance(filterWithinRadius(normalized, lat, lon, localRadius), lat, lon).slice(0, limit);
  if (strictLocal.length) return strictLocal;

  const widerLocal = sortByDistance(filterWithinRadius(normalized, lat, lon, 20000), lat, lon).slice(0, limit);
  return widerLocal;
}

async function overpassNearby(lat: number, lon: number, radius: number, limit: number) {
  const query = `
[out:json][timeout:25];
(
  nwr(around:${radius},${lat},${lon})["amenity"~"restaurant|cafe|bar|fast_food|pub|ice_cream|food_court|biergarten"];
  nwr(around:${radius},${lat},${lon})["shop"~"bakery|coffee|confectionery|ice_cream|supermarket|convenience|deli|pastry"];
);
out center;
`;

  let lastError = "overpass request failed";

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
          "User-Agent": "make-something/0.1 (local map search)",
          Referer: "https://make-something.local",
        },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        lastError = `Overpass ${response.status}: ${body.slice(0, 120)}`;
        continue;
      }

      const payload = (await response.json()) as { elements?: OverpassElement[] };
      const normalized = dedupePlaces((payload.elements ?? []).map(normalizeOverpassPlace).filter((place): place is Place => place !== null));
      return sortByDistance(normalized, lat, lon).slice(0, limit);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "overpass request failed";
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(lastError);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radius = clampRadius(Number(searchParams.get("radius") ?? "3000"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ ok: false, message: "lat/lon required", places: [] }, { status: 400 });
  }

  try {
    const places = query
      ? await photonSearch(query, lat, lon, 15, Math.max(radius, 8000))
      : await overpassNearby(lat, lon, radius, 50);

    return NextResponse.json({ ok: true, places }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "places request failed", places: [] },
      { status: 500 },
    );
  }
}
