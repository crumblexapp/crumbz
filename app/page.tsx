"use client";

import { type FormEvent, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Select,
  SelectItem,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { motion } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabase/client";

const FavoritesMap = dynamic(() => import("@/components/favorites-map"), { ssr: false });

const STORAGE_KEY = "crumbz-active-user-v1";
const ACCOUNTS_KEY = "crumbz-accounts-v1";
const POSTS_KEY = "crumbz-posts-v1";
const INTERACTIONS_KEY = "crumbz-interactions-v1";
const MEDIA_DB_NAME = "crumbz-media-v1";
const MEDIA_STORE_NAME = "post-media";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const ADMIN_EMAIL = "crumbleappco@gmail.com";
const ACCEPTED_VIDEO_TYPES = [".mp4", ".mov", "video/mp4", "video/quicktime"];
const ACCEPTED_IMAGE_TYPES = [".jpg", ".jpeg", ".png", ".heic", "image/jpeg", "image/png", "image/heic", "image/heif"];
const MAX_VIDEO_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const cityOptions = [
  "Warsaw",
  "Kraków",
  "Łódź",
  "Wrocław",
  "Poznań",
  "Gdańsk",
  "Szczecin",
  "Bydgoszcz",
  "Lublin",
  "Katowice",
  "Białystok",
  "Gdynia",
  "Częstochowa",
  "Toruń",
] as const;
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
const fallbackFavoritePlacesByCity: Record<string, FavoritePlace[]> = {
  warsaw: [
    { id: "warsaw-hala-koszyki", name: "hala koszyki", kind: "food hall", lat: 52.2221, lon: 21.0047, address: "koszykowa 63" },
    { id: "warsaw-charlotte", name: "charlotte menora", kind: "cafe", lat: 52.2316, lon: 21.0181, address: "plac grzybowski" },
    { id: "warsaw-lukullus", name: "lukullus", kind: "pastry shop", lat: 52.2362, lon: 21.0174, address: "chmielna area" },
  ],
  krakow: [
    { id: "krakow-handelek", name: "handelek", kind: "restaurant", lat: 50.062, lon: 19.9378, address: "old town" },
    { id: "krakow-camelot", name: "cafe camelot", kind: "cafe", lat: 50.061, lon: 19.9368, address: "sw. tomasza" },
    { id: "krakow-cukiernia-cichowscy", name: "cukiernia cichowscy", kind: "pastry shop", lat: 50.0619, lon: 19.9386, address: "starowislna area" },
  ],
  wroclaw: [
    { id: "wroclaw-dinette", name: "dinette", kind: "restaurant", lat: 51.1097, lon: 17.0313, address: "plac teatralny" },
    { id: "wroclaw-giselle", name: "giselle", kind: "cafe", lat: 51.1111, lon: 17.0337, address: "rynek" },
    { id: "wroclaw-nanan", name: "nanan", kind: "pastry shop", lat: 51.1092, lon: 17.0348, address: "swidnicka area" },
  ],
  gdansk: [
    { id: "gdansk-drukarnia", name: "drukarnia", kind: "cafe", lat: 54.3484, lon: 18.6535, address: "mariacka" },
    { id: "gdansk-ostro", name: "ostro", kind: "restaurant", lat: 54.3514, lon: 18.6522, address: "srodmiescie" },
    { id: "gdansk-umam", name: "umam", kind: "pastry shop", lat: 54.3504, lon: 18.6539, address: "stare miasto" },
  ],
  lodz: [
    { id: "lodz-off-piotrkowska", name: "off piotrkowska", kind: "food hall", lat: 51.7594, lon: 19.4587, address: "piotrkowska 138/140" },
    { id: "lodz-dzielna43", name: "dzielna 43", kind: "restaurant", lat: 51.7648, lon: 19.4555, address: "city center" },
    { id: "lodz-lodzka-bagieta", name: "lodzka bagieta", kind: "bakery", lat: 51.7608, lon: 19.4621, address: "piotrkowska area" },
  ],
  poznan: [
    { id: "poznan-stary-browar-food", name: "stary browar food hall", kind: "food hall", lat: 52.4009, lon: 16.9289, address: "półwiejska" },
    { id: "poznan-la-ruina", name: "la ruina", kind: "ice cream", lat: 52.408, lon: 16.9349, address: "święty marcin area" },
    { id: "poznan-piekarnia-la-farina", name: "la farina", kind: "bakery", lat: 52.4104, lon: 16.9298, address: "centrum" },
  ],
  szczecin: [
    { id: "szczecin-harnaś", name: "harnaś", kind: "restaurant", lat: 53.4307, lon: 14.5521, address: "stare miasto" },
    { id: "szczecin-columbus", name: "columbus coffee", kind: "cafe", lat: 53.4293, lon: 14.5538, address: "aleja niepodległości" },
    { id: "szczecin-bajgle-krola-jana", name: "bajgle króla jana", kind: "bakery", lat: 53.4314, lon: 14.5482, address: "centrum" },
  ],
  bydgoszcz: [
    { id: "bydgoszcz-warzelnia", name: "warzelnia piw", kind: "restaurant", lat: 53.123, lon: 18.0005, address: "wyspa młyńska" },
    { id: "bydgoszcz-karmelowa", name: "karmelowa", kind: "cafe", lat: 53.1224, lon: 18.0058, address: "gdańska" },
    { id: "bydgoszcz-landrynki", name: "landrynki", kind: "ice cream", lat: 53.1239, lon: 18.0089, address: "stary rynek" },
  ],
  lublin: [
    { id: "lublin-perlowa", name: "perłowa pijalnia piwa", kind: "restaurant", lat: 51.2469, lon: 22.561, address: "bernardyńska" },
    { id: "lublin-kawka", name: "kawka", kind: "cafe", lat: 51.2488, lon: 22.5677, address: "krakowskie przedmieście" },
    { id: "lublin-bosko", name: "bosko", kind: "ice cream", lat: 51.2482, lon: 22.5689, address: "stare miasto" },
  ],
  katowice: [
    { id: "katowice-moodro", name: "moodro", kind: "restaurant", lat: 50.2597, lon: 19.021, address: "mariacka" },
    { id: "katowice-kafej", name: "kafej", kind: "cafe", lat: 50.2583, lon: 19.0218, address: "chorzowska area" },
    { id: "katowice-lukaszczek", name: "lukaszczek", kind: "bakery", lat: 50.2658, lon: 19.0152, address: "centrum" },
  ],
  bialystok: [
    { id: "bialystok-sztuka-miesa", name: "sztuka mięsa", kind: "restaurant", lat: 53.1318, lon: 23.1586, address: "rynek kościuszki" },
    { id: "bialystok-fama", name: "fama", kind: "cafe", lat: 53.1328, lon: 23.1574, address: "lipowa" },
    { id: "bialystok-melba", name: "melba", kind: "ice cream", lat: 53.1336, lon: 23.1598, address: "centrum" },
  ],
  gdynia: [
    { id: "gdynia-tlok", name: "tłok", kind: "restaurant", lat: 54.5205, lon: 18.5394, address: "skwer kościuszki" },
    { id: "gdynia-delicje", name: "delicje", kind: "cafe", lat: 54.5213, lon: 18.5397, address: "świętojańska" },
    { id: "gdynia-paczek", name: "pączuś", kind: "bakery", lat: 54.5198, lon: 18.5348, address: "centrum" },
  ],
  czestochowa: [
    { id: "czestochowa-topollino", name: "topollino", kind: "restaurant", lat: 50.8112, lon: 19.1208, address: "aleja najświętszej maryi panny" },
    { id: "czestochowa-cafe-del-corso", name: "cafe del corso", kind: "cafe", lat: 50.8105, lon: 19.1189, address: "śródmieście" },
    { id: "czestochowa-sweet-home", name: "sweet home", kind: "pastry shop", lat: 50.8123, lon: 19.1234, address: "centrum" },
  ],
  torun: [
    { id: "torun-moniuszko", name: "moniuszko", kind: "restaurant", lat: 53.0108, lon: 18.6046, address: "stare miasto" },
    { id: "torun-projekt-nano", name: "projekt nano", kind: "cafe", lat: 53.0131, lon: 18.6038, address: "mostowa" },
    { id: "torun-lenkiewicz", name: "lenkiewicz", kind: "ice cream", lat: 53.0119, lon: 18.6062, address: "rynek staromiejski" },
  ],
};

const schoolsByCity: Record<string, string[]> = {
  warsaw: [
    "University of Warsaw",
    "Warsaw University of Technology",
    "SGH Warsaw School of Economics",
    "Medical University of Warsaw",
    "SWPS University",
    "Vistula University",
    "Lazarski University",
    "Collegium Civitas",
  ],
  krakow: [
    "Jagiellonian University",
    "AGH University of Krakow",
    "Krakow University of Technology",
    "Cracow University of Economics",
    "University of the National Education Commission",
  ],
  wroclaw: [
    "University of Wroclaw",
    "Wroclaw University of Science and Technology",
    "Wroclaw Medical University",
    "Wroclaw University of Economics",
  ],
  gdansk: [
    "University of Gdansk",
    "Gdansk University of Technology",
    "Medical University of Gdansk",
    "SWPS University Gdansk",
  ],
};

const defaultPosts: AppPost[] = [
  {
    id: "chapter-one-soon",
    title: "chapter one coming soon",
    body: "this is where the first real crumbz story lands once the team posts.",
    type: "chapter",
    cta: "first drop loading",
    createdAt: "today",
    mediaKind: "none",
    mediaUrls: [],
    videoRatio: "9:16",
    authorRole: "admin",
    authorName: "crumbz",
    authorEmail: ADMIN_EMAIL,
    schoolName: "",
    weekKey: "",
  },
  {
    id: "student-discount-soon",
    title: "student discounts are warming up",
    body: "flash deals, restaurant collabs, and campus-only offers will show up here first.",
    type: "discount",
    cta: "rewards coming soon",
    createdAt: "today",
    mediaKind: "none",
    mediaUrls: [],
    videoRatio: "9:16",
    authorRole: "admin",
    authorName: "crumbz",
    authorEmail: ADMIN_EMAIL,
    schoolName: "",
    weekKey: "",
  },
];

const fallbackFeedPosts: AppPost[] = [
  {
    id: "chapter-one-coming-soon",
    title: "chapter one coming soon",
    body: "crumbz is getting ready to drop the first real story. stay close, it lands here first.",
    type: "chapter",
    cta: "live soon",
    createdAt: "soon",
    mediaKind: "none",
    mediaUrls: [],
    videoRatio: "9:16",
    authorRole: "admin",
    authorName: "crumbz",
    authorEmail: ADMIN_EMAIL,
    schoolName: "",
    weekKey: "",
  },
];

type AuthMode = "signup" | "login";
type PostType = "chapter" | "story" | "discount" | "ad" | "collab" | "weekly-dump";
type MediaKind = "none" | "photo" | "video" | "carousel";
type VideoRatio = "9:16" | "4:5" | "1:1" | "16:9";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleProfile = {
  name: string;
  email: string;
  picture?: string;
};

type StoredUser = {
  signedIn: boolean;
  googleProfile: GoogleProfile | null;
  profile: {
    fullName: string;
    username: string;
    city: string;
    isStudent: boolean | null;
    schoolName: string;
    friends: string[];
    incomingFriendRequests: string[];
    outgoingFriendRequests: string[];
    favoritePlaceIds: string[];
  };
};

type FavoritePlace = {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  address: string;
};

type AppPost = {
  id: string;
  title: string;
  body: string;
  type: PostType;
  cta: string;
  createdAt: string;
  mediaKind: MediaKind;
  mediaUrls: string[];
  videoRatio: VideoRatio;
  authorRole: "admin" | "student";
  authorName: string;
  authorEmail: string;
  schoolName: string;
  weekKey: string;
};

const defaultPostFields = {
  mediaKind: "none" as MediaKind,
  mediaUrls: [] as string[],
  videoRatio: "9:16" as VideoRatio,
  authorRole: "admin" as const,
  authorName: "crumbz",
  authorEmail: ADMIN_EMAIL,
  schoolName: "",
  weekKey: "",
};

type PostComment = {
  id: string;
  authorEmail: string;
  authorName: string;
  schoolName: string;
  text: string;
  createdAt: string;
  hidden?: boolean;
};

type PostShare = {
  id: string;
  authorEmail: string;
  authorName: string;
  platform: string;
  createdAt: string;
};

type PostLike = {
  authorEmail: string;
  authorName: string;
  createdAt: string;
};

type AppAnnouncement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

type PostInteraction = {
  comments: PostComment[];
  shares: PostShare[];
  likes: PostLike[];
};

type InteractionsMap = Record<string, PostInteraction>;

type GoogleAccounts = {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
      auto_select?: boolean;
      ux_mode?: "popup" | "redirect";
    }) => void;
    renderButton: (
      parent: HTMLElement,
      options: {
        theme?: "outline" | "filled_blue" | "filled_black";
        size?: "large" | "medium" | "small";
        shape?: "pill" | "rectangular" | "circle" | "square";
        text?: "signin_with" | "signup_with" | "continue_with";
        width?: number;
        logo_alignment?: "left" | "center";
      },
    ) => void;
  };
};

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts;
    };
  }
}

const defaultUser: StoredUser = {
  signedIn: false,
  googleProfile: null,
  profile: {
    fullName: "",
    username: "",
    city: "",
    isStudent: null,
    schoolName: "",
    friends: [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    favoritePlaceIds: [],
  },
};

let cachedUserSnapshot = defaultUser;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function readUser(): StoredUser {
  const saved = readJson<Partial<StoredUser>>(STORAGE_KEY, defaultUser);
  const normalized = {
    ...defaultUser,
    ...saved,
    profile: {
      ...defaultUser.profile,
      ...(saved.profile ?? {}),
    },
  };

  if (normalized.googleProfile?.email?.toLowerCase() === "joshrejis@gmail.com" && !normalized.profile.username) {
    normalized.profile.username = "josheats";
  }

  if (typeof normalized.profile.isStudent !== "boolean") {
    normalized.profile.isStudent = normalized.profile.schoolName ? true : null;
  }

  return normalized;
}

function readAccounts() {
  const accounts = readJson<StoredUser[]>(ACCOUNTS_KEY, []);

  return accounts.map((account) => {
    const normalized = {
      ...defaultUser,
      ...account,
      profile: {
        ...defaultUser.profile,
        ...(account.profile ?? {}),
      },
    };

    if (normalized.googleProfile?.email?.toLowerCase() === "joshrejis@gmail.com" && !normalized.profile.username) {
      normalized.profile.username = "josheats";
    }

    if (typeof normalized.profile.isStudent !== "boolean") {
      normalized.profile.isStudent = normalized.profile.schoolName ? true : null;
    }

    return normalized;
  });
}

function readPosts() {
  const savedPosts = readJson<Partial<AppPost>[]>(POSTS_KEY, []);
  return normalizePosts(savedPosts);
}

function serializePostsForStorage(posts: AppPost[]) {
  return posts.map((post) => ({
    ...post,
    // localStorage is too small for base64 image/video payloads, so only persist lightweight post data.
    mediaUrls: post.mediaUrls.filter((url) => !url.startsWith("data:")),
  }));
}

function normalizePosts(posts: Partial<AppPost>[]) {
  return posts.map((post) => ({
    ...defaultPostFields,
    ...post,
    mediaUrls: Array.isArray(post.mediaUrls) ? post.mediaUrls : [],
    videoRatio: post.videoRatio ?? "9:16",
    mediaKind: post.mediaKind ?? "none",
  })) as AppPost[];
}

function readInteractions() {
  const saved = readJson<InteractionsMap>(INTERACTIONS_KEY, {});

  return Object.fromEntries(
    Object.entries(saved).map(([postId, bucket]) => [
      postId,
      {
        comments: bucket.comments ?? [],
        shares: bucket.shares ?? [],
        likes: bucket.likes ?? [],
      },
    ]),
  );
}

function matchesAcceptedType(file: File, acceptedTypes: string[]) {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  return acceptedTypes.some((acceptedType) =>
    acceptedType.startsWith(".") ? fileName.endsWith(acceptedType) : fileType === acceptedType,
  );
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
  }

  return `${Math.ceil(bytes / 1024)}kb`;
}

function formatPlaceKind(kind: string) {
  return kind.replace(/_/g, " ");
}

function normalizeCityKey(cityName: string) {
  return cityName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatProfileMeta(cityName: string, schoolName: string) {
  if (cityName && schoolName) return `${cityName} • ${schoolName}`;
  return cityName || schoolName || "";
}

function renderStudentTabIcon(tabKey: "feed" | "favorites" | "rewards" | "social" | "profile", className: string) {
  switch (tabKey) {
    case "feed":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M3.75 10.5 12 4l8.25 6.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.75 9.75V20h10.5V9.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "favorites":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M11.27 20.12a1.1 1.1 0 0 0 1.46 0c4.17-3.77 6.77-6.12 8-8.2a5.08 5.08 0 0 0-8.08-6 5.08 5.08 0 0 0-8.08 6c1.23 2.08 3.83 4.43 8 8.2Z" />
        </svg>
      );
    case "rewards":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M4 9.25h16v4.5H4z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 9.25v10.5" strokeLinecap="round" />
          <path d="M7.5 13.75V20h9v-6.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.25 7.75c0-1.24.9-2.25 2-2.25 1.78 0 1.75 3.75 1.75 3.75H10.5c-1.24 0-2.25-.67-2.25-1.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.75 7.75c0-1.24-.9-2.25-2-2.25C11.97 5.5 12 9.25 12 9.25h1.5c1.24 0 2.25-.67 2.25-1.5Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "social":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M8.25 11a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.75 12.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.75 18.5a4.5 4.5 0 0 1 9 0" strokeLinecap="round" />
          <path d="M13.5 18.5a3.75 3.75 0 0 1 6.75-2.25" strokeLinecap="round" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 19.25a7 7 0 0 1 14 0" strokeLinecap="round" />
        </svg>
      );
  }
}

function getFallbackFavoritePlaces(cityName: string) {
  return fallbackFavoritePlacesByCity[normalizeCityKey(cityName)] ?? [];
}

function hasAnySharedState(payload: {
  accounts?: unknown;
  posts?: unknown;
  interactions?: unknown;
  announcements?: unknown;
}) {
  return Boolean(
    (Array.isArray(payload.accounts) && payload.accounts.length) ||
      (Array.isArray(payload.posts) && payload.posts.length) ||
      (payload.interactions && typeof payload.interactions === "object" && Object.keys(payload.interactions as object).length) ||
      (Array.isArray(payload.announcements) && payload.announcements.length),
  );
}

function subscribeToUser(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = () => callback();
  window.addEventListener("storage", listener);
  window.addEventListener("crumbz-user-change", listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("crumbz-user-change", listener);
  };
}

function getUserSnapshot() {
  return cachedUserSnapshot;
}

function getUserServerSnapshot() {
  return defaultUser;
}

function persistUser(nextUser: StoredUser) {
  if (typeof window === "undefined") return;

  cachedUserSnapshot = nextUser;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  window.dispatchEvent(new Event("crumbz-user-change"));
}

function parseJwtCredential(credential: string): GoogleProfile | null {
  try {
    const payload = credential.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(normalized);
    const data = JSON.parse(decoded) as {
      name?: string;
      email?: string;
      picture?: string;
    };

    if (!data.name || !data.email) return null;

    return {
      name: data.name,
      email: data.email,
      picture: data.picture,
    };
  } catch {
    return null;
  }
}

function formatNow() {
  return new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function mutateAccountState<TUser = StoredUser>(payload: {
  action: "upsert_account" | "send_friend_request" | "accept_friend_request" | "decline_friend_request" | "remove_friend" | "update_favorites";
  account?: StoredUser;
  currentEmail?: string;
  targetEmail?: string;
  favoritePlaceIds?: string[];
}) {
  const response = await fetch("/api/account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        accounts?: StoredUser[];
        user?: TUser;
        message?: string;
      }
    | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message ?? "account update failed");
  }

  return {
    accounts: data.accounts ?? [],
    user: data.user ?? null,
  };
}

async function seedAccountsToBackend(accounts: StoredUser[]) {
  for (const account of accounts) {
    if (!account.googleProfile?.email) continue;
    await mutateAccountState({
      action: "upsert_account",
      account,
    });
  }
}

function isSunday(date: Date) {
  return date.getDay() === 0;
}

function getSundayKey(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

function getInteractionBucket(interactions: InteractionsMap, postId: string) {
  return interactions[postId] ?? { comments: [], shares: [], likes: [] };
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(MEDIA_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        db.createObjectStore(MEDIA_STORE_NAME, { keyPath: "postId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readPostMediaMap(): Promise<Record<string, string[]>> {
  if (typeof window === "undefined") return Promise.resolve({});

  return openMediaDb()
    .then(
      (db) =>
        new Promise<Record<string, string[]>>((resolve, reject) => {
          const transaction = db.transaction(MEDIA_STORE_NAME, "readonly");
          const store = transaction.objectStore(MEDIA_STORE_NAME);
          const request = store.getAll();

          request.onsuccess = () => {
            const entries = (request.result ?? []) as { postId: string; mediaUrls?: string[] }[];
            resolve(
              Object.fromEntries(
                entries.map((entry) => [entry.postId, Array.isArray(entry.mediaUrls) ? entry.mediaUrls : []]),
              ),
            );
          };
          request.onerror = () => reject(request.error);
        }),
    )
    .catch(() => ({}));
}

function persistPostMedia(posts: AppPost[]): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  return openMediaDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(MEDIA_STORE_NAME, "readwrite");
        const store = transaction.objectStore(MEDIA_STORE_NAME);
        store.clear();

        posts.forEach((post) => {
          if (post.mediaUrls.length) {
            store.put({ postId: post.id, mediaUrls: post.mediaUrls });
          }
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      }),
  );
}

function getVideoAspectClass(ratio: VideoRatio) {
  switch (ratio) {
    case "16:9":
      return "aspect-video";
    case "4:5":
      return "aspect-[4/5]";
    case "1:1":
      return "aspect-square";
    default:
      return "aspect-[9/16]";
  }
}

function PostMediaPreview({ post }: { post: AppPost }) {
  const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];

  if (post.mediaKind === "none" || !mediaUrls.length) {
    return null;
  }

  if (post.mediaKind === "photo") {
    return (
      <Image
        src={mediaUrls[0]}
        alt={post.title}
        className="h-72 w-full rounded-[24px] object-cover ring-1 ring-[#FFF0D0]"
        width={1200}
        height={1200}
      />
    );
  }

  if (post.mediaKind === "video") {
    return (
      <div className={`${getVideoAspectClass(post.videoRatio)} overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0]`}>
        <video src={mediaUrls[0]} controls className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {mediaUrls.map((url) => (
        <Image
          key={url}
          src={url}
          alt={post.title}
          className="h-64 w-56 shrink-0 rounded-[24px] object-cover ring-1 ring-[#FFF0D0]"
          width={900}
          height={1200}
        />
      ))}
    </div>
  );
}

function PostActionIcon({
  label,
  children,
  active = false,
  onPress,
}: {
  label: string;
  children: ReactNode;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className={`flex h-11 w-11 items-center justify-center rounded-full border ${
        active ? "border-[#FFD000] bg-[#FFD000] text-[#2C1A0E]" : "border-[#FFF0D0] bg-white text-[#2C1A0E]"
      }`}
    >
      <span className="flex items-center justify-center">{children}</span>
    </button>
  );
}

export default function Page() {
  const user = useSyncExternalStore(subscribeToUser, getUserSnapshot, getUserServerSnapshot);
  const [accounts, setAccounts] = useState<StoredUser[]>([]);
  const [posts, setPosts] = useState<AppPost[]>([...defaultPosts]);
  const [interactions, setInteractions] = useState<InteractionsMap>({});
  const [announcements, setAnnouncements] = useState<AppAnnouncement[]>([]);
  const [fullName, setFullName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [studentTab, setStudentTab] = useState<"feed" | "favorites" | "rewards" | "social" | "profile">("feed");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [friendQuery, setFriendQuery] = useState("");
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>([]);
  const [favoritePlacesLoading, setFavoritePlacesLoading] = useState(false);
  const [favoritePlacesError, setFavoritePlacesError] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [weeklyDumpNotice, setWeeklyDumpNotice] = useState("");
  const [weeklyDumpCaption, setWeeklyDumpCaption] = useState("");
  const [weeklyDumpMediaUrls, setWeeklyDumpMediaUrls] = useState<string[]>([]);
  const [isUploadingWeeklyDump, setIsUploadingWeeklyDump] = useState(false);
  const [weeklyDumpInputKey, setWeeklyDumpInputKey] = useState(0);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [composerMediaInputKey, setComposerMediaInputKey] = useState(0);
  const [composer, setComposer] = useState({
    title: "",
    body: "",
    cta: "",
    type: "chapter" as PostType,
    mediaKind: "none" as MediaKind,
    mediaUrls: [] as string[],
    videoRatio: "9:16" as VideoRatio,
  });
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const userRef = useRef(user);
  const accountsRef = useRef(accounts);
  const authModeRef = useRef<AuthMode>("signup");
  const hasLoadedDataRef = useRef(false);

  const isAdmin = user.googleProfile?.email?.toLowerCase() === ADMIN_EMAIL;
  const liveAccount =
    accounts.find((account) => account.googleProfile?.email === user.googleProfile?.email) ?? null;
  const liveProfile = liveAccount?.profile ?? user.profile;
  const needsOnboarding =
    user.signedIn &&
    (!liveProfile.fullName ||
      !liveProfile.username ||
      !liveProfile.city ||
      liveProfile.isStudent === null ||
      (liveProfile.isStudent && !liveProfile.schoolName));
  const fullNameValue = fullName ?? liveProfile.fullName ?? user.googleProfile?.name ?? "";
  const usernameValue = username ?? liveProfile.username ?? "";
  const cityValue = city ?? liveProfile.city ?? "";
  const isStudentValue = isStudent ?? liveProfile.isStudent;
  const schoolNameValue = schoolName ?? liveProfile.schoolName ?? "";
  const matchingSchools = schoolsByCity[normalizeCityKey(cityValue)] ?? [];
  const shouldShowSchoolField = isStudentValue === true;
  const isNonStudent = liveProfile.isStudent === false;
  const communityEyebrow = isNonStudent ? "community drops" : "student dumps";
  const communityTitle = isNonStudent ? "weekly food spots from your circle" : "weekly food spots from the community";
  const communityEmpty = isNonStudent
    ? "no friend food posts yet. your own sunday post and your circle's drops will land here."
    : "no friend food dumps yet. your own sunday post and your friends' dumps will land here.";
  const rewardsTitle = isNonStudent ? "perks loading" : "student perks loading";
  const adminAccount =
    accounts.find((account) => account.googleProfile?.email?.toLowerCase() === ADMIN_EMAIL) ?? null;
  const adminProfilePicture = adminAccount?.googleProfile?.picture;
  const cityBreakdown = accounts.reduce<Record<string, number>>((acc, account) => {
    const key = account.profile.city || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const totalSignups = accounts.filter((account) => account.googleProfile?.email?.toLowerCase() !== ADMIN_EMAIL).length;
  const sortedCityBreakdown = Object.entries(cityBreakdown).sort(([, a], [, b]) => b - a);
  const allFoodSpots = Object.values(fallbackFavoritePlacesByCity).flat();
  const foodSpotCounts = allFoodSpots
    .map((place) => ({
      ...place,
      saves: accounts.filter((account) => account.profile.favoritePlaceIds?.includes(place.id)).length,
    }))
    .filter((place) => place.saves > 0)
    .sort((a, b) => b.saves - a.saves)
    .slice(0, 6);
  const latestAnnouncement = announcements[0] ?? null;
  const userManagementRows = [...accounts]
    .filter((account) => account.googleProfile?.email?.toLowerCase() !== ADMIN_EMAIL)
    .sort((a, b) => (b.signedIn ? 1 : 0) - (a.signedIn ? 1 : 0));
  const adminPosts = posts.filter((post) => post.authorRole !== "student");
  const studentWeeklyDumps = posts.filter((post) => post.authorRole === "student" && post.type === "weekly-dump");
  const visibleStudentWeeklyDumps = studentWeeklyDumps.filter((post) => {
    const authorEmail = post.authorEmail.toLowerCase();
    const currentEmail = user.googleProfile?.email?.toLowerCase() ?? "";

    return authorEmail === currentEmail || liveProfile.friends.includes(post.authorEmail);
  });
  const displayPosts = adminPosts.length ? adminPosts : fallbackFeedPosts;
  const today = new Date();
  const canSubmitWeeklyDumpToday = isSunday(today);
  const currentSundayKey = getSundayKey(today);
  const hasSubmittedWeeklyDumpThisWeek = studentWeeklyDumps.some(
    (post) => post.authorEmail === user.googleProfile?.email && post.weekKey === currentSundayKey,
  );
  const totalComments = Object.values(interactions).reduce((sum, item) => sum + item.comments.length, 0);
  const totalShares = Object.values(interactions).reduce((sum, item) => sum + item.shares.length, 0);
  const totalLikes = Object.values(interactions).reduce((sum, item) => sum + item.likes.length, 0);
  const uniqueCommenters = new Set(
    Object.values(interactions).flatMap((item) => item.comments.map((comment) => comment.authorEmail)),
  ).size;
  const uniqueSharers = new Set(
    Object.values(interactions).flatMap((item) => item.shares.map((share) => share.authorEmail)),
  ).size;
  const friendableAccounts = accounts.filter((account) => {
    const email = account.googleProfile?.email ?? "";
    const query = friendQuery.trim().toLowerCase();
    if (!query || email === user.googleProfile?.email) return false;
    if (email.toLowerCase() === ADMIN_EMAIL) return false;
    if (liveProfile.friends.includes(email)) return false;
    if (liveProfile.outgoingFriendRequests.includes(email)) return false;
    if (liveProfile.incomingFriendRequests.includes(email)) return false;

    return (
      email.toLowerCase().includes(query) ||
      account.profile.username.toLowerCase().includes(query)
    );
  });
  const favoritePlaceIds = liveProfile.favoritePlaceIds ?? [];
  const favoriteCityCenter = cityCenters[normalizeCityKey(liveProfile.city)] ?? [52.2297, 21.0122];
  const friendAccounts = accounts.filter((account) => {
    const email = account.googleProfile?.email ?? "";
    return email.toLowerCase() !== ADMIN_EMAIL && liveProfile.friends.includes(email);
  });
  const storyRailItems = [
    {
      id: "crumbz",
      label: "crumbz",
      picture: adminProfilePicture,
      ring: "#F5A623",
      badge: "live",
    },
  ];
  const mutualFansByPlace = Object.fromEntries(
    favoritePlaces.map((place) => [
      place.id,
      friendAccounts
        .filter((account) => account.profile.favoritePlaceIds?.includes(place.id))
        .map((account) => ({
          email: account.googleProfile?.email ?? account.profile.username,
          name: account.profile.fullName,
          username: `@${account.profile.username}`,
          picture: account.googleProfile?.picture,
        })),
    ]),
  ) as Record<string, { email: string; name: string; username: string; picture?: string }[]>;
  const notificationItems = [
    ...announcements.slice(0, 4).map((announcement) => ({
      id: announcement.id,
      kind: "announcement" as const,
      title: announcement.title,
      detail: announcement.body,
      picture: adminProfilePicture,
    })),
    ...liveProfile.incomingFriendRequests
      .map((requestEmail) => {
        const requester = accounts.find((account) => account.googleProfile?.email === requestEmail);
        if (!requester || requestEmail.toLowerCase() === ADMIN_EMAIL) return null;

        return {
          id: `friend-${requestEmail}`,
          kind: "friend_request" as const,
          title: `${requester.profile.fullName} sent you a friend request`,
          detail: `@${requester.profile.username}${requester.profile.schoolName ? ` • ${requester.profile.schoolName}` : ""}`,
          email: requestEmail,
          picture: requester.googleProfile?.picture,
        };
      })
      .filter(Boolean),
    ...adminPosts.slice(0, 6).map((post) => ({
      id: `admin-post-${post.id}`,
      kind: "admin_post" as const,
      title: `crumbz posted ${post.title}`,
      detail: `${post.type} • ${post.createdAt}`,
      postId: post.id,
    })),
    ...visibleStudentWeeklyDumps
      .filter((post) => post.authorEmail !== user.googleProfile?.email)
      .slice(0, 6)
      .map((post) => ({
        id: `friend-dump-${post.id}`,
        kind: "friend_dump" as const,
        title: `${post.authorName} posted a sunday dump`,
        detail: `weekly food dump • ${post.createdAt}`,
        postId: post.id,
        picture: accounts.find((account) => account.googleProfile?.email === post.authorEmail)?.googleProfile?.picture,
      })),
  ].filter(Boolean) as Array<
    | { id: string; kind: "announcement"; title: string; detail: string; picture?: string }
    | { id: string; kind: "friend_request"; title: string; detail: string; email: string; picture?: string }
    | { id: string; kind: "admin_post" | "friend_dump"; title: string; detail: string; postId: string; picture?: string }
  >;
  const notificationCount = notificationItems.length;

  const renderFeedCard = (post: AppPost) => {
    const bucket = getInteractionBucket(interactions, post.id);
    const visibleComments = bucket.comments.filter((comment) => !comment.hidden);
    const hasLiked = bucket.likes.some((like) => like.authorEmail === user.googleProfile?.email);
    const isStudentPost = post.authorRole === "student";

    return (
      <Card
        id={`post-${post.id}`}
        key={post.id}
        className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]"
      >
        <CardHeader className="items-start gap-3 px-5 pb-0 pt-5">
          <Avatar
            src={
              isStudentPost
                ? accounts.find((account) => account.googleProfile?.email === post.authorEmail)?.googleProfile?.picture
                : adminProfilePicture
            }
            name={isStudentPost ? post.authorName : "C"}
            className={isStudentPost ? "bg-[#FFF0D0] text-[#F5A623]" : "bg-[#F5A623] text-white"}
          />
          <div className="flex-1">
            <p className="font-semibold text-[#2C1A0E]">{isStudentPost ? post.authorName : "crumbz"}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
              {isStudentPost ? `weekly food dump • ${post.createdAt}` : `${post.type} • ${post.createdAt}`}
            </p>
            {isStudentPost ? <p className="mt-1 text-xs text-[#2C1A0E]">{post.schoolName}</p> : null}
          </div>
          <Chip className="bg-[#FFF0D0] text-[#F5A623]">{post.cta}</Chip>
        </CardHeader>
        <CardBody className="gap-4 p-5">
          <div className="rounded-[24px] bg-[linear-gradient(180deg,_#FFF0D0_0%,_#ffffff_100%)] p-5 ring-1 ring-[#FFF0D0]">
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-2xl text-[#2C1A0E]">{post.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#2C1A0E]">{post.body}</p>
          </div>

          {post.mediaKind !== "none" ? (
            post.mediaUrls.length ? (
              <PostMediaPreview post={post} />
            ) : (
              <div className="rounded-[18px] border border-dashed border-[#FFF0D0] bg-white px-3 py-4 text-sm text-[#2C1A0E]">
                this post’s media needs one re-upload from the admin side.
              </div>
            )
          ) : null}

          <div className="flex items-center gap-3">
            <PostActionIcon label="like post" active={hasLiked} onPress={() => toggleLike(post.id)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 20s-6.5-4.35-8.5-7.8C1.7 9 3.2 5.5 7 5.5c2 0 3.3 1.15 4 2.2.7-1.05 2-2.2 4-2.2 3.8 0 5.3 3.5 3.5 6.7C18.5 15.65 12 20 12 20Z"
                  fill={hasLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </PostActionIcon>
            <PostActionIcon
              label="comment on post"
              onPress={() => {
                setOpenCommentPostId((current) => (current === post.id ? null : post.id));
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 18.5L3.5 20V6.8C3.5 5.8 4.3 5 5.3 5h13.4c1 0 1.8.8 1.8 1.8v8.4c0 1-.8 1.8-1.8 1.8H6Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </PostActionIcon>
            <PostActionIcon
              label="share post"
              onPress={() => {
                void sharePost(post.id);
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 4 11 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path
                  d="m20 4-6 16-3.4-6.6L4 10l16-6Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </PostActionIcon>
          </div>

          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
            <span className="rounded-full bg-[#FFF0D0] px-3 py-2">{bucket.likes.length} likes</span>
            <span className="rounded-full bg-[#FFF0D0] px-3 py-2">{visibleComments.length} comments</span>
            <span className="rounded-full bg-[#FFF0D0] px-3 py-2">{bucket.shares.length} shares</span>
          </div>

          <div className="space-y-3">
            {visibleComments.map((comment) => (
              <div key={comment.id} className="rounded-[18px] bg-[#FFF0D0] p-3">
                <p className="text-sm font-semibold text-[#2C1A0E]">
                  {comment.authorName} • {comment.schoolName}
                </p>
                <p className="mt-1 text-sm text-[#2C1A0E]">{comment.text}</p>
              </div>
            ))}

            {openCommentPostId === post.id ? (
              <form className="flex gap-2" onSubmit={(event) => addComment(event, post.id)}>
                <Input
                  aria-label={`comment on ${post.title}`}
                  radius="full"
                  placeholder="comment on this post"
                  value={commentDrafts[post.id] ?? ""}
                  onValueChange={(value) =>
                    setCommentDrafts((current) => ({
                      ...current,
                      [post.id]: value,
                    }))
                  }
                  classNames={{ inputWrapper: "bg-[#FFF0D0] border border-[#FFF0D0]" }}
                />
                <Button type="submit" radius="full" className="bg-[#F5A623] text-white">
                  send
                </Button>
              </form>
            ) : null}
          </div>
        </CardBody>
      </Card>
    );
  };

  const syncSharedState = ({
    nextPosts,
    nextInteractions,
    nextAnnouncements,
  }: {
    nextPosts?: AppPost[];
    nextInteractions?: InteractionsMap;
    nextAnnouncements?: AppAnnouncement[];
  }) => {
    void fetch("/api/state", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(nextPosts ? { posts: serializePostsForStorage(nextPosts) } : {}),
        ...(nextInteractions ? { interactions: nextInteractions } : {}),
        ...(nextAnnouncements ? { announcements: nextAnnouncements } : {}),
      }),
    }).catch(() => undefined);
  };

  useEffect(() => {
    const nextUser = readUser();
    const nextAccounts = readAccounts();
    const nextPosts = readPosts();
    const nextInteractions = readInteractions();

    cachedUserSnapshot = nextUser;
    window.dispatchEvent(new Event("crumbz-user-change"));
    void readPostMediaMap().then((mediaMap) => {
      const mergedPosts = nextPosts.map((post) => ({
        ...post,
        mediaUrls: post.mediaUrls.length ? post.mediaUrls : mediaMap[post.id] ?? [],
      }));

      queueMicrotask(() => {
        setAccounts(nextAccounts);
        setPosts(mergedPosts);
        setInteractions(nextInteractions);
        setAnnouncements([]);
        setUsername(nextUser.profile.username || (nextUser.googleProfile?.email?.toLowerCase() === "joshrejis@gmail.com" ? "josheats" : ""));
        hasLoadedDataRef.current = true;
      });
    });

    void fetch("/api/state", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.ok) return;

        queueMicrotask(() => {
          const serverHasState = hasAnySharedState(payload);

          if (!serverHasState) {
            void seedAccountsToBackend(nextAccounts).catch(() => undefined);
            syncSharedState({
              nextPosts,
              nextInteractions: nextInteractions,
            });
          } else {
            setAccounts((payload.accounts ?? []) as StoredUser[]);
            setPosts(normalizePosts((payload.posts ?? []) as Partial<AppPost>[]));
            setInteractions((payload.interactions ?? {}) as InteractionsMap);
            setAnnouncements((payload.announcements ?? []) as AppAnnouncement[]);
          }
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail || !accounts.length) return;

    const freshAccount = accounts.find((account) => account.googleProfile?.email === currentEmail);
    if (!freshAccount) return;

    const currentSerialized = JSON.stringify(user);
    const freshSerialized = JSON.stringify(freshAccount);
    if (currentSerialized === freshSerialized) return;

    persistUser(freshAccount);
  }, [accounts, user]);

  useEffect(() => {
    authModeRef.current = authMode;
  }, [authMode]);

  useEffect(() => {
    if (!user.signedIn || isAdmin) return;

    const cityKey = normalizeCityKey(user.profile.city);
    const center = cityCenters[cityKey];
    if (!center) {
      setFavoritePlaces(getFallbackFavoritePlaces(cityKey));
      setFavoritePlacesError("");
      return;
    }

    const controller = new AbortController();
    const loadPlaces = async () => {
      setFavoritePlacesLoading(true);
      setFavoritePlacesError("");

      const query = `
        [out:json][timeout:25];
        (
          node["amenity"~"restaurant|cafe|fast_food|ice_cream|bar|pub|food_court"](around:3500,${center[0]},${center[1]});
          way["amenity"~"restaurant|cafe|fast_food|ice_cream|bar|pub|food_court"](around:3500,${center[0]},${center[1]});
          node["shop"~"bakery|pastry|coffee|confectionery|tea|deli|cheese|chocolate"](around:3500,${center[0]},${center[1]});
          way["shop"~"bakery|pastry|coffee|confectionery|tea|deli|cheese|chocolate"](around:3500,${center[0]},${center[1]});
        );
        out center 80;
      `;

      try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: query,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("places request failed");
        }

        const payload = (await response.json()) as {
          elements?: Array<{
            id: number;
            lat?: number;
            lon?: number;
            center?: { lat: number; lon: number };
            tags?: Record<string, string>;
          }>;
        };

        const nextPlaces = (payload.elements ?? [])
          .map((element) => {
            const tags = element.tags ?? {};
            const lat = element.lat ?? element.center?.lat;
            const lon = element.lon ?? element.center?.lon;
            const name = tags.name;
            if (!lat || !lon || !name) return null;

            const street = tags["addr:street"];
            const houseNumber = tags["addr:housenumber"];
            const address = [street, houseNumber].filter(Boolean).join(" ") || user.profile.city;

            return {
              id: `place-${element.id}`,
              name,
              kind: formatPlaceKind(tags.amenity ?? tags.shop ?? "food spot"),
              lat,
              lon,
              address,
            };
          })
          .filter((place): place is FavoritePlace => Boolean(place))
          .filter((place, index, list) => list.findIndex((item) => item.name === place.name) === index);

        setFavoritePlaces(nextPlaces.length ? nextPlaces : getFallbackFavoritePlaces(cityKey));
      } catch {
        setFavoritePlaces(getFallbackFavoritePlaces(cityKey));
        setFavoritePlacesError("live map spots are loading from the fallback list right now.");
      } finally {
        setFavoritePlacesLoading(false);
      }
    };

    void loadPlaces();

    return () => controller.abort();
  }, [isAdmin, user.profile.city, user.signedIn]);

  useEffect(() => {
    if (!hasLoadedDataRef.current || typeof window === "undefined") return;
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (!hasLoadedDataRef.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(POSTS_KEY, JSON.stringify(serializePostsForStorage(posts)));
      void persistPostMedia(posts)
        .then(() => {
          queueMicrotask(() => setStorageNotice(""));
        })
        .catch(() => {
          queueMicrotask(() =>
            setStorageNotice("media couldn’t be saved on this browser, so uploads may disappear after refresh."),
          );
        });
    } catch {
      queueMicrotask(() =>
        setStorageNotice("media is too big for browser storage, so uploads stay live until refresh."),
      );
    }
  }, [posts]);

  useEffect(() => {
    if (!hasLoadedDataRef.current || typeof window === "undefined") return;
    window.localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(interactions));
  }, [interactions]);

  useEffect(() => {
    if (!hasLoadedDataRef.current || posts.length > 0) return;

    setInteractions((current) => {
      const next = Object.fromEntries(
        Object.entries(current).map(([postId, bucket]) => [
          postId,
          {
            ...bucket,
            shares: [],
          },
        ]),
      );

      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [posts.length]);

  useEffect(() => {
    if (!hasLoadedDataRef.current) return;

    const timeout = window.setTimeout(() => {
      syncSharedState({
        nextPosts: posts,
        nextInteractions: interactions,
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [posts, interactions]);

  useEffect(() => {
    if (!user.signedIn) return;

    const syncFromServer = () => {
      void fetch("/api/state", { cache: "no-store" })
        .then((response) => response.json())
        .then((payload) => {
          if (!payload?.ok) return;

          const serverHasState = hasAnySharedState(payload);

          if (!serverHasState) {
            const localAccounts = readAccounts();
            const localPosts = readPosts();
            const localInteractions = readInteractions();
            void seedAccountsToBackend(localAccounts).catch(() => undefined);
            syncSharedState({
              nextPosts: localPosts,
              nextInteractions: localInteractions,
              nextAnnouncements: announcements,
            });
            return;
          }

          setAccounts((payload.accounts ?? []) as StoredUser[]);
          setPosts(normalizePosts((payload.posts ?? []) as Partial<AppPost>[]));
          setInteractions((payload.interactions ?? {}) as InteractionsMap);
          setAnnouncements((payload.announcements ?? []) as AppAnnouncement[]);
        })
        .catch(() => undefined);
    };

    syncFromServer();
    const interval = window.setInterval(syncFromServer, 5000);

    return () => window.clearInterval(interval);
  }, [announcements, user.signedIn]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const existingScript = document.querySelector('script[data-google-identity="true"]');

    const setupGoogle = () => {
      if (!window.google?.accounts.id || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: GoogleCredentialResponse) => {
          const profile = response.credential ? parseJwtCredential(response.credential) : null;
          if (!profile) {
            setError("google sign-in didn’t come through. try again.");
            return;
          }

          const currentMode = authModeRef.current;
          const sharedAccounts = await fetch("/api/state", { cache: "no-store" })
            .then((result) => result.json())
            .then((payload) => (payload?.ok ? (payload.accounts as StoredUser[]) : null))
            .catch(() => null);

          const sourceAccounts =
            sharedAccounts?.length ? sharedAccounts : accountsRef.current.length ? accountsRef.current : readAccounts();
          const existingAccount =
            sourceAccounts.find((account) => account.googleProfile?.email?.toLowerCase() === profile.email.toLowerCase()) ?? null;

          setError("");

          if (currentMode === "login") {
            if (!existingAccount) {
              setError("that google account hasn’t signed up yet. use sign up first.");
              return;
            }

            const nextSignedInAccount = { ...existingAccount, signedIn: true };
            const result = await mutateAccountState({
              action: "upsert_account",
              account: nextSignedInAccount,
            }).catch(() => null);

            persistUser((result?.user as StoredUser | null) ?? nextSignedInAccount);
            if (result?.accounts?.length) {
              setAccounts(result.accounts);
            } else if (sharedAccounts?.length) {
              setAccounts(sharedAccounts);
            }
            setFullName(null);
            setUsername(null);
            setCity(null);
            setIsStudent(null);
            setSchoolName(null);
            return;
          }

          if (existingAccount) {
            setError("that google account already exists. use log in instead.");
            return;
          }

          const currentUser = userRef.current;
          const nextSignedUpAccount = {
            ...currentUser,
            signedIn: true,
            googleProfile: profile,
            profile: {
              ...currentUser.profile,
              fullName: currentUser.profile.fullName || profile.name,
              username:
                currentUser.profile.username ||
                (profile.email.toLowerCase() === "joshrejis@gmail.com" ? "josheats" : ""),
            },
          };
          const result = await mutateAccountState({
            action: "upsert_account",
            account: nextSignedUpAccount,
          }).catch(() => null);

          if (result?.accounts?.length) {
            setAccounts(result.accounts);
          } else if (sharedAccounts?.length) {
            setAccounts(sharedAccounts);
          }
          persistUser((result?.user as StoredUser | null) ?? nextSignedUpAccount);
          setFullName(profile.name);
          setUsername((current) => current ?? (profile.email.toLowerCase() === "joshrejis@gmail.com" ? "josheats" : ""));
          setIsStudent(null);
        },
        auto_select: false,
        ux_mode: "popup",
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: authMode === "signup" ? "signup_with" : "signin_with",
        width: 320,
        logo_alignment: "left",
      });

      setGoogleReady(true);
    };

    if (existingScript) {
      setupGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = setupGoogle;
    document.body.appendChild(script);
  }, [authMode]);

  useEffect(() => {
    if (typeof window === "undefined" || !user.signedIn || isAdmin) return;

    const postId = new URLSearchParams(window.location.search).get("post");
    if (!postId) return;

    const timeout = window.setTimeout(() => {
      setStudentTab("feed");
      const target = document.getElementById(`post-${postId}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [displayPosts, isAdmin, user.signedIn]);

  const finishOnboarding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = fullNameValue.trim();
    const trimmedUsername = usernameValue.trim().toLowerCase();
    const trimmedCity = cityValue.trim();
    const trimmedSchool = schoolNameValue.trim();

    if (!trimmedName || !trimmedUsername || !trimmedCity || isStudentValue === null || (isStudentValue && !trimmedSchool)) {
      setError("drop your full name, username, city, and whether you're a student so we can finish your profile.");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
      setError("username should be 3-20 characters using letters, numbers, or underscores.");
      return;
    }

    const usernameTaken = accounts.some(
      (account) =>
        account.profile.username.toLowerCase() === trimmedUsername &&
        account.googleProfile?.email !== user.googleProfile?.email,
    );

    if (usernameTaken) {
      setError("that username is already taken. pick another one.");
      return;
    }

    const nextUser = {
      ...user,
      profile: {
        fullName: trimmedName,
        username: trimmedUsername,
        city: trimmedCity,
        isStudent: isStudentValue,
        schoolName: isStudentValue ? trimmedSchool : "",
        friends: user.profile.friends,
        incomingFriendRequests: user.profile.incomingFriendRequests,
        outgoingFriendRequests: user.profile.outgoingFriendRequests,
        favoritePlaceIds: user.profile.favoritePlaceIds,
      },
    };

    void mutateAccountState({
      action: "upsert_account",
      account: nextUser,
    })
      .then((result) => {
        setAccounts(result.accounts);
        persistUser((result.user as StoredUser | null) ?? nextUser);
        setError("");
      })
      .catch(() => {
        setError("profile save didn’t stick. try once more.");
      });
  };

  const signOut = () => {
    persistUser(defaultUser);
    setFullName(null);
    setUsername(null);
    setCity(null);
    setIsStudent(null);
    setSchoolName(null);
    setError("");
    setAuthMode("signup");
    setShowWelcomeScreen(true);
  };

  const addFriend = (friendEmail: string) => {
    if (!friendEmail || friendEmail === user.googleProfile?.email) return;
    if (user.profile.friends.includes(friendEmail) || user.profile.outgoingFriendRequests.includes(friendEmail)) return;
    void mutateAccountState({
      action: "send_friend_request",
      currentEmail: user.googleProfile?.email ?? "",
      targetEmail: friendEmail,
    })
      .then((result) => {
        setAccounts(result.accounts);
        if (result.user) {
          persistUser(result.user as StoredUser);
        }
        setFriendQuery("");
      })
      .catch(() => {
        setError("friend request didn’t stick. try again.");
      });
  };

  const acceptFriendRequest = (requesterEmail: string) => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail) return;

    void mutateAccountState({
      action: "accept_friend_request",
      currentEmail,
      targetEmail: requesterEmail,
    })
      .then((result) => {
        setAccounts(result.accounts);
        if (result.user) {
          persistUser(result.user as StoredUser);
        }
      })
      .catch(() => {
        setError("accepting that friend request failed. try once more.");
      });
  };

  const declineFriendRequest = (requesterEmail: string) => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail) return;

    void mutateAccountState({
      action: "decline_friend_request",
      currentEmail,
      targetEmail: requesterEmail,
    })
      .then((result) => {
        setAccounts(result.accounts);
        if (result.user) {
          persistUser(result.user as StoredUser);
        }
      })
      .catch(() => {
        setError("declining that request failed. try again.");
      });
  };

  const removeFriend = (friendEmail: string) => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail) return;

    void mutateAccountState({
      action: "remove_friend",
      currentEmail,
      targetEmail: friendEmail,
    })
      .then((result) => {
        setAccounts(result.accounts);
        if (result.user) {
          persistUser(result.user as StoredUser);
        }
      })
      .catch(() => {
        setError("removing that friend failed. try again.");
      });
  };

  const toggleFavoritePlace = (placeId: string) => {
    const nextFavoritePlaceIds = favoritePlaceIds.includes(placeId)
      ? favoritePlaceIds.filter((id) => id !== placeId)
      : [...favoritePlaceIds, placeId];

    void mutateAccountState({
      action: "update_favorites",
      currentEmail: user.googleProfile?.email ?? "",
      favoritePlaceIds: nextFavoritePlaceIds,
    })
      .then((result) => {
        setAccounts(result.accounts);
        if (result.user) {
          persistUser(result.user as StoredUser);
        }
      })
      .catch(() => {
        setFavoritePlacesError("saving that spot didn’t stick. try again.");
      });
  };

  const sendAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = announcementTitle.trim();
    const trimmedBody = announcementBody.trim();
    if (!trimmedTitle || !trimmedBody) return;

    const nextAnnouncements = [
      {
        id: `announcement-${Date.now()}`,
        title: trimmedTitle,
        body: trimmedBody,
        createdAt: formatNow(),
      },
      ...announcements,
    ].slice(0, 12);

    setAnnouncements(nextAnnouncements);
    syncSharedState({ nextAnnouncements });
    setAnnouncementTitle("");
    setAnnouncementBody("");
  };

  const resetComposer = () => {
    setEditingPostId(null);
    setStorageNotice("");
    setComposer({
      title: "",
      body: "",
      cta: "",
      type: "chapter",
      mediaKind: "none",
      mediaUrls: [],
      videoRatio: "9:16",
    });
    setComposerMediaInputKey((current) => current + 1);
  };

  const createPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!composer.title.trim() || !composer.body.trim()) {
      return;
    }

    if (isUploadingMedia) {
      setStorageNotice("media is still uploading. wait a second, then publish.");
      return;
    }

    if (composer.mediaKind !== "none" && !composer.mediaUrls.length) {
      setStorageNotice("add the media file first so students can actually see it.");
      return;
    }

    const nextPost: AppPost = {
      id: editingPostId ?? `${Date.now()}`,
      title: composer.title.trim(),
      body: composer.body.trim(),
      cta: composer.cta.trim() || "live now",
      type: composer.type,
      createdAt: editingPostId
        ? posts.find((post) => post.id === editingPostId)?.createdAt ?? formatNow()
        : formatNow(),
      mediaKind: composer.mediaKind,
      mediaUrls: composer.mediaUrls,
      videoRatio: composer.videoRatio,
      authorRole: "admin",
      authorName: "crumbz",
      authorEmail: ADMIN_EMAIL,
      schoolName: "",
      weekKey: "",
    };

    setPosts((current) =>
      editingPostId
        ? current.map((post) => (post.id === editingPostId ? nextPost : post))
        : [nextPost, ...current],
    );
    resetComposer();
  };

  const submitWeeklyDump = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const authorEmail = user.googleProfile?.email;
    if (!authorEmail) return;

    if (!canSubmitWeeklyDumpToday) {
      setWeeklyDumpNotice("weekly food dumps open on sunday only.");
      return;
    }

    if (hasSubmittedWeeklyDumpThisWeek) {
      setWeeklyDumpNotice("you already dropped this sunday’s food dump.");
      return;
    }

    if (isUploadingWeeklyDump) {
      setWeeklyDumpNotice("your photos are still uploading. wait a sec, then submit.");
      return;
    }

    if (!weeklyDumpMediaUrls.length) {
      setWeeklyDumpNotice("add up to 10 food photos first.");
      return;
    }

    const firstName = user.profile.fullName.split(" ")[0] || user.profile.username || "student";
    const caption = weeklyDumpCaption.trim();

    const nextPost: AppPost = {
      id: `weekly-dump-${authorEmail}-${currentSundayKey}`,
      title: `${firstName}'s weekly food dump`,
      body: caption || formatProfileMeta(user.profile.city, user.profile.schoolName),
      cta: "sunday dump",
      type: "weekly-dump",
      createdAt: formatNow(),
      mediaKind: "carousel",
      mediaUrls: weeklyDumpMediaUrls,
      videoRatio: "4:5",
      authorRole: "student",
      authorName: user.profile.fullName,
      authorEmail,
      schoolName: user.profile.schoolName,
      weekKey: currentSundayKey,
    };

    setPosts((current) => [nextPost, ...current.filter((post) => post.id !== nextPost.id)]);
    setWeeklyDumpCaption("");
    setWeeklyDumpMediaUrls([]);
    setWeeklyDumpNotice("your weekly dump is live.");
    setWeeklyDumpInputKey((current) => current + 1);
  };

  const startEditingPost = (post: AppPost) => {
    setEditingPostId(post.id);
    setComposer({
      title: post.title,
      body: post.body,
      cta: post.cta,
      type: post.type,
      mediaKind: post.mediaKind,
      mediaUrls: post.mediaUrls,
      videoRatio: post.videoRatio,
    });
  };

  const cancelEditingPost = () => {
    resetComposer();
  };

  const deletePost = (postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    setInteractions((current) => {
      const next = { ...current };
      delete next[postId];
      return next;
    });

    if (editingPostId === postId) {
      cancelEditingPost();
    }
  };

  const uploadMediaFiles = async (
    files: FileList | null,
    options: {
      mediaKind: MediaKind;
      maxFiles?: number;
      skipSizeLimit?: boolean;
      setNotice: (message: string) => void;
    },
  ) => {
    if (!files?.length) return null;

    const fileList = Array.from(files);
    if (options.maxFiles && fileList.length > options.maxFiles) {
      options.setNotice(`keep it to ${options.maxFiles} photos max in one dump.`);
      return null;
    }

    const expectedTypes = options.mediaKind === "video" ? ACCEPTED_VIDEO_TYPES : ACCEPTED_IMAGE_TYPES;
    const hasInvalidFile = fileList.some((file) => !matchesAcceptedType(file, expectedTypes));
    const maxFileSize = options.mediaKind === "video" ? MAX_VIDEO_FILE_SIZE_BYTES : MAX_IMAGE_FILE_SIZE_BYTES;
    const oversizedFile = options.skipSizeLimit ? null : fileList.find((file) => file.size > maxFileSize);

    if (hasInvalidFile) {
      options.setNotice(
        options.mediaKind === "video" ? "videos need to be mp4 or mov." : "photos need to be jpg, jpeg, png, or heic.",
      );
      return null;
    }

    if (oversizedFile) {
      options.setNotice(
        options.mediaKind === "video"
          ? `that video is ${formatFileSize(oversizedFile.size)}. keep videos under ${formatFileSize(MAX_VIDEO_FILE_SIZE_BYTES)} for now.`
          : `that image is ${formatFileSize(oversizedFile.size)}. keep photos under ${formatFileSize(MAX_IMAGE_FILE_SIZE_BYTES)} for now.`,
      );
      return null;
    }

    const filePayloads = await Promise.all(
      fileList.map(async (file) => {
        const isHeic =
          matchesAcceptedType(file, [".heic", ".heif"]) || ["image/heic", "image/heif"].includes(file.type.toLowerCase());

        if (!isHeic) {
          return file;
        }

        const { default: heic2any } = await import("heic2any");
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.9,
        });
        const convertedBlob = Array.isArray(converted) ? converted[0] : converted;

        return new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
          type: "image/jpeg",
        });
      }),
    );

    const response = await fetch("/api/upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: filePayloads.map((file) => ({
          name: file.name,
          contentType: file.type || "application/octet-stream",
        })),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          uploads?: { path: string; token: string; publicUrl: string; contentType: string }[];
          message?: string;
        }
      | null;

    if (!response.ok || !payload?.ok || !payload.uploads?.length) {
      options.setNotice(payload?.message ?? "upload failed. try a smaller file or check supabase setup.");
      return null;
    }

    const uploadResults = await Promise.all(
      filePayloads.map(async (file, index) => {
        const target = payload.uploads?.[index];
        if (!target) {
          throw new Error("upload target missing");
        }

        const { error } = await supabaseBrowser.storage
          .from("crumbz-media")
          .uploadToSignedUrl(target.path, target.token, file, {
            contentType: file.type || target.contentType,
            upsert: true,
          });

        if (error) {
          throw error;
        }

        return target.publicUrl;
      }),
    ).catch((error: { message?: string }) => {
      options.setNotice(error.message ?? "upload failed while sending the file to storage.");
      return null;
    });

    return uploadResults?.length ? uploadResults : null;
  };

  const handleComposerFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setIsUploadingMedia(true);
    setStorageNotice("uploading media...");

    try {
      const uploadResults = await uploadMediaFiles(files, {
        mediaKind: composer.mediaKind,
        setNotice: setStorageNotice,
      });

      if (!uploadResults?.length) {
        return;
      }

      setComposer((current) => ({
        ...current,
        mediaUrls: uploadResults,
      }));
      setStorageNotice("media uploaded. now publish the post.");
      setComposerMediaInputKey((current) => current + 1);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleWeeklyDumpFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    if (!canSubmitWeeklyDumpToday) {
      setWeeklyDumpNotice("weekly dumps only open on sunday.");
      setWeeklyDumpInputKey((current) => current + 1);
      return;
    }

    setIsUploadingWeeklyDump(true);
    setWeeklyDumpNotice("uploading your food dump...");

    try {
      const uploadResults = await uploadMediaFiles(files, {
        mediaKind: "carousel",
        maxFiles: 7,
        skipSizeLimit: true,
        setNotice: setWeeklyDumpNotice,
      });

      if (!uploadResults?.length) {
        return;
      }

      setWeeklyDumpMediaUrls(uploadResults);
      setWeeklyDumpNotice("your weekly dump is loaded.");
      setWeeklyDumpInputKey((current) => current + 1);
    } finally {
      setIsUploadingWeeklyDump(false);
    }
  };

  const addComment = (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();
    const draft = commentDrafts[postId]?.trim();
    const authorEmail = user.googleProfile?.email;
    if (!draft || !authorEmail) return;

    setInteractions((current) => {
      const bucket = getInteractionBucket(current, postId);
      return {
        ...current,
        [postId]: {
          ...bucket,
          comments: [
            ...bucket.comments,
            {
              id: `${Date.now()}-${postId}`,
              authorEmail,
              authorName: user.profile.fullName,
              schoolName: user.profile.schoolName,
              text: draft,
              createdAt: formatNow(),
            },
          ],
        },
      };
    });

    setCommentDrafts((current) => ({
      ...current,
      [postId]: "",
    }));
  };

  const sharePost = async (postId: string) => {
    const authorEmail = user.googleProfile?.email;
    if (!authorEmail) return;

    const post = displayPosts.find((item) => item.id === postId);
    if (!post || typeof window === "undefined") return;

    const shareUrl = `${window.location.origin}/?post=${encodeURIComponent(postId)}`;
    const sharePayload = {
      title: post.title,
      text: `${post.title} • ${post.body}`,
      url: shareUrl,
    };

    let platform = "copied-link";

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        platform = "native-share";
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        window.prompt("copy this link", shareUrl);
      }
    } catch {
      return;
    }

    setInteractions((current) => {
      const bucket = getInteractionBucket(current, postId);
      return {
        ...current,
        [postId]: {
          ...bucket,
          shares: [
            ...bucket.shares,
            {
              id: `${Date.now()}-${platform}`,
              authorEmail,
              authorName: user.profile.fullName,
              platform,
              createdAt: formatNow(),
            },
          ],
        },
      };
    });
  };

  const toggleLike = (postId: string) => {
    const authorEmail = user.googleProfile?.email;
    if (!authorEmail) return;

    setInteractions((current) => {
      const bucket = getInteractionBucket(current, postId);
      const alreadyLiked = bucket.likes.some((like) => like.authorEmail === authorEmail);

      return {
        ...current,
        [postId]: {
          ...bucket,
          likes: alreadyLiked
            ? bucket.likes.filter((like) => like.authorEmail !== authorEmail)
            : [
                ...bucket.likes,
                {
                  authorEmail,
                  authorName: user.profile.fullName,
                  createdAt: formatNow(),
                },
              ],
        },
      };
    });
  };

  const toggleCommentHidden = (postId: string, commentId: string) => {
    setInteractions((current) => {
      const bucket = getInteractionBucket(current, postId);
      return {
        ...current,
        [postId]: {
          ...bucket,
          comments: bucket.comments.map((comment) =>
            comment.id === commentId ? { ...comment, hidden: !comment.hidden } : comment,
          ),
        },
      };
    });
  };

  const deleteComment = (postId: string, commentId: string) => {
    setInteractions((current) => {
      const bucket = getInteractionBucket(current, postId);
      return {
        ...current,
        [postId]: {
          ...bucket,
          comments: bucket.comments.filter((comment) => comment.id !== commentId),
        },
      };
    });
  };

  if (!user.signedIn) {
    if (showWelcomeScreen) {
      return (
        <main className="min-h-screen bg-[#F5A623] text-[#2C1A0E]">
          <div className="mx-auto flex min-h-screen w-full max-w-md flex-col font-[family-name:var(--font-manrope)]">
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-[#F5A623]"
            >
              <Image
                src="/brand/onboarding-page-exact.png"
                alt="crumbz onboarding"
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />

              <button
                type="button"
                aria-label="continue"
                className="absolute inset-0"
                onClick={() => setShowWelcomeScreen(false)}
              />
            </motion.section>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-[#FFF0D0] text-[#2C1A0E]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-5 font-[family-name:var(--font-manrope)]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden rounded-[40px] border border-[#FFF0D0] bg-[#F5A623] shadow-[0_24px_70px_rgba(255,150,11,0.24)]"
          >
            <Image
              src="/brand/onboarding-page-exact.png"
              alt="crumbz brand card"
              width={1080}
              height={1920}
              className="h-auto w-full object-cover"
              priority
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="mt-5"
          >
            <Card className="rounded-[34px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(47,23,20,0.08)]">
              <CardBody className="gap-5 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#2C1A0E]">start here</p>
                  <h1 className="mt-4 font-[family-name:var(--font-young-serif)] text-[2.1rem] leading-[1.02] text-[#2C1A0E]">
                    sign up or log in
                  </h1>
                  <div className="mt-3 flex gap-2">
                    <Button
                      radius="full"
                      className={authMode === "signup" ? "bg-[#F5A623] text-white" : "bg-[#FFF0D0] text-[#2C1A0E]"}
                      onPress={() => {
                        setAuthMode("signup");
                        setError("");
                      }}
                    >
                      sign up with google
                    </Button>
                    <Button
                      radius="full"
                      className={authMode === "login" ? "bg-[#F5A623] text-white" : "bg-[#FFF0D0] text-[#2C1A0E]"}
                      onPress={() => {
                        setAuthMode("login");
                        setError("");
                      }}
                    >
                      log in with google
                    </Button>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#2C1A0E]">
                    {authMode === "signup"
                      ? "new people sign up first, then fill in name, city, and whether they're a student."
                      : "returning people log in and land on the homepage straight away."}
                  </p>
                </div>

                {GOOGLE_CLIENT_ID ? (
                  <div className="flex justify-center">
                    <div ref={googleButtonRef} className="min-h-11" />
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#FFF0D0] bg-[#FFF0D0] p-4 text-sm leading-6 text-[#2C1A0E]">
                    add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and the real google button will appear here.
                  </div>
                )}

                {GOOGLE_CLIENT_ID && !googleReady ? (
                  <p className="text-center text-sm text-[#2C1A0E]">loading google sign-in…</p>
                ) : null}

                {error ? <p className="text-sm text-[#F5A623]">{error}</p> : null}
              </CardBody>
            </Card>
          </motion.section>
        </div>
      </main>
    );
  }

  if (needsOnboarding) {
    return (
      <main className="min-h-screen bg-white text-[#2C1A0E]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.84),_transparent_30%),linear-gradient(180deg,_#fff8ec_0%,_#FFF0D0_100%)] px-5 py-6 font-[family-name:var(--font-manrope)]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[36px] bg-white p-6 shadow-[0_22px_60px_rgba(44,26,14,0.08)] ring-1 ring-[#FFF0D0]"
          >
            <div className="flex items-center gap-4">
              <Avatar
                src={user.googleProfile?.picture}
                name={user.googleProfile?.name ?? "C"}
                className="h-16 w-16 bg-[#F5A623] text-white"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#2C1A0E]">one more step</p>
                <h1 className="mt-1 font-[family-name:var(--font-young-serif)] text-4xl leading-none">
                  finish your profile
                </h1>
                <p className="mt-1 text-sm text-[#2C1A0E]">{user.googleProfile?.email}</p>
              </div>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={finishOnboarding}>
              <Input
                label="full name"
                labelPlacement="outside"
                placeholder="your full name"
                radius="lg"
                value={fullNameValue}
                onValueChange={setFullName}
                classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
              />
              <Input
                label="username"
                labelPlacement="outside"
                placeholder="josheats"
                radius="lg"
                value={usernameValue}
                onValueChange={setUsername}
                classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
              />
              <Select
                label="city"
                labelPlacement="outside"
                radius="lg"
                placeholder="pick your city"
                selectedKeys={cityValue ? [cityValue] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  setCity(typeof selected === "string" ? selected : "");
                  setSchoolName(null);
                  setError("");
                }}
                classNames={{
                  trigger: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]",
                  value: "text-[#2C1A0E]",
                }}
              >
                {cityOptions.map((option) => (
                  <SelectItem key={option}>{option}</SelectItem>
                ))}
              </Select>
              <div>
                <p className="mb-2 text-sm font-medium text-[#2C1A0E]">are you a student?</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    radius="full"
                    className={isStudentValue === true ? "bg-[#F5A623] text-white" : "bg-[#FFF0D0] text-[#2C1A0E]"}
                    onPress={() => {
                      setIsStudent(true);
                      setError("");
                    }}
                  >
                    yes
                  </Button>
                  <Button
                    type="button"
                    radius="full"
                    className={isStudentValue === false ? "bg-[#F5A623] text-white" : "bg-[#FFF0D0] text-[#2C1A0E]"}
                    onPress={() => {
                      setIsStudent(false);
                      setSchoolName("");
                      setError("");
                    }}
                  >
                    no
                  </Button>
                </div>
              </div>
              {shouldShowSchoolField ? (
                matchingSchools.length ? (
                  <Select
                    label="university or school"
                    labelPlacement="outside"
                    placeholder="pick your school"
                    radius="lg"
                    selectedKeys={schoolNameValue ? [schoolNameValue] : []}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0];
                      setSchoolName(typeof selected === "string" ? selected : "");
                    }}
                    classNames={{
                      trigger: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]",
                      value: "text-[#2C1A0E]",
                    }}
                  >
                    {matchingSchools.map((school) => (
                      <SelectItem key={school}>{school}</SelectItem>
                    ))}
                  </Select>
                ) : (
                  <Input
                    label="university or school"
                    labelPlacement="outside"
                    placeholder="type your school"
                    radius="lg"
                    value={schoolNameValue}
                    onValueChange={setSchoolName}
                    classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                  />
                )
              ) : null}
              {error ? <p className="text-sm text-[#F5A623]">{error}</p> : null}
              <Button type="submit" radius="full" size="lg" className="bg-[#2C1A0E] font-semibold text-white">
                enter crumbz
              </Button>
            </form>
          </motion.section>
        </div>
      </main>
    );
  }

  if (isAdmin) {
    const recentActivity = Object.entries(interactions)
      .flatMap(([postId, bucket]) => [
        ...bucket.likes.map((like) => ({ kind: "like", postId, label: `${like.authorName} liked`, detail: "post liked", createdAt: like.createdAt })),
        ...bucket.comments.map((comment) => ({ kind: "comment", postId, label: `${comment.authorName} commented`, detail: comment.text, createdAt: comment.createdAt })),
        ...bucket.shares.map((share) => ({ kind: "share", postId, label: `${share.authorName} shared`, detail: `${share.platform} share`, createdAt: share.createdAt })),
      ])
      .slice(-8)
      .reverse();

    return (
      <main className="min-h-screen bg-white text-[#2C1A0E]">
        <div className="mx-auto min-h-screen w-full max-w-md bg-white px-4 pb-24 pt-5 font-[family-name:var(--font-manrope)]">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[30px] bg-[#F5A623] p-5 text-white shadow-[0_22px_60px_rgba(254,138,1,0.22)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/80">crumbz admin</p>
                <h1 className="mt-2 font-[family-name:var(--font-bricolage)] text-4xl leading-none">
                  control room
                </h1>
                <p className="mt-2 text-sm text-white/88">{user.googleProfile?.email}</p>
              </div>
              <Button radius="full" className="bg-white text-[#2C1A0E]" onPress={signOut}>
                log out
              </Button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="mt-5"
          >
            <Tabs
              aria-label="admin areas"
              classNames={{
                tabList: "w-full rounded-full bg-white/90 p-1",
                cursor: "rounded-full bg-[#F5A623]",
                tab: "h-11 text-sm font-medium text-[#2C1A0E]",
                tabContent: "group-data-[selected=true]:text-white",
              }}
            >
              <Tab key="overview" title="overview">
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "signups", value: totalSignups },
                      { label: "posts live", value: posts.length },
                      { label: "likes", value: totalLikes },
                      { label: "shares", value: totalShares },
                    ].map((item) => (
                      <Card key={item.label} className="rounded-[24px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                        <CardBody className="gap-1 p-4">
                          <p className="text-2xl font-semibold text-[#2C1A0E]">{item.value}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">{item.label}</p>
                        </CardBody>
                      </Card>
                    ))}
                  </div>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">push notifications</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">send one message to everyone and it shows up in their notifications drawer.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{announcements.length} live</Chip>
                      </div>
                      <form className="grid gap-3" onSubmit={sendAnnouncement}>
                        <Input
                          label="headline"
                          labelPlacement="outside"
                          placeholder="new post dropped"
                          value={announcementTitle}
                          onValueChange={setAnnouncementTitle}
                          classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                        />
                        <Textarea
                          label="message"
                          labelPlacement="outside"
                          placeholder="come back and check this out"
                          value={announcementBody}
                          onValueChange={setAnnouncementBody}
                          classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                        />
                        <Button type="submit" radius="full" className="bg-[#F5A623] text-white">
                          push to all users
                        </Button>
                      </form>
                      {latestAnnouncement ? (
                        <div className="rounded-[18px] bg-[#FFF0D0] px-4 py-3">
                          <p className="text-sm font-semibold text-[#2C1A0E]">{latestAnnouncement.title}</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">{latestAnnouncement.body}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">{latestAnnouncement.createdAt}</p>
                        </div>
                      ) : null}
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">overview stats</p>
                      <div className="flex flex-wrap gap-2">
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{totalComments} comments</Chip>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{uniqueCommenters} unique commenters</Chip>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{uniqueSharers} unique sharers</Chip>
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">user management</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">who signed up, where they’re from, and whether they’re active right now.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{userManagementRows.length} users</Chip>
                      </div>
                      <div className="grid gap-2">
                        {userManagementRows.length ? (
                          userManagementRows.map((account) => (
                            <div key={account.googleProfile?.email} className="flex items-center justify-between rounded-[18px] bg-[#FFF0D0] px-3 py-3 text-sm">
                              <div>
                                <p className="font-semibold text-[#2C1A0E]">{account.profile.fullName || account.googleProfile?.name || "new user"}</p>
                                <p className="text-[#2C1A0E]">
                                  @{account.profile.username || "pending"} • {formatProfileMeta(account.profile.city, account.profile.schoolName) || "profile not finished"}
                                </p>
                              </div>
                              <Chip className="bg-white text-[#2C1A0E]">{account.signedIn ? "active" : "saved"}</Chip>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#2C1A0E]">no users yet.</p>
                        )}
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">food spot data</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">which places are getting saved the most from day one.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{foodSpotCounts.length} tracked</Chip>
                      </div>
                      <div className="grid gap-2">
                        {foodSpotCounts.length ? (
                          foodSpotCounts.map((place) => (
                            <div key={place.id} className="flex items-center justify-between rounded-[18px] bg-[#FFF0D0] px-3 py-3 text-sm">
                              <div>
                                <p className="font-semibold text-[#2C1A0E]">{place.name}</p>
                                <p className="text-[#2C1A0E]">{place.address}</p>
                              </div>
                              <Chip className="bg-white text-[#2C1A0E]">{place.saves} saves</Chip>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#2C1A0E]">no food spots saved yet.</p>
                        )}
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">city breakdown</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">see where users are stacking up so you know where to focus next.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{sortedCityBreakdown.length} cities</Chip>
                      </div>
                      <div className="grid gap-2">
                        {sortedCityBreakdown.map(([cityName, count]) => (
                          <div key={cityName} className="flex items-center justify-between rounded-[18px] bg-[#FFF0D0] px-3 py-3 text-sm">
                            <span className="text-[#2C1A0E]">{cityName}</span>
                            <span className="font-semibold text-[#2C1A0E]">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">recent activity</p>
                      {recentActivity.length ? (
                        recentActivity.map((item, index) => (
                          <div key={`${item.kind}-${item.postId}-${item.createdAt}-${index}`} className="rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                            <p className="text-sm font-semibold text-[#2C1A0E]">{item.label}</p>
                            <p className="mt-1 text-sm text-[#2C1A0E]">{item.detail}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">{item.createdAt}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[#2C1A0E]">no activity yet.</p>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </Tab>

              <Tab key="post" title="post">
                <div className="mt-4 space-y-4">
                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="p-5">
                      <form className="grid gap-4" onSubmit={createPost}>
                      {editingPostId ? (
                        <div className="flex items-center justify-between rounded-[20px] bg-[#FFF0D0] px-4 py-3 text-sm">
                          <span className="text-[#2C1A0E]">editing an existing post</span>
                          <Button type="button" radius="full" variant="light" className="text-[#2C1A0E]" onPress={cancelEditingPost}>
                            cancel
                          </Button>
                        </div>
                      ) : null}
                      <Select
                        label="post type"
                        labelPlacement="outside"
                        radius="lg"
                        selectedKeys={[composer.type]}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0];
                          setComposer((current) => ({
                            ...current,
                            type: (typeof selected === "string" ? selected : "chapter") as PostType,
                          }));
                        }}
                        classNames={{
                          trigger: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]",
                        }}
                      >
                        {["chapter", "story", "discount", "ad", "collab"].map((type) => (
                          <SelectItem key={type}>{type}</SelectItem>
                        ))}
                      </Select>
                      <Select
                        label="media type"
                        labelPlacement="outside"
                        radius="lg"
                        selectedKeys={[composer.mediaKind]}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0];
                          setComposer((current) => ({
                            ...current,
                            mediaKind: (typeof selected === "string" ? selected : "none") as MediaKind,
                            mediaUrls: typeof selected === "string" && selected !== "none" ? current.mediaUrls : [],
                          }));
                          setComposerMediaInputKey((current) => current + 1);
                        }}
                        classNames={{
                          trigger: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]",
                        }}
                      >
                        {["none", "photo", "video", "carousel"].map((type) => (
                          <SelectItem key={type}>{type}</SelectItem>
                        ))}
                      </Select>
                      {composer.mediaKind === "video" ? (
                        <Select
                          label="video ratio"
                          labelPlacement="outside"
                          radius="lg"
                          selectedKeys={[composer.videoRatio]}
                          onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0];
                            setComposer((current) => ({
                              ...current,
                              videoRatio: (typeof selected === "string" ? selected : "9:16") as VideoRatio,
                            }));
                          }}
                          classNames={{
                            trigger: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]",
                          }}
                        >
                          {["9:16", "4:5", "1:1", "16:9"].map((ratio) => (
                            <SelectItem key={ratio}>{ratio}</SelectItem>
                          ))}
                        </Select>
                      ) : null}
                      <Input
                        label="title"
                        labelPlacement="outside"
                        placeholder="new chapter just dropped"
                        value={composer.title}
                        onValueChange={(value) => setComposer((current) => ({ ...current, title: value }))}
                        classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                      />
                      <Textarea
                        label="body"
                        labelPlacement="outside"
                        placeholder="tell students what’s happening"
                        value={composer.body}
                        onValueChange={(value) => setComposer((current) => ({ ...current, body: value }))}
                        classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                      />
                      <Input
                        label="cta label"
                        labelPlacement="outside"
                        placeholder="student offer live"
                        value={composer.cta}
                        onValueChange={(value) => setComposer((current) => ({ ...current, cta: value }))}
                        classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                      />
                      {composer.mediaKind !== "none" ? (
                        <div className="grid gap-3">
                          <label className="text-sm font-medium text-[#2C1A0E]">
                            {composer.mediaKind === "carousel" ? "photos for carousel" : `${composer.mediaKind} file`}
                          </label>
                          <input
                            key={composerMediaInputKey}
                            type="file"
                            accept={
                              composer.mediaKind === "video"
                                ? ".mp4,.mov,video/mp4,video/quicktime"
                                : ".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
                            }
                            multiple={composer.mediaKind === "carousel"}
                            onChange={(event) => {
                              void handleComposerFiles(event.target.files);
                            }}
                            className="rounded-[18px] border border-[#FFF0D0] bg-[#FFF0D0] px-3 py-3 text-sm text-[#2C1A0E]"
                          />
                          {composer.mediaUrls.length ? (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                radius="full"
                                className="bg-white text-[#2C1A0E]"
                                onPress={() => setComposer((current) => ({ ...current, mediaUrls: [] }))}
                              >
                                remove media
                              </Button>
                              <p className="self-center text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
                                pick a new file to replace it
                              </p>
                            </div>
                          ) : null}
                          {composer.mediaUrls.length ? (
                            <div className="rounded-[20px] bg-[#FFF0D0] p-3">
                              <PostMediaPreview
                                post={{
                                  id: "preview",
                                  title: composer.title || "preview",
                                  body: composer.body,
                                  type: composer.type,
                                  cta: composer.cta,
                                  createdAt: "preview",
                                  mediaKind: composer.mediaKind,
                                  mediaUrls: composer.mediaUrls,
                                  videoRatio: composer.videoRatio,
                                  authorRole: "admin",
                                  authorName: "crumbz",
                                  authorEmail: ADMIN_EMAIL,
                                  schoolName: "",
                                  weekKey: "",
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {storageNotice ? <p className="text-sm text-[#F5A623]">{storageNotice}</p> : null}
                      <Button
                        type="submit"
                        radius="full"
                        size="lg"
                        isDisabled={isUploadingMedia}
                        className="bg-[#F5A623] text-white disabled:opacity-60"
                      >
                        {isUploadingMedia ? "uploading media..." : editingPostId ? "save changes" : "publish post"}
                      </Button>
                      </form>
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">all posts</p>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{posts.length} total</Chip>
                      </div>
                      {posts.length ? (
                        posts.map((post) => (
                          <div key={post.id} className="rounded-[22px] bg-[#FFF0D0] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#2C1A0E]">{post.title}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
                                  {post.type} • {post.createdAt}
                                </p>
                              </div>
                              <Chip className="bg-white text-[#2C1A0E]">{post.mediaKind}</Chip>
                            </div>
                            <p className="mt-2 text-sm text-[#2C1A0E]">{post.body}</p>
                            {post.mediaKind !== "none" ? (
                              <div className="mt-3">
                                {post.mediaUrls.length ? (
                                  <PostMediaPreview post={post} />
                                ) : (
                                  <div className="rounded-[18px] border border-dashed border-[#FFF0D0] bg-white px-3 py-4 text-sm text-[#2C1A0E]">
                                    media is missing on this saved post. open edit and upload it again once.
                                  </div>
                                )}
                              </div>
                            ) : null}
                            <div className="mt-3 flex gap-2">
                              <Button type="button" radius="full" className="bg-white text-[#2C1A0E]" onPress={() => startEditingPost(post)}>
                                edit
                              </Button>
                              <Button type="button" radius="full" color="danger" variant="flat" onPress={() => deletePost(post.id)}>
                                delete
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[#2C1A0E]">no posts yet.</p>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </Tab>

              <Tab key="community" title="community">
                <div className="mt-4 space-y-4">
                  {posts.map((post) => {
                    const bucket = getInteractionBucket(interactions, post.id);
                    return (
                      <Card key={post.id} className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                        <CardHeader className="flex items-start justify-between gap-3 px-5 pb-0 pt-5">
                          <div>
                            <p className="font-semibold text-[#2C1A0E]">{post.title}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
                              {post.type} • {post.createdAt}
                            </p>
                          </div>
                          <Chip className="bg-[#FFF0D0] text-[#F5A623]">{bucket.comments.length} comments</Chip>
                        </CardHeader>
                        <CardBody className="gap-3 p-5">
                          <p className="text-sm text-[#2C1A0E]">{post.body}</p>
                          <div className="flex flex-wrap gap-2">
                            <Chip className="bg-[#FFF0D0] text-[#F5A623]">{bucket.likes.length} likes</Chip>
                            <Chip className="bg-[#FFF0D0] text-[#F5A623]">{bucket.shares.length} shares</Chip>
                            <Chip className="bg-[#FFF0D0] text-[#F5A623]">{post.cta}</Chip>
                          </div>
                          {bucket.comments.length ? (
                            bucket.comments.map((comment) => (
                              <div key={comment.id} className="rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[#2C1A0E]">
                                      {comment.authorName} • {comment.schoolName}
                                    </p>
                                    <p className="mt-1 text-sm text-[#2C1A0E]">{comment.text}</p>
                                    {comment.hidden ? (
                                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">hidden from students</p>
                                    ) : null}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      radius="full"
                                      className="bg-white text-[#2C1A0E]"
                                      onPress={() => toggleCommentHidden(post.id, comment.id)}
                                    >
                                      {comment.hidden ? "unhide" : "hide"}
                                    </Button>
                                    <Button
                                      type="button"
                                      radius="full"
                                      color="danger"
                                      variant="flat"
                                      onPress={() => deleteComment(post.id, comment.id)}
                                    >
                                      delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-[#2C1A0E]">no comments yet.</p>
                          )}
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              </Tab>
            </Tabs>
          </motion.section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#2C1A0E]">
      <div className="mx-auto min-h-screen w-full max-w-md bg-white px-4 pb-24 pt-5 font-[family-name:var(--font-manrope)]">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between border-b border-[#f3e7cf] pb-5"
        >
          <div>
            <p className="font-[family-name:var(--font-young-serif)] text-[2.2rem] leading-none text-[#57657f]">
              what’s good, {user.profile.fullName.split(" ")[0].toLowerCase()}
            </p>
            <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">the feed is hungry. so are you.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="rounded-full bg-[#fff7ea] p-2.5 text-[#2C1A0E] shadow-[0_8px_20px_rgba(44,26,14,0.06)]"
            >
              <Badge color="warning" content={notificationCount} shape="circle" className="text-[#2C1A0E]">
                <span className="text-2xl leading-none">🔔</span>
              </Badge>
            </button>
            <button type="button" onClick={() => setStudentTab("profile")} className="rounded-full">
              <Badge color="warning" content="" shape="circle" isInvisible>
                <Avatar
                  src={user.googleProfile?.picture}
                  name={user.profile.fullName}
                  className="h-12 w-12 border-2 border-[#f8c6ad] bg-[#FFF0D0] text-[#F5A623]"
                />
              </Badge>
            </button>
          </div>
        </motion.section>

        {studentTab === "feed" ? (
          <>
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="mt-6"
            >
              <div className="flex gap-4 overflow-x-auto pb-2">
                {storyRailItems.map((item) => (
                  <div key={item.id} className="min-w-[82px] text-center">
                    <div
                      className="mx-auto rounded-full p-[3px] shadow-[0_10px_30px_rgba(44,26,14,0.08)]"
                      style={{ background: `linear-gradient(135deg, ${item.ring}, #f4f0e7)` }}
                    >
                      <Avatar
                        src={item.picture}
                        name={item.label}
                        className="h-[76px] w-[76px] bg-[#f1f2f6] text-sm font-semibold text-[#2C1A0E]"
                      />
                    </div>
                    {item.badge ? (
                      <div className="-mt-2">
                        <span className="rounded-full bg-[#f05c1c] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                          {item.badge}
                        </span>
                      </div>
                    ) : null}
                    <p className="mt-2 text-sm font-medium text-[#53627b]">coming soon</p>
                  </div>
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.16 }}
              className="mt-7 space-y-4"
            >
              <Card className="overflow-hidden rounded-[30px] border-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_22%),linear-gradient(135deg,_#141b33_0%,_#0e1630_100%)] text-white shadow-[0_24px_60px_rgba(15,22,48,0.24)]">
                <CardBody className="gap-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[#ff7d37]">push notification</p>
                      <h3 className="mt-2 text-[1.85rem] font-bold leading-[1.02] text-white">
                        {latestAnnouncement?.title || "Upcoming Food Mob"}
                      </h3>
                      <p className="mt-2 max-w-[15rem] text-base leading-7 text-white/76">
                        {latestAnnouncement?.body || "The Sunday Food Drop is happening soon. Get your camera ready."}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-white/6 p-4 text-4xl">📣</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button radius="full" className="h-12 bg-[#ff6a24] px-8 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(255,106,36,0.28)]">
                      remind me
                    </Button>
                    <Chip className="bg-[#FF3D6B]/18 text-[#ff96b0]">{notificationCount} alerts</Chip>
                  </div>
                </CardBody>
              </Card>

              <Card className="rounded-[30px] border border-[#f1e8da] bg-white shadow-[0_18px_50px_rgba(44,26,14,0.08)]">
                <CardBody className="gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-[family-name:var(--font-young-serif)] text-[2.7rem] italic leading-none text-[#2C1A0E]">
                        sunday food drop
                      </p>
                      <p className="mt-3 text-lg text-[#73809a]">Add up to 7 photos from your week.</p>
                    </div>
                    <Chip className="rounded-full bg-[#fff1eb] px-3 text-[#ff6a24]">{weeklyDumpMediaUrls.length}/7</Chip>
                  </div>

                  <form className="space-y-4" onSubmit={submitWeeklyDump}>
                    <div className="grid grid-cols-4 gap-3">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`flex aspect-square items-center justify-center rounded-[18px] ${
                            index === 0 && !weeklyDumpMediaUrls.length
                              ? "border border-dashed border-[#ffc6b5] bg-[#fff8f5] text-4xl text-[#ff6a24]"
                              : "bg-[#eef2f8]"
                          }`}
                        >
                          {index === 0 && !weeklyDumpMediaUrls.length ? "+" : null}
                        </div>
                      ))}
                    </div>
                    <Textarea
                      placeholder="what hit this week?"
                      value={weeklyDumpCaption}
                      onValueChange={setWeeklyDumpCaption}
                      classNames={{ inputWrapper: "rounded-[18px] bg-[#f8f4ec] shadow-none border border-[#f8f4ec]", input: "text-[#8d99ad]" }}
                    />
                    <input
                      key={weeklyDumpInputKey}
                      type="file"
                      accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
                      multiple
                      disabled={!canSubmitWeeklyDumpToday || hasSubmittedWeeklyDumpThisWeek}
                      onChange={(event) => {
                        void handleWeeklyDumpFiles(event.target.files);
                      }}
                      className="rounded-[18px] border border-[#f1e8da] bg-[#f8f4ec] px-3 py-3 text-sm text-[#2C1A0E] disabled:opacity-50"
                    />
                    {weeklyDumpMediaUrls.length ? (
                      <div className="rounded-[20px] bg-[#f8f4ec] p-3">
                        <PostMediaPreview
                          post={{
                            id: "weekly-dump-preview",
                            title: `${user.profile.fullName.split(" ")[0] || "your"}'s weekly food dump`,
                            body: weeklyDumpCaption || formatProfileMeta(user.profile.city, user.profile.schoolName),
                            type: "weekly-dump",
                            cta: "sunday dump",
                            createdAt: "preview",
                            mediaKind: "carousel",
                            mediaUrls: weeklyDumpMediaUrls,
                            videoRatio: "4:5",
                            authorRole: "student",
                            authorName: user.profile.fullName,
                            authorEmail: user.googleProfile?.email ?? "",
                            schoolName: user.profile.schoolName,
                            weekKey: currentSundayKey,
                          }}
                        />
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3">
                      {weeklyDumpNotice ? <p className="text-sm text-[#ff6a24]">{weeklyDumpNotice}</p> : <div className="flex-1" />}
                      <Button
                        type="submit"
                        radius="full"
                        size="lg"
                        isDisabled={!canSubmitWeeklyDumpToday || hasSubmittedWeeklyDumpThisWeek || isUploadingWeeklyDump}
                        className="h-14 min-w-14 bg-[#ff6a24] px-5 text-2xl text-white disabled:opacity-60"
                      >
                        →
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>

              <Card className="overflow-hidden rounded-[30px] border-0 bg-[#eadffd] shadow-[0_18px_50px_rgba(123,79,255,0.16)]">
                <CardBody className="flex-row items-center justify-between gap-4 p-5">
                  <div className="max-w-[14rem]">
                    <p className="font-[family-name:var(--font-young-serif)] text-[2.3rem] leading-none text-[#2C1A0E]">
                      your digest
                    </p>
                    <p className="mt-3 text-lg leading-7 text-[#4f526f]">
                      your top picks and taste profile. updates sundays.
                    </p>
                    <Button radius="full" className="mt-4 h-12 bg-[#2C1A0E] px-8 text-white">
                      open
                    </Button>
                  </div>
                  <div className="relative h-40 w-32 shrink-0">
                    <div className="absolute right-4 top-0 h-20 w-20 rounded-full bg-[#f05c1c]" />
                    <div className="absolute left-2 top-4 rounded-full bg-[#dfff67] px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2C1A0E]">
                      wild
                    </div>
                    <div className="absolute bottom-0 right-0 flex h-24 w-16 items-center justify-center rounded-[16px] bg-[#ff7b2f] text-4xl">
                      🌶️
                    </div>
                    <div className="absolute bottom-6 left-5 text-xl text-[#dfff67]">✦</div>
                    <div className="absolute bottom-2 left-1 text-base text-[#dfff67]">✦</div>
                  </div>
                </CardBody>
              </Card>

              <Card className="rounded-[30px] border border-[#f1e8da] bg-[#fff8ee] shadow-[0_18px_50px_rgba(44,26,14,0.08)]">
                <CardBody className="gap-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-[family-name:var(--font-young-serif)] text-[2.2rem] leading-none text-[#2C1A0E]">
                        plans & perks
                      </p>
                      <p className="mt-2 text-base text-[#6c7289]">perfect places and perks for the squad</p>
                    </div>
                    <Button radius="full" variant="light" className="text-[#f05c1c]">
                      see all
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] bg-[#dff4ff] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#0EA5E9]">links</p>
                      <p className="mt-2 text-lg font-semibold text-[#2C1A0E]">campus guides</p>
                    </div>
                    <div className="rounded-[22px] bg-[#e7ffd7] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#1FBF6B]">deals</p>
                      <p className="mt-2 text-lg font-semibold text-[#2C1A0E]">new discounts</p>
                    </div>
                    <div className="rounded-[22px] bg-[#ffe2ec] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#FF3D6B]">likes</p>
                      <p className="mt-2 text-lg font-semibold text-[#2C1A0E]">hot picks</p>
                    </div>
                    <div className="rounded-[22px] bg-[#efe4ff] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#7B4FFF]">premium</p>
                      <p className="mt-2 text-lg font-semibold text-[#2C1A0E]">reward drops</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <div className="space-y-4">
                {displayPosts.map(renderFeedCard)}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{communityEyebrow}</p>
                    <h3 className="mt-1 font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">{communityTitle}</h3>
                  </div>
                  <Chip className="bg-[#FFF0D0] text-[#F5A623]">{visibleStudentWeeklyDumps.length} dumps</Chip>
                </div>
                {visibleStudentWeeklyDumps.length ? (
                  visibleStudentWeeklyDumps.map(renderFeedCard)
                ) : (
                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
                    <CardBody className="p-5 text-sm text-[#2C1A0E]">{communityEmpty}</CardBody>
                  </Card>
                )}
              </div>
            </motion.section>
          </>
        ) : null}

        {studentTab === "favorites" ? (
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">favorites</p>
                    <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">
                      food map for {user.profile.city}
                    </h2>
                    <p className="text-sm text-[#2C1A0E]">
                      heart the cafes, restaurants, bakeries, and food spots you rate. your friends can spot the overlap.
                    </p>
                  </div>
                  <Chip className="bg-[#FFF0D0] text-[#F5A623]">{favoritePlaceIds.length} liked</Chip>
                </div>

                <FavoritesMap
                  cityName={user.profile.city}
                  center={favoriteCityCenter}
                  places={favoritePlaces}
                  favoriteIds={favoritePlaceIds}
                  mutualFansByPlace={mutualFansByPlace}
                  onToggleFavorite={toggleFavoritePlace}
                  friends={friendAccounts.map((account) => ({
                    email: account.googleProfile?.email ?? account.profile.username,
                    name: account.profile.fullName,
                    username: `@${account.profile.username}`,
                    picture: account.googleProfile?.picture,
                    favoritePlaceIds: account.profile.favoritePlaceIds ?? [],
                  }))}
                />

                {favoritePlacesLoading ? <p className="text-sm text-[#2C1A0E]">loading food spots around the city...</p> : null}
                {favoritePlacesError ? <p className="text-sm text-[#2C1A0E]">{favoritePlacesError}</p> : null}
              </CardBody>
            </Card>
          </section>
        ) : null}

        {studentTab === "rewards" ? (
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">rewards</p>
                <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">{rewardsTitle}</h2>
                <p className="text-sm text-[#2C1A0E]">share crumbz posts, stay active, and this is where discounts and drops will land.</p>
              </CardBody>
            </Card>
          </section>
        ) : null}

        {studentTab === "social" ? (
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">friend requests</p>
                {liveProfile.incomingFriendRequests.length ? (
                  liveProfile.incomingFriendRequests.map((requestEmail) => {
                    const requester = accounts.find((account) => account.googleProfile?.email === requestEmail);
                    if (!requester || requestEmail.toLowerCase() === ADMIN_EMAIL) return null;

                    return (
                      <div key={requestEmail} className="rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                        <p className="text-sm font-semibold text-[#2C1A0E]">{requester.profile.fullName}</p>
                        <p className="text-sm text-[#2C1A0E]">
                          @{requester.profile.username}
                          {requester.profile.schoolName ? ` • ${requester.profile.schoolName}` : ""}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button radius="full" className="bg-[#F5A623] text-white" onPress={() => acceptFriendRequest(requestEmail)}>
                            accept
                          </Button>
                          <Button radius="full" variant="flat" className="bg-white text-[#2C1A0E]" onPress={() => declineFriendRequest(requestEmail)}>
                            decline
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#2C1A0E]">no requests waiting right now.</p>
                )}
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">social</p>
                  <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">add your friends</h2>
                  <p className="text-sm text-[#2C1A0E]">search by email or username and add them to your crumbz circle.</p>
                </div>
                <Input
                  radius="full"
                  placeholder="search email or username"
                  value={friendQuery}
                  onValueChange={setFriendQuery}
                  classNames={{ inputWrapper: "bg-[#FFF0D0] border border-[#FFF0D0]" }}
                />
                {friendQuery ? (
                  friendableAccounts.length ? (
                    friendableAccounts.map((account) => (
                      <div key={account.googleProfile?.email} className="flex items-center justify-between rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                        <div>
                          <p className="text-sm font-semibold text-[#2C1A0E]">{account.profile.fullName}</p>
                          <p className="text-sm text-[#2C1A0E]">@{account.profile.username} • {account.googleProfile?.email}</p>
                        </div>
                        <Button radius="full" className="bg-[#F5A623] text-white" onPress={() => addFriend(account.googleProfile?.email ?? "")}>
                          send request
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#2C1A0E]">no matching account yet.</p>
                  )
                ) : null}

                {liveProfile.outgoingFriendRequests.length ? (
                  <div className="rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">pending</p>
                    <p className="mt-1 text-sm text-[#2C1A0E]">
                      waiting on {liveProfile.outgoingFriendRequests.length} friend request{liveProfile.outgoingFriendRequests.length === 1 ? "" : "s"}.
                    </p>
                  </div>
                ) : null}
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">your people</p>
                {liveProfile.friends.length ? (
                  liveProfile.friends.map((friendEmail) => {
                    const friend = accounts.find((account) => account.googleProfile?.email === friendEmail);
                    if (!friend || friendEmail.toLowerCase() === ADMIN_EMAIL) return null;

                    return (
                      <div key={friendEmail} className="rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                        <p className="text-sm font-semibold text-[#2C1A0E]">{friend.profile.fullName}</p>
                        <p className="text-sm text-[#2C1A0E]">
                          @{friend.profile.username}
                          {friend.profile.schoolName ? ` • ${friend.profile.schoolName}` : ""}
                        </p>
                        <Button radius="full" variant="flat" className="mt-3 bg-white text-[#2C1A0E]" onPress={() => removeFriend(friendEmail)}>
                          remove friend
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#2C1A0E]">no friends added yet.</p>
                )}
              </CardBody>
            </Card>
          </section>
        ) : null}

        {studentTab === "profile" ? (
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">profile</p>
                <p className="text-2xl font-semibold text-[#2C1A0E]">{user.profile.fullName}</p>
                <p className="text-sm text-[#2C1A0E]">@{user.profile.username}</p>
                <p className="text-sm text-[#2C1A0E]">{formatProfileMeta(user.profile.city, user.profile.schoolName)}</p>
                <p className="text-sm text-[#2C1A0E]">{favoritePlaceIds.length} favorite food spots</p>
              </CardBody>
            </Card>
          </section>
        ) : null}

        <nav className="fixed bottom-3 left-1/2 z-20 w-[calc(100%-1rem)] max-w-[24.5rem] -translate-x-1/2 rounded-[32px] border border-[#FFF0D0] bg-[#2C1A0E] px-4 py-4 shadow-[0_18px_50px_rgba(44,26,14,0.24)] backdrop-blur">
          <div className="grid grid-cols-5 gap-1 text-center">
            {[
              { label: "Feed", key: "feed" },
              { label: "Favorites", key: "favorites" },
              { label: "Rewards", key: "rewards" },
              { label: "Social", key: "social" },
              { label: "Profile", key: "profile" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className={`flex min-w-0 flex-col items-center gap-1 rounded-[22px] px-2 py-2 transition-colors ${
                  studentTab === item.key ? "bg-white text-[#2C1A0E]" : "bg-transparent text-[#FFF0D0]"
                }`}
                onClick={() => setStudentTab(item.key as "feed" | "favorites" | "rewards" | "social" | "profile")}
              >
                <span className={`text-[24px] leading-none ${studentTab === item.key ? "text-[#F5A623]" : "text-[#FFF0D0]"}`}>
                  {renderStudentTabIcon(item.key as "feed" | "favorites" | "rewards" | "social" | "profile", "h-6 w-6")}
                </span>
                <span className={`text-[11px] font-medium leading-none ${studentTab === item.key ? "text-[#2C1A0E]" : "text-[#FFF0D0]"}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {notificationsOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="close notifications"
            className="absolute inset-0 bg-[#2C1A0E]/20"
            onClick={() => setNotificationsOpen(false)}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25 }}
            className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-[#FFF0D0] bg-white px-5 pb-6 pt-6 shadow-[-24px_0_60px_rgba(43,21,48,0.12)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">notifications</p>
                <h2 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-2xl text-[#2C1A0E]">
                  what’s new
                </h2>
              </div>
              <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={() => setNotificationsOpen(false)}>
                close
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              {notificationItems.length ? (
                notificationItems.map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-[#FFF0D0] bg-[#FFF0D0] p-4">
                    <div className="flex items-start gap-3">
                      <Avatar src={item.picture} name={item.title} className="h-11 w-11 bg-[#F5A623] text-white" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#2C1A0E]">{item.title}</p>
                        <p className="mt-1 text-sm text-[#2C1A0E]">{item.detail}</p>
                        {item.kind === "friend_request" ? (
                          <div className="mt-3 flex gap-2">
                            <Button
                              radius="full"
                              className="bg-[#F5A623] text-white"
                              onPress={() => {
                                acceptFriendRequest(item.email);
                                setStudentTab("social");
                                setNotificationsOpen(false);
                              }}
                            >
                              accept
                            </Button>
                            <Button
                              radius="full"
                              variant="flat"
                              className="bg-white text-[#2C1A0E]"
                              onPress={() => {
                                declineFriendRequest(item.email);
                                setNotificationsOpen(false);
                              }}
                            >
                              decline
                            </Button>
                          </div>
                        ) : item.kind === "announcement" ? (
                          <div className="mt-3">
                            <Button
                              radius="full"
                              className="bg-[#F5A623] text-white"
                              onPress={() => {
                                setStudentTab("feed");
                                setNotificationsOpen(false);
                              }}
                            >
                              view update
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <Button
                              radius="full"
                              className="bg-[#F5A623] text-white"
                              onPress={() => {
                                setStudentTab("feed");
                                setNotificationsOpen(false);
                                window.setTimeout(() => {
                                  const target = document.getElementById(`post-${item.postId}`);
                                  target?.scrollIntoView({ behavior: "smooth", block: "center" });
                                }, 120);
                              }}
                            >
                              open post
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-[#FFF0D0] bg-[#FFF0D0] p-4 text-sm text-[#2C1A0E]">
                  no notifications yet. friend requests, admin drops, and sunday dumps will show up here.
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </main>
  );
}
