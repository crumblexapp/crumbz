"use client";

import { Avatar, Button, Modal, ModalBody, ModalContent, ModalHeader, Spinner } from "@heroui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Language, translations } from "@/lib/i18n";
import Script from "next/script";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

type FavoritePlace = {
  id: string;
  googlePlaceId?: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  address: string;
  priceLevel?: string;
  openingHours?: string[];
  openNow?: boolean | null;
  reviews?: Array<{
    authorName: string;
    rating: number | null;
    text: string;
  }>;
  favoritePlaceIds?: string[];
};

type FriendProfile = {
  email: string;
  name: string;
  username: string;
  picture?: string;
  favoritePlaceIds: string[];
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_MAPS_ERROR = GOOGLE_MAPS_API_KEY ? "" : "missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY";
const PLACE_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

// Warm, branded map style — cream tones, muted roads, no POI clutter
const BRANDED_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f7ede2" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a5c3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f7ede2" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#5a3c22" }] },
  { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#9a7a58" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#f0e4d4" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e8dac8" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#ece0d0" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#8a6a48" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffd9a8" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#f5c080" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#6b4a28" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9a7a58" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#b8d8e8" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d6b8a" }] },
];

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
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function normalizePolishChars(text: string): string {
  return text
    .replace(/[ąĄ]/g, "a")
    .replace(/[ęĘ]/g, "e")
    .replace(/[łŁ]/g, "l")
    .replace(/[óÓ]/g, "o")
    .replace(/[śŚ]/g, "s")
    .replace(/[źŹżŻ]/g, "z")
    .replace(/[ćĆ]/g, "c")
    .replace(/[ńŃ]/g, "n")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function stripPlaceNameSuffixes(name: string): string {
  return name
    .replace(/\s*\|\s*.*$/g, "")
    .replace(/\s*-\s*.*$/g, "")
    .replace(/\s*\(.*\)$/g, "")
    .trim();
}

function distanceInMeters(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isPlaceFavorited(place: FavoritePlace, favoriteIds: string[], favoritePlaces: FavoritePlace[]) {
  if (favoriteIds.includes(place.id)) return true;
  if (place.googlePlaceId && favoriteIds.includes(place.googlePlaceId)) return true;

  const normName = normalizePolishChars(stripPlaceNameSuffixes(place.name));
  for (const fav of favoritePlaces) {
    const normFav = normalizePolishChars(stripPlaceNameSuffixes(fav.name));
    const match = normFav === normName || normFav.includes(normName) || normName.includes(normFav);
    if (match && distanceInMeters(place.lat, place.lon, fav.lat, fav.lon) < 500) return true;
  }
  return false;
}

function findMatchingFavoriteId(place: FavoritePlace, favoriteIds: string[], favoritePlaces: FavoritePlace[]): string | null {
  if (favoriteIds.includes(place.id)) return place.id;
  if (place.googlePlaceId && favoriteIds.includes(place.googlePlaceId)) return place.googlePlaceId;

  const normName = normalizePolishChars(stripPlaceNameSuffixes(place.name));
  for (const fav of favoritePlaces) {
    const normFav = normalizePolishChars(stripPlaceNameSuffixes(fav.name));
    const match = normFav === normName || normFav.includes(normName) || normName.includes(normFav);
    if (match && distanceInMeters(place.lat, place.lon, fav.lat, fav.lon) < 500) return fav.id;
  }
  return null;
}

// Checks both the place's primary ID and googlePlaceId against a friend's saved list
function isPlaceFavoritedByFriend(place: FavoritePlace, friend: FriendProfile): boolean {
  if (friend.favoritePlaceIds.includes(place.id)) return true;
  if (place.googlePlaceId && friend.favoritePlaceIds.includes(place.googlePlaceId)) return true;
  return false;
}

function getPlaceAccent(kind: string) {
  const k = kind.toLowerCase();
  if (k.includes("bakery")) return { bg: "#ff8a65", fg: "#fff7f0", icon: "🥐", chip: "#ffe0d3" };
  if (k.includes("cafe") || k.includes("coffee")) return { bg: "#7b61ff", fg: "#f6f2ff", icon: "☕", chip: "#e5ddff" };
  if (k.includes("dessert") || k.includes("ice")) return { bg: "#ff5fa2", fg: "#fff2f8", icon: "🍰", chip: "#ffd9eb" };
  if (k.includes("bar") || k.includes("pub")) return { bg: "#2dbf8d", fg: "#eefdf7", icon: "🍸", chip: "#d7f7eb" };
  if (k.includes("pizza")) return { bg: "#ef6c3d", fg: "#fff7f0", icon: "🍕", chip: "#ffd8cb" };
  if (k.includes("burger") || k.includes("hamburger")) return { bg: "#b86b34", fg: "#fff6ee", icon: "🍔", chip: "#f3dac8" };
  if (k.includes("sandwich")) return { bg: "#9b7b3e", fg: "#fff9ef", icon: "🥪", chip: "#efe1ba" };
  if (k.includes("meal delivery") || k.includes("takeaway") || k.includes("fast food")) return { bg: "#f2a900", fg: "#fff8e7", icon: "🥡", chip: "#ffe7a7" };
  return { bg: "#fe8a01", fg: "#fff7ea", icon: "🍽", chip: "#ffe5bf" };
}

function getTodayHours(place: FavoritePlace) {
  const hours = place.openingHours ?? [];
  if (!hours.length) return "";
  const todayIndex = (new Date().getDay() + 6) % 7;
  return hours[todayIndex] ?? hours[0] ?? "";
}

function formatPriceLevel(priceLevel: string | undefined, language: Language) {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE": return language === "pl" ? "za darmo" : "free";
    case "PRICE_LEVEL_INEXPENSIVE": return "$";
    case "PRICE_LEVEL_MODERATE": return "$$";
    case "PRICE_LEVEL_EXPENSIVE": return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE": return "$$$$";
    default: return "";
  }
}

function pickDiscoveryReview(place: FavoritePlace) {
  const reviews = place.reviews?.filter((r) => r.text.trim()) ?? [];
  if (!reviews.length) return null;
  const hash = Array.from(place.id).reduce((sum, c, i) => sum + c.charCodeAt(0) * (i + 1), 0);
  return reviews[Math.abs(hash) % reviews.length] ?? null;
}

function deduplicatePlaces(places: FavoritePlace[]): FavoritePlace[] {
  const seen = new Map<string, FavoritePlace>();
  for (const place of places) {
    const key = `${normalizePolishChars(stripPlaceNameSuffixes(place.name))}|${place.lat.toFixed(4)}|${place.lon.toFixed(4)}`;
    const existing = seen.get(key);
    if (existing) {
      if (place.openingHours?.length && !existing.openingHours?.length) {
        seen.set(key, { ...place, favoritePlaceIds: [...(existing.favoritePlaceIds ?? []), ...(place.favoritePlaceIds ?? [])] });
      }
    } else {
      seen.set(key, { ...place, favoritePlaceIds: place.favoritePlaceIds ?? [] });
    }
  }
  return Array.from(seen.values());
}

// Pin-shaped marker: type-colored by default, orange when favorited.
// Friend badge (small heart dot) appears top-right when any friend saved this spot.
function createMarkerIcon(kind: string, isFavorited: boolean, hasFriendSave: boolean) {
  const accent = getPlaceAccent(kind);
  const bgColor = isFavorited ? "#fe8a01" : accent.bg;
  const icon = accent.icon;

  const friendBadge = hasFriendSave
    ? `<circle cx="33" cy="11" r="7.5" fill="white"/>
       <circle cx="33" cy="11" r="6" fill="${isFavorited ? "#ffffff" : "#fe8a01"}"/>
       <text x="33" y="14.5" text-anchor="middle" font-size="8" fill="${isFavorited ? "#fe8a01" : "#ffffff"}">♥</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
    <ellipse cx="22" cy="52" rx="7" ry="2.5" fill="rgba(43,21,48,0.18)"/>
    <path d="M22 2C12.6 2 5 9.6 5 19.5C5 32 22 50 22 50C22 50 39 32 39 19.5C39 9.6 31.4 2 22 2Z" fill="${bgColor}" stroke="white" stroke-width="2.5"/>
    <text x="22" y="24" text-anchor="middle" font-size="14">${icon}</text>
    ${friendBadge}
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44, 54),
    anchor: new google.maps.Point(22, 52),
  };
}

const FOOD_KINDS = [
  "restaurant", "cafe", "bar", "bakery", "fast food", "pizza", "burger",
  "ice cream", "dessert", "pub", "shop", "sandwich", "coffee", "pastry", "deli", "chocolate",
];

function isFoodKind(kind: string) {
  const k = kind.toLowerCase();
  return FOOD_KINDS.some((f) => k.includes(f));
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
  isNewUser = false,
}: {
  center: [number, number];
  language: Language;
  places: FavoritePlace[];
  favoriteIds: string[];
  onToggleFavorite: (place: FavoritePlace) => void;
  onOpenDirections: (place: FavoritePlace) => void;
  onPostFromPlace?: (place: FavoritePlace) => void;
  cityName: string;
  searchCityName?: string;
  friends: FriendProfile[];
  highlightedPlaceId?: string | null;
  isNewUser?: boolean;
}) {
  const copy = translations[language];
  const effectiveCenter = cityCenters[normalizeCityKey(cityName)] ?? center;

  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(DEFAULT_MAPS_ERROR);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FavoritePlace[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searchFallback, setSearchFallback] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [previewedPlace, setPreviewedPlace] = useState<FavoritePlace | null>(null);
  const [placeDetailsLoading, setPlaceDetailsLoading] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [fansModalOpen, setFansModalOpen] = useState(false);

  // Refs avoid stale closures in effects and prevent unnecessary marker rebuilds
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const searchCacheRef = useRef<Map<string, FavoritePlace[]>>(new Map());
  const detailsInFlightRef = useRef<Set<string>>(new Set());

  const foodOnlyPlaces = useMemo(() => {
    return deduplicatePlaces(places.filter((p) => isFoodKind(p.kind)));
  }, [places]);

  // Uses googlePlaceId fallback so friend saved-state is consistent across ID formats
  const mutualFansByPlace = useMemo(
    () =>
      Object.fromEntries(
        foodOnlyPlaces.map((place) => [
          place.id,
          friends.filter((friend) => isPlaceFavoritedByFriend(place, friend)),
        ]),
      ) as Record<string, FriendProfile[]>,
    [foodOnlyPlaces, friends],
  );

  const selectedPlace = useMemo(
    () => searchResults.find((p) => p.id === selectedPlaceId) ?? places.find((p) => p.id === selectedPlaceId) ?? null,
    [places, searchResults, selectedPlaceId],
  );
  const focusedPlace = previewedPlace ?? selectedPlace;
  const selectedMutualFans = useMemo(
    () => (focusedPlace ? friends.filter((friend) => isPlaceFavoritedByFriend(focusedPlace, friend)) : []),
    [focusedPlace, friends],
  );

  const showSearchResults = searchQuery.trim().length >= 2 && !searchLoading;
  const showSelectedPlaceCard = Boolean(focusedPlace) && !showSearchResults;
  const selectedPreviewPlace = showSelectedPlaceCard ? focusedPlace : null;
  const selectedPreviewAccent = selectedPreviewPlace ? getPlaceAccent(selectedPreviewPlace.kind) : null;
  const selectedReview = selectedPreviewPlace ? pickDiscoveryReview(selectedPreviewPlace) : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.gm_authFailure = () => {
      setGoogleMapsError("google maps rejected this browser key");
      setGoogleMapsLoaded(false);
    };
    return () => { delete window.gm_authFailure; };
  }, []);

  useEffect(() => {
    if (!googleMapsLoaded || typeof window === "undefined" || !document.getElementById("google-map")) return;
    try {
      const map = new google.maps.Map(document.getElementById("google-map")!, {
        center: { lat: effectiveCenter[0], lng: effectiveCenter[1] },
        zoom: 13,
        disableDefaultUI: true,
        styles: BRANDED_MAP_STYLES,
      });
      setMapInstance(map);
      setGoogleMapsError("");
    } catch {
      setGoogleMapsError("map failed to load");
    }
  }, [googleMapsLoaded, effectiveCenter]);

  // Rebuild markers whenever places, favorites, friends, or map changes
  useEffect(() => {
    if (!mapInstance || !googleMapsLoaded) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    foodOnlyPlaces.forEach((place) => {
      const isFavorited = isPlaceFavorited(place, favoriteIds, places);
      const hasFriendSave = (mutualFansByPlace[place.id]?.length ?? 0) > 0;
      const icon = createMarkerIcon(place.kind, isFavorited, hasFriendSave);

      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lon },
        map: mapInstance,
        icon,
        zIndex: isFavorited ? 10 : hasFriendSave ? 5 : 1,
      });

      marker.addListener("click", () => {
        setSelectedPlaceId(place.id);
        setPreviewedPlace(place);
        void fetchPlaceDetails(place);
      });

      markersRef.current.set(place.id, marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodOnlyPlaces, favoriteIds, places, mapInstance, googleMapsLoaded, mutualFansByPlace]);

  useEffect(() => {
    if (!highlightedPlaceId) return;
    const next = places.find((p) => p.id === highlightedPlaceId);
    if (next) {
      setSelectedPlaceId(next.id);
      setPreviewedPlace(next);
      void fetchPlaceDetails(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedPlaceId, places]);

  // Fetches full place details (hours, price, reviews) only when the user opens a place.
  // Immediately restores from 30-day localStorage cache to avoid repeat API calls.
  const fetchPlaceDetails = async (place: FavoritePlace) => {
    const placeKey = place.googlePlaceId || place.id;
    if (detailsInFlightRef.current.has(placeKey)) return;

    const cacheKey = `google-place-${placeKey}`;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(cacheKey) : null;
      if (raw) {
        const { data, timestamp } = JSON.parse(raw) as { data: FavoritePlace; timestamp: number };
        if (Date.now() - timestamp < PLACE_CACHE_TTL) {
          // Restore from cache immediately — no API call needed
          setPreviewedPlace((prev) => ({
            ...(prev ?? place),
            priceLevel: data.priceLevel || (prev ?? place).priceLevel,
            openingHours: data.openingHours?.length ? data.openingHours : (prev ?? place).openingHours,
            openNow: data.openNow ?? (prev ?? place).openNow,
            reviews: data.reviews?.length ? data.reviews : (prev ?? place).reviews,
          }));
          return;
        }
      }
    } catch { /* ignore */ }

    detailsInFlightRef.current.add(placeKey);
    setPlaceDetailsLoading(place.id);

    try {
      const params = new URLSearchParams({ name: place.name, lat: String(place.lat), lon: String(place.lon) });
      if (place.googlePlaceId) params.set("placeId", place.googlePlaceId);

      const response = await fetch(`/api/place-details?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();

      if (payload.ok === true && payload.place) {
        const enriched: FavoritePlace = {
          ...place,
          priceLevel: payload.place.priceLevel || place.priceLevel,
          openingHours: payload.place.openingHours?.length ? payload.place.openingHours : place.openingHours,
          openNow: payload.place.openNow ?? place.openNow,
          reviews: payload.place.reviews?.length ? payload.place.reviews : place.reviews,
        };
        setPreviewedPlace((prev) => ({
          ...(prev ?? enriched),
          priceLevel: enriched.priceLevel || (prev ?? enriched).priceLevel,
          openingHours: enriched.openingHours?.length ? enriched.openingHours : (prev ?? enriched).openingHours,
          openNow: enriched.openNow ?? (prev ?? enriched).openNow,
          reviews: enriched.reviews?.length ? enriched.reviews : (prev ?? enriched).reviews,
        }));
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(cacheKey, JSON.stringify({ data: enriched, timestamp: Date.now() }));
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore, keep showing whatever data we have */ } finally {
      setPlaceDetailsLoading(null);
      detailsInFlightRef.current.delete(placeKey);
    }
  };

  // Debounced search — session-cached per query+location to avoid duplicate API calls
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      setSearchFallback(false);
      return;
    }

    const cacheKey = `${query}|${effectiveCenter[0].toFixed(3)}|${effectiveCenter[1].toFixed(3)}`;
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      setSearchResults(cached);
      setSearchLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      setSearchFallback(false);

      try {
        const params = new URLSearchParams({ query, lat: String(effectiveCenter[0]), lon: String(effectiveCenter[1]) });
        if (searchCityName?.trim()) params.set("city", searchCityName);

        const response = await fetch(`/api/places?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({ ok: false, places: [] }))) as {
          ok?: boolean;
          message?: string;
          places?: FavoritePlace[];
        };

        if (payload.ok === false) {
          if (payload.message) setSearchError(payload.message);
          setSearchFallback(true);
        }

        const q = query.toLowerCase();
        const foodResults = (payload.places ?? []).filter((place) => {
          const kind = place.kind.toLowerCase();
          const nameMatch = place.name.toLowerCase().includes(q);
          const kindMatch =
            kind.includes(q) ||
            (q === "coffee" && kind.includes("cafe")) ||
            (q === "cafe" && kind.includes("coffee"));
          return (nameMatch || kindMatch) && isFoodKind(kind);
        });

        const results = deduplicatePlaces(foodResults).slice(0, 25);
        searchCacheRef.current.set(cacheKey, results);
        setSearchResults(results);
        // Do not auto-select or auto-fetch details — user must tap a result
      } catch {
        setSearchResults([]);
        setSearchError("search unavailable right now");
        setSearchFallback(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [effectiveCenter, searchCityName, searchQuery]);

  const previewPlace = (place: FavoritePlace) => {
    setSelectedPlaceId(place.id);
    setPreviewedPlace(place);
    setSearchQuery("");
    setSearchResults([]);
    void fetchPlaceDetails(place);
  };

  const handleGoogleMapsError = () => {
    setGoogleMapsError("google maps script was blocked or could not load");
    setGoogleMapsLoaded(false);
  };

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="lazyOnload"
        onLoad={() => {
          if (typeof window !== "undefined" && window.google?.maps) {
            setGoogleMapsLoaded(true);
            setGoogleMapsError("");
          } else {
            setGoogleMapsError("google maps script loaded, but the api was unavailable");
            setGoogleMapsLoaded(false);
          }
        }}
        onError={handleGoogleMapsError}
      />

      <div className="relative overflow-hidden rounded-[32px] border border-[#e9dcc9] bg-[linear-gradient(180deg,_#fbf7f0_0%,_#f6efe4_100%)] shadow-[0_22px_60px_rgba(254,138,1,0.12)]">
        {!googleMapsLoaded && !googleMapsError ? (
          <div className="flex h-[440px] w-full items-center justify-center sm:h-[540px]">
            <Spinner color="warning" />
          </div>
        ) : null}

        {googleMapsError ? (
          <div className="flex h-[440px] w-full items-center justify-center sm:h-[540px]">
            <p className="text-sm text-[#785c42]">⚠ {googleMapsError}. please refresh.</p>
          </div>
        ) : null}

        {googleMapsLoaded && !googleMapsError ? (
          <>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.55),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(254,138,1,0.14),_transparent_34%)]" />

            {/* Search box */}
            <div className="absolute left-4 right-4 top-4 z-[500]">
              <div className="rounded-[28px] bg-white/94 px-4 py-3 shadow-[0_14px_40px_rgba(43,21,48,0.08)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="text-xl text-[#7a7895]">⌕</span>
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={copy.map.searchPlaceholder}
                      className="w-full bg-transparent text-sm font-medium text-[#2b1530] outline-none placeholder:text-[#b4b1c8]"
                    />
                    <p className="text-xs text-[#8d89ab]">
                      {searchLoading ? copy.map.searchLoading : copy.map.searchIdle}
                    </p>
                  </div>
                  {searchQuery.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                      className="shrink-0 text-[#b4b1c8] hover:text-[#7a7895]"
                      aria-label="clear search"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>

              {showSearchResults ? (
                <div className="mt-3 max-h-[260px] overflow-hidden rounded-[24px] border border-white/70 bg-white/96 shadow-[0_18px_40px_rgba(43,21,48,0.12)] backdrop-blur">
                  <div className="flex items-center justify-between border-b border-[#f3eadc] bg-[#fff8ef] px-4 py-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b56d19]">
                        {searchFallback ? "local results" : copy.map.liveResults}
                      </p>
                      <p className="mt-1 text-xs text-[#7c6d60]">
                        {searchFallback ? "live search unavailable" : copy.map.tapToPreview}
                      </p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b1530] shadow-[0_6px_18px_rgba(43,21,48,0.06)]">
                      {copy.map.found(searchResults.length)}
                    </div>
                  </div>

                  {searchResults.length ? (
                    <div className="max-h-[188px] overflow-y-auto overscroll-contain">
                      {searchResults.map((place) => {
                        const accent = getPlaceAccent(place.kind);
                        const savedByMe = isPlaceFavorited(place, favoriteIds, places);
                        const placeFans = friends.filter((f) => isPlaceFavoritedByFriend(place, f));
                        return (
                          <div
                            key={place.id}
                            className="flex items-center justify-between gap-3 border-b border-[#f3eadc] px-4 py-3 transition-colors hover:bg-[#fff9f1] last:border-b-0"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div
                                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] text-lg shadow-[0_10px_24px_rgba(43,21,48,0.08)]"
                                style={{ background: accent.chip }}
                              >
                                {accent.icon}
                                {savedByMe ? (
                                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#fe8a01] text-[8px] text-white">♥</span>
                                ) : null}
                              </div>
                              <button type="button" onClick={() => previewPlace(place)} className="min-w-0 flex-1 text-left">
                                <p className="truncate text-sm font-semibold text-[#2b1530]">{place.name}</p>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[#b56d19]">{place.kind}</p>
                                  {placeFans.length > 0 ? (
                                    <span className="shrink-0 text-[10px] text-[#fe8a01]">
                                      · {placeFans[0]?.username} {placeFans.length > 1 ? `+${placeFans.length - 1}` : ""} saved
                                    </span>
                                  ) : null}
                                </div>
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
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-sm text-[#7c6d60]">
                      {searchError ? `⚠ ${searchError}` : copy.map.noResults}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* City label */}
            <div className="absolute right-4 top-20 z-[500] rounded-full bg-white/94 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a7895] shadow-[0_14px_40px_rgba(43,21,48,0.08)] backdrop-blur">
              {cityName}
            </div>

            {/* Map canvas */}
            <div className="h-[440px] w-full overflow-hidden sm:h-[540px]">
              <div id="google-map" className="h-full w-full" />
            </div>

            {searchLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-[1px]">
                <Spinner color="warning" />
              </div>
            ) : null}

            {/* Place card */}
            {selectedPreviewPlace && selectedPreviewAccent ? (
              <div className="border-t border-[#eadfcf] bg-[#fffaf2] p-4">
                <div className="rounded-[30px] border border-white/80 bg-[#fffaf2]/96 p-4 shadow-[0_24px_60px_rgba(43,21,48,0.12)] backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b1530]"
                          style={{ background: selectedPreviewAccent.chip }}
                        >
                          {selectedPreviewPlace.kind}
                        </span>
                        {/* Open / closed status badge */}
                        {selectedPreviewPlace.openNow !== null && selectedPreviewPlace.openNow !== undefined ? (
                          <span
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              selectedPreviewPlace.openNow
                                ? "bg-[#d4f8e8] text-[#1a7a4a]"
                                : "bg-[#ffe5e5] text-[#b93535]"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${selectedPreviewPlace.openNow ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
                            {selectedPreviewPlace.openNow ? copy.map.openNow : copy.map.closedNow}
                          </span>
                        ) : null}
                        {selectedMutualFans.length === 0 ? (
                          <span className="text-[11px] font-medium text-[#7c6d60]">{copy.map.newFoodSpot}</span>
                        ) : null}
                      </div>
                      <p className="mt-3 break-words pr-1 text-[1.55rem] font-semibold leading-[1.04] text-[#2b1530]">
                        {selectedPreviewPlace.name}
                      </p>
                      <p className="mt-1.5 max-w-[15rem] text-[13px] leading-5 text-[#785c42]">
                        {selectedPreviewPlace.address}
                      </p>
                    </div>
                    {/* Heart / save button */}
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(selectedPreviewPlace)}
                      className={`mt-1 flex h-14 w-14 shrink-0 items-center justify-center self-start rounded-[20px] transition-colors ${
                        isPlaceFavorited(selectedPreviewPlace, favoriteIds, places)
                          ? "bg-[#FE8A01] text-white"
                          : "bg-[#fff0d9] text-[#d97706]"
                      }`}
                      aria-label={`heart ${selectedPreviewPlace.name}`}
                    >
                      <span className="text-2xl">♥</span>
                    </button>
                  </div>

                  {/* Hours + price row */}
                  <div className={`mt-4 grid gap-2 ${selectedPreviewPlace.priceLevel ? "sm:grid-cols-2" : ""}`}>
                    <div className="rounded-[18px] bg-white/90 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B56D19]">
                        {copy.map.todayHours ?? "today"}
                      </p>
                      <p className="mt-1 text-[13px] font-medium leading-5 text-[#2b1530]">
                        {getTodayHours(selectedPreviewPlace) || copy.map.hoursUnavailable}
                      </p>
                      {placeDetailsLoading === selectedPreviewPlace.id ? (
                        <p className="mt-1 text-[10px] text-[#b4b1c8]">loading details…</p>
                      ) : null}
                    </div>
                    {selectedPreviewPlace.priceLevel ? (
                      <div className="rounded-[18px] bg-white/90 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B56D19]">
                          {copy.map.priceRange}
                        </p>
                        <p className="mt-1 text-[13px] font-medium leading-5 text-[#2b1530]">
                          {formatPriceLevel(selectedPreviewPlace.priceLevel, language)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Discovery review (new users) */}
                  {isNewUser && selectedReview ? (
                    <div className="mt-3 rounded-[20px] bg-[#fff3e1] px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B56D19]">
                          {copy.map.reviewLabel}
                        </p>
                        {selectedReview.rating ? (
                          <span className="text-[11px] font-semibold text-[#7c6d60]">{selectedReview.rating.toFixed(1)}★</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[13px] leading-5 text-[#2b1530]">{selectedReview.text}</p>
                      <p className="mt-2 text-[11px] text-[#7c6d60]">{selectedReview.authorName}</p>
                    </div>
                  ) : null}

                  {/* Friend overlap row */}
                  {selectedMutualFans.length ? (
                    <button
                      type="button"
                      onClick={() => setFansModalOpen(true)}
                      className="mt-4 flex w-full items-center gap-2 rounded-[18px] bg-[#edf5ff] px-2.5 py-2 text-left"
                    >
                      <span className="shrink-0 text-lg">❤️</span>
                      <div className="flex shrink-0 -space-x-2">
                        {selectedMutualFans.slice(0, 3).map((fan) => (
                          <Avatar key={fan.email} src={fan.picture} name={fan.name} className="h-8 w-8 border-2 border-[#edf5ff]" />
                        ))}
                      </div>
                      <p className="min-w-0 flex-1 text-[11px] font-medium leading-4 text-[#34517a]">
                        {selectedMutualFans.length === 1
                          ? copy.map.savedByOne(selectedMutualFans[0]?.username ?? "")
                          : copy.map.savedByMany(selectedMutualFans[0]?.username ?? "", selectedMutualFans.length - 1)}
                      </p>
                    </button>
                  ) : null}

                  {/* Actions */}
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

            {/* Fans modal */}
            <Modal isOpen={fansModalOpen} onOpenChange={setFansModalOpen} placement="bottom-center" scrollBehavior="inside">
              <ModalContent className="bg-[#fffaf2]">
                {(onClose) => (
                  <>
                    <ModalHeader className="flex items-center justify-between gap-3 border-b border-[#FFF0D0]">
                      <div>
                        <p className="text-sm uppercase tracking-[0.16em] text-[#B56D19]">
                          {copy.map.friendSaves(selectedMutualFans.length)}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[#2b1530]">{selectedPreviewPlace?.name}</p>
                      </div>
                      <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                        close
                      </Button>
                    </ModalHeader>
                    <ModalBody className="bg-[#fffaf2] pb-6 pt-5">
                      <div className="grid gap-3">
                        {selectedMutualFans.map((fan) => (
                          <div key={fan.email} className="flex items-center gap-3 rounded-[20px] bg-[#FFF7E8] px-4 py-3">
                            <Avatar src={fan.picture} name={fan.name} className="h-11 w-11 bg-[#FFF0D0] text-[#F5A623]" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#2b1530]">{fan.name}</p>
                              <p className="truncate text-sm text-[#6c7289]">{fan.username}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ModalBody>
                  </>
                )}
              </ModalContent>
            </Modal>
          </>
        ) : null}
      </div>
    </>
  );
}
