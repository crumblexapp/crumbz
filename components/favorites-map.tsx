"use client";

import { Avatar, Spinner } from "@heroui/react";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

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

function normalizeCityKey(cityName: string) {
  return cityName
    .trim()
    .replace(/[łŁ]/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildMarkerIcon(selected: boolean, favorited: boolean, fans: FriendProfile[]) {
  const bubbles = fans
    .slice(0, 2)
    .map((fan, index) => {
      const content = fan.picture
        ? `<img src="${escapeHtml(fan.picture)}" alt="${escapeHtml(fan.name)}" style="height:100%;width:100%;object-fit:cover;" />`
        : `<span>${escapeHtml(fan.name.slice(0, 1).toUpperCase())}</span>`;

      return `<div style="height:32px;width:32px;border-radius:999px;overflow:hidden;border:2px solid white;background:#fff3e1;color:#2b1530;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;position:relative;z-index:${3 - index};margin-left:${index === 0 ? 0 : -8}px;box-shadow:0 8px 20px rgba(43,21,48,0.14);">${content}</div>`;
    })
    .join("");

  const extra =
    fans.length > 2
      ? `<div style="height:32px;width:32px;border-radius:999px;border:2px solid white;background:#2b1530;color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;margin-left:-8px;">+${fans.length - 2}</div>`
      : "";

  return L.divIcon({
    className: "crumbz-map-marker",
    html: `<div style="display:flex;align-items:center;gap:8px;">
      <div style="height:36px;width:36px;border-radius:999px;border:3px solid white;background:${favorited ? "#FE8A01" : "#3cc58f"};display:flex;align-items:center;justify-content:center;color:white;font-size:16px;box-shadow:0 10px 24px rgba(43,21,48,0.18);transform:${selected ? "scale(1.08)" : "scale(1)"};">♥</div>
      ${fans.length ? `<div style="display:flex;align-items:center;">${bubbles}${extra}</div>` : ""}
    </div>`,
    iconSize: [fans.length ? 86 : 36, 36],
    iconAnchor: [18, 18],
  });
}

function MapViewportSync({
  center,
  selectedPlace,
}: {
  center: [number, number];
  selectedPlace: FavoritePlace | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPlace) {
      map.setView([selectedPlace.lat, selectedPlace.lon], Math.max(map.getZoom(), 13), { animate: true });
      return;
    }

    map.setView(center, 13, { animate: true });
  }, [center, map, selectedPlace]);

  return null;
}

export default function FavoritesMap({
  center,
  cityName,
  places,
  favoriteIds,
  onToggleFavorite,
  friends,
  highlightedPlaceId,
}: {
  center: [number, number];
  places: FavoritePlace[];
  favoriteIds: string[];
  mutualFansByPlace: Record<string, unknown>;
  onToggleFavorite: (placeId: string) => void;
  cityName: string;
  friends: FriendProfile[];
  highlightedPlaceId?: string | null;
}) {
  const effectiveCenter = cityCenters[normalizeCityKey(cityName)] ?? center;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FavoritePlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(places[0]?.id ?? null);

  const displayedPlaces = useMemo(() => {
    if (searchQuery.trim().length >= 2) return searchResults;
    return places;
  }, [places, searchQuery, searchResults]);

  const mutualFansByPlace = useMemo(
    () =>
      Object.fromEntries(
        displayedPlaces.map((place) => [place.id, friends.filter((friend) => friend.favoritePlaceIds.includes(place.id))]),
      ) as Record<string, FriendProfile[]>,
    [displayedPlaces, friends],
  );

  const selectedPlace = displayedPlaces.find((place) => place.id === selectedPlaceId) ?? displayedPlaces[0] ?? null;
  const selectedMutualFans = selectedPlace ? mutualFansByPlace[selectedPlace.id] ?? [] : [];

  useEffect(() => {
    setSelectedPlaceId((current) => current ?? places[0]?.id ?? null);
  }, [places]);

  useEffect(() => {
    if (!highlightedPlaceId) return;
    const nextPlace = displayedPlaces.find((place) => place.id === highlightedPlaceId);
    if (nextPlace) setSelectedPlaceId(nextPlace.id);
  }, [displayedPlaces, highlightedPlaceId]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);

      try {
        const params = new URLSearchParams({
          q: `${query} in ${cityName}`,
          format: "jsonv2",
          limit: "12",
          addressdetails: "1",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
        const payload = (await response.json().catch(() => [])) as Array<{
          place_id?: number;
          display_name?: string;
          lat?: string;
          lon?: string;
          type?: string;
          name?: string;
        }>;

        const nextResults = payload
          .map((item) => {
            const lat = Number(item.lat);
            const lon = Number(item.lon);
            if (!item.place_id || Number.isNaN(lat) || Number.isNaN(lon)) return null;

            const parts = (item.display_name ?? "").split(",");
            return {
              id: `osm-${item.place_id}`,
              name: item.name ?? parts[0]?.trim() ?? "food spot",
              kind: (item.type ?? "food spot").replace(/_/g, " "),
              lat,
              lon,
              address: item.display_name ?? "city spot",
            } satisfies FavoritePlace;
          })
          .filter((item): item is FavoritePlace => Boolean(item));

        setSearchResults(nextResults);
        setSelectedPlaceId(nextResults[0]?.id ?? null);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [cityName, searchQuery]);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[#e5e1f4] bg-[linear-gradient(180deg,_#f8f7ff_0%,_#eef4ff_100%)] shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
      <div className="absolute left-4 right-4 top-4 z-[500] rounded-full bg-white/94 px-4 py-3 shadow-[0_14px_40px_rgba(43,21,48,0.08)] backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-xl text-[#7a7895]">⌕</span>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="find cafes, bakeries, restaurants..."
              className="w-full bg-transparent text-sm font-medium text-[#2b1530] outline-none placeholder:text-[#b4b1c8]"
            />
            <p className="text-xs text-[#8d89ab]">{searchLoading ? "searching places..." : "add your favorite spots here."}</p>
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-20 z-[500] rounded-full bg-white/94 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a7895] shadow-[0_14px_40px_rgba(43,21,48,0.08)] backdrop-blur">
        {cityName}
      </div>

      <div className="h-[560px] w-full">
        <MapContainer
          center={effectiveCenter}
          zoom={13}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapViewportSync center={effectiveCenter} selectedPlace={selectedPlace} />
          {displayedPlaces.map((place) => (
            <Marker
              key={place.id}
              position={[place.lat, place.lon]}
              icon={buildMarkerIcon(selectedPlace?.id === place.id, favoriteIds.includes(place.id), mutualFansByPlace[place.id] ?? [])}
              eventHandlers={{
                click: () => {
                  setSelectedPlaceId(place.id);
                },
              }}
            />
          ))}
        </MapContainer>
      </div>

      {!displayedPlaces.length && !searchLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
          <div className="rounded-[24px] bg-white/95 px-5 py-4 text-center text-sm text-[#785c42] shadow-[0_20px_40px_rgba(43,21,48,0.08)]">
            search for a spot or save one to start your map.
          </div>
        </div>
      ) : null}

      {searchLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
          <Spinner color="warning" />
        </div>
      ) : null}

      {selectedPlace ? (
        <div className="absolute inset-x-4 bottom-4 z-[500] rounded-[28px] bg-white/96 p-4 shadow-[0_20px_50px_rgba(43,21,48,0.16)] backdrop-blur">
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
              <p className="text-xs font-medium text-[#34517a]">
                {selectedMutualFans.length === 1
                  ? `${selectedMutualFans[0]?.username} saved this spot`
                  : `${selectedMutualFans[0]?.username} and ${selectedMutualFans.length - 1} more saved this spot`}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
