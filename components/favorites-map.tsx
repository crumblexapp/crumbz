"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Avatar, Spinner } from "@heroui/react";
import { useEffect, useMemo, useRef, useState } from "react";

type FavoritePlace = {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  address: string;
};

type FriendProfile = {
  email: string;
  name: string;
  username: string;
  picture?: string;
  favoritePlaceIds: string[];
};

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const cityCenters: Record<string, [number, number]> = {
  warsaw: [52.2297, 21.0122],
  lodz: [51.7592, 19.456],
  krakow: [50.0647, 19.945],
  wroclaw: [51.1079, 17.0385],
  poznan: [52.4064, 16.9252],
  gdansk: [54.352, 18.6466],
  szczecin: [53.4285, 14.5528],
  bydgoszcz: [53.1235, 18.0084],
  lublin: [51.2465, 22.5684],
  katowice: [50.2649, 19.0238],
  bialystok: [53.1325, 23.1688],
  gdynia: [54.5189, 18.5305],
  czestochowa: [50.8118, 19.1203],
  torun: [53.0138, 18.5984],
};
const FOOD_SEARCH_QUERIES = [
  "restaurants",
  "cafes",
  "bakeries",
  "desserts",
  "matcha",
  "bubble tea",
  "coffee",
  "juice bar",
];
const EXCLUDED_PLACE_TYPES = new Set(["liquor_store", "supermarket", "convenience_store", "grocery_or_supermarket"]);
const SEARCH_RADIUS_METERS = 15000;

function normalizeCityKey(cityName: string) {
  return cityName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizePlaceResult(place: google.maps.places.PlaceResult): FavoritePlace | null {
  const location = place.geometry?.location;
  const placeId = place.place_id;
  const name = place.name;
  if (!location || !placeId || !name) return null;

  const kinds = place.types ?? [];
  const blocked = kinds.some((kind) => EXCLUDED_PLACE_TYPES.has(kind));
  if (blocked) return null;

  return {
    id: placeId,
    name,
    kind: (kinds[0] ?? "food spot").replace(/_/g, " "),
    lat: location.lat(),
    lon: location.lng(),
    address: place.formatted_address ?? place.vicinity ?? "city spot",
  };
}

export default function FavoritesMap({
  center,
  cityName,
  places,
  favoriteIds,
  onToggleFavorite,
  friends,
}: {
  center: [number, number];
  places: FavoritePlace[];
  favoriteIds: string[];
  mutualFansByPlace: Record<string, unknown>;
  onToggleFavorite: (placeId: string) => void;
  cityName: string;
  friends: FriendProfile[];
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const effectiveCenter = cityCenters[normalizeCityKey(cityName)] ?? center;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FavoritePlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(places[0]?.id ?? null);
  const [mapReady, setMapReady] = useState(false);

  const displayedPlaces = useMemo(() => {
    const hasQuery = searchQuery.trim().length >= 2;
    if (hasQuery) return searchResults;
    if (searchResults.length && !places.length) return searchResults;
    return places;
  }, [places, searchQuery, searchResults]);
  const selectedPlace = displayedPlaces.find((place) => place.id === selectedPlaceId) ?? displayedPlaces[0] ?? null;
  const selectedMutualFans = selectedPlace ? friends.filter((friend) => friend.favoritePlaceIds.includes(selectedPlace.id)) : [];

  const runTextSearch = async (query: string) => {
    if (!placesServiceRef.current || !mapRef.current) return [];

    const request: google.maps.places.TextSearchRequest = {
      query,
      location: new google.maps.LatLng(effectiveCenter[0], effectiveCenter[1]),
      radius: SEARCH_RADIUS_METERS,
    };

    return new Promise<FavoritePlace[]>((resolve) => {
      const collected: FavoritePlace[] = [];

      const runPage = (pageRequest: google.maps.places.TextSearchRequest) => {
        placesServiceRef.current?.textSearch(pageRequest, (results, status, pagination) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
            collected.push(...results.map(normalizePlaceResult).filter((place): place is FavoritePlace => Boolean(place)));
          }

          if (pagination?.hasNextPage && collected.length < 120) {
            // google requires a small delay before calling nextPage
            window.setTimeout(() => pagination.nextPage(), 320);
          } else {
            resolve(
              collected.filter((place, index, list) => list.findIndex((item) => item.id === place.id) === index),
            );
          }
        });
      };

      runPage(request);
    });
  };

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current || !GOOGLE_MAPS_KEY) return;

    setOptions({
      key: GOOGLE_MAPS_KEY,
      v: "weekly",
    });

    void Promise.all([importLibrary("maps"), importLibrary("places")]).then(() => {
      if (!mapElementRef.current) return;

      const map = new google.maps.Map(mapElementRef.current, {
        center: { lat: effectiveCenter[0], lng: effectiveCenter[1] },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        gestureHandling: "greedy",
      });

      mapRef.current = map;
      placesServiceRef.current = new google.maps.places.PlacesService(map);
      setMapReady(true);
    });
  }, [effectiveCenter]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setCenter({ lat: effectiveCenter[0], lng: effectiveCenter[1] });
    mapRef.current.setZoom(13);
    setSelectedPlaceId(places[0]?.id ?? null);
    setSearchResults([]);
  }, [effectiveCenter]);

  useEffect(() => {
    if (!mapReady || !placesServiceRef.current || !mapRef.current) return;

    placesServiceRef.current.findPlaceFromQuery(
      {
        query: cityName,
        fields: ["geometry"],
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          mapRef.current?.setCenter(loc);
        }
      },
    );
  }, [cityName, mapReady]);

  useEffect(() => {
    if (!mapRef.current || !displayedPlaces.length) return;
    const first = displayedPlaces[0];
    mapRef.current.setCenter({ lat: first.lat, lng: first.lon });
    setSelectedPlaceId((current) => current ?? first.id);
  }, [displayedPlaces]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !placesServiceRef.current) return;

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      const results = await runTextSearch(`${query} in ${cityName}`);
      setSearchResults(results);
      setSelectedPlaceId(results[0]?.id ?? null);
      setSearchLoading(false);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [cityName, mapReady, searchQuery]);

  useEffect(() => {
    if (!mapReady) return;

    const loadDefaultPlaces = async () => {
      const primary = await runTextSearch(`restaurants in ${cityName}`);
      const fallback = primary.length ? primary : await runTextSearch(`food in ${cityName}`);
      if (fallback.length) {
        setSearchResults([]);
        setSelectedPlaceId((current) => current ?? fallback[0]?.id ?? null);
      }
    };

    if (!places.length) {
      void loadDefaultPlaces();
    }
  }, [cityName, mapReady, places.length]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    displayedPlaces.forEach((place) => {
      const isFavorited = favoriteIds.includes(place.id);
      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lon },
        map: mapRef.current,
        title: place.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: selectedPlace?.id === place.id ? 11 : 8,
          fillColor: isFavorited ? "#FE8A01" : "#3cc58f",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });

      marker.addListener("click", () => {
        setSelectedPlaceId(place.id);
        mapRef.current?.panTo({ lat: place.lat, lng: place.lon });
      });

      markersRef.current.push(marker);
    });
  }, [displayedPlaces, favoriteIds, mapReady, selectedPlace?.id]);

  useEffect(() => {
    if (!selectedPlace || !mapRef.current) return;
    mapRef.current.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lon });
  }, [selectedPlace]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="rounded-[32px] border border-dashed border-[#ffd9ab] bg-white px-4 py-8 text-sm text-[#8b6338]">
        add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to turn on the real interactive google map here.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[#e5e1f4] bg-[linear-gradient(180deg,_#f8f7ff_0%,_#eef4ff_100%)] shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
      <div className="absolute left-4 right-4 top-4 z-10 rounded-full bg-white/94 px-4 py-3 shadow-[0_14px_40px_rgba(43,21,48,0.08)] backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-xl text-[#7a7895]">⌕</span>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`search places in ${cityName}...`}
              className="w-full bg-transparent text-sm font-medium text-[#2b1530] outline-none placeholder:text-[#b4b1c8]"
            />
            <p className="text-xs text-[#8d89ab]">
              {searchLoading ? "searching google places..." : `showing ${displayedPlaces.length} spots around ${cityName}`}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-20 z-10 rounded-full bg-white/94 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a7895] shadow-[0_14px_40px_rgba(43,21,48,0.08)] backdrop-blur">
        {cityName}
      </div>

      <div ref={mapElementRef} className="h-[560px] w-full" />

      {!mapReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <Spinner color="warning" />
        </div>
      ) : null}

      {selectedPlace ? (
        <div className="absolute inset-x-4 bottom-4 z-10 rounded-[28px] bg-white/96 p-4 shadow-[0_20px_50px_rgba(43,21,48,0.16)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-[#2b1530]">{selectedPlace.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#b56d19]">{selectedPlace.kind}</p>
              <p className="mt-2 text-sm text-[#785c42]">{selectedPlace.address}</p>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(selectedPlace.id)}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${
                favoriteIds.includes(selectedPlace.id) ? "bg-[#FE8A01] text-white" : "bg-[#fff5e8] text-[#d97706]"
              }`}
              aria-label={`heart ${selectedPlace.name}`}
            >
              <span className="text-xl">♥</span>
            </button>
          </div>

          {selectedMutualFans.length ? (
            <div className="mt-4 inline-flex items-center gap-3 rounded-full bg-[#edf5ff] px-3 py-2">
              <span className="text-xl">❤️</span>
              <div className="flex -space-x-2">
                {selectedMutualFans.slice(0, 3).map((fan) => (
                  <Avatar key={fan.email} src={fan.picture} name={fan.name} className="h-9 w-9 border-2 border-[#edf5ff]" />
                ))}
              </div>
              <p className="text-xs font-medium text-[#34517a]">{selectedMutualFans[0]?.username} mutual liked place</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
