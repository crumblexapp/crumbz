"use client";

import { Avatar, Spinner } from "@heroui/react";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { type Language, translations } from "@/lib/i18n";

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

function getPlaceAccent(kind: string) {
  const normalized = kind.toLowerCase();
  if (normalized.includes("bakery")) return { bg: "#ff8a65", fg: "#fff7f0", icon: "🥐", chip: "#ffe0d3" };
  if (normalized.includes("cafe") || normalized.includes("coffee")) return { bg: "#7b61ff", fg: "#f6f2ff", icon: "☕", chip: "#e5ddff" };
  if (normalized.includes("dessert") || normalized.includes("ice")) return { bg: "#ff5fa2", fg: "#fff2f8", icon: "🍰", chip: "#ffd9eb" };
  if (normalized.includes("bar") || normalized.includes("pub")) return { bg: "#2dbf8d", fg: "#eefdf7", icon: "🍸", chip: "#d7f7eb" };
  return { bg: "#fe8a01", fg: "#fff7ea", icon: "🍽", chip: "#ffe5bf" };
}

function buildMarkerIcon(place: FavoritePlace, selected: boolean, favorited: boolean, fans: FriendProfile[]) {
  const accent = getPlaceAccent(place.kind);
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
      <div style="height:44px;width:44px;border-radius:18px;border:3px solid white;background:${favorited ? "#fe8a01" : accent.bg};display:flex;align-items:center;justify-content:center;color:${accent.fg};font-size:18px;box-shadow:0 12px 28px rgba(43,21,48,0.18);transform:${selected ? "translateY(-2px) scale(1.08)" : "scale(1)"};transition:transform 180ms ease;">${accent.icon}</div>
      ${fans.length ? `<div style="display:flex;align-items:center;">${bubbles}${extra}</div>` : ""}
    </div>`,
    iconSize: [fans.length ? 96 : 44, 44],
    iconAnchor: [22, 22],
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
      map.setView([selectedPlace.lat, selectedPlace.lon], Math.max(map.getZoom(), 15), { animate: true });
      return;
    }

    map.setView(center, 13, { animate: true });
  }, [center, map, selectedPlace]);

  return null;
}

export default function FavoritesMap({
  center,
  cityName,
  searchCityName,
  language,
  places,
  favoriteIds,
  onToggleFavorite,
  onOpenDirections,
  onPostFromPlace,
  friends,
  highlightedPlaceId,
}: {
  center: [number, number];
  language: Language;
  places: FavoritePlace[];
  favoriteIds: string[];
  mutualFansByPlace: Record<string, unknown>;
  onToggleFavorite: (place: FavoritePlace) => void;
  onOpenDirections: (place: FavoritePlace) => void;
  onPostFromPlace?: (place: FavoritePlace) => void;
  cityName: string;
  searchCityName?: string;
  friends: FriendProfile[];
  highlightedPlaceId?: string | null;
}) {
  const copy = translations[language];
  const effectiveCenter = cityCenters[normalizeCityKey(cityName)] ?? center;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FavoritePlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [previewedPlace, setPreviewedPlace] = useState<FavoritePlace | null>(null);
  const defaultDisplayedPlaces = useMemo(() => places.slice(0, 24), [places]);

  const selectedPlace = useMemo(
    () => searchResults.find((place) => place.id === selectedPlaceId) ?? places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, searchResults, selectedPlaceId],
  );
  const focusedPlace = previewedPlace ?? selectedPlace;
  const displayedPlaces = useMemo(() => {
    if (searchResults.length) return searchResults;
    if (!focusedPlace) return defaultDisplayedPlaces;
    if (defaultDisplayedPlaces.some((place) => place.id === focusedPlace.id)) return defaultDisplayedPlaces;
    return [focusedPlace, ...defaultDisplayedPlaces].slice(0, 24);
  }, [defaultDisplayedPlaces, focusedPlace, searchResults]);

  const mutualFansByPlace = useMemo(
    () =>
      Object.fromEntries(
        displayedPlaces.map((place) => [place.id, friends.filter((friend) => friend.favoritePlaceIds.includes(place.id))]),
      ) as Record<string, FriendProfile[]>,
    [displayedPlaces, friends],
  );

  const selectedMutualFans = focusedPlace ? friends.filter((friend) => friend.favoritePlaceIds.includes(focusedPlace.id)) : [];
  const showSearchResults = searchQuery.trim().length >= 2 && !searchLoading;
  const showSelectedPlaceCard = Boolean(focusedPlace) && !showSearchResults;
  const selectedPreviewPlace = showSelectedPlaceCard ? focusedPlace : null;
  const selectedPreviewAccent = selectedPreviewPlace ? getPlaceAccent(selectedPreviewPlace.kind) : null;

  const previewPlace = (place: FavoritePlace) => {
    setSelectedPlaceId(place.id);
    setPreviewedPlace(place);
    setSearchQuery("");
    setSearchResults([]);
  };

  useEffect(() => {
    if (!highlightedPlaceId) return;
    const nextPlace = places.find((place) => place.id === highlightedPlaceId);
    if (nextPlace) {
      setSelectedPlaceId(nextPlace.id);
      setPreviewedPlace(nextPlace);
    }
  }, [highlightedPlaceId, places]);

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
          query,
          lat: String(effectiveCenter[0]),
          lon: String(effectiveCenter[1]),
        });
        if (searchCityName?.trim()) {
          params.set("city", searchCityName);
        }
        const response = await fetch(`/api/places?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({ places: [] }))) as { places?: FavoritePlace[] };
        const nextResults = (payload.places ?? []).slice(0, 12);

        setSearchResults(nextResults);
        setSelectedPlaceId(nextResults[0]?.id ?? null);
        setPreviewedPlace(nextResults[0] ?? null);
      } catch {
        setSearchResults([]);
        setSelectedPlaceId(null);
        setPreviewedPlace(null);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [effectiveCenter, searchCityName, searchQuery]);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[#e9dcc9] bg-[linear-gradient(180deg,_#fbf7f0_0%,_#f6efe4_100%)] shadow-[0_22px_60px_rgba(254,138,1,0.12)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.55),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(254,138,1,0.14),_transparent_34%)]" />

      <div className="absolute left-4 right-4 top-4 z-[500]">
        <div className="rounded-[28px] bg-white/94 px-4 py-3 shadow-[0_14px_40px_rgba(43,21,48,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-xl text-[#7a7895]">⌕</span>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={copy.map.searchPlaceholder}
                className="w-full bg-transparent text-sm font-medium text-[#2b1530] outline-none placeholder:text-[#b4b1c8]"
              />
              <p className="text-xs text-[#8d89ab]">{searchLoading ? copy.map.searchLoading : copy.map.searchIdle}</p>
            </div>
          </div>
        </div>

        {showSearchResults ? (
          <div className="mt-3 max-h-[260px] overflow-hidden rounded-[24px] border border-white/70 bg-white/96 shadow-[0_18px_40px_rgba(43,21,48,0.12)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-[#f3eadc] bg-[#fff8ef] px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b56d19]">{copy.map.liveResults}</p>
                <p className="mt-1 text-xs text-[#7c6d60]">{copy.map.tapToPreview}</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b1530] shadow-[0_6px_18px_rgba(43,21,48,0.06)]">
                {copy.map.found(searchResults.length)}
              </div>
            </div>
            {searchResults.length ? (
              <div className="max-h-[188px] overflow-y-auto overscroll-contain">
                {searchResults.map((place) => (
                  <div
                    key={place.id}
                    className="flex items-center justify-between gap-3 border-b border-[#f3eadc] px-4 py-3 transition-colors hover:bg-[#fff9f1] last:border-b-0"
                  >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] text-lg shadow-[0_10px_24px_rgba(43,21,48,0.08)]"
                      style={{ background: getPlaceAccent(place.kind).chip }}
                    >
                      {getPlaceAccent(place.kind).icon}
                    </div>
                    <button type="button" onClick={() => previewPlace(place)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-semibold text-[#2b1530]">{place.name}</p>
                        <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.14em] text-[#b56d19]">{place.kind}</p>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => previewPlace(place)}
                    aria-label={`show ${place.name} on the map`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff4e3] text-lg text-[#b56d19]"
                  >
                    ›
                  </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-[#7c6d60]">{copy.map.noResults}</div>
            )}
          </div>
        ) : null}
      </div>

      <div className="absolute right-4 top-20 z-[500] rounded-full bg-white/94 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a7895] shadow-[0_14px_40px_rgba(43,21,48,0.08)] backdrop-blur">
        {cityName}
      </div>

      <div className="h-[440px] w-full overflow-hidden sm:h-[540px]">
        <MapContainer
          center={effectiveCenter}
          zoom={13}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          />
          <MapViewportSync center={effectiveCenter} selectedPlace={focusedPlace} />
          {displayedPlaces.map((place) => (
            <Marker
              key={place.id}
              position={[place.lat, place.lon]}
              icon={buildMarkerIcon(place, focusedPlace?.id === place.id, favoriteIds.includes(place.id), mutualFansByPlace[place.id] ?? [])}
              eventHandlers={{
                click: () => {
                  setSelectedPlaceId(place.id);
                  setPreviewedPlace(place);
                },
              }}
            />
          ))}
        </MapContainer>
      </div>

      {!displayedPlaces.length && !searchLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/45 backdrop-blur-[2px]">
          <div className="rounded-[24px] bg-white/95 px-5 py-4 text-center text-sm text-[#785c42] shadow-[0_20px_40px_rgba(43,21,48,0.08)]">
            {copy.map.noOverlay}
          </div>
        </div>
      ) : null}

      {searchLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-[1px]">
          <Spinner color="warning" />
        </div>
      ) : null}

      {selectedPreviewPlace && selectedPreviewAccent ? (
        <div className="border-t border-[#eadfcf] bg-[#fffaf2] p-4">
          <div className="rounded-[30px] border border-white/80 bg-[#fffaf2]/96 p-4 shadow-[0_24px_60px_rgba(43,21,48,0.12)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1530]"
                  style={{ background: selectedPreviewAccent.chip }}
                >
                  {selectedPreviewPlace.kind}
                </span>
                <span className="text-xs font-medium text-[#7c6d60]">
                  {selectedMutualFans.length ? copy.map.friendSaves(selectedMutualFans.length) : copy.map.newFoodSpot}
                </span>
              </div>
              <p className="mt-3 break-words pr-1 text-[2rem] font-semibold leading-[1.02] text-[#2b1530]">
                {selectedPreviewPlace.name}
              </p>
              <p className="mt-2 max-w-[15rem] text-sm text-[#785c42]">{selectedPreviewPlace.address}</p>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(selectedPreviewPlace)}
              className={`mt-1 flex h-14 w-14 shrink-0 items-center justify-center self-start rounded-[20px] ${
                favoriteIds.includes(selectedPreviewPlace.id) ? "bg-[#FE8A01] text-white" : "bg-[#fff0d9] text-[#d97706]"
              }`}
              aria-label={`heart ${selectedPreviewPlace.name}`}
            >
              <span className="text-2xl">♥</span>
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
                  ? copy.map.savedByOne(selectedMutualFans[0]?.username ?? "")
                  : copy.map.savedByMany(selectedMutualFans[0]?.username ?? "", selectedMutualFans.length - 1)}
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDirections(selectedPreviewPlace)}
              className="flex-1 rounded-full bg-[#2b1530] px-4 py-3 text-sm font-semibold text-white"
            >
              {copy.common.directions}
            </button>
            {onPostFromPlace ? (
              <button
                type="button"
                onClick={() => onPostFromPlace(selectedPreviewPlace)}
                aria-label={`post from ${selectedPreviewPlace.name}`}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff0d9] text-xl font-semibold text-[#d97706]"
              >
                +
              </button>
            ) : null}
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
