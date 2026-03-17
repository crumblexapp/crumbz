import { NextResponse } from "next/server";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  types?: string[];
};

const GOOGLE_MAPS_SERVER_API_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY ?? "";
const FOOD_TYPES = ["restaurant", "cafe", "bakery", "bar", "coffee_shop", "fast_food", "meal_takeaway", "dessert_shop"];

function isFoodPlace(place: { kind: string; name: string; address: string }) {
  const haystack = `${place.kind} ${place.name} ${place.address}`.toLowerCase();
  return FOOD_TYPES.some((type) => haystack.includes(type.replace(/_/g, " ")));
}

function normalizePlace(place: GooglePlace) {
  const id = place.id;
  const name = place.displayName?.text;
  const lat = place.location?.latitude;
  const lon = place.location?.longitude;
  if (!id || !name || typeof lat !== "number" || typeof lon !== "number") return null;

  return {
    id,
    name,
    kind: (place.primaryType ?? place.types?.[0] ?? "food spot").replace(/_/g, " "),
    lat,
    lon,
    address: place.formattedAddress ?? "city spot",
  };
}

async function searchNearby(lat: number, lon: number, radius: number) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_SERVER_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types",
    },
    body: JSON.stringify({
      includedTypes: FOOD_TYPES,
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lon,
          },
          radius,
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("nearby places request failed");
  }

  const payload = (await response.json()) as { places?: GooglePlace[] };
  return (payload.places ?? [])
    .map(normalizePlace)
    .filter((place): place is NonNullable<ReturnType<typeof normalizePlace>> => Boolean(place));
}

async function searchText(rawQuery: string, city?: string, lat?: number, lon?: number) {
  const textQuery = city ? `${rawQuery} in ${city}` : rawQuery;
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_SERVER_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types",
    },
    body: JSON.stringify({
      textQuery,
      pageSize: 12,
      locationBias:
        typeof lat === "number" && typeof lon === "number"
          ? {
              circle: {
                center: { latitude: lat, longitude: lon },
                radius: 15000,
              },
            }
          : undefined,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("text places request failed");
  }

  const payload = (await response.json()) as { places?: GooglePlace[] };
  const normalized = (payload.places ?? [])
    .map(normalizePlace)
    .filter((place): place is NonNullable<ReturnType<typeof normalizePlace>> => Boolean(place));

  return normalized.filter((place) => {
    const loweredQuery = rawQuery.toLowerCase();
    const exactNameMatch = place.name.toLowerCase().includes(loweredQuery);
    return exactNameMatch || isFoodPlace(place);
  });
}

export async function GET(request: Request) {
  if (!GOOGLE_MAPS_SERVER_API_KEY) {
    return NextResponse.json({ ok: false, message: "missing GOOGLE_MAPS_SERVER_API_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radius = Number(searchParams.get("radius") ?? "3500");

  try {
    const places = query
      ? await searchText(query, city || undefined, Number.isFinite(lat) ? lat : undefined, Number.isFinite(lon) ? lon : undefined)
      : Number.isFinite(lat) && Number.isFinite(lon)
        ? await searchNearby(lat, lon, Number.isFinite(radius) ? radius : 3500)
        : [];

    return NextResponse.json({ ok: true, places }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "places request failed", places: [] },
      { status: 500 },
    );
  }
}
