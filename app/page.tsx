"use client";

import { Fragment, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Select,
  SelectItem,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import { LANGUAGE_STORAGE_KEY, detectPreferredLanguage, translations, type Language } from "@/lib/i18n";
import {
  buildAdminPostNotification,
  buildAnnouncementNotification,
  buildFriendFavoriteNotification,
  buildFriendPostNotification,
  buildFriendRequestNotification,
  buildTaggedPostNotification,
} from "@/lib/notification-copy";
import { supabaseBrowser } from "@/lib/supabase/client";

const FavoritesMap = dynamic(() => import("@/components/favorites-map"), { ssr: false });

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STORAGE_KEY = "crumbz-active-user-v1";
const ACCOUNTS_KEY = "crumbz-accounts-v1";
const POSTS_KEY = "crumbz-posts-v1";
const INTERACTIONS_KEY = "crumbz-interactions-v1";
const DARE_KEY = "crumbz-dare-v1";
const SEEN_NOTIFICATIONS_KEY = "crumbz-seen-notifications-v1";
const PUSH_PROMPT_ASKED_PREFIX = "crumbz-push-prompt-asked-v1";
const INSTALL_PROMPT_DISMISSED_KEY = "crumbz-install-prompt-dismissed-v1";
const PENDING_REFERRAL_CODE_KEY = "crumbz-pending-referral-code-v1";
const MEDIA_DB_NAME = "crumbz-media-v1";
const MEDIA_STORE_NAME = "post-media";
const AUTH_EXPIRED_EVENT = "crumbz-auth-expired";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const WEB_PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ADMIN_EMAIL = "crumbleappco@gmail.com";
const ACCEPTED_VIDEO_TYPES = [".mp4", ".mov", "video/mp4", "video/quicktime"];
const ACCEPTED_IMAGE_TYPES = [".jpg", ".jpeg", ".png", ".heic", "image/jpeg", "image/png", "image/heic", "image/heif"];
const MAX_VIDEO_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const STORY_MAX_VIDEO_FILE_SIZE_BYTES = 500 * 1024 * 1024;
const STORY_MAX_IMAGE_FILE_SIZE_BYTES = 30 * 1024 * 1024;
const STORY_RATIO = 9 / 16;
const STORY_RATIO_TOLERANCE = 0.02;
const STORY_IMAGE_DIMENSIONS = { width: 1080, height: 1920 } as const;
const CHAPTER_IMAGE_DIMENSIONS = [
  { width: 1080, height: 1350 },
  { width: 1080, height: 1080 },
] as const;
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
    createdAtIso: new Date().toISOString(),
    mediaKind: "none",
    mediaUrls: [],
    videoRatio: "9:16",
    authorRole: "admin",
    authorName: "crumbz",
    authorEmail: ADMIN_EMAIL,
    schoolName: "",
    weekKey: "",
    taggedPlaceId: "",
    taggedPlaceName: "",
    taggedPlaceKind: "",
    taggedPlaceAddress: "",
    taggedPlaceLat: null,
    taggedPlaceLon: null,
    taggedPlaceCity: "",
    tasteTag: "",
    priceTag: "",
  },
  {
    id: "student-discount-soon",
    title: "student discounts are warming up",
    body: "flash deals, restaurant collabs, and campus-only offers will show up here first.",
    type: "discount",
    cta: "rewards coming soon",
    createdAt: "today",
    createdAtIso: new Date().toISOString(),
    mediaKind: "none",
    mediaUrls: [],
    videoRatio: "9:16",
    authorRole: "admin",
    authorName: "crumbz",
    authorEmail: ADMIN_EMAIL,
    schoolName: "",
    weekKey: "",
    taggedPlaceId: "",
    taggedPlaceName: "",
    taggedPlaceKind: "",
    taggedPlaceAddress: "",
    taggedPlaceLat: null,
    taggedPlaceLon: null,
    taggedPlaceCity: "",
    tasteTag: "",
    priceTag: "",
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
    createdAtIso: new Date().toISOString(),
    mediaKind: "none",
    mediaUrls: [],
    videoRatio: "9:16",
    authorRole: "admin",
    authorName: "crumbz",
    authorEmail: ADMIN_EMAIL,
    schoolName: "",
    weekKey: "",
    taggedPlaceId: "",
    taggedPlaceName: "",
    taggedPlaceKind: "",
    taggedPlaceAddress: "",
    taggedPlaceLat: null,
    taggedPlaceLon: null,
    taggedPlaceCity: "",
    tasteTag: "",
    priceTag: "",
  },
];

type AuthMode = "signup" | "login";
type PostType = "chapter" | "story" | "discount" | "ad" | "collab" | "weekly-dump";
type MediaKind = "none" | "photo" | "video" | "carousel";
type VideoRatio = "9:16" | "4:5" | "1:1" | "16:9";
type StudentTab = "feed" | "favorites" | "rewards" | "social" | "profile";
type AppNavigationState = {
  studentTab: StudentTab;
  notificationsOpen: boolean;
  selectedProfileEmail: string | null;
  profileDrawer: "followers" | "favorites" | null;
  selectedOwnPostId: string | null;
  selectedStoryPostId: string | null;
  favoriteViewCity: string | null;
  highlightedFavoritePlaceId: string | null;
};

type CrumbzHistoryState = {
  crumbzNav?: AppNavigationState;
};

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
    bio?: string;
    picture?: string;
    isStudent: boolean | null;
    schoolName: string;
    friends: string[];
    incomingFriendRequests: string[];
    outgoingFriendRequests: string[];
    favoritePlaceIds: string[];
    favoriteActivities?: FavoriteActivity[];
    referralCode?: string;
    referredByCode?: string;
    referredByEmail?: string;
    referralCompletedAt?: string | null;
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

type FavoriteActivity = {
  id: string;
  placeId: string;
  placeName: string;
  placeKind: string;
  placeAddress: string;
  lat: number;
  lon: number;
  city: string;
  createdAt: string;
};

const TASTE_TAG_OPTIONS = [
  { key: "fire", label: "fire" },
  { key: "solid", label: "solid" },
  { key: "skip", label: "skip" },
] as const;

const PRICE_TAG_OPTIONS = [
  { key: "student-friendly", label: "student friendly" },
  { key: "kinda-pricey", label: "kinda pricey" },
  { key: "special-occasion", label: "special occasion" },
] as const;

type AppPost = {
  id: string;
  title: string;
  body: string;
  type: PostType;
  cta: string;
  createdAt: string;
  createdAtIso: string;
  mediaKind: MediaKind;
  mediaUrls: string[];
  videoRatio: VideoRatio;
  authorRole: "admin" | "student";
  authorName: string;
  authorEmail: string;
  schoolName: string;
  weekKey: string;
  taggedPlaceId: string;
  taggedPlaceName: string;
  taggedPlaceKind: string;
  taggedPlaceAddress: string;
  taggedPlaceLat: number | null;
  taggedPlaceLon: number | null;
  taggedPlaceCity: string;
  tasteTag: "" | "fire" | "solid" | "skip";
  priceTag: "" | "student-friendly" | "kinda-pricey" | "special-occasion";
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
  createdAtIso: "",
  taggedPlaceId: "",
  taggedPlaceName: "",
  taggedPlaceKind: "",
  taggedPlaceAddress: "",
  taggedPlaceLat: null,
  taggedPlaceLon: null,
  taggedPlaceCity: "",
  tasteTag: "",
  priceTag: "",
};

function isStoryAspectRatio(width: number, height: number) {
  return Math.abs(width / height - STORY_RATIO) <= STORY_RATIO_TOLERANCE;
}

function hasExactDimensions(
  dimensions: { width: number; height: number },
  allowed: readonly { width: number; height: number }[],
) {
  return allowed.some((option) => dimensions.width === option.width && dimensions.height === option.height);
}

function isLiveStory(post: Pick<AppPost, "type" | "createdAtIso">) {
  if (post.type !== "story") return false;
  const createdAt = Date.parse(post.createdAtIso);
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt < 24 * 60 * 60 * 1000;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image load failed"));
    };

    image.src = objectUrl;
  });
}

function readVideoMetadata(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("video load failed"));
    };

    video.src = objectUrl;
  });
}

function getDefaultDare(): DareState {
  const now = new Date();
  const releaseAt = new Date(now);
  const daysUntilWednesday = (3 - now.getDay() + 7) % 7;
  releaseAt.setDate(now.getDate() + (daysUntilWednesday === 0 && now.getHours() >= 12 ? 7 : daysUntilWednesday));
  releaseAt.setHours(12, 0, 0, 0);
  const nextSunday = new Date(releaseAt);
  const daysUntilSunday = (7 - releaseAt.getDay()) % 7;
  nextSunday.setDate(releaseAt.getDate() + daysUntilSunday);
  nextSunday.setHours(23, 59, 0, 0);

  return {
    id: "dare-to-eat-weekly",
    title: "late-night sleeper hit",
    prompt: "find the most underrated late-night bite in your city and prove it.",
    createdAt: formatNow(),
    releaseAt: releaseAt.toISOString(),
    closesAt: nextSunday.toISOString(),
    acceptedEmails: [],
    reminderEmails: [],
    submissions: [],
    instagramPostedAt: null,
    winnerSubmissionId: null,
    reward: "winner gets a special partner discount drop on tuesday.",
  };
}

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

type DareSubmission = {
  id: string;
  authorEmail: string;
  authorName: string;
  photoUrl: string;
  locationTag: string;
  caption: string;
  createdAt: string;
};

type DareState = {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  releaseAt: string;
  closesAt: string;
  acceptedEmails: string[];
  reminderEmails: string[];
  submissions: DareSubmission[];
  instagramPostedAt: string | null;
  winnerSubmissionId: string | null;
  reward: string;
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
    bio: "",
    picture: "",
    isStudent: null,
    schoolName: "",
    friends: [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    favoritePlaceIds: [],
    favoriteActivities: [],
    referralCode: "",
    referredByCode: "",
    referredByEmail: "",
    referralCompletedAt: null,
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
    normalized.profile.username = "joeydoesntsharefood";
  }

  if (typeof normalized.profile.isStudent !== "boolean") {
    normalized.profile.isStudent = normalized.profile.schoolName ? true : null;
  }

  return normalized;
}

async function getAuthAccessToken() {
  const { data, error } = await supabaseBrowser.auth.getSession();
  if (error) return "";
  return data.session?.access_token ?? "";
}

async function getAuthenticatedHeaders(headers: Record<string, string> = {}) {
  const token = await getAuthAccessToken();
  return token
    ? {
        ...headers,
        Authorization: `Bearer ${token}`,
      }
    : headers;
}

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function readAccounts() {
  return normalizeAccounts(readJson<StoredUser[]>(ACCOUNTS_KEY, []));
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
    id: typeof post.id === "string" ? post.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: typeof post.title === "string" ? post.title : "untitled post",
    body: typeof post.body === "string" ? post.body : "",
    type: typeof post.type === "string" ? post.type : "chapter",
    cta: typeof post.cta === "string" ? post.cta : "live now",
    createdAt: typeof post.createdAt === "string" ? post.createdAt : formatNow(),
    createdAtIso:
      typeof post.createdAtIso === "string" && !Number.isNaN(Date.parse(post.createdAtIso))
        ? post.createdAtIso
        : new Date().toISOString(),
    mediaUrls: Array.isArray(post.mediaUrls) ? post.mediaUrls : [],
    videoRatio: post.videoRatio ?? "9:16",
    mediaKind: post.mediaKind ?? "none",
    authorRole: post.authorRole === "student" ? "student" : "admin",
    authorName: typeof post.authorName === "string" ? post.authorName : "crumbz",
    authorEmail: typeof post.authorEmail === "string" ? post.authorEmail : ADMIN_EMAIL,
    schoolName: typeof post.schoolName === "string" ? post.schoolName : "",
    weekKey: typeof post.weekKey === "string" ? post.weekKey : "",
    taggedPlaceId: typeof post.taggedPlaceId === "string" ? post.taggedPlaceId : "",
    taggedPlaceName: typeof post.taggedPlaceName === "string" ? post.taggedPlaceName : "",
    taggedPlaceKind: typeof post.taggedPlaceKind === "string" ? post.taggedPlaceKind : "",
    taggedPlaceAddress: typeof post.taggedPlaceAddress === "string" ? post.taggedPlaceAddress : "",
    taggedPlaceLat: typeof post.taggedPlaceLat === "number" ? post.taggedPlaceLat : null,
    taggedPlaceLon: typeof post.taggedPlaceLon === "number" ? post.taggedPlaceLon : null,
    taggedPlaceCity: typeof post.taggedPlaceCity === "string" ? post.taggedPlaceCity : "",
    tasteTag: post.tasteTag === "fire" || post.tasteTag === "solid" || post.tasteTag === "skip" ? post.tasteTag : "",
    priceTag:
      post.priceTag === "student-friendly" || post.priceTag === "kinda-pricey" || post.priceTag === "special-occasion"
        ? post.priceTag
        : "",
  })) as AppPost[];
}

function mergePostsPreferLocal(localPosts: AppPost[], serverPosts: AppPost[]) {
  const merged = new Map<string, AppPost>();

  serverPosts.forEach((post) => {
    merged.set(post.id, post);
  });

  localPosts.forEach((post) => {
    merged.set(post.id, post);
  });

  return Array.from(merged.values()).sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);

    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return b.createdAt.localeCompare(a.createdAt);
    }

    return bTime - aTime;
  });
}

function mergeInteractionsPreferLocal(localInteractions: InteractionsMap, serverInteractions: InteractionsMap) {
  return {
    ...serverInteractions,
    ...localInteractions,
  };
}

function filterRecentDeletedPosts(posts: AppPost[], deletedPostIds: Set<string>) {
  if (!deletedPostIds.size) return posts;
  return posts.filter((post) => !deletedPostIds.has(post.id));
}

function filterRecentDeletedInteractions(interactions: InteractionsMap, deletedPostIds: Set<string>) {
  if (!deletedPostIds.size) return interactions;
  return Object.fromEntries(Object.entries(interactions).filter(([postId]) => !deletedPostIds.has(postId)));
}

function mergeAccountsPreferLocal(serverAccounts: StoredUser[], localAccounts: StoredUser[]) {
  const localByEmail = new Map(
    localAccounts
      .map((account) => [account.googleProfile?.email?.toLowerCase() ?? "", account] as const)
      .filter(([email]) => Boolean(email)),
  );

  const mergedAccounts = serverAccounts.map((account) => {
    const email = account.googleProfile?.email?.toLowerCase() ?? "";
    const localAccount = localByEmail.get(email);
    if (!localAccount) return account;

    return {
      ...account,
      signedIn: account.signedIn || localAccount.signedIn,
      profile: {
        ...account.profile,
        bio: localAccount.profile.bio || account.profile.bio || "",
        picture: localAccount.profile.picture || account.profile.picture || "",
      },
    };
  });

  return mergedAccounts;
}

function removeUserFromInteractions(interactions: InteractionsMap, targetEmail: string, deletedPostIds: Set<string>) {
  const normalizedTargetEmail = targetEmail.toLowerCase();

  return Object.fromEntries(
    Object.entries(interactions)
      .filter(([postId]) => !deletedPostIds.has(postId))
      .map(([postId, bucket]) => [
        postId,
        {
          ...bucket,
          comments: bucket.comments.filter((comment) => comment.authorEmail.toLowerCase() !== normalizedTargetEmail),
          shares: bucket.shares.filter((share) => share.authorEmail.toLowerCase() !== normalizedTargetEmail),
          likes: bucket.likes.filter((like) => like.authorEmail.toLowerCase() !== normalizedTargetEmail),
        },
      ]),
  );
}

function readInteractions() {
  return normalizeInteractions(readJson<InteractionsMap>(INTERACTIONS_KEY, {}));
}

function normalizeDareState(dare: unknown): DareState {
  const candidate = dare && typeof dare === "object" ? (dare as Partial<DareState>) : {};
  const fallback = getDefaultDare();

  return {
    ...fallback,
    ...candidate,
    title: typeof candidate.title === "string" ? candidate.title : fallback.title,
    prompt: typeof candidate.prompt === "string" ? candidate.prompt : fallback.prompt,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : fallback.createdAt,
    releaseAt: typeof candidate.releaseAt === "string" ? candidate.releaseAt : fallback.releaseAt,
    closesAt: typeof candidate.closesAt === "string" ? candidate.closesAt : fallback.closesAt,
    acceptedEmails: Array.isArray(candidate.acceptedEmails)
      ? candidate.acceptedEmails.filter((item): item is string => typeof item === "string")
      : fallback.acceptedEmails,
    reminderEmails: Array.isArray(candidate.reminderEmails)
      ? candidate.reminderEmails.filter((item): item is string => typeof item === "string")
      : fallback.reminderEmails,
    submissions: Array.isArray(candidate.submissions)
      ? candidate.submissions
          .filter((item): item is DareSubmission => Boolean(item && typeof item === "object"))
          .map((item) => ({
            id: typeof item.id === "string" ? item.id : `dare-sub-${Date.now()}`,
            authorEmail: typeof item.authorEmail === "string" ? item.authorEmail : "",
            authorName: typeof item.authorName === "string" ? item.authorName : "crumbz user",
            photoUrl: typeof item.photoUrl === "string" ? item.photoUrl : "",
            locationTag: typeof item.locationTag === "string" ? item.locationTag : "",
            caption: typeof item.caption === "string" ? item.caption : "",
            createdAt: typeof item.createdAt === "string" ? item.createdAt : fallback.createdAt,
          }))
      : fallback.submissions,
    instagramPostedAt: typeof candidate.instagramPostedAt === "string" ? candidate.instagramPostedAt : null,
    winnerSubmissionId: typeof candidate.winnerSubmissionId === "string" ? candidate.winnerSubmissionId : null,
    reward: typeof candidate.reward === "string" ? candidate.reward : fallback.reward,
  };
}

function readDare() {
  return normalizeDareState(readJson<DareState>(DARE_KEY, getDefaultDare()));
}

function readSeenNotifications() {
  return readJson<string[]>(SEEN_NOTIFICATIONS_KEY, []);
}

function getPushPromptAskedKey(email: string) {
  return `${PUSH_PROMPT_ASKED_PREFIX}:${email.toLowerCase()}`;
}

function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;
  const iosStandalone = "standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

function getReferralLink(referralCode: string) {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.origin);
  url.searchParams.set("ref", referralCode);
  return url.toString();
}

function normalizeAccounts(accounts: unknown): StoredUser[] {
  if (!Array.isArray(accounts)) return [];

  return accounts.map((account) => {
    const candidate = account as Partial<StoredUser>;
    const googleProfile =
      candidate.googleProfile && typeof candidate.googleProfile === "object"
        ? {
            name: typeof candidate.googleProfile.name === "string" ? candidate.googleProfile.name : "",
            email: typeof candidate.googleProfile.email === "string" ? candidate.googleProfile.email : "",
            picture: typeof candidate.googleProfile.picture === "string" ? candidate.googleProfile.picture : undefined,
          }
        : null;

    const normalized = {
      ...defaultUser,
      ...candidate,
      signedIn: Boolean(candidate.signedIn),
      googleProfile: googleProfile?.email ? googleProfile : null,
      profile: {
        ...defaultUser.profile,
        ...(candidate.profile ?? {}),
        fullName: typeof candidate.profile?.fullName === "string" ? candidate.profile.fullName : "",
        username: typeof candidate.profile?.username === "string" ? candidate.profile.username : "",
        city: typeof candidate.profile?.city === "string" ? candidate.profile.city : "",
        bio: typeof candidate.profile?.bio === "string" ? candidate.profile.bio : "",
        picture: typeof candidate.profile?.picture === "string" ? candidate.profile.picture : "",
        schoolName: typeof candidate.profile?.schoolName === "string" ? candidate.profile.schoolName : "",
        friends: Array.isArray(candidate.profile?.friends) ? candidate.profile.friends.filter((item): item is string => typeof item === "string") : [],
        incomingFriendRequests: Array.isArray(candidate.profile?.incomingFriendRequests)
          ? candidate.profile.incomingFriendRequests.filter((item): item is string => typeof item === "string")
          : [],
        outgoingFriendRequests: Array.isArray(candidate.profile?.outgoingFriendRequests)
          ? candidate.profile.outgoingFriendRequests.filter((item): item is string => typeof item === "string")
          : [],
        favoritePlaceIds: Array.isArray(candidate.profile?.favoritePlaceIds)
          ? candidate.profile.favoritePlaceIds.filter((item): item is string => typeof item === "string")
          : [],
        favoriteActivities: Array.isArray(candidate.profile?.favoriteActivities)
          ? candidate.profile.favoriteActivities.filter(
              (item): item is FavoriteActivity =>
                Boolean(
                  item &&
                    typeof item === "object" &&
                    typeof item.id === "string" &&
                    typeof item.placeId === "string" &&
                    typeof item.placeName === "string" &&
                    typeof item.placeKind === "string" &&
                    typeof item.placeAddress === "string" &&
                    typeof item.lat === "number" &&
                    typeof item.lon === "number" &&
                    typeof item.city === "string" &&
                    typeof item.createdAt === "string",
                ),
            )
          : [],
        referralCode: typeof candidate.profile?.referralCode === "string" ? candidate.profile.referralCode : "",
        referredByCode: typeof candidate.profile?.referredByCode === "string" ? candidate.profile.referredByCode : "",
        referredByEmail: typeof candidate.profile?.referredByEmail === "string" ? candidate.profile.referredByEmail : "",
        referralCompletedAt:
          typeof candidate.profile?.referralCompletedAt === "string" ? candidate.profile.referralCompletedAt : null,
      },
    };

    if (normalized.googleProfile?.email?.toLowerCase() === "joshrejis@gmail.com" && !normalized.profile.username) {
      normalized.profile.username = "joeydoesntsharefood";
    }

    if (typeof normalized.profile.isStudent !== "boolean") {
      normalized.profile.isStudent = normalized.profile.schoolName ? true : null;
    }

    return normalized;
  });
}

function normalizeInteractions(interactions: unknown): InteractionsMap {
  if (!interactions || typeof interactions !== "object" || Array.isArray(interactions)) return {};

  return Object.fromEntries(
    Object.entries(interactions).map(([postId, bucket]) => {
      const safeBucket = bucket && typeof bucket === "object" ? (bucket as Partial<PostInteraction>) : {};

      return [
        postId,
        {
          comments: Array.isArray(safeBucket.comments) ? safeBucket.comments.filter((item): item is PostComment => Boolean(item && typeof item === "object")) : [],
          shares: Array.isArray(safeBucket.shares) ? safeBucket.shares.filter((item): item is PostShare => Boolean(item && typeof item === "object")) : [],
          likes: Array.isArray(safeBucket.likes) ? safeBucket.likes.filter((item): item is PostLike => Boolean(item && typeof item === "object")) : [],
        },
      ];
    }),
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

function formatCalendarTimestamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function normalizeCityKey(cityName: string) {
  return cityName
    .trim()
    .replace(/[łŁ]/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatProfileMeta(cityName: string, schoolName: string) {
  if (cityName && schoolName) return `${cityName} • ${schoolName}`;
  return cityName || schoolName || "";
}

function getAccountPicture(account: Pick<StoredUser, "googleProfile" | "profile"> | null | undefined) {
  if (!account) return "";
  return account.profile.picture?.trim() || account.googleProfile?.picture?.trim() || "";
}

const USERNAME_MENTION_REGEX = /(^|[^a-z0-9_])@([a-z0-9._-]+)/gi;

function extractTaggedUsernames(text: string) {
  if (!text.trim()) return [];

  const matches = text.matchAll(USERNAME_MENTION_REGEX);
  const taggedUsernames = new Set<string>();

  for (const match of matches) {
    const username = match[2]?.trim().toLowerCase();
    if (username) {
      taggedUsernames.add(username);
    }
  }

  return [...taggedUsernames];
}

function getProfileShareMessage(username: string) {
  return `open @${username}'s crumbz profile and add them to your circle.`;
}

function getActiveMentionQuery(text: string, cursorPosition: number) {
  const safeCursor = Math.max(0, Math.min(cursorPosition, text.length));
  const textBeforeCursor = text.slice(0, safeCursor);
  const mentionMatch = textBeforeCursor.match(/(^|\s)@([a-z0-9._-]*)$/i);
  if (!mentionMatch) return null;

  const fullMatch = mentionMatch[0] ?? "";
  const query = mentionMatch[2] ?? "";

  return {
    query: query.toLowerCase(),
    start: safeCursor - fullMatch.length + fullMatch.lastIndexOf("@"),
    end: safeCursor,
  };
}

function getEmailHandle(email: string) {
  return email.split("@")[0]?.trim() || "";
}

function getSafePublicIdentity({
  username,
  fullName,
  email,
}: {
  username?: string | null;
  fullName?: string | null;
  email?: string | null;
}) {
  const cleanUsername = username?.trim().replace(/^@+/, "") ?? "";
  if (cleanUsername) return `@${cleanUsername}`;

  const cleanFullName = fullName?.trim() ?? "";
  if (cleanFullName) return cleanFullName;

  const handle = getEmailHandle(email ?? "");
  return handle ? `@${handle}` : "@crumbz-user";
}

function renderStudentTabIcon(tabKey: StudentTab, className: string) {
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

function getDareReminderEvent(dare: DareState) {
  const start = new Date(dare.releaseAt);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return {
    title: `crumbz dare drop: ${dare.title}`,
    details: `${dare.prompt}\n\n${dare.reward}`,
    start,
    end,
  };
}

function hasAnySharedState(payload: {
  accounts?: unknown;
  posts?: unknown;
  interactions?: unknown;
  dare?: unknown;
  announcements?: unknown;
}) {
  return Boolean(
    (Array.isArray(payload.accounts) && payload.accounts.length) ||
      (Array.isArray(payload.posts) && payload.posts.length) ||
      (payload.interactions && typeof payload.interactions === "object" && Object.keys(payload.interactions as object).length) ||
      (payload.dare && typeof payload.dare === "object") ||
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

function dispatchAuthExpired(message?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { message } }));
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

function getPostTimestamp(post: Pick<AppPost, "createdAtIso">) {
  const timestamp = Date.parse(post.createdAtIso);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatRelativePostTime(createdAtIso: string, fallback: string) {
  const timestamp = Date.parse(createdAtIso);
  if (Number.isNaN(timestamp)) return fallback;

  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) return "just now";

  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours < 1) {
    const diffMinutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) return `${diffHours}h ago`;

  return fallback;
}

function toLocalDateTimeValue(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const timezoneOffset = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function fromLocalDateTimeValue(value: string, fallback: string) {
  if (!value) return fallback;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

async function mutateAccountState<TUser = StoredUser>(payload: {
  action: "upsert_account" | "send_friend_request" | "cancel_friend_request" | "accept_friend_request" | "decline_friend_request" | "remove_friend" | "update_favorites" | "delete_account";
  account?: StoredUser;
  currentEmail?: string;
  targetEmail?: string;
  favoritePlaceIds?: string[];
  favoritePlace?: FavoritePlace;
}) {
  const headers = await getAuthenticatedHeaders({
    "Content-Type": "application/json",
  });
  const response = await fetch("/api/account", {
    method: "POST",
    headers,
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

  if (response.status === 401) {
    dispatchAuthExpired(data?.message);
  }

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

function isCurrentWeeklyDump(post: AppPost, currentSundayKey: string) {
  if (post.type !== "weekly-dump") return false;
  if (post.weekKey === currentSundayKey) return true;
  return post.id.endsWith(`-${currentSundayKey}`);
}

function pruneExpiredWeeklyDumps(posts: AppPost[], interactions: InteractionsMap, currentSundayKey: string) {
  const expiredDumpIds = new Set(
    posts
      .filter((post) => post.authorRole === "student" && post.type === "weekly-dump" && !isCurrentWeeklyDump(post, currentSundayKey))
      .map((post) => post.id),
  );

  if (!expiredDumpIds.size) {
    return {
      posts,
      interactions,
      changed: false,
    };
  }

  return {
    posts: posts.filter((post) => !expiredDumpIds.has(post.id)),
    interactions: Object.fromEntries(
      Object.entries(interactions).filter(([postId]) => !expiredDumpIds.has(postId)),
    ),
    changed: true,
  };
}

function getInteractionBucket(interactions: InteractionsMap, postId: string) {
  return interactions[postId] ?? { comments: [], shares: [], likes: [] };
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window) || !window.indexedDB) {
      reject(new Error("indexeddb unavailable"));
      return;
    }

    let request: IDBOpenDBRequest;

    try {
      request = window.indexedDB.open(MEDIA_DB_NAME, 1);
    } catch (error) {
      reject(error);
      return;
    }

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

function PostMediaPreview({ post, detail = false }: { post: AppPost; detail?: boolean }) {
  const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = Math.min(activeIndex, mediaUrls.length - 1);

  if (post.mediaKind === "none" || !mediaUrls.length) {
    return null;
  }

  if (post.mediaKind === "photo") {
    return (
      <div className="overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0]">
        {/* uploaded dump images come straight from storage urls, so a plain img avoids remote loader issues here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrls[0]}
          alt={post.title}
          className="h-auto w-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  if (post.mediaKind === "video") {
    return (
      <div className={`${detail ? "overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0]" : `${getVideoAspectClass(post.videoRatio)} overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0]`}`}>
        <video src={mediaUrls[0]} controls className={detail ? "max-h-[70vh] w-full object-contain bg-black" : "h-full w-full object-cover"} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0]">
        {/* carousel images use the same direct storage urls as the single-photo case above. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrls[currentIndex]}
          alt={`${post.title} ${currentIndex + 1}`}
          className={detail ? "max-h-[70vh] w-full object-contain bg-white" : "h-[28rem] w-full object-cover"}
          loading="lazy"
        />
        {mediaUrls.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="previous photo"
              onClick={() => setActiveIndex((current) => (current <= 0 ? mediaUrls.length - 1 : current - 1))}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-2xl text-[#2C1A0E] shadow-[0_10px_24px_rgba(44,26,14,0.16)]"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="next photo"
              onClick={() => setActiveIndex((current) => (current + 1) % mediaUrls.length)}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-2xl text-[#2C1A0E] shadow-[0_10px_24px_rgba(44,26,14,0.16)]"
            >
              ›
            </button>
          </>
        ) : null}
      </div>
      {mediaUrls.length > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {mediaUrls.map((url, index) => (
            <Fragment key={url}>
              <button
                type="button"
                aria-label={`show photo ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${index === currentIndex ? "w-6 bg-[#F5A623]" : "w-2.5 bg-[#D8DFEB]"}`}
              />
            </Fragment>
          ))}
        </div>
      ) : null}
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
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors ${
        active
          ? "border-[#F5A623] bg-[#F5A623] text-white"
          : "border-[#F3DFC1] bg-white text-[#2C1A0E] hover:border-[#F5A623]/60"
      }`}
    >
      <span className="pointer-events-none flex items-center justify-center">{children}</span>
    </button>
  );
}

export default function Page() {
  const user = useSyncExternalStore(subscribeToUser, getUserSnapshot, getUserServerSnapshot);
  const [accounts, setAccounts] = useState<StoredUser[]>([]);
  const [posts, setPosts] = useState<AppPost[]>([...defaultPosts]);
  const [interactions, setInteractions] = useState<InteractionsMap>({});
  const [dare, setDare] = useState<DareState>(getDefaultDare());
  const [dareHydrated, setDareHydrated] = useState(false);
  const [announcements, setAnnouncements] = useState<AppAnnouncement[]>([]);
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>([]);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState("");
  const [profileEditModalOpen, setProfileEditModalOpen] = useState(false);
  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [bioSaveNotice, setBioSaveNotice] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [profilePhotoModalOpen, setProfilePhotoModalOpen] = useState(false);
  const [profilePhotoDraft, setProfilePhotoDraft] = useState("");
  const [profilePhotoNotice, setProfilePhotoNotice] = useState("");
  const [isSavingProfilePhoto, setIsSavingProfilePhoto] = useState(false);
  const [profilePhotoInputKey, setProfilePhotoInputKey] = useState(0);
  const [profileCameraInputKey, setProfileCameraInputKey] = useState(0);
  const [profileQrOpen, setProfileQrOpen] = useState(false);
  const [profileShareUrl, setProfileShareUrl] = useState("");
  const [profileShareNotice, setProfileShareNotice] = useState("");
  const [profileQrImageUrl, setProfileQrImageUrl] = useState("");
  const [referralNotice, setReferralNotice] = useState("");
  const [pendingReferralCode, setPendingReferralCode] = useState("");
  const [socialActionNotice, setSocialActionNotice] = useState("");
  const [language, setLanguage] = useState<Language>(detectPreferredLanguage);
  const [studentTab, setStudentTab] = useState<StudentTab>("feed");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [pushNotice, setPushNotice] = useState("");
  const [pushPromptOpen, setPushPromptOpen] = useState(false);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installPromptMode, setInstallPromptMode] = useState<"android" | "ios" | null>(null);
  const [installPromptExpanded, setInstallPromptExpanded] = useState(false);
  const [friendQuery, setFriendQuery] = useState("");
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>([]);
  const [highlightedFavoritePlaceId, setHighlightedFavoritePlaceId] = useState<string | null>(null);
  const [favoriteViewCity, setFavoriteViewCity] = useState<string | null>(null);
  const [favoritePlacesLoading, setFavoritePlacesLoading] = useState(false);
  const [favoritePlacesError, setFavoritePlacesError] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [dareTitleDraft, setDareTitleDraft] = useState(getDefaultDare().title);
  const [darePromptDraft, setDarePromptDraft] = useState(getDefaultDare().prompt);
  const [dareRewardDraft, setDareRewardDraft] = useState(getDefaultDare().reward);
  const [dareReleaseAtDraft, setDareReleaseAtDraft] = useState(toLocalDateTimeValue(getDefaultDare().releaseAt));
  const [dareClosesAtDraft, setDareClosesAtDraft] = useState(toLocalDateTimeValue(getDefaultDare().closesAt));
  const [dareLocationDraft, setDareLocationDraft] = useState("");
  const [dareCaptionDraft, setDareCaptionDraft] = useState("");
  const [dareProofPhotoUrl, setDareProofPhotoUrl] = useState("");
  const [dareNotice, setDareNotice] = useState("");
  const [dareReminderModalOpen, setDareReminderModalOpen] = useState(false);
  const [isUploadingDareProof, setIsUploadingDareProof] = useState(false);
  const [adminActionNotice, setAdminActionNotice] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleInitError, setGoogleInitError] = useState(false);
  const [error, setError] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [dailyPostNotice, setDailyPostNotice] = useState("");
  const [dailyPostCaption, setDailyPostCaption] = useState("");
  const [dailyPostMentionQuery, setDailyPostMentionQuery] = useState("");
  const [dailyPostMentionRange, setDailyPostMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [dailyPostMediaUrls, setDailyPostMediaUrls] = useState<string[]>([]);
  const [dailyPostTaggedPlace, setDailyPostTaggedPlace] = useState<FavoritePlace | null>(null);
  const [dailyPostPlaceQuery, setDailyPostPlaceQuery] = useState("");
  const [dailyPostPlaceResults, setDailyPostPlaceResults] = useState<FavoritePlace[]>([]);
  const [dailyPostPlaceSearchLoading, setDailyPostPlaceSearchLoading] = useState(false);
  const [dailyPostTasteTag, setDailyPostTasteTag] = useState<AppPost["tasteTag"]>("");
  const [dailyPostPriceTag, setDailyPostPriceTag] = useState<AppPost["priceTag"]>("");
  const [isUploadingDailyPost, setIsUploadingDailyPost] = useState(false);
  const [dailyPostInputKey, setDailyPostInputKey] = useState(0);
  const [weeklyDumpNotice, setWeeklyDumpNotice] = useState("");
  const [weeklyDumpCaption, setWeeklyDumpCaption] = useState("");
  const [weeklyDumpMediaUrls, setWeeklyDumpMediaUrls] = useState<string[]>([]);
  const [isUploadingWeeklyDump, setIsUploadingWeeklyDump] = useState(false);
  const [weeklyDumpInputKey, setWeeklyDumpInputKey] = useState(0);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [pendingDeletePostId, setPendingDeletePostId] = useState<string | null>(null);
  const [selectedProfileEmail, setSelectedProfileEmail] = useState<string | null>(null);
  const [profileDrawer, setProfileDrawer] = useState<"followers" | "favorites" | null>(null);
  const [selectedOwnPostId, setSelectedOwnPostId] = useState<string | null>(null);
  const [selectedStoryPostId, setSelectedStoryPostId] = useState<string | null>(null);
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
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const profileCameraInputRef = useRef<HTMLInputElement>(null);
  const dailyPostCaptionRef = useRef<HTMLTextAreaElement | null>(null);
  const dailyPostInputRef = useRef<HTMLInputElement>(null);
  const weeklyDumpInputRef = useRef<HTMLInputElement>(null);
  const favoritesMapSectionRef = useRef<HTMLElement | null>(null);
  const userRef = useRef(user);
  const accountsRef = useRef(accounts);
  const isApplyingHistoryNavigationRef = useRef(false);
  const lastNavigationKeyRef = useRef<string | null>(null);
  const lastDraftSyncedDareIdRef = useRef<string | null>(null);
  const authModeRef = useRef<AuthMode>("signup");
  const hasLoadedDataRef = useRef(false);
  const hasBackfilledReferralCodeRef = useRef(false);
  const hasAdminBackfilledReferralCodesRef = useRef(false);
  const lastSharedStateMutationAtRef = useRef(0);
  const lastManualSharedStateSyncAtRef = useRef(0);
  const recentlyDeletedPostIdsRef = useRef<Map<string, number>>(new Map());

  const isAdmin = user.googleProfile?.email?.toLowerCase() === ADMIN_EMAIL;
  const liveAccount =
    accounts.find(
      (account) => account.googleProfile?.email?.toLowerCase() === (user.googleProfile?.email?.toLowerCase() ?? ""),
    ) ?? null;
  const liveProfile = liveAccount?.profile ?? user.profile;
  const currentUserPicture = getAccountPicture(liveAccount ?? user);
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
  const copy = useMemo(() => translations[language], [language]);
  const navigationState = useMemo<AppNavigationState>(
    () => ({
      studentTab,
      notificationsOpen,
      selectedProfileEmail,
      profileDrawer,
      selectedOwnPostId,
      selectedStoryPostId,
      favoriteViewCity,
      highlightedFavoritePlaceId,
    }),
    [
      favoriteViewCity,
      highlightedFavoritePlaceId,
      notificationsOpen,
      profileDrawer,
      selectedOwnPostId,
      selectedProfileEmail,
      selectedStoryPostId,
      studentTab,
    ],
  );
  const navigationKey = JSON.stringify(navigationState);

  useEffect(() => {
    if (!bioModalOpen) return;
    setBioDraft((liveProfile.bio ?? "").slice(0, 180));
    setBioSaveNotice("");
  }, [bioModalOpen, liveProfile.bio]);

  useEffect(() => {
    if (!profilePhotoModalOpen) return;
    setProfilePhotoDraft(currentUserPicture);
    setProfilePhotoNotice("");
  }, [currentUserPicture, profilePhotoModalOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextHistoryState: CrumbzHistoryState = {
      ...(typeof window.history.state === "object" && window.history.state ? window.history.state : {}),
      crumbzNav: navigationState,
    };

    if (lastNavigationKeyRef.current === null) {
      window.history.replaceState(nextHistoryState, "", window.location.href);
      lastNavigationKeyRef.current = navigationKey;
      return;
    }

    if (isApplyingHistoryNavigationRef.current) {
      isApplyingHistoryNavigationRef.current = false;
      lastNavigationKeyRef.current = navigationKey;
      return;
    }

    if (lastNavigationKeyRef.current === navigationKey) return;

    window.history.pushState(nextHistoryState, "", window.location.href);
    lastNavigationKeyRef.current = navigationKey;
  }, [navigationKey, navigationState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyNavigationState = (nextState: AppNavigationState) => {
      isApplyingHistoryNavigationRef.current = true;
      setStudentTab(nextState.studentTab);
      setNotificationsOpen(nextState.notificationsOpen);
      setSelectedProfileEmail(nextState.selectedProfileEmail);
      setProfileDrawer(nextState.profileDrawer);
      setSelectedOwnPostId(nextState.selectedOwnPostId);
      setSelectedStoryPostId(nextState.selectedStoryPostId);
      setFavoriteViewCity(nextState.favoriteViewCity);
      setHighlightedFavoritePlaceId(nextState.highlightedFavoritePlaceId);
    };

    const handlePopState = (event: PopStateEvent) => {
      const nextState = (event.state as CrumbzHistoryState | null)?.crumbzNav;
      if (!nextState) return;
      applyNavigationState(nextState);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!user.signedIn || isAdmin || needsOnboarding || !liveAccount) return;
    if (liveProfile.referralCode || hasBackfilledReferralCodeRef.current) return;

    hasBackfilledReferralCodeRef.current = true;

    void mutateAccountState({
      action: "upsert_account",
      account: {
        ...liveAccount,
        profile: {
          ...liveAccount.profile,
          referralCode: liveAccount.profile.referralCode ?? "",
        },
      },
    })
      .then((result) => {
        setAccounts(result.accounts);
        if (result.user) {
          persistUser(result.user as StoredUser);
        }
      })
      .catch(() => {
        hasBackfilledReferralCodeRef.current = false;
      });
  }, [isAdmin, liveAccount, liveProfile.referralCode, needsOnboarding, user.signedIn]);

  useEffect(() => {
    if (!user.signedIn || !isAdmin || hasAdminBackfilledReferralCodesRef.current) return;

    const missingReferralCodeAccounts = accounts.filter(
      (account) => account.googleProfile?.email?.toLowerCase() !== ADMIN_EMAIL && !account.profile.referralCode?.trim(),
    );

    if (!missingReferralCodeAccounts.length) return;

    hasAdminBackfilledReferralCodesRef.current = true;

    void Promise.all(
      missingReferralCodeAccounts.map((account) =>
        mutateAccountState({
          action: "upsert_account",
          account: {
            ...account,
            profile: {
              ...account.profile,
              referralCode: "",
            },
          },
        }),
      ),
    )
      .then((results) => {
        const latest = results.at(-1);
        if (latest?.accounts?.length) {
          setAccounts(latest.accounts);
        }
      })
      .catch(() => {
        hasAdminBackfilledReferralCodesRef.current = false;
      });
  }, [accounts, isAdmin, user.signedIn]);

  useEffect(() => {
    if (typeof window === "undefined" || !liveProfile.username) return;
    setProfileShareUrl(`${window.location.origin}/?profile=${encodeURIComponent(liveProfile.username.trim().toLowerCase())}`);
  }, [liveProfile.username]);

  useEffect(() => {
    if (typeof window === "undefined" || !accounts.length) return;
    const usernameParam = new URLSearchParams(window.location.search).get("profile")?.trim().toLowerCase();
    if (!usernameParam) return;

    const matchedAccount = accounts.find((account) => account.profile.username.trim().toLowerCase() === usernameParam);
    if (!matchedAccount?.googleProfile?.email) return;
    setSelectedProfileEmail(matchedAccount.googleProfile.email);
  }, [accounts, user.signedIn]);
  const adminAccount =
    accounts.find((account) => account.googleProfile?.email?.toLowerCase() === ADMIN_EMAIL) ?? null;
  const adminProfilePicture = getAccountPicture(adminAccount);
  const nonAdminAccounts = accounts.filter((account) => account.googleProfile?.email?.toLowerCase() !== ADMIN_EMAIL);
  const nonAdminEmailSet = new Set(
    nonAdminAccounts
      .map((account) => account.googleProfile?.email?.toLowerCase() ?? "")
      .filter(Boolean),
  );
  const cityBreakdown = nonAdminAccounts.reduce<Record<string, number>>((acc, account) => {
    const key = account.profile.city || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const totalSignups = nonAdminAccounts.length;
  const sortedCityBreakdown = Object.entries(cityBreakdown).sort(([, a], [, b]) => b - a);
  const completedReferralAccounts = nonAdminAccounts.filter(
    (account) => account.profile.referralCompletedAt && account.profile.referredByEmail,
  );
  const referralRows = nonAdminAccounts
    .map((account) => {
      const email = account.googleProfile?.email?.toLowerCase() ?? "";
      const referrals = completedReferralAccounts.filter((candidate) => candidate.profile.referredByEmail?.toLowerCase() === email);
      return {
        inviter: account,
        successfulReferrals: referrals.length,
        qualified: referrals.length >= 2,
        referredAccounts: referrals,
      };
    })
    .sort((a, b) => b.successfulReferrals - a.successfulReferrals || a.inviter.profile.fullName.localeCompare(b.inviter.profile.fullName));
  const qualifiedReferralCount = referralRows.filter((row) => row.qualified).length;
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
  const selectedAnnouncement =
    announcements.find((announcement) => announcement.id === selectedAnnouncementId) ??
    latestAnnouncement;
  const now = new Date();
  const dareReleaseDate = new Date(dare.releaseAt);
  const dareCloseDate = new Date(dare.closesAt);
  const isDareLiveWindow = now >= dareReleaseDate && now <= dareCloseDate;
  const isPreDareWindow = now < dareReleaseDate;
  const dareReleaseText = dareReleaseDate.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dareSubmissionsCloseText = new Date(dare.closesAt).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const draftReleaseText = new Date(fromLocalDateTimeValue(dareReleaseAtDraft, dare.releaseAt)).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const draftCloseText = new Date(fromLocalDateTimeValue(dareClosesAtDraft, dare.closesAt)).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const currentUserAcceptedDare = Boolean(user.googleProfile?.email && dare.acceptedEmails.includes(user.googleProfile.email));
  const currentUserDareReminder = Boolean(user.googleProfile?.email && dare.reminderEmails.includes(user.googleProfile.email));
  const dareReminderEvent = getDareReminderEvent(dare);
  const dareReminderNotificationId = `dare-reminder-${dare.id}-${isDareLiveWindow ? "live" : "scheduled"}`;
  const currentUserDareSubmission =
    dare.submissions.find((submission) => submission.authorEmail.toLowerCase() === (user.googleProfile?.email?.toLowerCase() ?? "")) ?? null;
  const winningDareSubmission =
    dare.winnerSubmissionId ? dare.submissions.find((submission) => submission.id === dare.winnerSubmissionId) ?? null : null;
  const userManagementRows = [...accounts]
    .filter((account) => account.googleProfile?.email?.toLowerCase() !== ADMIN_EMAIL)
    .sort((a, b) => (b.signedIn ? 1 : 0) - (a.signedIn ? 1 : 0));
  const duplicateUsernames = userManagementRows.reduce<Record<string, number>>((acc, account) => {
    const username = account.profile.username.trim().toLowerCase();
    if (!username) return acc;
    acc[username] = (acc[username] ?? 0) + 1;
    return acc;
  }, {});
  const duplicateUsernameCount = Object.values(duplicateUsernames).filter((count) => count > 1).length;
  const accountByEmail = new Map(
    accounts
      .filter((account) => account.googleProfile?.email)
      .map((account) => [account.googleProfile?.email?.toLowerCase() ?? "", account] as const),
  );
  const accountByUsername = new Map(
    accounts
      .map((account) => {
        const username = account.profile.username.trim().toLowerCase();
        return username && account.googleProfile?.email ? ([username, account] as const) : null;
      })
      .filter((entry): entry is readonly [string, StoredUser] => Boolean(entry)),
  );
  const resolveChallenger = (email: string, submission?: DareSubmission | null) => {
    const account = accountByEmail.get(email.toLowerCase()) ?? null;
    const fallbackName = submission?.authorName || getSafePublicIdentity({ email });

    return {
      email,
      name: account?.profile.fullName || account?.googleProfile?.name || fallbackName,
      username: account?.profile.username || "",
      meta: formatProfileMeta(account?.profile.city ?? "", account?.profile.schoolName ?? ""),
      picture: getAccountPicture(account),
      submission: submission ?? null,
    };
  };
  const reminderChallengers = dare.reminderEmails.map((email) => resolveChallenger(email));
  const acceptedChallengers = dare.acceptedEmails.map((email) => resolveChallenger(email));
  const proofChallengers = dare.submissions.map((submission) => resolveChallenger(submission.authorEmail, submission));
  const adminPosts = posts.filter((post) => post.authorRole !== "student");
  const currentUserEmail = user.googleProfile?.email?.toLowerCase() ?? "";
  const friendEmails = liveProfile.friends.map((email) => email.toLowerCase());
  const today = new Date();
  const canSubmitWeeklyDumpToday = isSunday(today);
  const shouldShowSundayDumpFeed = canSubmitWeeklyDumpToday;
  const currentSundayKey = getSundayKey(today);
  const studentDailyPosts = posts
    .filter((post) => post.authorRole === "student" && post.type !== "weekly-dump")
    .filter((post) => nonAdminEmailSet.has(post.authorEmail.toLowerCase()))
    .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const studentWeeklyDumps = posts
    .filter((post) => post.authorRole === "student" && post.type === "weekly-dump")
    .filter((post) => isCurrentWeeklyDump(post, currentSundayKey))
    .filter((post) => nonAdminEmailSet.has(post.authorEmail.toLowerCase()));
  const visibleStudentWeeklyDumps = studentWeeklyDumps.filter((post) => {
    const authorEmail = post.authorEmail.toLowerCase();
    return authorEmail === currentUserEmail || friendEmails.includes(authorEmail);
  });
  const visibleStudentDailyPosts = studentDailyPosts.filter((post) => {
    const authorEmail = post.authorEmail.toLowerCase();
    return authorEmail === currentUserEmail || friendEmails.includes(authorEmail);
  });
  const friendDailyFeedPosts = visibleStudentDailyPosts.filter((post) => {
    const authorEmail = post.authorEmail.toLowerCase();
    return authorEmail !== currentUserEmail;
  });
  const friendWeeklyDumps = visibleStudentWeeklyDumps.filter(
    (post) => post.authorEmail.toLowerCase() !== currentUserEmail,
  );
  const adminLiveStoryPosts = adminPosts.filter((post) => isLiveStory(post)).slice(0, 8);
  const adminArchivedStoryPosts = adminPosts
    .filter((post) => post.type === "story" && !isLiveStory(post))
    .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const adminStorySequence = [...adminLiveStoryPosts].reverse();
  const adminFeedPosts = adminPosts.filter((post) => post.type !== "story");
  const adminPostArchive = [...adminFeedPosts].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const mixedHomeFeedPosts = [...adminFeedPosts, ...friendDailyFeedPosts].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const authoredWeeklyDumps = studentWeeklyDumps.filter(
    (post) => post.authorEmail.toLowerCase() === (user.googleProfile?.email?.toLowerCase() ?? ""),
  );
  const currentUserWeeklyDump =
    authoredWeeklyDumps.find((post) => post.weekKey === currentSundayKey) ??
    authoredWeeklyDumps.find((post) => post.id === `weekly-dump-${currentUserEmail}-${currentSundayKey}`) ??
    authoredWeeklyDumps[0] ??
    null;
  const nonAdminUserPosts = posts
    .filter((post) => nonAdminEmailSet.has(post.authorEmail.toLowerCase()))
    .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const currentUserAllPosts = [...studentDailyPosts, ...studentWeeklyDumps]
    .filter((post) => post.authorEmail.toLowerCase() === currentUserEmail)
    .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const selectedOwnPost = selectedOwnPostId
    ? currentUserAllPosts.find((post) => post.id === selectedOwnPostId) ?? null
    : null;
  const selectedStoryPostIndex = selectedStoryPostId
    ? adminStorySequence.findIndex((post) => post.id === selectedStoryPostId)
    : -1;
  const selectedStoryPost = selectedStoryPostIndex >= 0 ? adminStorySequence[selectedStoryPostIndex] : null;
  const selectedProfileAccount = selectedProfileEmail ? accountByEmail.get(selectedProfileEmail.toLowerCase()) ?? null : null;
  const selectedProfileUsername = selectedProfileAccount?.profile.username.trim().toLowerCase() ?? "";
  const selectedProfileAuthoredPosts = selectedProfileEmail
    ? [...studentDailyPosts, ...studentWeeklyDumps]
        .filter((post) => post.authorEmail.toLowerCase() === selectedProfileEmail.toLowerCase())
        .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))
    : [];
  const selectedProfileTaggedPosts = selectedProfileUsername
    ? [...studentDailyPosts, ...studentWeeklyDumps]
        .filter((post) => post.authorEmail.toLowerCase() !== selectedProfileEmail?.toLowerCase())
        .filter((post) => extractTaggedUsernames(post.body).includes(selectedProfileUsername))
        .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))
    : [];
  const selectedProfileEmailLower = selectedProfileEmail?.toLowerCase() ?? "";
  const selectedProfileIsOwn = Boolean(selectedProfileEmailLower && selectedProfileEmailLower === currentUserEmail);
  const selectedProfileIsFriend = Boolean(selectedProfileEmailLower && liveProfile.friends.includes(selectedProfileEmailLower));
  const selectedProfileRequestPending = Boolean(selectedProfileEmailLower && liveProfile.outgoingFriendRequests.includes(selectedProfileEmailLower));
  const selectedProfileIncomingRequest = Boolean(selectedProfileEmailLower && liveProfile.incomingFriendRequests.includes(selectedProfileEmailLower));
  const activeWeeklyDumpMediaUrls = weeklyDumpMediaUrls.length ? weeklyDumpMediaUrls : currentUserWeeklyDump?.mediaUrls ?? [];
  const activeWeeklyDumpCaption = weeklyDumpCaption || currentUserWeeklyDump?.body || "";
  const validPostIds = new Set(posts.map((post) => post.id));
  const filteredInteractions = Object.fromEntries(
    Object.entries(interactions).map(([postId, bucket]) => [
      postId,
      {
        comments: bucket.comments.filter((comment) => nonAdminEmailSet.has(comment.authorEmail.toLowerCase())),
        shares: bucket.shares.filter((share) => nonAdminEmailSet.has(share.authorEmail.toLowerCase())),
        likes: bucket.likes.filter((like) => nonAdminEmailSet.has(like.authorEmail.toLowerCase())),
      },
    ]),
  );
  const totalComments = Object.entries(filteredInteractions)
    .filter(([postId]) => validPostIds.has(postId))
    .reduce((sum, [, item]) => sum + item.comments.length, 0);
  const totalShares = Object.entries(filteredInteractions)
    .filter(([postId]) => validPostIds.has(postId))
    .reduce((sum, [, item]) => sum + item.shares.length, 0);
  const totalLikes = Object.entries(filteredInteractions)
    .filter(([postId]) => validPostIds.has(postId))
    .reduce((sum, [, item]) => sum + item.likes.length, 0);
  const uniqueCommenters = new Set(
    Object.entries(filteredInteractions)
      .filter(([postId]) => validPostIds.has(postId))
      .flatMap(([, item]) => item.comments.map((comment) => comment.authorEmail)),
  ).size;
  const uniqueSharers = new Set(
    Object.entries(filteredInteractions)
      .filter(([postId]) => validPostIds.has(postId))
      .flatMap(([, item]) => item.shares.map((share) => share.authorEmail)),
  ).size;
  const normalizedFriendQuery = friendQuery.trim().replace(/^@+/, "").toLowerCase();
  const exactFriendMatch = accounts.find((account) => {
    const email = account.googleProfile?.email ?? "";
    const username = account.profile.username?.trim().toLowerCase() ?? "";
    if (!normalizedFriendQuery || !username) return false;
    if (email.toLowerCase() === ADMIN_EMAIL) return false;
    if (email.toLowerCase() === (user.googleProfile?.email?.toLowerCase() ?? "")) return false;
    if (liveProfile.friends.some((friendEmail) => friendEmail.toLowerCase() === email.toLowerCase())) return false;
    if (liveProfile.outgoingFriendRequests.some((requestEmail) => requestEmail.toLowerCase() === email.toLowerCase())) return false;
    if (liveProfile.incomingFriendRequests.some((requestEmail) => requestEmail.toLowerCase() === email.toLowerCase())) return false;

    return username === normalizedFriendQuery;
  });
  const favoritePlaceIds = liveProfile.favoritePlaceIds ?? [];
  const favoriteActivities = liveProfile.favoriteActivities ?? [];
  const currentFavoriteCity = favoriteViewCity ?? liveProfile.city;
  const favoriteCityCenter = cityCenters[normalizeCityKey(currentFavoriteCity)] ?? [52.2297, 21.0122];
  const dailyPostCity = liveProfile.city || currentFavoriteCity || "Warsaw";
  const dailyPostCityCenter = cityCenters[normalizeCityKey(dailyPostCity)] ?? favoriteCityCenter;
  const profileLikedSpots = favoritePlaceIds
    .map(
      (placeId) =>
        favoritePlaces.find((place) => place.id === placeId) ??
        allFoodSpots.find((place) => place.id === placeId) ??
        (() => {
          const activity = favoriteActivities.find((item) => item.placeId === placeId) ?? null;
          if (!activity) return null;

          return {
            id: activity.placeId,
            name: activity.placeName,
            kind: activity.placeKind,
            lat: activity.lat,
            lon: activity.lon,
            address: activity.placeAddress,
          } satisfies FavoritePlace;
        })() ??
        null,
    )
    .filter((place): place is FavoritePlace => Boolean(place));
  const friendAccounts = accounts.filter((account) => {
    const email = account.googleProfile?.email ?? "";
    return email.toLowerCase() !== ADMIN_EMAIL && liveProfile.friends.includes(email);
  });
  const dailyPostMentionFriends = friendAccounts
    .map((account) => ({
      email: account.googleProfile?.email ?? "",
      username: account.profile.username.trim(),
      usernameLower: account.profile.username.trim().toLowerCase(),
      fullName: account.profile.fullName || account.googleProfile?.name || account.profile.username,
      picture: getAccountPicture(account),
    }))
    .filter((friend) => friend.username);
  const dailyPostMentionSuggestions = dailyPostMentionRange
    ? dailyPostMentionFriends
        .filter((friend) => !dailyPostMentionQuery || friend.usernameLower.startsWith(dailyPostMentionQuery))
        .slice(0, 6)
    : [];
  const shouldShowFeedAnnouncementCard = user.signedIn && (liveProfile.friends.length === 0 || (friendDailyFeedPosts.length === 0 && friendWeeklyDumps.length === 0));
  const citySpotlightName = liveProfile.city || "Lodz";
  const citySnapshot = {
    mostPostedSpot: friendDailyFeedPosts[0]?.title ?? friendWeeklyDumps[0]?.title ?? foodSpotCounts[0]?.name ?? "community drops loading",
    mostLikedFood: foodSpotCounts[0]?.name ?? "most-liked food loading",
    hottestNeighbourhood: liveProfile.city || "Lodz",
    hiddenGem: favoritePlaces[0]?.name ?? "new hidden gem loading",
  };
  const friendFoodMoments = [
    ...friendDailyFeedPosts.slice(0, 3).map((post) => ({
      id: post.id,
      title: `${post.authorName} posted ${formatRelativePostTime(post.createdAtIso, post.createdAt)}`,
      detail: post.body || "fresh food photos just landed",
      city: "",
      place: null,
    })),
    ...friendAccounts
      .flatMap((account) =>
        (account.profile.favoritePlaceIds ?? []).slice(0, 1).map((placeId) => {
          const matchedPlace = allFoodSpots.find((place) => place.id === placeId);
          return matchedPlace
            ? {
                id: `${account.googleProfile?.email}-like-${placeId}`,
                title: `${account.profile.fullName} liked ${matchedPlace.name}`,
                detail: matchedPlace.address,
                city: account.profile.city || liveProfile.city,
                place: matchedPlace,
              }
            : null;
        }),
      )
      .filter((item): item is { id: string; title: string; detail: string; city: string; place: FavoritePlace } => Boolean(item)),
  ].slice(0, 4);
  const storyRailItems = adminStorySequence.length
    ? [
        {
          id: "crumbz-story-rail",
          postId: adminStorySequence[0]?.id ?? null,
          label: "crumbz",
          detail: adminStorySequence.length > 1 ? `${adminStorySequence.length} stories` : adminStorySequence[0]?.title ?? "live",
          picture: adminProfilePicture,
          ring: "#F5A623",
          badge: "live",
        },
      ]
    : [
        {
          id: "crumbz-placeholder",
          postId: null,
          label: "crumbz",
          detail: "coming soon",
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
          picture: getAccountPicture(account),
        })),
    ]),
  ) as Record<string, { email: string; name: string; username: string; picture?: string }[]>;
  const sharedFavoriteMoments = favoritePlaces
    .map((place) => ({
      place,
      fans: mutualFansByPlace[place.id] ?? [],
    }))
    .filter((item) => item.fans.length > 0)
    .sort((a, b) => b.fans.length - a.fans.length)
    .slice(0, 8);
  const friendFavoriteNotifications = friendAccounts
    .flatMap((account) =>
      (account.profile.favoriteActivities ?? []).map((activity) => {
        const copy = buildFriendFavoriteNotification({
          username: account.profile.username ? `@${account.profile.username}` : "@yourfriend",
          placeName: activity.placeName,
          seed: activity.id,
        });

        return {
          id: activity.id,
          kind: "friend_favorite" as const,
          title: copy.title,
          detail: copy.body,
          picture: getAccountPicture(account),
          createdAt: activity.createdAt,
          sortTime: Date.parse(activity.createdAt) || 0,
          city: activity.city || account.profile.city,
          place: {
            id: activity.placeId,
            name: activity.placeName,
            kind: activity.placeKind,
            lat: activity.lat,
            lon: activity.lon,
            address: activity.placeAddress,
          } satisfies FavoritePlace,
        };
      }),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const rawNotificationItems = [
    ...announcements.slice(0, 4).map((announcement) => {
      const copy = buildAnnouncementNotification({
        title: announcement.title,
        body: announcement.body,
        seed: announcement.id,
      });

      return {
        id: announcement.id,
        kind: "announcement" as const,
        title: copy.title,
        detail: copy.body,
        picture: adminProfilePicture,
        sortTime: Number(announcement.id.replace(/\D/g, "")) || 0,
      };
    }),
    ...liveProfile.incomingFriendRequests
      .map((requestEmail, index, requests) => {
        const requester = accounts.find((account) => account.googleProfile?.email === requestEmail);
        if (!requester || requestEmail.toLowerCase() === ADMIN_EMAIL) return null;
        const copy = buildFriendRequestNotification(
          requester.profile.fullName || requester.googleProfile?.name || "someone",
          requester.profile.username ? `@${requester.profile.username}` : "@someone",
          `friend-${requestEmail}`,
        );

        return {
          id: `friend-${requestEmail}`,
          kind: "friend_request" as const,
          title: copy.title,
          detail: copy.body,
          email: requestEmail,
          picture: getAccountPicture(requester),
          sortTime: Date.now() - (requests.length - index),
        };
      })
      .filter(Boolean),
    ...[...adminLiveStoryPosts, ...adminFeedPosts]
      .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))
      .slice(0, 6)
      .map((post) => {
        const copy = buildAdminPostNotification({
          postType: post.type,
          title: post.title,
          body: post.body,
          cta: post.cta,
          seed: post.id,
        });

        return {
          id: `admin-post-${post.id}`,
          kind: "admin_post" as const,
          title: copy.title,
          detail: copy.body,
          postId: post.id,
          sortTime: getPostTimestamp(post),
        };
      }),
    ...[...friendDailyFeedPosts, ...friendWeeklyDumps]
      .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))
      .slice(0, 6)
      .map((post) => {
        const authorAccount = accounts.find((account) => account.googleProfile?.email === post.authorEmail);
        const copy = buildFriendPostNotification({
          authorName: post.authorName,
          username: authorAccount?.profile.username ? `@${authorAccount.profile.username}` : "@yourfriend",
          placeName: post.taggedPlaceName,
          isWeeklyDump: post.type === "weekly-dump",
          seed: post.id,
        });

        return {
          id: `friend-dump-${post.id}`,
          kind: "friend_dump" as const,
          title: copy.title,
          detail: copy.body,
          postId: post.id,
          picture: getAccountPicture(authorAccount),
          sortTime: getPostTimestamp(post),
        };
      }),
    ...[...studentDailyPosts, ...studentWeeklyDumps]
      .filter((post) => post.authorEmail.toLowerCase() !== currentUserEmail)
      .filter((post) => extractTaggedUsernames(post.body).includes(liveProfile.username.trim().toLowerCase()))
      .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))
      .slice(0, 6)
      .map((post) => {
        const authorAccount = accounts.find((account) => account.googleProfile?.email === post.authorEmail);
        const copy = buildTaggedPostNotification({
          authorName: post.authorName,
          username: authorAccount?.profile.username ? `@${authorAccount.profile.username}` : "@someone",
          placeName: post.taggedPlaceName,
          seed: `tagged-${post.id}`,
        });

        return {
          id: `tagged-post-${post.id}-${liveProfile.username.trim().toLowerCase()}`,
          kind: "tagged_post" as const,
          title: copy.title,
          detail: copy.body,
          postId: post.id,
          picture: getAccountPicture(authorAccount),
          sortTime: getPostTimestamp(post),
        };
      }),
    ...friendFavoriteNotifications,
  ];
  const notificationItems = rawNotificationItems
    .filter((item): item is NonNullable<(typeof rawNotificationItems)[number]> => Boolean(item))
    .sort((a, b) => ("sortTime" in b ? b.sortTime : 0) - ("sortTime" in a ? a.sortTime : 0)) as Array<
    | { id: string; kind: "dare_reminder"; title: string; detail: string; picture?: string; sortTime: number }
    | { id: string; kind: "announcement"; title: string; detail: string; picture?: string; sortTime: number }
    | { id: string; kind: "friend_request"; title: string; detail: string; email: string; picture?: string; sortTime: number }
    | { id: string; kind: "friend_favorite"; title: string; detail: string; picture?: string; createdAt: string; city: string; place: FavoritePlace; sortTime: number }
    | { id: string; kind: "admin_post" | "friend_dump" | "tagged_post"; title: string; detail: string; postId: string; picture?: string; sortTime: number }
  >;
  const unreadNotificationItems = notificationItems.filter((item) => !seenNotificationIds.includes(item.id));
  const notificationCount = unreadNotificationItems.length;

  const openProfileByUsername = (username: string) => {
    const matchedAccount = accountByUsername.get(username.trim().toLowerCase());
    const nextEmail = matchedAccount?.googleProfile?.email;
    if (!nextEmail) return;
    setSelectedProfileEmail(nextEmail);
  };

  const renderCaptionWithTags = (text: string, className = "") => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(USERNAME_MENTION_REGEX)) {
      const [fullMatch, prefix = "", username = ""] = match;
      const startIndex = match.index ?? 0;

      if (startIndex > lastIndex) {
        parts.push(text.slice(lastIndex, startIndex));
      }

      if (prefix) {
        parts.push(prefix);
      }

      const taggedAccount = accountByUsername.get(username.toLowerCase());
      if (taggedAccount?.googleProfile?.email) {
        parts.push(
          <button
            key={`${startIndex}-${username}`}
            type="button"
            onClick={() => openProfileByUsername(username)}
            className="font-semibold text-[#F5A623] transition hover:text-[#d88b10]"
          >
            @{username}
          </button>,
        );
      } else {
        parts.push(`@${username}`);
      }

      lastIndex = startIndex + fullMatch.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return <p className={className}>{parts.length ? parts : text}</p>;
  };

  const renderFeedCard = (post: AppPost, detail = false) => {
    const bucket = getInteractionBucket(interactions, post.id);
    const visibleComments = bucket.comments.filter((comment) => !comment.hidden);
    const currentUserEmail = user.googleProfile?.email?.toLowerCase() ?? "";
    const hasLiked = bucket.likes.some((like) => like.authorEmail.toLowerCase() === currentUserEmail);
    const isStudentPost = post.authorRole === "student";
    const isSundayDump = post.type === "weekly-dump";
    const authorAccount = accounts.find((account) => account.googleProfile?.email === post.authorEmail);
    const authorUsername = authorAccount?.profile.username ? `@${authorAccount.profile.username}` : post.authorName;
    const profileMeta = authorAccount ? formatProfileMeta(authorAccount.profile.city, authorAccount.profile.schoolName) : "";
    const showPostBody = Boolean(post.body.trim()) && (!isStudentPost || post.body.trim() !== profileMeta);
    const canOpenProfile = isStudentPost && post.authorEmail.toLowerCase() !== currentUserEmail;
    const isFriendFeedCard = isStudentPost && !isSundayDump;
    const ctaLabel = post.cta === "live now" ? "post" : post.cta;
    const commentUsernamesByEmail = new Map(
      accounts
        .filter((account) => account.googleProfile?.email && account.profile.username)
        .map((account) => [account.googleProfile?.email?.toLowerCase() ?? "", `@${account.profile.username}`]),
    );

    return (
      <Card
        id={`post-${post.id}`}
        key={post.id}
        className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]"
      >
        <CardHeader className="flex flex-wrap items-start gap-3 px-5 pb-0 pt-5">
          {canOpenProfile ? (
            <button type="button" onClick={() => setSelectedProfileEmail(post.authorEmail)} className="shrink-0 rounded-full">
              <Avatar
                src={
                  isStudentPost
                    ? getAccountPicture(accounts.find((account) => account.googleProfile?.email === post.authorEmail))
                    : adminProfilePicture
                }
                name={isStudentPost ? post.authorName : "C"}
                className={isStudentPost ? "bg-[#FFF0D0] text-[#F5A623]" : "bg-[#F5A623] text-white"}
              />
            </button>
          ) : (
            <Avatar
              src={
                isStudentPost
                  ? getAccountPicture(accounts.find((account) => account.googleProfile?.email === post.authorEmail))
                  : adminProfilePicture
              }
              name={isStudentPost ? post.authorName : "C"}
              className={isStudentPost ? "bg-[#FFF0D0] text-[#F5A623]" : "bg-[#F5A623] text-white"}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold text-[#2C1A0E]">
              {isStudentPost ? authorUsername : "crumbz"}
            </p>
            {isSundayDump && isStudentPost ? (
              profileMeta ? <p className="text-sm text-[#6c7289]">{profileMeta}</p> : null
            ) : !isSundayDump ? (
              <p className="text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
                {isStudentPost ? formatRelativePostTime(post.createdAtIso, post.createdAt) : `${post.type} • ${post.createdAt}`}
              </p>
            ) : null}
          </div>
          <Chip className="max-w-full shrink-0 bg-[#FFF0D0] text-[#F5A623]">{ctaLabel}</Chip>
        </CardHeader>
        <CardBody className="gap-4 p-5">
          {isSundayDump ? (
            showPostBody ? renderCaptionWithTags(post.body, "text-base leading-7 text-[#2C1A0E]") : null
          ) : isFriendFeedCard ? null : (
            <div className="rounded-[24px] bg-[linear-gradient(180deg,_#FFF0D0_0%,_#ffffff_100%)] p-5 ring-1 ring-[#FFF0D0]">
              <h3 className="font-[family-name:var(--font-young-serif)] text-[2rem] leading-none text-[#2C1A0E]">{post.title}</h3>
              {post.taggedPlaceName ? (
                <button
                  type="button"
                  onClick={() => openPostPlace(post)}
                  className="mt-3 flex w-full items-start justify-between gap-3 rounded-[18px] bg-white/90 px-4 py-3 text-left shadow-[0_10px_24px_rgba(44,26,14,0.06)]"
                >
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#B56D19]">{post.taggedPlaceKind || "food spot"}</p>
                    <p className="mt-1 truncate text-base font-semibold text-[#2C1A0E]">{post.taggedPlaceName}</p>
                    {post.taggedPlaceAddress ? <p className="mt-1 truncate text-sm text-[#6c7289]">{post.taggedPlaceAddress}</p> : null}
                  </div>
                  <span className="rounded-full bg-[#FFF0D0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A623]">map</span>
                </button>
              ) : null}
              {showPostBody ? renderCaptionWithTags(post.body, "mt-2 text-sm leading-6 text-[#2C1A0E]") : null}
              {post.tasteTag || post.priceTag ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tasteTag ? <Chip className="bg-[#2C1A0E] text-white">{post.tasteTag}</Chip> : null}
                  {post.priceTag ? <Chip className="bg-white text-[#2C1A0E]">{PRICE_TAG_OPTIONS.find((item) => item.key === post.priceTag)?.label ?? post.priceTag}</Chip> : null}
                </div>
              ) : null}
            </div>
          )}

          {post.mediaKind !== "none" ? (
            post.mediaUrls.length ? (
              <PostMediaPreview post={post} detail={detail} />
            ) : (
              <div className="rounded-[18px] border border-dashed border-[#FFF0D0] bg-white px-3 py-4 text-sm text-[#2C1A0E]">
                this post’s media needs one re-upload from the admin side.
              </div>
            )
          ) : null}

          {isFriendFeedCard && showPostBody ? renderCaptionWithTags(post.body, "text-base leading-7 text-[#2C1A0E]") : null}

          {isFriendFeedCard && post.taggedPlaceName ? (
            <button
              type="button"
              onClick={() => openPostPlace(post)}
              className="flex w-full items-start justify-between gap-3 rounded-[18px] bg-[linear-gradient(180deg,_#FFF8EA_0%,_#ffffff_100%)] px-4 py-3 text-left ring-1 ring-[#FFF0D0]"
            >
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-[#B56D19]">{post.taggedPlaceKind || "food spot"}</p>
                <p className="mt-1 truncate text-base font-semibold text-[#2C1A0E]">{post.taggedPlaceName}</p>
                {post.taggedPlaceAddress ? <p className="mt-1 truncate text-sm text-[#6c7289]">{post.taggedPlaceAddress}</p> : null}
              </div>
              <span className="rounded-full bg-[#FFF0D0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A623]">map</span>
            </button>
          ) : null}

          {isFriendFeedCard && (post.tasteTag || post.priceTag) ? (
            <div className="flex flex-wrap gap-2">
              {post.tasteTag ? <Chip className="bg-[#2C1A0E] text-white">{post.tasteTag}</Chip> : null}
              {post.priceTag ? <Chip className="bg-white text-[#2C1A0E] ring-1 ring-[#FFF0D0]">{PRICE_TAG_OPTIONS.find((item) => item.key === post.priceTag)?.label ?? post.priceTag}</Chip> : null}
            </div>
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

          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
            <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{bucket.likes.length} likes</span>
            <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{visibleComments.length} comments</span>
            <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{bucket.shares.length} shares</span>
          </div>

          <div className="space-y-3">
            {visibleComments.map((comment) => (
              <div key={comment.id} className="rounded-[18px] bg-[#FFF0D0] p-3">
                <p className="text-sm font-semibold text-[#2C1A0E]">
                  {commentUsernamesByEmail.get(comment.authorEmail.toLowerCase()) || comment.authorName}
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

  const ensureAuthenticatedSession = async (message?: string) => {
    if (await getAuthAccessToken()) return true;

    const nextMessage = message ?? "your session needs a quick refresh. sign out and sign back in with google, then try again.";
    if (isAdmin) {
      setAdminActionNotice(nextMessage);
    } else {
      setError(nextMessage);
    }

    return false;
  };

  const resetExpiredSession = (message?: string) => {
    persistUser(defaultUser);
    void supabaseBrowser.auth.signOut().catch(() => undefined);
    setFullName(null);
    setUsername(null);
    setCity(null);
    setIsStudent(null);
    setSchoolName(null);
    setAuthMode("login");
    setShowWelcomeScreen(false);
    setStudentTab("feed");
    setError(message ?? "your google session expired. sign in again.");
  };

  const syncPushSubscriptionToBackend = async (subscription: PushSubscription) => {
    const headers = await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    });
    const response = await fetch("/api/push-subscriptions", {
      method: "POST",
      headers,
      body: JSON.stringify({ subscription }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "push notifications didn’t connect.");
    }
  };

  const markPushPromptAsked = () => {
    if (typeof window === "undefined") return;
    const email = user.googleProfile?.email?.toLowerCase();
    if (!email) return;
    window.localStorage.setItem(getPushPromptAskedKey(email), "true");
  };

  const registerCrumbzServiceWorker = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !IS_PRODUCTION) {
      return null;
    }

    return navigator.serviceWorker.register("/crumbz-sw.js");
  };

  const enablePushNotifications = async () => {
    if (!(await ensureAuthenticatedSession("sign in again first so we can turn on alerts for this account."))) {
      return;
    }

    if (!pushSupported || !WEB_PUSH_PUBLIC_KEY) {
      setPushNotice("open crumbz from the latest home-screen app and try again.");
      return;
    }

    setIsUpdatingPush(true);
    setPushNotice("");

    try {
      const registration = await registerCrumbzServiceWorker();
      if (!registration) {
        setPushNotice("notifications turn on in the live app, not the local build.");
        setPushEnabled(false);
        return;
      }
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== "granted") {
        markPushPromptAsked();
        setPushNotice(permission === "denied" ? "notifications are blocked on this device right now." : "notification setup was skipped.");
        setPushEnabled(false);
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeBase64Url(WEB_PUSH_PUBLIC_KEY),
        }));

      await syncPushSubscriptionToBackend(subscription);
      markPushPromptAsked();
      setPushEnabled(true);
      setPushPromptOpen(false);
      setPushNotice("real device alerts are on.");
    } catch {
      setPushNotice("notifications didn’t turn on. try again from the home-screen app.");
    } finally {
      setIsUpdatingPush(false);
    }
  };

  const disablePushNotifications = async () => {
    if (!pushSupported) return;

    setIsUpdatingPush(true);
    setPushNotice("");

    try {
      const registration = await registerCrumbzServiceWorker();
      if (!registration) {
        setPushEnabled(false);
        setPushNotice("");
        return;
      }
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const headers = await getAuthenticatedHeaders({
          "Content-Type": "application/json",
        });
        await fetch("/api/push-subscriptions", {
          method: "DELETE",
          headers,
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);
        await subscription.unsubscribe().catch(() => undefined);
      }

      setPushEnabled(false);
      setPushNotice("device alerts are off.");
    } catch {
      setPushNotice("couldn’t turn alerts off right now.");
    } finally {
      setIsUpdatingPush(false);
    }
  };

  const syncSharedState = async ({
    nextPosts,
    nextInteractions,
    nextDare,
    nextAnnouncements,
    deletePostId,
    source = "manual",
  }: {
    nextPosts?: AppPost[];
    nextInteractions?: InteractionsMap;
    nextDare?: DareState;
    nextAnnouncements?: AppAnnouncement[];
    deletePostId?: string;
    source?: "manual" | "auto";
  }) => {
    if (source === "manual") {
      lastManualSharedStateSyncAtRef.current = Date.now();
    }

    if (!(await ensureAuthenticatedSession(isAdmin ? "your admin session needs a quick refresh. sign out and sign back in with crumbleappco@gmail.com, then try again." : undefined))) {
      return;
    }

    const headers = await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    });
    void fetch("/api/state", {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify({
        ...(nextPosts ? { posts: serializePostsForStorage(nextPosts) } : {}),
        ...(nextInteractions ? { interactions: nextInteractions } : {}),
        ...(nextDare ? { dare: nextDare } : {}),
        ...(nextAnnouncements ? { announcements: nextAnnouncements } : {}),
        ...(deletePostId ? { deletePostId } : {}),
      }),
    })
      .then(async (response) => {
        if (response.ok) return;

        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        if (response.status === 401) {
          dispatchAuthExpired(payload?.message);
          return;
        }
        const fallbackMessage = isAdmin
          ? "that admin change didn’t stick. sign out and back in with crumbleappco@gmail.com, then try again."
          : "that change didn’t stick. sign out and back in with google, then try again.";
        const nextMessage = payload?.message ?? fallbackMessage;

        if (isAdmin) {
          setAdminActionNotice(nextMessage);
        } else {
          setError(nextMessage);
        }
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    const listener = (event: Event) => {
      const authEvent = event as CustomEvent<{ message?: string }>;
      resetExpiredSession(authEvent.detail?.message);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  }, []);

  useEffect(() => {
    const nextUser = readUser();
    const nextAccounts = readAccounts();
    const nextPosts = readPosts();
    const nextInteractions = readInteractions();
    const nextDare = readDare();

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
        setDare(nextDare);
        setDareHydrated(true);
        setAnnouncements([]);
        setSeenNotificationIds(readSeenNotifications());
        setUsername(nextUser.profile.username || (nextUser.googleProfile?.email?.toLowerCase() === "joshrejis@gmail.com" ? "joeydoesntsharefood" : ""));
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
            setAccounts(mergeAccountsPreferLocal(normalizeAccounts(payload.accounts), nextAccounts));
            setPosts([]);
            setInteractions({});
            setDare(normalizeDareState(payload.dare));
            setDareHydrated(true);
            setAnnouncements((payload.announcements ?? []) as AppAnnouncement[]);
          } else {
            setAccounts(mergeAccountsPreferLocal(normalizeAccounts(payload.accounts), nextAccounts));
            setPosts(normalizePosts((payload.posts ?? []) as Partial<AppPost>[]));
            setInteractions(normalizeInteractions(payload.interactions));
            setDare(normalizeDareState(payload.dare));
            setDareHydrated(true);
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
    if (lastDraftSyncedDareIdRef.current === dare.id) return;

    setDareTitleDraft(dare.title);
    setDarePromptDraft(dare.prompt);
    setDareRewardDraft(dare.reward);
    setDareReleaseAtDraft(toLocalDateTimeValue(dare.releaseAt));
    setDareClosesAtDraft(toLocalDateTimeValue(dare.closesAt));
    lastDraftSyncedDareIdRef.current = dare.id;
  }, [dare.closesAt, dare.id, dare.prompt, dare.releaseAt, dare.reward, dare.title]);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    let cancelled = false;

    void supabaseBrowser.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session && userRef.current.signedIn) {
        resetExpiredSession("sign in with google to keep going.");
      }
    });

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session || !userRef.current.signedIn) return;
      resetExpiredSession("sign in with google to keep going.");
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const currentEmail = user.googleProfile?.email?.toLowerCase();
    if (!currentEmail || !accounts.length) return;

    const freshAccount = accounts.find((account) => account.googleProfile?.email?.toLowerCase() === currentEmail);
    if (!freshAccount) {
      if (!user.signedIn) return;

      persistUser(defaultUser);
      void supabaseBrowser.auth.signOut().catch(() => undefined);
      setFullName(null);
      setUsername(null);
      setCity(null);
      setIsStudent(null);
      setSchoolName(null);
      setAuthMode("login");
      setShowWelcomeScreen(false);
      setStudentTab("feed");
      setError("that account was removed. sign up or log in with another google account.");
      return;
    }

    const currentSerialized = JSON.stringify(user);
    const freshSerialized = JSON.stringify(freshAccount);
    if (currentSerialized === freshSerialized) return;

    persistUser(freshAccount);
  }, [accounts, user]);

  useEffect(() => {
    authModeRef.current = authMode;
  }, [authMode]);

  useEffect(() => {
    if (!user.signedIn || isAdmin) {
      setPushEnabled(false);
      setPushPromptOpen(false);
      setPushNotice("");
      return;
    }

    const refresh = async () => {
      if (typeof window === "undefined" || !("Notification" in window) || !IS_PRODUCTION) {
        setPushSupported(false);
        setPushPermission("unsupported");
        setPushEnabled(false);
        return;
      }

      setPushSupported(Boolean(WEB_PUSH_PUBLIC_KEY));
      setPushPermission(Notification.permission);

      if (!WEB_PUSH_PUBLIC_KEY) {
        setPushEnabled(false);
        return;
      }

      try {
        const registration = await registerCrumbzServiceWorker();
        if (!registration) {
          setPushSupported(false);
          setPushEnabled(false);
          return;
        }
        if (!("pushManager" in registration)) {
          setPushSupported(false);
          setPushEnabled(false);
          return;
        }

        setPushSupported(true);
        const subscription = await registration.pushManager.getSubscription();
        setPushEnabled(Boolean(subscription));

        if (subscription) {
          await syncPushSubscriptionToBackend(subscription).catch(() => undefined);
        }
      } catch {
        setPushSupported(false);
        setPushEnabled(false);
      }
    };

    void refresh();
  }, [isAdmin, user.signedIn]);

  useEffect(() => {
    if (typeof window === "undefined" || !user.signedIn || isAdmin || pushEnabled) {
      setPushPromptOpen(false);
      return;
    }

    const email = user.googleProfile?.email?.toLowerCase();
    if (!email) return;
    if (!pushSupported || pushPermission === "unsupported" || pushPermission === "denied") return;

    const hasSeenPrompt = window.localStorage.getItem(getPushPromptAskedKey(email)) === "true";
    if (!hasSeenPrompt) {
      setPushPromptOpen(true);
    }
  }, [isAdmin, pushEnabled, pushPermission, pushSupported, user.googleProfile?.email, user.signedIn]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const referralCode = url.searchParams.get("ref")?.trim().toUpperCase() ?? "";

    if (referralCode) {
      window.localStorage.setItem(PENDING_REFERRAL_CODE_KEY, referralCode);
      setPendingReferralCode(referralCode);
      url.searchParams.delete("ref");
      window.history.replaceState(
        {
          ...(typeof window.history.state === "object" && window.history.state ? window.history.state : {}),
        } satisfies CrumbzHistoryState,
        "",
        url.toString(),
      );
      return;
    }

    setPendingReferralCode(window.localStorage.getItem(PENDING_REFERRAL_CODE_KEY)?.trim().toUpperCase() ?? "");
  }, [user.signedIn]);

  useEffect(() => {
    if (typeof window === "undefined" || user.signedIn) {
      setShowInstallPrompt(false);
      setInstallPromptMode(null);
      return;
    }

    const dismissed = window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === "true";
    if (dismissed || isStandaloneDisplayMode()) {
      setShowInstallPrompt(false);
      setInstallPromptMode(null);
      return;
    }

    if (isIosDevice()) {
      setInstallPromptMode("ios");
      setShowInstallPrompt(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallPromptMode("android");
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [user.signedIn]);

  useEffect(() => {
    if (!user.signedIn || isAdmin) return;

    const cityKey = normalizeCityKey(currentFavoriteCity);
    const center = cityCenters[cityKey];
    if (!center) {
      setFavoritePlaces(getFallbackFavoritePlaces(cityKey));
      setFavoritePlacesError("");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);
    const loadPlaces = async () => {
      setFavoritePlacesLoading(true);
      setFavoritePlacesError("");

      try {
        const params = new URLSearchParams({
          city: currentFavoriteCity,
          lat: String(center[0]),
          lon: String(center[1]),
          radius: "3500",
        });
        const response = await fetch(`/api/places?${params.toString()}`, { signal: controller.signal, cache: "no-store" });

        if (!response.ok) {
          throw new Error("places request failed");
        }

        const payload = (await response.json()) as { places?: FavoritePlace[] };
        const nextPlaces = (payload.places ?? []).filter(
          (place, index, list) => list.findIndex((item) => item.name === place.name) === index,
        );

        setFavoritePlaces(nextPlaces.length ? nextPlaces : getFallbackFavoritePlaces(cityKey));
      } catch {
        setFavoritePlaces(getFallbackFavoritePlaces(cityKey));
        setFavoritePlacesError("live map spots are loading from the fallback list right now.");
      } finally {
        setFavoritePlacesLoading(false);
        window.clearTimeout(timeoutId);
      }
    };

    void loadPlaces();

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [currentFavoriteCity, isAdmin, user.signedIn]);

  useEffect(() => {
    if (!user.signedIn || isAdmin) return;
    if (favoritePlacesLoading) return;

    const cityKey = normalizeCityKey(currentFavoriteCity);
    if (!favoritePlaces.length && cityKey) {
      const fallback = getFallbackFavoritePlaces(cityKey);
      if (fallback.length) {
        setFavoritePlaces(fallback);
        setFavoritePlacesError("");
      }
    }
  }, [currentFavoriteCity, favoritePlaces.length, favoritePlacesLoading, isAdmin, user.signedIn]);

  useEffect(() => {
    const query = dailyPostPlaceQuery.trim();

    if (query.length < 2) {
      setDailyPostPlaceResults([]);
      setDailyPostPlaceSearchLoading(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setDailyPostPlaceSearchLoading(true);

      try {
        const params = new URLSearchParams({
          city: dailyPostCity,
          query,
          lat: String(dailyPostCityCenter[0]),
          lon: String(dailyPostCityCenter[1]),
        });
        const response = await fetch(`/api/places?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({ places: [] }))) as { places?: FavoritePlace[] };
        const liveResults = (payload.places ?? []).slice(0, 8);
        const fallbackResults = [...favoritePlaces, ...getFallbackFavoritePlaces(dailyPostCity)].filter(
          (place, index, list) =>
            place.name.toLowerCase().includes(query.toLowerCase()) && list.findIndex((item) => item.id === place.id) === index,
        );

        setDailyPostPlaceResults((liveResults.length ? liveResults : fallbackResults).slice(0, 8));
      } catch {
        const fallbackResults = [...favoritePlaces, ...getFallbackFavoritePlaces(dailyPostCity)].filter(
          (place, index, list) =>
            place.name.toLowerCase().includes(query.toLowerCase()) && list.findIndex((item) => item.id === place.id) === index,
        );
        setDailyPostPlaceResults(fallbackResults.slice(0, 8));
      } finally {
        setDailyPostPlaceSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [dailyPostCity, dailyPostCityCenter, dailyPostPlaceQuery, favoritePlaces]);

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
    if (!hasLoadedDataRef.current || typeof window === "undefined") return;
    window.localStorage.setItem(DARE_KEY, JSON.stringify(dare));
  }, [dare]);

  useEffect(() => {
    if (!hasLoadedDataRef.current || typeof window === "undefined") return;
    window.localStorage.setItem(SEEN_NOTIFICATIONS_KEY, JSON.stringify(seenNotificationIds));
  }, [seenNotificationIds]);

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
    if (Date.now() - lastSharedStateMutationAtRef.current > 5000) return;
    if (Date.now() - lastManualSharedStateSyncAtRef.current < 1500) return;

    const timeout = window.setTimeout(() => {
      void syncSharedState({
        nextPosts: posts,
        nextInteractions: interactions,
        nextDare: dare,
        source: "auto",
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [dare, posts, interactions]);

  useEffect(() => {
    if (!user.signedIn) return;

    const pruned = pruneExpiredWeeklyDumps(posts, interactions, currentSundayKey);
    if (!pruned.changed) return;

    lastSharedStateMutationAtRef.current = Date.now();
    setPosts(pruned.posts);
    setInteractions(pruned.interactions);
    syncSharedState({
      nextPosts: pruned.posts,
      nextInteractions: pruned.interactions,
    });
  }, [currentSundayKey, interactions, posts, user.signedIn]);

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
            void seedAccountsToBackend(localAccounts).catch(() => undefined);
            setPosts([]);
            setInteractions({});
            setDare(normalizeDareState(payload.dare));
            setAnnouncements((payload.announcements ?? []) as AppAnnouncement[]);
            return;
          }

          setAccounts((current) => mergeAccountsPreferLocal(normalizeAccounts(payload.accounts), current));
          const now = Date.now();
          const recentDeletedPostIds = new Set(
            Array.from(recentlyDeletedPostIdsRef.current.entries())
              .filter(([, deletedAt]) => now - deletedAt < 5000)
              .map(([postId]) => postId),
          );
          recentlyDeletedPostIdsRef.current = new Map(
            Array.from(recentlyDeletedPostIdsRef.current.entries()).filter(([, deletedAt]) => now - deletedAt < 5000),
          );
          const serverPosts = filterRecentDeletedPosts(normalizePosts((payload.posts ?? []) as Partial<AppPost>[]), recentDeletedPostIds);
          const shouldPreserveLocalPosts = now - lastSharedStateMutationAtRef.current < 5000;
          setPosts((current) => (shouldPreserveLocalPosts ? mergePostsPreferLocal(current, serverPosts) : serverPosts));
          const serverInteractions = filterRecentDeletedInteractions(normalizeInteractions(payload.interactions), recentDeletedPostIds);
          setInteractions((current) =>
            shouldPreserveLocalPosts ? mergeInteractionsPreferLocal(current, serverInteractions) : serverInteractions,
          );
          setDare(normalizeDareState(payload.dare));
          setAnnouncements((payload.announcements ?? []) as AppAnnouncement[]);
        })
        .catch(() => undefined);
    };

    syncFromServer();
    const interval = window.setInterval(syncFromServer, 5000);

    return () => window.clearInterval(interval);
  }, [announcements, user.signedIn]);

  useEffect(() => {
    if (!selectedStoryPost || selectedStoryPost.mediaKind === "video") return;

    const timeout = window.setTimeout(() => {
      const nextIndex = selectedStoryPostIndex + 1;
      if (nextIndex < 0 || nextIndex >= adminStorySequence.length) {
        setSelectedStoryPostId(null);
        return;
      }

      setSelectedStoryPostId(adminStorySequence[nextIndex].id);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [adminStorySequence, selectedStoryPost, selectedStoryPostIndex]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const existingScript = document.querySelector('script[data-google-identity="true"]');

    const setupGoogle = () => {
      if (!window.google?.accounts.id || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: GoogleCredentialResponse) => {
          if (!response.credential) {
            setError("google sign-in didn’t come through. try again.");
            return;
          }

          const authResult = await supabaseBrowser.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
          });
          if (authResult.error) {
            setError("google sign-in didn’t finish. try again.");
            return;
          }

          const profile = parseJwtCredential(response.credential);
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
                (profile.email.toLowerCase() === "joshrejis@gmail.com" ? "joeydoesntsharefood" : ""),
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
          setUsername((current) => current ?? (profile.email.toLowerCase() === "joshrejis@gmail.com" ? "joeydoesntsharefood" : ""));
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
      setGoogleInitError(false);
    };

    // if google never arrives, surface a retry after a short delay
    const failSafeTimer = window.setTimeout(() => {
      if (!googleReady) setGoogleInitError(true);
    }, 4000);

    if (existingScript) {
      setupGoogle();
      return () => window.clearTimeout(failSafeTimer);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = setupGoogle;
    document.body.appendChild(script);
    return () => window.clearTimeout(failSafeTimer);
  }, [authMode, googleReady]);

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
  }, [isAdmin, user.signedIn]);

  useEffect(() => {
    let cancelled = false;

    if (!profileShareUrl) {
      setProfileQrImageUrl("");
      return;
    }

    void QRCode.toDataURL(profileShareUrl, {
      width: 960,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setProfileQrImageUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setProfileQrImageUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [profileShareUrl]);

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

    const matchedReferrer =
      pendingReferralCode && pendingReferralCode !== (liveProfile.referralCode ?? "")
        ? accounts.find((account) => account.profile.referralCode?.trim().toUpperCase() === pendingReferralCode) ?? null
        : null;

    const nextUser = {
      ...user,
      profile: {
        fullName: trimmedName,
        username: trimmedUsername,
        city: trimmedCity,
        bio: user.profile.bio ?? "",
        picture: liveProfile.picture ?? user.profile.picture ?? "",
        isStudent: isStudentValue,
        schoolName: isStudentValue ? trimmedSchool : "",
        friends: user.profile.friends,
        incomingFriendRequests: user.profile.incomingFriendRequests,
        outgoingFriendRequests: user.profile.outgoingFriendRequests,
        favoritePlaceIds: user.profile.favoritePlaceIds,
        favoriteActivities: user.profile.favoriteActivities ?? [],
        referralCode: liveProfile.referralCode ?? user.profile.referralCode ?? "",
        referredByCode: matchedReferrer?.profile.referralCode ?? liveProfile.referredByCode ?? user.profile.referredByCode ?? "",
        referredByEmail: matchedReferrer?.googleProfile?.email ?? liveProfile.referredByEmail ?? user.profile.referredByEmail ?? "",
        referralCompletedAt: liveProfile.referralCompletedAt ?? user.profile.referralCompletedAt ?? null,
      },
    };

    void mutateAccountState({
      action: "upsert_account",
      account: nextUser,
    })
      .then((result) => {
        setAccounts(result.accounts);
        persistUser((result.user as StoredUser | null) ?? nextUser);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
        }
        setPendingReferralCode("");
        setError("");
      })
      .catch(() => {
        setError("profile save didn’t stick. try once more.");
      });
  };

  const saveProfileBio = () => {
    const sourceUser = liveAccount ?? user;
    const nextBio = bioDraft.trim().slice(0, 180);
    const nextUser = {
      ...sourceUser,
      signedIn: true,
      googleProfile: user.googleProfile ?? sourceUser.googleProfile,
      profile: {
        ...sourceUser.profile,
        bio: nextBio,
      },
    };

    setIsSavingBio(true);
    setBioSaveNotice("");

    void mutateAccountState({
      action: "upsert_account",
      account: nextUser,
    })
      .then((result) => {
        setAccounts(result.accounts);
        persistUser((result.user as StoredUser | null) ?? nextUser);
        setBioModalOpen(false);
      })
      .catch(() => {
        const currentEmail = nextUser.googleProfile?.email?.toLowerCase();
        const nextAccounts =
          currentEmail && accountsRef.current.some((account) => account.googleProfile?.email?.toLowerCase() === currentEmail)
            ? accountsRef.current.map((account) =>
                account.googleProfile?.email?.toLowerCase() === currentEmail ? nextUser : account,
              )
            : [...accountsRef.current, nextUser];

        setAccounts(nextAccounts);
        persistUser(nextUser);
        setBioModalOpen(false);
      })
      .finally(() => {
        setIsSavingBio(false);
      });
  };

  const copyProfileLink = async () => {
    if (!profileShareUrl) return;

    try {
      await navigator.clipboard.writeText(profileShareUrl);
      setProfileShareNotice("profile link copied.");
    } catch {
      window.prompt("copy your profile link", profileShareUrl);
      setProfileShareNotice("copy your profile link from the prompt.");
    }
  };

  const shareProfilePhotoToInstagram = async () => {
    if (!profileShareUrl || typeof window === "undefined") return;

    const shareMessage = getProfileShareMessage(liveProfile.username);
    const shareImageUrl = `${window.location.origin}/opengraph-image`;

    try {
      if (navigator.share) {
        const imageBlob = await fetch(shareImageUrl).then((response) => response.blob());
        const imageFile = new File([imageBlob], "crumbz-share.png", { type: "image/png" });

        if (navigator.canShare?.({ files: [imageFile] })) {
          await navigator.share({
            files: [imageFile],
            title: "crumbz",
            text: shareMessage,
          });
          setProfileShareNotice("your phone share menu is open with the crumbz photo.");
          return;
        }
      }
    } catch {
      setProfileShareNotice("photo sharing didn’t open, so you can use the profile link instead.");
      return;
    }

    setProfileShareNotice("this device can’t share the photo directly here, so use the profile link button instead.");
  };

  const updateDailyPostMentionState = (nextCaption: string, cursorPosition: number) => {
    const activeMention = getActiveMentionQuery(nextCaption, cursorPosition);
    if (!activeMention) {
      setDailyPostMentionQuery("");
      setDailyPostMentionRange(null);
      return;
    }

    setDailyPostMentionQuery(activeMention.query);
    setDailyPostMentionRange({ start: activeMention.start, end: activeMention.end });
  };

  const applyDailyPostMention = (username: string) => {
    if (!dailyPostMentionRange) return;

    const nextCaption = `${dailyPostCaption.slice(0, dailyPostMentionRange.start)}@${username} ${dailyPostCaption.slice(dailyPostMentionRange.end)}`;
    const nextCursorPosition = dailyPostMentionRange.start + username.length + 2;

    setDailyPostCaption(nextCaption);
    setDailyPostMentionQuery("");
    setDailyPostMentionRange(null);

    window.requestAnimationFrame(() => {
      dailyPostCaptionRef.current?.focus();
      dailyPostCaptionRef.current?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const shareReferralLink = async () => {
    const referralCode = liveProfile.referralCode?.trim().toUpperCase();
    if (!referralCode) {
      setReferralNotice("your referral link is getting ready. try again in a second.");
      return;
    }

    const referralLink = getReferralLink(referralCode);
    if (!referralLink) {
      setReferralNotice("that referral link didn’t load right. try again in a sec.");
      return;
    }

    const shareText = "join me on crumbz. sign up from this link and your signup counts toward my raffle entry.";

    try {
      if (navigator.share) {
        await navigator.share({
          title: "join me on crumbz",
          text: shareText,
          url: referralLink,
        });
        setReferralNotice("your phone share menu is open with your referral link.");
        return;
      }

      await navigator.clipboard.writeText(referralLink);
      setReferralNotice("your referral link is copied.");
    } catch {
      window.prompt("copy your referral link", referralLink);
      setReferralNotice("copy your referral link from the prompt.");
    }
  };

  const downloadReferralsCsv = () => {
    if (typeof window === "undefined") return;

    const lines = [
      [
        "inviter_name",
        "inviter_username",
        "inviter_email",
        "referral_code",
        "successful_referrals",
        "qualified_for_raffle",
        "referred_name",
        "referred_username",
        "referred_email",
        "completed_at",
      ].join(","),
      ...referralRows.flatMap((row) => {
        if (!row.referredAccounts.length) {
          return [
            [
              row.inviter.profile.fullName || row.inviter.googleProfile?.name || "",
              row.inviter.profile.username,
              row.inviter.googleProfile?.email ?? "",
              row.inviter.profile.referralCode ?? "",
              String(row.successfulReferrals),
              row.qualified ? "yes" : "no",
              "",
              "",
              "",
              "",
            ]
              .map((value) => `"${String(value).replace(/"/g, '""')}"`)
              .join(","),
          ];
        }

        return row.referredAccounts.map((referred) =>
          [
            row.inviter.profile.fullName || row.inviter.googleProfile?.name || "",
            row.inviter.profile.username,
            row.inviter.googleProfile?.email ?? "",
            row.inviter.profile.referralCode ?? "",
            String(row.successfulReferrals),
            row.qualified ? "yes" : "no",
            referred.profile.fullName || referred.googleProfile?.name || "",
            referred.profile.username,
            referred.googleProfile?.email ?? "",
            referred.profile.referralCompletedAt ?? "",
          ]
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        );
      }),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crumbz-referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareProfile = async () => {
    if (!profileShareUrl) return;
    const shareMessage = getProfileShareMessage(liveProfile.username);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${liveProfile.fullName || liveProfile.username}'s crumbz profile`,
          text: shareMessage,
          url: profileShareUrl,
        });
        setProfileShareNotice("your phone share menu is open with the profile link.");
        return;
      }
    } catch {
      setProfileShareNotice("the phone share menu didn’t open, so you can copy the link instead.");
      return;
    }

    await copyProfileLink();
  };

  const closeSelectedProfile = () => {
    setSelectedProfileEmail(null);

    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("profile")) return;
    url.searchParams.delete("profile");
    window.history.replaceState(
      {
        ...(typeof window.history.state === "object" && window.history.state ? window.history.state : {}),
        crumbzNav: {
          ...navigationState,
          selectedProfileEmail: null,
        },
      } satisfies CrumbzHistoryState,
      "",
      url.toString(),
    );
  };

  const signOut = () => {
    const currentEmail = user.googleProfile?.email?.toLowerCase();
    const signedOutAccount = currentEmail
      ? accountsRef.current.find((account) => account.googleProfile?.email?.toLowerCase() === currentEmail) ?? null
      : null;

    if (signedOutAccount) {
      const nextSignedOutAccount = {
        ...signedOutAccount,
        signedIn: false,
      };

      const nextAccounts = accountsRef.current.map((account) =>
        account.googleProfile?.email?.toLowerCase() === currentEmail ? nextSignedOutAccount : account
      );

      setAccounts(nextAccounts);
      void mutateAccountState({
        action: "upsert_account",
        account: nextSignedOutAccount,
      })
        .then((result) => {
          if (result.accounts.length) {
            setAccounts(result.accounts);
          }
        })
        .catch(() => undefined);
    }

    persistUser(defaultUser);
    void supabaseBrowser.auth.signOut().catch(() => undefined);
    setFullName(null);
    setUsername(null);
    setCity(null);
    setIsStudent(null);
    setSchoolName(null);
    setError("");
    setAuthMode("login");
    setShowWelcomeScreen(false);
    setStudentTab("feed");
  };

  const addFriend = async (friendEmail: string) => {
    if (!friendEmail || friendEmail === user.googleProfile?.email) return;
    if (user.profile.friends.includes(friendEmail) || user.profile.outgoingFriendRequests.includes(friendEmail)) return;
    if (!(await ensureAuthenticatedSession())) return;
    setSocialActionNotice("");

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
        setSocialActionNotice("friend request sent.");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "friend request didn’t stick. try again.";
        setError(message);
        setSocialActionNotice(message);
      });
  };

  const cancelFriendRequest = async (friendEmail: string) => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail || !friendEmail) return;
    if (!(await ensureAuthenticatedSession())) return;
    setSocialActionNotice("");

    void mutateAccountState({
      action: "cancel_friend_request",
      currentEmail,
      targetEmail: friendEmail,
    })
      .then((result) => {
        setAccounts(result.accounts);
        if (result.user) {
          persistUser(result.user as StoredUser);
        }
        setSocialActionNotice("friend request cancelled.");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "canceling that friend request failed. try once more.";
        setError(message);
        setSocialActionNotice(message);
      });
  };

  const acceptFriendRequest = async (requesterEmail: string) => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail) return;
    if (!(await ensureAuthenticatedSession())) return;
    setSocialActionNotice("");

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
        setSocialActionNotice("friend added to your circle.");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "accepting that friend request failed. try once more.";
        setError(message);
        setSocialActionNotice(message);
      });
  };

  const declineFriendRequest = async (requesterEmail: string) => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail) return;
    if (!(await ensureAuthenticatedSession())) return;
    setSocialActionNotice("");

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
        setSocialActionNotice("friend request declined.");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "declining that request failed. try again.";
        setError(message);
        setSocialActionNotice(message);
      });
  };

  const removeFriend = async (friendEmail: string) => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail) return;
    if (!(await ensureAuthenticatedSession())) return;
    setSocialActionNotice("");

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
        setSocialActionNotice("friend removed.");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "removing that friend failed. try again.";
        setError(message);
        setSocialActionNotice(message);
      });
  };

  const toggleFavoritePlace = (place: FavoritePlace) => {
    const placeId = place.id;
    const nextFavoritePlaceIds = favoritePlaceIds.includes(placeId)
      ? favoritePlaceIds.filter((id) => id !== placeId)
      : [...favoritePlaceIds, placeId];

    void mutateAccountState({
      action: "update_favorites",
      currentEmail: user.googleProfile?.email ?? "",
      favoritePlaceIds: nextFavoritePlaceIds,
      favoritePlace: place,
    })
      .then((result) => {
        setAccounts(result.accounts);
        if (result.user) {
          persistUser(result.user as StoredUser);
        }
      })
      .catch((error) => {
        setFavoritePlacesError(error instanceof Error ? error.message : "saving that spot didn’t stick. try again.");
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

    lastSharedStateMutationAtRef.current = Date.now();
    setAnnouncements(nextAnnouncements);
    syncSharedState({ nextAnnouncements });
    setAnnouncementTitle("");
    setAnnouncementBody("");
  };

  const deleteAnnouncement = (announcementId: string) => {
    const nextAnnouncements = announcements.filter((announcement) => announcement.id !== announcementId);

    lastSharedStateMutationAtRef.current = Date.now();
    setAnnouncements(nextAnnouncements);
    syncSharedState({ nextAnnouncements });
    setAdminActionNotice("push notification deleted everywhere.");
  };

  const launchWeeklyDare = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = dareTitleDraft.trim();
    const trimmedPrompt = darePromptDraft.trim();
    const trimmedReward = dareRewardDraft.trim();
    const nextReleaseAt = fromLocalDateTimeValue(dareReleaseAtDraft, getDefaultDare().releaseAt);
    const nextClosesAt = fromLocalDateTimeValue(dareClosesAtDraft, getDefaultDare().closesAt);

    if (!trimmedTitle || !trimmedPrompt) return;
    if (new Date(nextClosesAt).getTime() <= new Date(nextReleaseAt).getTime()) {
      setAdminActionNotice("close time needs to be after the drop time.");
      return;
    }

    const nextDare = {
      ...getDefaultDare(),
      id: dare.id || `dare-${Date.now()}`,
      title: trimmedTitle,
      prompt: trimmedPrompt,
      reward: trimmedReward || "winner gets a special partner discount drop on tuesday.",
      createdAt: dare.createdAt || formatNow(),
      acceptedEmails: dare.acceptedEmails,
      reminderEmails: dare.reminderEmails,
      submissions: dare.submissions,
      instagramPostedAt: dare.instagramPostedAt,
      winnerSubmissionId: dare.winnerSubmissionId,
      releaseAt: nextReleaseAt,
      closesAt: nextClosesAt,
    };

    lastSharedStateMutationAtRef.current = Date.now();
    setDare(nextDare);
    syncSharedState({ nextDare });
    setAdminActionNotice("new dare design is live in dare to eat. push notifications only go out when you send one from push to all users.");
  };

  const deleteDare = () => {
    const nextDare = getDefaultDare();

    lastSharedStateMutationAtRef.current = Date.now();
    setDare(nextDare);
    setDareTitleDraft(nextDare.title);
    setDarePromptDraft(nextDare.prompt);
    setDareRewardDraft(nextDare.reward);
    setDareReleaseAtDraft(toLocalDateTimeValue(nextDare.releaseAt));
    setDareClosesAtDraft(toLocalDateTimeValue(nextDare.closesAt));
    syncSharedState({ nextDare });
    setAdminActionNotice("current dare cleared. you can now set up the next one.");
  };

  const acceptDare = () => {
    const userEmail = user.googleProfile?.email;
    if (!userEmail || dare.acceptedEmails.includes(userEmail) || !isDareLiveWindow) return;

    lastSharedStateMutationAtRef.current = Date.now();
    setDare((current) => ({
      ...current,
      acceptedEmails: [...current.acceptedEmails, userEmail],
    }));
    setDareNotice("you’re in. now go get proof before sunday midnight.");
  };

  const openDareProof = () => {
    if (!currentUserAcceptedDare || !isDareLiveWindow) return;
    setStudentTab("rewards");
    setDareNotice((current) => current || "drop your proof here before sunday 23:59.");
  };

  const saveDareReminder = () => {
    const userEmail = user.googleProfile?.email;
    if (!userEmail || dare.reminderEmails.includes(userEmail)) return false;

    lastSharedStateMutationAtRef.current = Date.now();
    setDare((current) => ({
      ...current,
      reminderEmails: [...current.reminderEmails, userEmail],
    }));
    return true;
  };

  const downloadAppleCalendarInvite = () => {
    if (typeof window === "undefined") return;

    const stamp = Date.now();
    const icsBody = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//crumbz//dare reminder//EN",
      "BEGIN:VEVENT",
      `UID:${dare.id}-${stamp}@crumbz.app`,
      `DTSTAMP:${formatCalendarTimestamp(new Date(stamp))}`,
      `DTSTART:${formatCalendarTimestamp(dareReminderEvent.start)}`,
      `DTEND:${formatCalendarTimestamp(dareReminderEvent.end)}`,
      `SUMMARY:${escapeIcsText(dareReminderEvent.title)}`,
      `DESCRIPTION:${escapeIcsText(dareReminderEvent.details)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const file = new Blob([icsBody], { type: "text/calendar;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "crumbz-dare-reminder.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    setDareNotice("apple calendar file is ready. crumbz will keep this reminder in your app too.");
    setDareReminderModalOpen(false);
  };

  const openGoogleCalendarReminder = () => {
    if (typeof window === "undefined") return;

    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", dareReminderEvent.title);
    url.searchParams.set("details", dareReminderEvent.details);
    url.searchParams.set(
      "dates",
      `${formatCalendarTimestamp(dareReminderEvent.start)}/${formatCalendarTimestamp(dareReminderEvent.end)}`,
    );

    window.open(url.toString(), "_blank", "noopener,noreferrer");
    setDareNotice("google calendar is opening. crumbz will keep this reminder in your app too.");
    setDareReminderModalOpen(false);
  };

  const remindMeForDare = () => {
    const addedReminder = saveDareReminder();
    setDareNotice(
      addedReminder
        ? "nice. we’ll remind you in crumbz too. pick apple or google calendar if you want it there as well."
        : "your crumbz reminder is already set. you can still add it to apple or google calendar.",
    );
    setDareReminderModalOpen(true);
  };

  const handleDareProofFile = async (files: FileList | null) => {
    if (!files?.length) return;

    setIsUploadingDareProof(true);
    setDareNotice("uploading your dare proof...");

    try {
      const uploadResults = await uploadMediaFiles(files, {
        mediaKind: "photo",
        maxFiles: 1,
        setNotice: setDareNotice,
      });

      if (!uploadResults?.length) return;

      setDareProofPhotoUrl(uploadResults[0]);
      setDareNotice("proof photo locked in.");
    } finally {
      setIsUploadingDareProof(false);
    }
  };

  const submitDareProof = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const userEmail = user.googleProfile?.email;
    if (!userEmail) return;

    if (!isDareLiveWindow) {
      setDareNotice("the dare isn't live yet. hit remind me and we’ll hold your spot.");
      return;
    }

    if (!currentUserAcceptedDare) {
      setDareNotice("accept the dare first, then drop your proof.");
      return;
    }

    if (!dareProofPhotoUrl || !dareLocationDraft.trim()) {
      setDareNotice("add a photo and location tag so your dare counts.");
      return;
    }

    const nextSubmission: DareSubmission = {
      id: `dare-submission-${Date.now()}`,
      authorEmail: userEmail,
      authorName: user.profile.fullName || user.profile.username || "crumbz user",
      photoUrl: dareProofPhotoUrl,
      locationTag: dareLocationDraft.trim(),
      caption: dareCaptionDraft.trim(),
      createdAt: formatNow(),
    };

    lastSharedStateMutationAtRef.current = Date.now();
    setDare((current) => ({
      ...current,
      submissions: [nextSubmission, ...current.submissions.filter((submission) => submission.authorEmail.toLowerCase() !== userEmail.toLowerCase())],
    }));
    setDareLocationDraft("");
    setDareCaptionDraft("");
    setDareProofPhotoUrl("");
    setDareNotice("proof submitted. if crumbz posts finalists on instagram, you’re in the mix.");
  };

  const postDareToInstagram = () => {
    lastSharedStateMutationAtRef.current = Date.now();
    setDare((current) => ({
      ...current,
      instagramPostedAt: formatNow(),
    }));
    setAdminActionNotice("instagram voting stage is marked live.");
  };

  const chooseDareWinner = (submissionId: string) => {
    lastSharedStateMutationAtRef.current = Date.now();
    setDare((current) => ({
      ...current,
      winnerSubmissionId: submissionId,
    }));
    setAdminActionNotice("winner locked. this submission now shows at the top of everyone’s feed.");
  };

  const markNotificationSeen = (notificationId: string) => {
    setSeenNotificationIds((current) => (current.includes(notificationId) ? current : [...current, notificationId]));
  };

  const openAnnouncementNotification = (notificationId: string, announcementId: string) => {
    markNotificationSeen(notificationId);
    setSelectedAnnouncementId(announcementId);
    setStudentTab("feed");
    setNotificationsOpen(false);
    window.setTimeout(() => {
      const target = document.getElementById(`announcement-${announcementId}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  const openPostNotification = (notificationId: string, postId: string) => {
    markNotificationSeen(notificationId);
    const targetPost = posts.find((post) => post.id === postId) ?? null;
    if (targetPost?.authorRole === "admin" && targetPost.type === "story") {
      setSelectedStoryPostId(postId);
      setNotificationsOpen(false);
      return;
    }

    setStudentTab("feed");
    setNotificationsOpen(false);
    window.setTimeout(() => {
      const target = document.getElementById(`post-${postId}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  const revealFavoritePlace = (place: FavoritePlace, cityName = currentFavoriteCity) => {
    setFavoriteViewCity(cityName);
    setHighlightedFavoritePlaceId(place.id);
    setFavoritePlaces((current) => {
      const next = current.filter((item) => item.id !== place.id);
      return [place, ...next].slice(0, 24);
    });
    setStudentTab("favorites");
    window.setTimeout(() => {
      favoritesMapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const openFriendFavoriteNotification = (notificationId: string, cityName: string, place: FavoritePlace) => {
    markNotificationSeen(notificationId);
    setNotificationsOpen(false);
    revealFavoritePlace(place, cityName);
  };

  const openFriendFavoriteMoment = (cityName: string, place: FavoritePlace) => {
    revealFavoritePlace(place, cityName);
  };

  const startPostFromPlace = (place: FavoritePlace, cityName = currentFavoriteCity) => {
    setFavoriteViewCity(cityName);
    setHighlightedFavoritePlaceId(place.id);
    setFavoritePlaces((current) => {
      const next = current.filter((item) => item.id !== place.id);
      return [place, ...next].slice(0, 24);
    });
    setDailyPostTaggedPlace(place);
    setDailyPostPlaceQuery("");
    setDailyPostPlaceResults([]);
    setDailyPostTasteTag("");
    setDailyPostPriceTag("");
    setDailyPostNotice(`posting from ${place.name}. add your photo and tell friends what you thought.`);
    setStudentTab("profile");
    window.setTimeout(() => {
      document.getElementById("daily-post-composer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const focusFavoritePlace = (place: FavoritePlace, cityName = currentFavoriteCity) => {
    revealFavoritePlace(place, cityName);
  };

  const openPlaceDirections = (place: FavoritePlace) => {
    if (typeof window === "undefined") return;

    const destination =
      Number.isFinite(place.lat) && Number.isFinite(place.lon)
        ? `${place.lat},${place.lon}`
        : encodeURIComponent([place.name, place.address].filter(Boolean).join(", "));

    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank", "noopener,noreferrer");
  };

  const openPostPlace = (post: AppPost) => {
    if (!post.taggedPlaceId || !post.taggedPlaceName) return;

    const place: FavoritePlace = {
      id: post.taggedPlaceId,
      name: post.taggedPlaceName,
      kind: post.taggedPlaceKind || "restaurant",
      lat: post.taggedPlaceLat ?? dailyPostCityCenter[0],
      lon: post.taggedPlaceLon ?? dailyPostCityCenter[1],
      address: post.taggedPlaceAddress,
    };

    setSelectedOwnPostId((current) => (current === post.id ? null : current));
    revealFavoritePlace(place, post.taggedPlaceCity || liveProfile.city || currentFavoriteCity);
  };

  const openStorySequence = (postId?: string | null) => {
    if (!adminStorySequence.length) return;
    setSelectedStoryPostId(postId && adminStorySequence.some((post) => post.id === postId) ? postId : adminStorySequence[0].id);
  };

  const showAdjacentStory = (direction: -1 | 1) => {
    if (!adminStorySequence.length || selectedStoryPostIndex < 0) return;
    const nextIndex = selectedStoryPostIndex + direction;

    if (nextIndex < 0 || nextIndex >= adminStorySequence.length) {
      setSelectedStoryPostId(null);
      return;
    }

    setSelectedStoryPostId(adminStorySequence[nextIndex].id);
  };

  const resetComposer = (notice = "") => {
    setEditingPostId(null);
    setPendingDeletePostId(null);
    setStorageNotice(notice);
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

  const publishComposerPost = () => {
    if (!composer.title.trim() || !composer.body.trim()) {
      setStorageNotice("add a title and body first, then publish.");
      return;
    }

    if (isUploadingMedia) {
      setStorageNotice("media is still uploading. wait a second, then publish.");
      return;
    }

    if (composer.type === "story" && composer.mediaKind === "none") {
      setStorageNotice("stories need a photo or video.");
      return;
    }

    if (composer.type === "story" && composer.mediaKind === "carousel") {
      setStorageNotice("stories work with one vertical photo or one vertical video.");
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
      createdAtIso: editingPostId
        ? posts.find((post) => post.id === editingPostId)?.createdAtIso ?? new Date().toISOString()
        : new Date().toISOString(),
      mediaKind: composer.mediaKind,
      mediaUrls: composer.mediaUrls,
      videoRatio: composer.videoRatio,
      authorRole: "admin",
      authorName: "crumbz",
      authorEmail: ADMIN_EMAIL,
      schoolName: "",
      weekKey: "",
      taggedPlaceId: "",
      taggedPlaceName: "",
      taggedPlaceKind: "",
      taggedPlaceAddress: "",
      taggedPlaceLat: null,
      taggedPlaceLon: null,
      taggedPlaceCity: "",
      tasteTag: "",
      priceTag: "",
    };

    const nextPosts = editingPostId
      ? posts.map((post) => (post.id === editingPostId ? nextPost : post))
      : [nextPost, ...posts];

    lastSharedStateMutationAtRef.current = Date.now();
    setPosts(nextPosts);
    syncSharedState({
      nextPosts,
      nextInteractions: interactions,
    });
    resetComposer(editingPostId ? "post updated." : "post published.");
  };

  const createPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    publishComposerPost();
  };

  const submitWeeklyDump = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const authorEmail = user.googleProfile?.email?.toLowerCase();
    if (!authorEmail) return;

    if (!canSubmitWeeklyDumpToday) {
      setWeeklyDumpNotice("weekly food dumps open on sunday only.");
      return;
    }

    if (isUploadingWeeklyDump) {
      setWeeklyDumpNotice("your photos are still uploading. wait a sec, then submit.");
      return;
    }

    if (!activeWeeklyDumpMediaUrls.length) {
      setWeeklyDumpNotice("add up to 7 food photos first.");
      return;
    }

    const firstName = user.profile.fullName.split(" ")[0] || user.profile.username || "student";
    const caption = weeklyDumpCaption.trim();

    const nextPost: AppPost = {
      id: currentUserWeeklyDump?.id ?? `weekly-dump-${authorEmail}-${currentSundayKey}`,
      title: `${firstName}'s weekly food dump`,
      body: caption,
      cta: "sunday dump",
      type: "weekly-dump",
      createdAt: currentUserWeeklyDump?.createdAt ?? formatNow(),
      createdAtIso: currentUserWeeklyDump?.createdAtIso ?? new Date().toISOString(),
      mediaKind: "carousel",
      mediaUrls: activeWeeklyDumpMediaUrls,
      videoRatio: "4:5",
      authorRole: "student",
      authorName: user.profile.fullName,
      authorEmail,
      schoolName: user.profile.schoolName,
      weekKey: currentSundayKey,
      taggedPlaceId: "",
      taggedPlaceName: "",
      taggedPlaceKind: "",
      taggedPlaceAddress: "",
      taggedPlaceLat: null,
      taggedPlaceLon: null,
      taggedPlaceCity: "",
      tasteTag: "",
      priceTag: "",
    };

    lastSharedStateMutationAtRef.current = Date.now();
    setPosts((current) => [nextPost, ...current.filter((post) => post.id !== nextPost.id)]);
    syncSharedState({
      nextPosts: [nextPost, ...posts.filter((post) => post.id !== nextPost.id)],
      nextInteractions: interactions,
    });
    setWeeklyDumpCaption("");
    setWeeklyDumpMediaUrls([]);
    setWeeklyDumpNotice(currentUserWeeklyDump ? "your sunday drop is updated." : "your weekly dump is live.");
    setWeeklyDumpInputKey((current) => current + 1);
  };

  const startEditingPost = (post: AppPost) => {
    setPendingDeletePostId(null);
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

  const deletePost = async (postId: string) => {
    if (!(await ensureAuthenticatedSession("your admin session needs a quick refresh. sign out and sign back in with crumbleappco@gmail.com, then delete the post again."))) {
      return;
    }

    recentlyDeletedPostIdsRef.current.set(postId, Date.now());
    const nextPosts = posts.filter((post) => post.id !== postId);
    const nextInteractions = { ...interactions };
    delete nextInteractions[postId];

    lastSharedStateMutationAtRef.current = Date.now();
    setPosts(nextPosts);
    setInteractions(nextInteractions);
    void syncSharedState({
      nextPosts,
      nextInteractions,
      deletePostId: postId,
    });
    setPendingDeletePostId(null);
    setAdminActionNotice("post deleted.");

    if (editingPostId === postId) {
      cancelEditingPost();
    }

    if (selectedStoryPostId === postId) {
      setSelectedStoryPostId(null);
    }
  };

  const deleteUserFromAdmin = async (targetEmail: string) => {
    if (!(await ensureAuthenticatedSession("your admin session needs a quick refresh. sign out and sign back in with crumbleappco@gmail.com, then delete the user again."))) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("delete this user from the backend and wipe their posts, likes, comments, shares, and friend links?");
      if (!confirmed) return;
    }

    setAdminActionNotice("");
    void mutateAccountState({
      action: "delete_account",
      targetEmail,
    })
      .then((result) => {
        const deletedPostIds = new Set(
          posts.filter((post) => post.authorEmail.toLowerCase() === targetEmail.toLowerCase()).map((post) => post.id),
        );

        setAccounts(result.accounts);
        setPosts((current) => current.filter((post) => post.authorEmail.toLowerCase() !== targetEmail.toLowerCase()));
        setInteractions((current) => removeUserFromInteractions(current, targetEmail, deletedPostIds));
        setAdminActionNotice("user deleted from backend. if they come back with google, they’ll need to sign up again.");
      })
      .catch((error: unknown) => {
        setAdminActionNotice(error instanceof Error ? error.message : "that delete didn’t stick. try again.");
      });
  };

  const uploadMediaFiles = async (
    files: FileList | null,
    options: {
      mediaKind: MediaKind;
      postType?: PostType;
      maxFiles?: number;
      skipSizeLimit?: boolean;
      setNotice: (message: string) => void;
    },
  ) => {
    if (!files?.length) return null;

    const fileList = Array.from(files);
    const isStoryPost = options.postType === "story";
    if (options.maxFiles && fileList.length > options.maxFiles) {
      options.setNotice(`keep it to ${options.maxFiles} photos max in one dump.`);
      return null;
    }

    const expectedTypes =
      isStoryPost && options.mediaKind !== "video"
        ? [".jpg", ".jpeg", ".png", "image/jpeg", "image/png"]
        : options.mediaKind === "video"
          ? ACCEPTED_VIDEO_TYPES
          : ACCEPTED_IMAGE_TYPES;
    const hasInvalidFile = fileList.some((file) => !matchesAcceptedType(file, expectedTypes));
    const maxFileSize =
      isStoryPost && options.mediaKind === "video"
        ? STORY_MAX_VIDEO_FILE_SIZE_BYTES
        : isStoryPost
          ? STORY_MAX_IMAGE_FILE_SIZE_BYTES
          : options.mediaKind === "video"
            ? MAX_VIDEO_FILE_SIZE_BYTES
            : MAX_IMAGE_FILE_SIZE_BYTES;
    const oversizedFile = options.skipSizeLimit ? null : fileList.find((file) => file.size > maxFileSize);

    if (hasInvalidFile) {
      options.setNotice(
        isStoryPost
          ? options.mediaKind === "video"
            ? "story videos need to be mp4 or mov."
            : "story photos need to be jpg or png."
          : options.mediaKind === "video"
            ? "videos need to be mp4 or mov."
            : "photos need to be jpg, jpeg, png, or heic.",
      );
      return null;
    }

    if (oversizedFile) {
      options.setNotice(
        options.mediaKind === "video"
          ? `that video is ${formatFileSize(oversizedFile.size)}. keep ${isStoryPost ? "story videos" : "videos"} under ${formatFileSize(maxFileSize)}.`
          : `that image is ${formatFileSize(oversizedFile.size)}. keep ${isStoryPost ? "story photos" : "photos"} under ${formatFileSize(maxFileSize)}.`,
      );
      return null;
    }

    if (isStoryPost) {
      if (options.mediaKind === "video") {
        for (const file of fileList) {
          try {
            const metadata = await readVideoMetadata(file);
            if (
              !isStoryAspectRatio(metadata.width, metadata.height) ||
              metadata.width !== STORY_IMAGE_DIMENSIONS.width ||
              metadata.height !== STORY_IMAGE_DIMENSIONS.height
            ) {
              options.setNotice("story videos need to be exactly 1080 x 1920.");
              return null;
            }

            if (metadata.duration < 1 || metadata.duration > 60) {
              options.setNotice("story videos need to be between 1 and 60 seconds.");
              return null;
            }
          } catch {
            options.setNotice("we couldn't read that video. try another mp4 or mov file.");
            return null;
          }
        }
      } else if (options.mediaKind === "photo") {
        for (const file of fileList) {
          try {
            const dimensions = await readImageDimensions(file);
            if (!isStoryAspectRatio(dimensions.width, dimensions.height) || !hasExactDimensions(dimensions, [STORY_IMAGE_DIMENSIONS])) {
              options.setNotice("story photos need to be exactly 1080 x 1920.");
              return null;
            }
          } catch {
            options.setNotice("we couldn't read that image. try another jpg or png file.");
            return null;
          }
        }
      }
    } else if (options.postType === "chapter" && options.mediaKind === "photo") {
      for (const file of fileList) {
        try {
          const dimensions = await readImageDimensions(file);
          if (!hasExactDimensions(dimensions, CHAPTER_IMAGE_DIMENSIONS)) {
            options.setNotice("chapter photos need to be exactly 1080 x 1350 or 1080 x 1080.");
              return null;
            }
        } catch {
          options.setNotice("we couldn't read that image. try another jpg, png, or heic file.");
          return null;
        }
      }
    }

    const filePayloads = await Promise.all(
      fileList.map(async (file) => {
        if (isStoryPost) {
          return file;
        }

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

    const headers = await getAuthenticatedHeaders({
      "Content-Type": "application/json",
    });
    const response = await fetch("/api/upload-url", {
      method: "POST",
      headers,
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

  const handleProfilePhotoFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setIsSavingProfilePhoto(true);
    setProfilePhotoNotice("uploading your new photo...");

    try {
      const uploadResults = await uploadMediaFiles(files, {
        mediaKind: "photo",
        maxFiles: 1,
        setNotice: setProfilePhotoNotice,
      });

      if (!uploadResults?.[0]) {
        return;
      }

      setProfilePhotoDraft(uploadResults[0]);
      setProfilePhotoNotice("photo ready. tap save to use it.");
      setProfilePhotoInputKey((current) => current + 1);
      setProfileCameraInputKey((current) => current + 1);
    } finally {
      setIsSavingProfilePhoto(false);
    }
  };

  const saveProfilePhoto = () => {
    const sourceUser = liveAccount ?? user;
    const nextPicture = profilePhotoDraft.trim();
    if (!nextPicture) {
      setProfilePhotoNotice("pick a photo first.");
      return;
    }

    const nextUser = {
      ...sourceUser,
      signedIn: true,
      googleProfile: user.googleProfile ?? sourceUser.googleProfile,
      profile: {
        ...sourceUser.profile,
        picture: nextPicture,
      },
    };

    setIsSavingProfilePhoto(true);
    setProfilePhotoNotice("");

    void mutateAccountState({
      action: "upsert_account",
      account: nextUser,
    })
      .then((result) => {
        setAccounts(result.accounts);
        persistUser((result.user as StoredUser | null) ?? nextUser);
        setProfilePhotoModalOpen(false);
      })
      .catch(() => {
        const currentEmail = nextUser.googleProfile?.email?.toLowerCase();
        const nextAccounts =
          currentEmail && accountsRef.current.some((account) => account.googleProfile?.email?.toLowerCase() === currentEmail)
            ? accountsRef.current.map((account) =>
                account.googleProfile?.email?.toLowerCase() === currentEmail ? nextUser : account,
              )
            : [...accountsRef.current, nextUser];

        setAccounts(nextAccounts);
        persistUser(nextUser);
        setProfilePhotoModalOpen(false);
      })
      .finally(() => {
        setIsSavingProfilePhoto(false);
      });
  };

  const handleComposerFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setIsUploadingMedia(true);
    setStorageNotice("uploading media...");

    try {
      const uploadResults = await uploadMediaFiles(files, {
        mediaKind: composer.mediaKind,
        postType: composer.type,
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

    const remainingSlots = 7 - activeWeeklyDumpMediaUrls.length;
    if (remainingSlots <= 0) {
      setWeeklyDumpNotice("your sunday drop is full. send it or swap photos next.");
      setWeeklyDumpInputKey((current) => current + 1);
      return;
    }

    setIsUploadingWeeklyDump(true);
    setWeeklyDumpNotice("uploading your food dump...");

    try {
      const uploadResults = await uploadMediaFiles(files, {
        mediaKind: "carousel",
        maxFiles: remainingSlots,
        skipSizeLimit: true,
        setNotice: setWeeklyDumpNotice,
      });

      if (!uploadResults?.length) {
        return;
      }

      setWeeklyDumpMediaUrls((current) => [...(current.length ? current : currentUserWeeklyDump?.mediaUrls ?? []), ...uploadResults].slice(0, 7));
      setWeeklyDumpNotice("your weekly dump is loaded.");
      setWeeklyDumpInputKey((current) => current + 1);
    } finally {
      setIsUploadingWeeklyDump(false);
    }
  };

  const handleDailyPostFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setIsUploadingDailyPost(true);
    setDailyPostNotice("uploading your post...");

    try {
      const uploadResults = await uploadMediaFiles(files, {
        mediaKind: "photo",
        maxFiles: 1,
        setNotice: setDailyPostNotice,
      });

      if (!uploadResults?.length) return;

      setDailyPostMediaUrls([uploadResults[0]]);
      setDailyPostNotice("your photo is ready.");
      setDailyPostInputKey((current) => current + 1);
    } finally {
      setIsUploadingDailyPost(false);
    }
  };

  const submitDailyPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const authorEmail = user.googleProfile?.email?.toLowerCase();
    if (!authorEmail) return;

    if (isUploadingDailyPost) {
      setDailyPostNotice("your photos are still uploading. wait a sec, then post.");
      return;
    }

    if (!dailyPostMediaUrls.length) {
      setDailyPostNotice("add at least one photo for today’s drop.");
      return;
    }

    const createdAtIso = new Date().toISOString();
    const caption = dailyPostCaption.trim();
    const nextPost: AppPost = {
      id: `daily-post-${Date.now()}`,
      title: dailyPostTaggedPlace?.name || `${user.profile.fullName.split(" ")[0] || user.profile.username || "friend"}'s post`,
      body: caption,
      type: "chapter",
      cta: dailyPostTaggedPlace ? "friend review" : "live now",
      createdAt: formatNow(),
      createdAtIso,
      mediaKind: "photo",
      mediaUrls: [dailyPostMediaUrls[0]],
      videoRatio: "4:5",
      authorRole: "student",
      authorName: user.profile.fullName,
      authorEmail,
      schoolName: user.profile.schoolName,
      weekKey: "",
      taggedPlaceId: dailyPostTaggedPlace?.id ?? "",
      taggedPlaceName: dailyPostTaggedPlace?.name ?? "",
      taggedPlaceKind: dailyPostTaggedPlace?.kind ?? "",
      taggedPlaceAddress: dailyPostTaggedPlace?.address ?? "",
      taggedPlaceLat: dailyPostTaggedPlace?.lat ?? null,
      taggedPlaceLon: dailyPostTaggedPlace?.lon ?? null,
      taggedPlaceCity: dailyPostTaggedPlace ? dailyPostCity : "",
      tasteTag: dailyPostTasteTag,
      priceTag: dailyPostPriceTag,
    };

    lastSharedStateMutationAtRef.current = Date.now();
    setPosts((current) => [nextPost, ...current]);
    syncSharedState({
      nextPosts: [nextPost, ...posts],
      nextInteractions: interactions,
    });
    setDailyPostCaption("");
    setDailyPostMentionQuery("");
    setDailyPostMentionRange(null);
    setDailyPostMediaUrls([]);
    setDailyPostTaggedPlace(null);
    setDailyPostPlaceQuery("");
    setDailyPostPlaceResults([]);
    setDailyPostTasteTag("");
    setDailyPostPriceTag("");
    setDailyPostNotice("your post is live.");
    setDailyPostInputKey((current) => current + 1);
  };

  const weeklyDumpTileCount = Math.max(4, activeWeeklyDumpMediaUrls.length + (activeWeeklyDumpMediaUrls.length < 7 ? 1 : 0));

  const addComment = (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();
    const draft = commentDrafts[postId]?.trim();
    const authorEmail = user.googleProfile?.email;
    if (!draft || !authorEmail) return;

    lastSharedStateMutationAtRef.current = Date.now();
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

    const post = posts.find((item) => item.id === postId) ?? fallbackFeedPosts.find((item) => item.id === postId);
    if (!post || typeof window === "undefined") return;

    const postAuthorAccount = accounts.find((account) => account.googleProfile?.email?.toLowerCase() === post.authorEmail.toLowerCase()) ?? null;
    const profileUsername = postAuthorAccount?.profile.username?.trim().toLowerCase() ?? "";
    const shareUrl =
      post.type === "weekly-dump" && profileUsername
        ? `${window.location.origin}/?profile=${encodeURIComponent(profileUsername)}`
        : `${window.location.origin}/?post=${encodeURIComponent(postId)}`;
    const sharePayload = {
      title: post.type === "weekly-dump" && profileUsername ? `${profileUsername}'s crumbz profile` : post.title,
      text:
        post.type === "weekly-dump" && profileUsername
          ? `open ${profileUsername}'s crumbz profile and see their sunday dump`
          : `${post.title} • ${post.body}`,
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

    lastSharedStateMutationAtRef.current = Date.now();
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
    const authorEmail = user.googleProfile?.email?.toLowerCase();
    if (!authorEmail) return;

    lastSharedStateMutationAtRef.current = Date.now();
    setInteractions((current) => {
      const bucket = getInteractionBucket(current, postId);
      const alreadyLiked = bucket.likes.some((like) => like.authorEmail.toLowerCase() === authorEmail);
      const nextInteractions = {
        ...current,
        [postId]: {
          ...bucket,
          likes: alreadyLiked
            ? bucket.likes.filter((like) => like.authorEmail.toLowerCase() !== authorEmail)
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

      syncSharedState({
        nextPosts: posts,
        nextInteractions,
      });

      return nextInteractions;
    });
  };

  const toggleCommentHidden = (postId: string, commentId: string) => {
    lastSharedStateMutationAtRef.current = Date.now();
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
    lastSharedStateMutationAtRef.current = Date.now();
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

  const dismissInstallPrompt = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "true");
    }
    setShowInstallPrompt(false);
    setInstallPromptExpanded(false);
  };

  const installApp = async () => {
    if (!deferredInstallPrompt) return;

    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice.catch(() => null);
    setDeferredInstallPrompt(null);
    setShowInstallPrompt(false);
    setInstallPromptExpanded(false);

    if (choice?.outcome !== "accepted" && typeof window !== "undefined") {
      window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "true");
    }
  };

  const renderInstallPrompt = (className = "") => {
    if (!showInstallPrompt || !installPromptMode) return null;

    return (
      <Card className={`rounded-[28px] border border-[#FFE1B3] bg-white/96 shadow-[0_16px_40px_rgba(44,26,14,0.12)] backdrop-blur ${className}`.trim()}>
        <CardBody className="gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#B56D19]">
                {installPromptMode === "android" ? "install crumbz" : "add to home screen"}
              </p>
              <p className="mt-2 font-[family-name:var(--font-young-serif)] text-[1.6rem] leading-none text-[#2C1A0E]">
                {installPromptMode === "android" ? "put crumbz on your phone" : "save crumbz to your home screen"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6c7289]">
                {installPromptMode === "android"
                  ? "it’ll open like a real app and makes notifications way smoother."
                  : "on iphone, this is how crumbz works like an app and unlocks alerts later on."}
              </p>
            </div>
            <Button radius="full" variant="light" className="min-w-0 px-3 text-[#2C1A0E]" onPress={dismissInstallPrompt}>
              close
            </Button>
          </div>

          {installPromptMode === "android" ? (
            <div className="flex gap-2">
              <Button radius="full" className="bg-[#2C1A0E] text-white" onPress={() => void installApp()}>
                install app
              </Button>
              <Button radius="full" variant="flat" className="bg-[#FFF0D0] text-[#2C1A0E]" onPress={dismissInstallPrompt}>
                maybe later
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button
                  radius="full"
                  className="bg-[#2C1A0E] text-white"
                  onPress={() => setInstallPromptExpanded((current) => !current)}
                >
                  {installPromptExpanded ? "hide steps" : "show me how"}
                </Button>
                <Button radius="full" variant="flat" className="bg-[#FFF0D0] text-[#2C1A0E]" onPress={dismissInstallPrompt}>
                  maybe later
                </Button>
              </div>
              {installPromptExpanded ? (
                <div className="rounded-[20px] bg-[#FFF7E8] p-4 text-sm leading-6 text-[#2C1A0E]">
                  <p>1. tap the share button in safari</p>
                  <p>2. pick add to home screen</p>
                  <p>3. open crumbz from your home screen next time</p>
                </div>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>
    );
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

              <div className="pointer-events-none absolute inset-x-4 bottom-6 z-10">
                <div className="pointer-events-auto">{renderInstallPrompt()}</div>
              </div>
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
            {renderInstallPrompt("mb-4")}
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
                  <div className="flex flex-col items-center gap-3">
                    <div ref={googleButtonRef} className="min-h-11" />
                    {!googleReady ? (
                      <p className="text-center text-sm text-[#2C1A0E]">loading google sign-in…</p>
                    ) : null}
                    {googleInitError ? (
                      <Button
                        radius="full"
                        className="bg-[#F5A623] text-white"
                        onPress={() => {
                          setGoogleReady(false);
                          setGoogleInitError(false);
                          const script = document.querySelector('script[data-google-identity=\"true\"]') as HTMLScriptElement | null;
                          if (script?.onload) {
                            script.onload(new Event("load"));
                          }
                        }}
                      >
                        retry google sign-in
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#FFF0D0] bg-[#FFF0D0] p-4 text-sm leading-6 text-[#2C1A0E]">
                    add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and the real google button will appear here.
                  </div>
                )}

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
                src={currentUserPicture}
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
                placeholder="joeydoesntsharefood"
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
    const recentActivity = Object.entries(filteredInteractions)
      .filter(([postId]) => validPostIds.has(postId))
      .flatMap(([postId, bucket]) => [
        ...bucket.likes.map((like) => ({ kind: "like", postId, label: `${like.authorName} liked`, detail: "post liked", createdAt: like.createdAt })),
        ...bucket.comments.map((comment) => ({ kind: "comment", postId, label: `${comment.authorName} commented`, detail: comment.text, createdAt: comment.createdAt })),
        ...bucket.shares.map((share) => ({ kind: "share", postId, label: `${share.authorName} shared`, detail: `${share.platform} share`, createdAt: share.createdAt })),
      ])
      .slice(-8)
      .reverse();

    return (
      <main className="min-h-screen bg-white text-[#2C1A0E]">
        <div className="mx-auto min-h-screen w-full max-w-md overflow-x-hidden bg-white px-4 pb-24 pt-5 font-[family-name:var(--font-manrope)]">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[30px] bg-[#F5A623] p-5 text-white shadow-[0_22px_60px_rgba(254,138,1,0.22)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.28em] text-white/80">crumbz admin</p>
                <h1 className="mt-2 font-[family-name:var(--font-young-serif)] text-[2.5rem] leading-none">
                  control room
                </h1>
                <p className="mt-2 break-all text-sm text-white/88">{user.googleProfile?.email}</p>
              </div>
              <Button radius="full" className="shrink-0 bg-white text-[#2C1A0E]" onPress={signOut}>
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
                tabList: "grid w-full grid-cols-3 gap-1 rounded-[28px] bg-white/90 p-1 sm:grid-cols-5",
                cursor: "rounded-full bg-[#F5A623]",
                tab: "h-11 min-w-0 px-2 text-xs font-medium text-[#2C1A0E] sm:text-sm",
                tabContent: "truncate group-data-[selected=true]:text-white",
              }}
            >
              <Tab key="overview" title="overview">
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "posts live", value: adminPosts.length },
                      { label: "push live", value: announcements.length },
                      { label: "dare proofs", value: dare.submissions.length },
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

                  {adminActionNotice ? (
                    <Card className="rounded-[24px] border border-[#FFF0D0] bg-[#FFF7E8] shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                      <CardBody className="p-4 text-sm text-[#2C1A0E]">{adminActionNotice}</CardBody>
                    </Card>
                  ) : null}

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
                      {announcements.length ? (
                        <div className="grid gap-2">
                          {announcements.map((announcement) => (
                            <div key={announcement.id} className="rounded-[18px] bg-[#FFF0D0] px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#2C1A0E]">{announcement.title}</p>
                                  <p className="mt-1 text-sm text-[#2C1A0E]">{announcement.body}</p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">{announcement.createdAt}</p>
                                </div>
                                <Button
                                  radius="full"
                                  variant="flat"
                                  className="bg-white text-[#B3261E]"
                                  onPress={() => deleteAnnouncement(announcement.id)}
                                >
                                  delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">dare to eat</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">admin-only controls. create the dare here, save it, and it becomes the wednesday reveal.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{dare.submissions.length} proofs</Chip>
                      </div>
                      <div className="rounded-[18px] bg-[#FFF0D0] px-4 py-3">
                        <p className="text-sm font-semibold text-[#2C1A0E]">{dare.title}</p>
                        <p className="mt-1 text-sm text-[#2C1A0E]">{dare.prompt}</p>
                        <p className="mt-1 text-sm text-[#2C1A0E]">{dare.acceptedEmails.length} accepted • {dare.reminderEmails.length} reminded • closes {dareSubmissionsCloseText}</p>
                        <p className="mt-1 text-sm text-[#2C1A0E]">{dare.reward}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button radius="full" className="bg-[#F5A623] text-white" onPress={postDareToInstagram}>
                          mark instagram voting live
                        </Button>
                        {winningDareSubmission ? <Chip className="bg-white text-[#2C1A0E]">winner picked</Chip> : null}
                      </div>
                      <div className="grid gap-2">
                        {dare.submissions.length ? (
                          dare.submissions.map((submission) => (
                            <div key={submission.id} className="rounded-[18px] bg-white p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#2C1A0E]">{submission.authorName}</p>
                                  <p className="text-sm text-[#2C1A0E]">{submission.locationTag}</p>
                                </div>
                                <Button radius="full" className="bg-[#F5A623] text-white" onPress={() => chooseDareWinner(submission.id)}>
                                  pick winner
                                </Button>
                              </div>
                              <p className="mt-2 text-sm text-[#2C1A0E]">{submission.caption || "no caption"}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#2C1A0E]">no dare proofs yet.</p>
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

              <Tab key="challengers" title="challengers">
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "remind me", value: reminderChallengers.length },
                      { label: "i'm in", value: acceptedChallengers.length },
                      { label: "proofs", value: proofChallengers.length },
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
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">admin dare access</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">this is the control to make the dare and save what shows in the wednesday card.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{isPreDareWindow ? "scheduled" : "live"}</Chip>
                      </div>
                      <form className="grid gap-3" onSubmit={launchWeeklyDare}>
                        <Input
                          label="dare title"
                          labelPlacement="outside"
                          placeholder="late-night sleeper hit"
                          value={dareTitleDraft}
                          onValueChange={setDareTitleDraft}
                          classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                        />
                        <Textarea
                          label="dare copy"
                          labelPlacement="outside"
                          placeholder="find the most underrated late-night bite in your city and prove it."
                          value={darePromptDraft}
                          onValueChange={setDarePromptDraft}
                          classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                        />
                        <Input
                          label="reward"
                          labelPlacement="outside"
                          placeholder="free coffee + pastry drop"
                          value={dareRewardDraft}
                          onValueChange={setDareRewardDraft}
                          classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            type="datetime-local"
                            label="show on"
                            labelPlacement="outside"
                            value={dareReleaseAtDraft}
                            onValueChange={setDareReleaseAtDraft}
                            classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                          />
                          <Input
                            type="datetime-local"
                            label="proof closes"
                            labelPlacement="outside"
                            value={dareClosesAtDraft}
                            onValueChange={setDareClosesAtDraft}
                            classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" radius="full" className="flex-1 bg-[#2C1A0E] text-white">
                            save dare
                          </Button>
                          <Button type="button" radius="full" variant="flat" className="bg-[#FFF0D0] text-[#B3261E]" onPress={deleteDare}>
                            delete dare
                          </Button>
                        </div>
                      </form>
                      <div className="rounded-[18px] bg-[#FFF0D0] px-4 py-3">
                        <p className="text-sm font-semibold text-[#2C1A0E]">{dareTitleDraft || "untitled dare"}</p>
                        <p className="mt-1 text-sm text-[#2C1A0E]">{darePromptDraft || "the dare copy preview shows here."}</p>
                        <p className="mt-1 text-sm text-[#2C1A0E]">shows {draftReleaseText} • closes {draftCloseText}</p>
                        <p className="mt-1 text-sm text-[#2C1A0E]">{dareRewardDraft || "reward preview goes here."}</p>
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">remind me list</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">everyone waiting for the drop notification.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{reminderChallengers.length}</Chip>
                      </div>
                      <div className="grid gap-2">
                        {reminderChallengers.length ? (
                          reminderChallengers.map((challenger) => (
                            <div key={challenger.email} className="flex items-center justify-between gap-3 rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar src={challenger.picture} name={challenger.name} className="h-10 w-10" />
                                <div>
                                  <p className="text-sm font-semibold text-[#2C1A0E]">{challenger.name}</p>
                                  <p className="text-sm text-[#2C1A0E]">
                                    {getSafePublicIdentity({ username: challenger.username, fullName: challenger.name, email: challenger.email })}
                                    {challenger.meta ? ` • ${challenger.meta}` : ""}
                                  </p>
                                </div>
                              </div>
                              <Chip className="bg-white text-[#2C1A0E]">remind me</Chip>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#2C1A0E]">nobody has tapped remind me yet.</p>
                        )}
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">i&apos;m in list</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">these are the people who accepted the challenge.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{acceptedChallengers.length}</Chip>
                      </div>
                      <div className="grid gap-2">
                        {acceptedChallengers.length ? (
                          acceptedChallengers.map((challenger) => (
                            <div key={challenger.email} className="flex items-center justify-between gap-3 rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar src={challenger.picture} name={challenger.name} className="h-10 w-10" />
                                <div>
                                  <p className="text-sm font-semibold text-[#2C1A0E]">{challenger.name}</p>
                                  <p className="text-sm text-[#2C1A0E]">
                                    {getSafePublicIdentity({ username: challenger.username, fullName: challenger.name, email: challenger.email })}
                                    {challenger.meta ? ` • ${challenger.meta}` : ""}
                                  </p>
                                </div>
                              </div>
                              <Chip className="bg-white text-[#2C1A0E]">i&apos;m in</Chip>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#2C1A0E]">no one has accepted this dare yet.</p>
                        )}
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">proof submissions</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">every challenger who submitted proof, with the actual proof attached.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{proofChallengers.length}</Chip>
                      </div>
                      <div className="grid gap-3">
                        {proofChallengers.length ? (
                          proofChallengers.map((challenger) => (
                            <div key={challenger.submission?.id ?? challenger.email} className="rounded-[20px] bg-[#FFF0D0] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <Avatar src={challenger.picture} name={challenger.name} className="h-10 w-10" />
                                  <div>
                                    <p className="text-sm font-semibold text-[#2C1A0E]">{challenger.name}</p>
                                    <p className="text-sm text-[#2C1A0E]">
                                      {getSafePublicIdentity({ username: challenger.username, fullName: challenger.name, email: challenger.email })}
                                      {challenger.meta ? ` • ${challenger.meta}` : ""}
                                    </p>
                                  </div>
                                </div>
                                <Chip className="bg-white text-[#2C1A0E]">{challenger.submission?.createdAt ?? "submitted"}</Chip>
                              </div>
                              {challenger.submission?.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={challenger.submission.photoUrl}
                                  alt={challenger.submission.caption || challenger.name}
                                  className="mt-3 h-52 w-full rounded-[18px] object-cover"
                                  loading="lazy"
                                />
                              ) : null}
                              <p className="mt-3 text-sm font-semibold text-[#2C1A0E]">{challenger.submission?.locationTag || "no location tag"}</p>
                              <p className="mt-1 text-sm text-[#2C1A0E]">{challenger.submission?.caption || "no caption"}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#2C1A0E]">no proof submissions yet.</p>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </Tab>

              <Tab key="post" title="post">
                <div className="mt-4 space-y-4">
                  <Tabs
                    aria-label="post sections"
                    classNames={{
                      tabList: "w-full rounded-full bg-[#FFF7E8] p-1",
                      cursor: "rounded-full bg-[#F5A623]",
                      tab: "h-11 text-sm font-medium text-[#2C1A0E]",
                      tabContent: "group-data-[selected=true]:text-white",
                    }}
                  >
                    <Tab key="push-notifications" title={`push notifications (${announcements.length})`}>
                      <div className="mt-4 space-y-4">
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
                            {announcements.length ? (
                              <div className="grid gap-2">
                                {announcements.map((announcement) => (
                                  <div key={announcement.id} className="rounded-[18px] bg-[#FFF0D0] px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-[#2C1A0E]">{announcement.title}</p>
                                        <p className="mt-1 text-sm text-[#2C1A0E]">{announcement.body}</p>
                                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">{announcement.createdAt}</p>
                                      </div>
                                      <Button
                                        radius="full"
                                        variant="flat"
                                        className="bg-white text-[#B3261E]"
                                        onPress={() => deleteAnnouncement(announcement.id)}
                                      >
                                        delete
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </CardBody>
                        </Card>
                      </div>
                    </Tab>

                    <Tab key="published-posts" title={`posts (${adminFeedPosts.length})`}>
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
                                    videoRatio: typeof selected === "string" && selected === "story" ? "9:16" : current.videoRatio,
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
                              {composer.type === "story" ? (
                                <p className="text-sm text-[#6c7289]">stories stay live for 24 hours, then move into stories archive. use exactly 1080 x 1920 for story photos and videos. photos can be jpg or png up to 30mb. videos can be mp4 or mov up to 500mb and 1 to 60 seconds.</p>
                              ) : composer.type === "chapter" && composer.mediaKind === "photo" ? (
                                <p className="text-sm text-[#6c7289]">chapter photos need to be exactly 1080 x 1350 or 1080 x 1080.</p>
                              ) : null}
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
                              {composer.mediaKind === "video" && composer.type !== "story" ? (
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
                              ) : composer.mediaKind === "video" && composer.type === "story" ? (
                                <div className="rounded-[18px] bg-[#FFF7E8] px-4 py-3 text-sm text-[#2C1A0E]">story videos are locked to 9:16.</div>
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
                                        : composer.type === "story"
                                          ? ".jpg,.jpeg,.png,image/jpeg,image/png"
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
                                          createdAtIso: new Date().toISOString(),
                                          mediaKind: composer.mediaKind,
                                          mediaUrls: composer.mediaUrls,
                                          videoRatio: composer.videoRatio,
                                          authorRole: "admin",
                                          authorName: "crumbz",
                                          authorEmail: ADMIN_EMAIL,
                                          schoolName: "",
                                          weekKey: "",
                                          taggedPlaceId: "",
                                          taggedPlaceName: "",
                                          taggedPlaceKind: "",
                                          taggedPlaceAddress: "",
                                          taggedPlaceLat: null,
                                          taggedPlaceLon: null,
                                          taggedPlaceCity: "",
                                          tasteTag: "",
                                          priceTag: "",
                                        }}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              {storageNotice ? <p className="text-sm text-[#F5A623]">{storageNotice}</p> : null}
                              <Button
                                type="button"
                                radius="full"
                                size="lg"
                                isDisabled={isUploadingMedia}
                                onPress={publishComposerPost}
                                className="bg-[#F5A623] text-white disabled:opacity-60"
                              >
                                {isUploadingMedia ? "uploading media..." : editingPostId ? "save changes" : "publish post"}
                              </Button>
                            </form>
                            {adminActionNotice ? <p className="mt-3 text-sm text-[#2C1A0E]">{adminActionNotice}</p> : null}
                          </CardBody>
                        </Card>

                        <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                          <CardBody className="gap-3 p-5">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">live stories</p>
                                <p className="mt-1 text-sm text-[#2C1A0E]">these are the stories people can still see right now.</p>
                              </div>
                              <Chip className="bg-[#FFF0D0] text-[#F5A623]">{adminLiveStoryPosts.length} live</Chip>
                            </div>
                            {adminLiveStoryPosts.length ? (
                              adminLiveStoryPosts.map((post) => (
                                <div key={post.id} className="rounded-[22px] bg-[#FFF0D0] p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-[#2C1A0E]">{post.title}</p>
                                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
                                        story • {post.createdAt}
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
                                          media is missing on this saved story. open edit and upload it again once.
                                        </div>
                                      )}
                                    </div>
                                  ) : null}
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditingPost(post)}
                                      className="rounded-full bg-white px-6 py-3 text-base font-semibold text-[#2C1A0E]"
                                    >
                                      edit
                                    </button>
                                    {pendingDeletePostId === post.id ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setPendingDeletePostId(null)}
                                          className="rounded-full bg-white px-6 py-3 text-base font-semibold text-[#2C1A0E]"
                                        >
                                          cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deletePost(post.id)}
                                          className="rounded-full bg-[#f8b7b3] px-6 py-3 text-base font-semibold text-[#c81e5b]"
                                        >
                                          confirm delete
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setPendingDeletePostId(post.id)}
                                        className="rounded-full bg-[#f8b7b3] px-6 py-3 text-base font-semibold text-[#c81e5b]"
                                      >
                                        delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-[#2C1A0E]">no live stories right now.</p>
                            )}
                          </CardBody>
                        </Card>

                        <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                          <CardBody className="gap-3 p-5">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">stories archive</p>
                                <p className="mt-1 text-sm text-[#2C1A0E]">expired admin stories stay here after their 24-hour live window ends.</p>
                              </div>
                              <Chip className="bg-[#FFF0D0] text-[#F5A623]">{adminArchivedStoryPosts.length} total</Chip>
                            </div>
                            {adminActionNotice ? <p className="text-sm text-[#2C1A0E]">{adminActionNotice}</p> : null}
                            {adminArchivedStoryPosts.length ? (
                              adminArchivedStoryPosts.map((post) => (
                                <div key={post.id} className="rounded-[22px] bg-[#FFF0D0] p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-[#2C1A0E]">{post.title}</p>
                                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">story • {post.createdAt}</p>
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
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditingPost(post)}
                                      className="rounded-full bg-white px-6 py-3 text-base font-semibold text-[#2C1A0E]"
                                    >
                                      edit
                                    </button>
                                    {pendingDeletePostId === post.id ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setPendingDeletePostId(null)}
                                          className="rounded-full bg-white px-6 py-3 text-base font-semibold text-[#2C1A0E]"
                                        >
                                          cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deletePost(post.id)}
                                          className="rounded-full bg-[#f8b7b3] px-6 py-3 text-base font-semibold text-[#c81e5b]"
                                        >
                                          confirm delete
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setPendingDeletePostId(post.id)}
                                        className="rounded-full bg-[#f8b7b3] px-6 py-3 text-base font-semibold text-[#c81e5b]"
                                      >
                                        delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-[#2C1A0E]">no archived stories yet.</p>
                            )}
                          </CardBody>
                        </Card>

                        <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                          <CardBody className="gap-3 p-5">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">post archive</p>
                                <p className="mt-1 text-sm text-[#2C1A0E]">chapters, discounts, ads, and collabs stay here for admin.</p>
                              </div>
                              <Chip className="bg-[#FFF0D0] text-[#F5A623]">{adminPostArchive.length} total</Chip>
                            </div>
                            {adminPostArchive.length ? (
                              adminPostArchive.map((post) => (
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
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditingPost(post)}
                                      className="rounded-full bg-white px-6 py-3 text-base font-semibold text-[#2C1A0E]"
                                    >
                                      edit
                                    </button>
                                    {pendingDeletePostId === post.id ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setPendingDeletePostId(null)}
                                          className="rounded-full bg-white px-6 py-3 text-base font-semibold text-[#2C1A0E]"
                                        >
                                          cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deletePost(post.id)}
                                          className="rounded-full bg-[#f8b7b3] px-6 py-3 text-base font-semibold text-[#c81e5b]"
                                        >
                                          confirm delete
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setPendingDeletePostId(post.id)}
                                        className="rounded-full bg-[#f8b7b3] px-6 py-3 text-base font-semibold text-[#c81e5b]"
                                      >
                                        delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-[#2C1A0E]">no archived posts yet.</p>
                            )}
                          </CardBody>
                        </Card>
                      </div>
                    </Tab>
                  </Tabs>
                </div>
              </Tab>

              <Tab key="community" title="community">
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "signups", value: totalSignups },
                      { label: "user posts", value: nonAdminUserPosts.length },
                      { label: "comments", value: totalComments },
                      { label: "unique sharers", value: uniqueSharers },
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
                      <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">community stats</p>
                      <div className="flex flex-wrap gap-2">
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{totalLikes} likes</Chip>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{uniqueCommenters} unique commenters</Chip>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{sortedCityBreakdown.length} cities</Chip>
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
                        <div className="flex items-center gap-2">
                          {duplicateUsernameCount ? <Chip className="bg-[#FFE1D6] text-[#B3261E]">{duplicateUsernameCount} username duplicate{duplicateUsernameCount === 1 ? "" : "s"}</Chip> : null}
                          <Chip className="bg-[#FFF0D0] text-[#F5A623]">{userManagementRows.length} users</Chip>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        {userManagementRows.length ? (
                          userManagementRows.map((account) => (
                            <div key={account.googleProfile?.email} className="flex items-center justify-between gap-3 rounded-[18px] bg-[#FFF0D0] px-3 py-3 text-sm">
                              <div>
                                <p className="font-semibold text-[#2C1A0E]">{account.profile.fullName || account.googleProfile?.name || "new user"}</p>
                                <p className="text-[#2C1A0E]">
                                  @{account.profile.username || "pending"} • {formatProfileMeta(account.profile.city, account.profile.schoolName) || "profile not finished"}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {account.profile.username && duplicateUsernames[account.profile.username.trim().toLowerCase()] > 1 ? (
                                  <Chip className="bg-[#FFE1D6] text-[#B3261E]">duplicate username</Chip>
                                ) : null}
                                <Chip className="bg-white text-[#2C1A0E]">{account.signedIn ? "active" : "saved"}</Chip>
                                <Button radius="full" color="danger" variant="flat" className="bg-white text-[#B3261E]" onPress={() => deleteUserFromAdmin(account.googleProfile?.email ?? "")}>
                                  delete
                                </Button>
                              </div>
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
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">user posts</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">remove one user post without deleting the whole account.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{nonAdminUserPosts.length} total</Chip>
                      </div>
                      {nonAdminUserPosts.length ? (
                        <div className="grid gap-2">
                          {nonAdminUserPosts.map((post) => (
                            <div key={post.id} className="rounded-[18px] bg-[#FFF0D0] px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#2C1A0E]">{post.title}</p>
                                  <p className="mt-1 text-sm text-[#2C1A0E]">{post.authorName || "user post"}</p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
                                    {post.type === "weekly-dump" ? "sunday dump" : "post"} • {post.createdAt}
                                  </p>
                                </div>
                                <Button radius="full" color="danger" variant="flat" className="bg-white text-[#B3261E]" onPress={() => deletePost(post.id)}>
                                  delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#2C1A0E]">no user posts yet.</p>
                      )}
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

                  {posts.map((post) => {
                    const bucket = getInteractionBucket(interactions, post.id);
                    const authorAccount = accounts.find((account) => account.googleProfile?.email === post.authorEmail);
                    const adminPostUsername = authorAccount?.profile.username?.trim() ? `@${authorAccount.profile.username.trim()}` : post.authorName;
                    return (
                      <Card key={post.id} className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                        <CardHeader className="flex items-start justify-between gap-3 px-5 pb-0 pt-5">
                          <div>
                            <p className="font-semibold text-[#2C1A0E]">{post.title}</p>
                            <p className="mt-1 text-sm text-[#2C1A0E]">{adminPostUsername}</p>
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

              <Tab key="referrals" title="referrals">
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "qualified", value: qualifiedReferralCount },
                      { label: "successful referrals", value: completedReferralAccounts.length },
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
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">raffle referrals</p>
                          <p className="mt-1 text-sm text-[#2C1A0E]">every user gets a unique referral code. 2 completed referral signups qualifies them for the raffle.</p>
                        </div>
                        <Button radius="full" className="w-full bg-[#F5A623] text-white sm:w-auto" onPress={downloadReferralsCsv}>
                          download csv
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        {referralRows.length ? (
                          referralRows.map((row) => (
                            <div key={row.inviter.googleProfile?.email} className="rounded-[20px] bg-[#FFF0D0] p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#2C1A0E]">
                                    {row.inviter.profile.fullName || row.inviter.googleProfile?.name || "crumbz user"}
                                  </p>
                                  <p className="mt-1 text-sm text-[#2C1A0E]">
                                    @{row.inviter.profile.username || "pending"} • {row.inviter.googleProfile?.email}
                                  </p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
                                    code {row.inviter.profile.referralCode || "loading"}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Chip className="bg-white text-[#2C1A0E]">{row.successfulReferrals} referrals</Chip>
                                  {row.qualified ? <Chip className="bg-[#2C1A0E] text-white">qualified</Chip> : null}
                                </div>
                              </div>
                              {row.referredAccounts.length ? (
                                <div className="mt-3 grid gap-2">
                                  {row.referredAccounts.map((referred) => (
                                    <div key={referred.googleProfile?.email} className="rounded-[16px] bg-white px-3 py-3 text-sm text-[#2C1A0E]">
                                      <p className="font-semibold">
                                        {referred.profile.fullName || referred.googleProfile?.name || "new signup"}{" "}
                                        <span className="font-normal text-[#6c7289]">@{referred.profile.username || "pending"}</span>
                                      </p>
                                      <p className="mt-1 text-[#6c7289]">
                                        {referred.googleProfile?.email} • {referred.profile.referralCompletedAt ? formatRelativePostTime(referred.profile.referralCompletedAt, referred.profile.referralCompletedAt) : "pending"}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-sm text-[#6c7289]">no completed referrals yet.</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#2C1A0E]">no referral data yet.</p>
                        )}
                      </div>
                    </CardBody>
                  </Card>
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
      <div className="mx-auto min-h-screen w-full max-w-md bg-white px-4 pb-40 pt-5 font-[family-name:var(--font-manrope)]">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between border-b border-[#f3e7cf] pb-5"
        >
          <div>
            {studentTab === "feed" ? (
              <>
                <p className="font-[family-name:var(--font-young-serif)] text-[1.7rem] leading-none text-[#57657f] sm:text-[1.9rem]">
                  what’s good, {user.profile.fullName.split(" ")[0].toLowerCase()}
                </p>
                <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">the feed is hungry. so are you.</p>
              </>
            ) : studentTab === "favorites" ? (
              <>
                <p className="font-[family-name:var(--font-young-serif)] text-[1.7rem] leading-none text-[#57657f] sm:text-[1.9rem]">
                  favorites
                </p>
                <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">your saved spots and map overlap.</p>
              </>
            ) : studentTab === "rewards" ? (
              <>
                <p className="font-[family-name:var(--font-young-serif)] text-[1.7rem] leading-none text-[#57657f] sm:text-[1.9rem]">
                  rewards
                </p>
                <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">perks, drops, and what unlocks next.</p>
              </>
            ) : studentTab === "social" ? (
              <>
                <p className="font-[family-name:var(--font-young-serif)] text-[1.7rem] leading-none text-[#57657f] sm:text-[1.9rem]">
                  social
                </p>
                <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">find your people and grow your circle.</p>
              </>
            ) : (
              <>
                <p className="font-[family-name:var(--font-young-serif)] text-[1.7rem] leading-none text-[#57657f] sm:text-[1.9rem]">
                  profile
                </p>
                <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">your taste, identity, and saved stats.</p>
              </>
            )}
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
                  src={currentUserPicture}
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
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.postId}
                    onClick={() => openStorySequence(item.postId)}
                    className="min-w-[82px] text-center disabled:cursor-default"
                  >
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
                    <p className="mt-2 max-w-[82px] truncate text-sm font-medium text-[#53627b]">{item.detail}</p>
                  </button>
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.16 }}
              className="mt-7 space-y-4"
            >
              {shouldShowSundayDumpFeed ? (
                <div className="space-y-4">
                  {friendWeeklyDumps.length ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{communityEyebrow}</p>
                          <h3 className="mt-1 font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">{communityTitle}</h3>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{friendWeeklyDumps.length} dumps</Chip>
                      </div>
                      {friendWeeklyDumps.map((post) => renderFeedCard(post))}
                    </>
                  ) : null}

                  <Card className="rounded-[30px] border border-[#f1e8da] bg-white shadow-[0_18px_50px_rgba(44,26,14,0.08)]">
                    <CardBody className="gap-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-[family-name:var(--font-young-serif)] text-[2.7rem] italic leading-none text-[#2C1A0E]">
                              sunday food drop
                            </p>
                            <p className="mt-3 text-lg text-[#73809a]">add up to 7 photos from your week.</p>
                          </div>
                        <Chip className="rounded-full bg-[#fff1eb] px-3 text-[#ff6a24]">{activeWeeklyDumpMediaUrls.length}/7</Chip>
                      </div>

                      <form className="space-y-4" onSubmit={submitWeeklyDump}>
                        <div className="grid grid-cols-4 gap-3">
                          {Array.from({ length: weeklyDumpTileCount }, (_, index) => {
                            const showAddTile = activeWeeklyDumpMediaUrls.length < 7 && index === 0;
                            const imageIndex = activeWeeklyDumpMediaUrls.length < 7 ? index - 1 : index;
                            const imageUrl = activeWeeklyDumpMediaUrls[imageIndex];

                            if (showAddTile) {
                              return (
                                <button
                                  key="weekly-dump-add-tile"
                                  type="button"
                                  aria-label="add sunday dump photos"
                                  disabled={!canSubmitWeeklyDumpToday || activeWeeklyDumpMediaUrls.length >= 7 || isUploadingWeeklyDump}
                                  onClick={() => weeklyDumpInputRef.current?.click()}
                                  className="flex aspect-square items-center justify-center rounded-[18px] border border-dashed border-[#ffc6b5] bg-[#fff8f5] text-4xl text-[#ff6a24] transition-transform hover:scale-[1.02] disabled:opacity-50"
                                >
                                  +
                                </button>
                              );
                            }

                            if (imageUrl) {
                              return (
                                <div key={imageUrl} className="aspect-square overflow-hidden rounded-[18px] bg-[#eef2f8]">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={imageUrl} alt={`weekly dump photo ${imageIndex + 1}`} className="h-full w-full object-cover" loading="lazy" />
                                </div>
                              );
                            }

                            return <div key={`weekly-dump-empty-${index}`} className="aspect-square rounded-[18px] bg-[#eef2f8]" />;
                          })}
                        </div>
                        <Textarea
                          placeholder="what hit this week?"
                          value={activeWeeklyDumpCaption}
                          onValueChange={setWeeklyDumpCaption}
                          classNames={{ inputWrapper: "rounded-[18px] bg-[#f8f4ec] shadow-none border border-[#f8f4ec]", input: "text-[#8d99ad]" }}
                        />
                        <input
                          ref={weeklyDumpInputRef}
                          key={weeklyDumpInputKey}
                          type="file"
                          accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
                          multiple
                          disabled={!canSubmitWeeklyDumpToday || activeWeeklyDumpMediaUrls.length >= 7}
                          onChange={(event) => {
                            void handleWeeklyDumpFiles(event.target.files);
                          }}
                          className="hidden"
                        />
                        <div className="flex items-center gap-3">
                          {weeklyDumpNotice ? <p className="text-sm text-[#ff6a24]">{weeklyDumpNotice}</p> : <div className="flex-1" />}
                          <Button
                            type="submit"
                            radius="full"
                            size="lg"
                            isDisabled={!canSubmitWeeklyDumpToday || isUploadingWeeklyDump}
                          className="h-14 min-w-14 bg-[#ff6a24] px-5 text-2xl text-white disabled:opacity-60"
                        >
                            →
                          </Button>
                        </div>
                      </form>
                    </CardBody>
                  </Card>

                  {!friendWeeklyDumps.length ? (
                    <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
                      <CardBody className="p-5 text-sm text-[#2C1A0E]">{communityEmpty}</CardBody>
                    </Card>
                  ) : null}
                </div>
              ) : null}

              {shouldShowFeedAnnouncementCard ? (
                <Card
                  id={selectedAnnouncement ? `announcement-${selectedAnnouncement.id}` : "announcement-panel"}
                  className="overflow-hidden rounded-[30px] border-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_22%),linear-gradient(135deg,_#141b33_0%,_#0e1630_100%)] text-white shadow-[0_24px_60px_rgba(15,22,48,0.24)]"
                >
                  <CardBody className="gap-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[#ff7d37]">{copy.feed.announcementLabel}</p>
                        <h3 className="mt-2 text-[1.85rem] font-bold leading-[1.02] text-white">
                          {selectedAnnouncement?.title || copy.feed.announcementFallbackTitle}
                        </h3>
                        <p className="mt-2 max-w-[15rem] text-base leading-7 text-white/76">
                          {selectedAnnouncement?.body || copy.feed.announcementFallbackBody}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-white/6 p-4 text-4xl">📣</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        radius="full"
                        className="h-12 bg-[#ff6a24] px-8 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(255,106,36,0.28)]"
                        onPress={() => setNotificationsOpen(true)}
                      >
                        {copy.feed.remindMe}
                      </Button>
                      <Chip className="bg-[#FF3D6B]/18 text-[#ff96b0]">{copy.feed.alerts(notificationCount)}</Chip>
                    </div>
                  </CardBody>
                </Card>
              ) : null}

              {mixedHomeFeedPosts.length ? <div className="space-y-4">{mixedHomeFeedPosts.map((post) => renderFeedCard(post))}</div> : null}

              <Card className="rounded-[30px] border border-[#f1e8da] bg-white shadow-[0_18px_50px_rgba(44,26,14,0.08)]">
                <CardBody className="gap-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-[family-name:var(--font-young-serif)] text-[2.2rem] leading-none text-[#2C1A0E]">
                        {copy.feed.friendsAteTitle}
                      </p>
                      <p className="mt-2 text-base text-[#6c7289]">{copy.feed.friendsAteSubtitle}</p>
                    </div>
                    <Chip className="bg-[#FFF0D0] text-[#F5A623]">{copy.feed.updates(friendFoodMoments.length)}</Chip>
                  </div>
                  {friendFoodMoments.length ? (
                    <div className="grid gap-3">
                      {friendFoodMoments.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="rounded-[22px] bg-[#FFF7E8] p-4 text-left"
                          onClick={() => {
                            if (item.place) {
                              openFriendFavoriteMoment(item.city, item.place);
                            }
                          }}
                        >
                          <p className="text-lg font-semibold text-[#2C1A0E]">{item.title}</p>
                          <p className="mt-1 text-sm text-[#6c7289]">{item.detail}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6c7289]">{copy.feed.friendsAteEmpty}</p>
                  )}
                </CardBody>
              </Card>

              <Card className="overflow-hidden rounded-[30px] border-0 bg-[#eadffd] shadow-[0_18px_50px_rgba(123,79,255,0.16)]">
                <CardBody className="flex-row items-center justify-between gap-4 p-5">
                  <div className="max-w-[14rem]">
                    <p className="font-[family-name:var(--font-young-serif)] text-[2.3rem] leading-none text-[#2C1A0E]">
                      {copy.feed.cityWeekTitle(citySpotlightName)}
                    </p>
                    <p className="mt-3 text-lg leading-7 text-[#4f526f]">
                      {copy.feed.cityWeekBody}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Chip className="bg-white text-[#2C1A0E]">{copy.feed.mostPosted(citySnapshot.mostPostedSpot)}</Chip>
                      <Chip className="bg-white text-[#2C1A0E]">{copy.feed.mostLiked(citySnapshot.mostLikedFood)}</Chip>
                    </div>
                    <p className="mt-3 text-sm text-[#4f526f]">
                      {copy.feed.hottest(citySnapshot.hottestNeighbourhood)} • {copy.feed.hiddenGem(citySnapshot.hiddenGem)}
                    </p>
                  </div>
                  <div className="relative h-40 w-32 shrink-0">
                    <div className="absolute right-4 top-0 h-20 w-20 rounded-full bg-[#f05c1c]" />
                    <div className="absolute left-2 top-4 rounded-full bg-[#dfff67] px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2C1A0E]">
                      {copy.feed.cityLabel}
                    </div>
                    <div className="absolute bottom-0 right-0 flex h-24 w-16 items-center justify-center rounded-[16px] bg-[#ff7b2f] text-4xl">
                      🗺️
                    </div>
                    <div className="absolute bottom-6 left-5 text-xl text-[#dfff67]">✦</div>
                    <div className="absolute bottom-2 left-1 text-base text-[#dfff67]">✦</div>
                  </div>
                </CardBody>
              </Card>
            </motion.section>
          </>
        ) : null}

        {studentTab === "favorites" ? (
          <section ref={favoritesMapSectionRef} className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{copy.favorites.label}</p>
                    <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">
                      {copy.favorites.title(currentFavoriteCity)}
                    </h2>
                    <p className="text-sm text-[#2C1A0E]">{copy.favorites.subtitle}</p>
                  </div>
                  <Chip className="bg-[#FFF0D0] text-[#F5A623]">{copy.favorites.likedCount(favoritePlaceIds.length)}</Chip>
                </div>

                <FavoritesMap
                  language={language}
                  cityName={currentFavoriteCity}
                  center={favoriteCityCenter}
                  places={favoritePlaces}
                  favoriteIds={favoritePlaceIds}
                  mutualFansByPlace={mutualFansByPlace}
                  highlightedPlaceId={highlightedFavoritePlaceId}
                  onToggleFavorite={toggleFavoritePlace}
                  onOpenDirections={openPlaceDirections}
                  onPostFromPlace={(place) => startPostFromPlace(place, currentFavoriteCity)}
                  friends={friendAccounts.map((account) => ({
                    email: account.googleProfile?.email ?? account.profile.username,
                    name: account.profile.fullName,
                    username: `@${account.profile.username}`,
                    picture: getAccountPicture(account),
                    favoritePlaceIds: account.profile.favoritePlaceIds ?? [],
                  }))}
                />

                {sharedFavoriteMoments.length ? (
                  <div className="grid gap-3">
                    {sharedFavoriteMoments.map(({ place, fans }) => (
                      <div
                        key={place.id}
                        onClick={() => focusFavoritePlace(place, currentFavoriteCity)}
                        className="cursor-pointer rounded-[22px] bg-[#FFF7E8] p-4 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex -space-x-2">
                              {fans.slice(0, 2).map((fan) => (
                                <Avatar key={`${place.id}-${fan.email}`} src={fan.picture} name={fan.name} className="h-9 w-9 border-2 border-[#FFF7E8]" />
                              ))}
                            </div>
                            <p className="mt-3 text-base font-semibold text-[#2C1A0E]">
                              {fans.length === 1
                                ? copy.favorites.friendAdded(fans[0]?.username ?? "", place.name, user.profile.city)
                                : copy.favorites.friendAddedMany(fans[0]?.username ?? "", fans.length - 1, place.name, user.profile.city)}
                            </p>
                            <p className="mt-1 text-sm text-[#6c7289]">{place.address}</p>
                          </div>
                          <Button
                            radius="full"
                            className="bg-[#F5A623] text-white"
                            onPress={() => focusFavoritePlace(place, currentFavoriteCity)}
                          >
                            {copy.common.showMe}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {favoritePlacesLoading ? <p className="text-sm text-[#2C1A0E]">{copy.common.loadingSpots}</p> : null}
                {favoritePlacesError ? <p className="text-sm text-[#2C1A0E]">{favoritePlacesError}</p> : null}
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{copy.favorites.likedSpots}</p>
                    <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">
                      {copy.favorites.savedPlaces}
                    </h2>
                  </div>
                  <Chip className="bg-[#FFF0D0] text-[#F5A623]">{profileLikedSpots.length}</Chip>
                </div>

                {profileLikedSpots.length ? (
                  <div className="grid gap-3">
                    {profileLikedSpots.map((place) => (
                      <div
                        key={place.id}
                        onClick={() => focusFavoritePlace(place, currentFavoriteCity)}
                        className="cursor-pointer rounded-[22px] bg-[#FFF7E8] p-4 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">{place.kind}</p>
                            <p className="mt-2 text-lg font-semibold text-[#2C1A0E]">{place.name}</p>
                            <p className="mt-1 text-sm text-[#6c7289]">{place.address}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="rounded-full bg-[#FFF0D0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A623]">
                              liked
                            </div>
                            <Button
                              radius="full"
                              size="sm"
                              variant="light"
                              className="bg-white text-[#2C1A0E]"
                              onPress={() => openPlaceDirections(place)}
                            >
                              directions
                            </Button>
                            <Button
                              radius="full"
                              size="sm"
                              className="bg-white text-[#d97706]"
                              onPress={() => startPostFromPlace(place, currentFavoriteCity)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6c7289]">once you like food spots, they’ll show up here.</p>
                )}
              </CardBody>
            </Card>
          </section>
        ) : null}

        {studentTab === "rewards" ? (
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{copy.rewards.label}</p>
                <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">{rewardsTitle}</h2>
                <p className="text-sm text-[#2C1A0E]">{copy.rewards.body}</p>
              </CardBody>
            </Card>
          </section>
        ) : null}

        {studentTab === "social" ? (
          <section className="mt-6 space-y-4">
            {socialActionNotice ? (
              <Card className="rounded-[24px] border border-[#FFF0D0] bg-white shadow-[0_12px_30px_rgba(254,138,1,0.08)]">
                <CardBody className="p-4 text-sm text-[#2C1A0E]">{socialActionNotice}</CardBody>
              </Card>
            ) : null}
            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{copy.social.requests}</p>
                {liveProfile.incomingFriendRequests.length ? (
                  liveProfile.incomingFriendRequests.map((requestEmail) => {
                    const requester = accounts.find((account) => account.googleProfile?.email?.toLowerCase() === requestEmail.toLowerCase());
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
                            {copy.common.accept}
                          </Button>
                          <Button radius="full" variant="flat" className="bg-white text-[#2C1A0E]" onPress={() => declineFriendRequest(requestEmail)}>
                            {copy.common.decline}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#2C1A0E]">{copy.social.noRequests}</p>
                )}
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{copy.social.label}</p>
                  <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">{copy.social.title}</h2>
                  <p className="text-sm text-[#2C1A0E]">{copy.social.subtitle}</p>
                </div>
                <Input
                  radius="full"
                  placeholder={copy.social.placeholder}
                  value={friendQuery}
                  onValueChange={setFriendQuery}
                  classNames={{ inputWrapper: "bg-[#FFF0D0] border border-[#FFF0D0]" }}
                />
                {friendQuery ? (
                  exactFriendMatch ? (
                    <div className="flex items-center justify-between rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#2C1A0E]">{exactFriendMatch.profile.fullName}</p>
                        <p className="text-sm text-[#2C1A0E]">@{exactFriendMatch.profile.username}</p>
                      </div>
                      <Button radius="full" className="bg-[#F5A623] text-white" onPress={() => addFriend(exactFriendMatch.googleProfile?.email ?? "")}>
                        {copy.common.sendRequest}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-[#2C1A0E]">{copy.common.noExactUsername}</p>
                  )
                ) : null}

                {liveProfile.outgoingFriendRequests.length ? (
                  <div className="rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">{copy.social.pending}</p>
                    <div className="mt-2 grid gap-2">
                      {liveProfile.outgoingFriendRequests.map((requestEmail) => {
                        const pendingFriend = accounts.find((account) => account.googleProfile?.email?.toLowerCase() === requestEmail.toLowerCase());
                        return (
                          <div key={requestEmail} className="flex items-center justify-between gap-3 rounded-[16px] bg-white px-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#2C1A0E]">{pendingFriend?.profile.fullName || copy.social.pendingFriend}</p>
                              <p className="truncate text-sm text-[#6c7289]">@{pendingFriend?.profile.username || requestEmail}</p>
                            </div>
                            <Button radius="full" variant="flat" className="bg-[#FFF0D0] text-[#2C1A0E]" onPress={() => cancelFriendRequest(requestEmail)}>
                              {copy.common.cancel}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{copy.social.yourPeople}</p>
                {liveProfile.friends.length ? (
                  liveProfile.friends.map((friendEmail) => {
                    const friend = accounts.find((account) => account.googleProfile?.email?.toLowerCase() === friendEmail.toLowerCase());
                    if (!friend || friendEmail.toLowerCase() === ADMIN_EMAIL) return null;

                    return (
                      <div key={friendEmail} className="rounded-[18px] bg-[#FFF0D0] px-3 py-3">
                        <p className="text-sm font-semibold text-[#2C1A0E]">{friend.profile.fullName}</p>
                        <p className="text-sm text-[#2C1A0E]">
                          @{friend.profile.username}
                          {friend.profile.schoolName ? ` • ${friend.profile.schoolName}` : ""}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button radius="full" variant="flat" className="bg-white text-[#2C1A0E]" onPress={() => setSelectedProfileEmail(friendEmail)}>
                            {copy.common.viewProfile}
                          </Button>
                          <Button radius="full" variant="flat" className="bg-white text-[#2C1A0E]" onPress={() => removeFriend(friendEmail)}>
                            {copy.common.removeFriend}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#2C1A0E]">{copy.social.noFriends}</p>
                )}
              </CardBody>
            </Card>
          </section>
        ) : null}

        {studentTab === "profile" ? (
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.08)]">
              <CardBody className="gap-4 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#B56D19]">{copy.profile.languageLabel}</p>
                  <p className="mt-2 font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">
                    {copy.profile.languageTitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#6c7289]">{copy.profile.languageBody}</p>
                </div>
                <Select
                  radius="full"
                  aria-label={copy.profile.languageTitle}
                  selectedKeys={[language]}
                  onSelectionChange={(keys) => {
                    const nextLanguage = Array.from(keys)[0];
                    if (nextLanguage === "en" || nextLanguage === "pl") {
                      setLanguage(nextLanguage);
                    }
                  }}
                  placeholder={copy.profile.languageSelectPlaceholder}
                  classNames={{ trigger: "bg-[#FFF7E8] border border-[#FFF0D0]" }}
                >
                  <SelectItem key="en">{copy.profile.english}</SelectItem>
                  <SelectItem key="pl">{copy.profile.polish}</SelectItem>
                </Select>
              </CardBody>
            </Card>

            {!pushEnabled ? (
              <Card className="rounded-[28px] border border-[#FFE1B3] bg-[#FFF7E8] shadow-[0_18px_50px_rgba(254,138,1,0.08)]">
                <CardBody className="gap-3 p-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#B56D19]">{copy.profile.notificationsLabel}</p>
                    <p className="mt-2 font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">
                      {copy.profile.notificationsTitle}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#6c7289]">{copy.profile.notificationsBody}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button radius="full" className="bg-[#2C1A0E] text-white" onPress={() => setPushPromptOpen(true)}>
                      {copy.profile.turnOn}
                    </Button>
                    <Button
                      radius="full"
                      variant="flat"
                      className="bg-white text-[#2C1A0E]"
                      onPress={() => {
                        markPushPromptAsked();
                        setPushPromptOpen(false);
                      }}
                    >
                      {copy.profile.maybeLater}
                    </Button>
                  </div>
                  <p className="text-sm text-[#6c7289]">
                    {pushPermission === "denied"
                      ? "this device blocked alerts before, so the next step is reopening them in your browser or phone settings."
                      : pushSupported
                        ? "iphone and android both still need one quick permission tap from the person using the device."
                        : "if alerts don’t show here yet, open the installed home-screen app and try again there."}
                  </p>
                </CardBody>
              </Card>
            ) : null}

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-[family-name:var(--font-young-serif)] text-[1.45rem] leading-none text-[#2C1A0E] sm:text-[1.6rem]">
                      @{liveProfile.username}
                    </p>
                    <p className="mt-2 text-sm text-[#6c7289]">your crumbz profile</p>
                  </div>
                  <Button radius="full" variant="bordered" className="shrink-0 border-[#2C1A0E] text-[#2C1A0E]" onPress={signOut}>
                    log out
                  </Button>
                </div>

                <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-3">
                  <div className="flex justify-start">
                    <Avatar
                      src={currentUserPicture}
                      name={liveProfile.fullName || user.googleProfile?.name || "crumbz"}
                      className="h-24 w-24 border-4 border-[#FFF0D0] bg-[#FFF0D0] text-[#F5A623]"
                    />
                  </div>
                  <div className="min-w-0 pt-2">
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div className="flex min-h-[3.75rem] min-w-0 flex-col items-center justify-start rounded-[18px] px-1 py-1 text-center">
                        <p className="text-[1.25rem] font-semibold leading-none text-[#2C1A0E]">{currentUserAllPosts.length}</p>
                        <p className="mt-1 whitespace-nowrap text-[0.78rem] text-[#6c7289]">posts</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProfileDrawer("followers")}
                        className="flex min-h-[3.75rem] min-w-0 flex-col items-center justify-start rounded-[18px] px-1 py-1 text-center"
                      >
                        <p className="text-[1.25rem] font-semibold leading-none text-[#2C1A0E]">{liveProfile.friends.length}</p>
                        <p className="mt-1 whitespace-nowrap text-[0.78rem] text-[#6c7289]">{copy.profile.followers}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileDrawer("favorites")}
                        className="flex min-h-[3.75rem] min-w-0 flex-col items-center justify-start rounded-[18px] px-1 py-1 text-center"
                      >
                        <p className="text-[1.25rem] font-semibold leading-none text-[#2C1A0E]">{profileLikedSpots.length}</p>
                        <p className="mt-1 whitespace-nowrap text-[0.78rem] text-[#6c7289]">{copy.profile.favorites}</p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-[#2C1A0E]">{liveProfile.fullName}</p>
                    <p className="text-sm text-[#2C1A0E]">{formatProfileMeta(liveProfile.city, liveProfile.schoolName)}</p>
                  </div>

                  <div className="col-span-2 space-y-1 pt-1">
                    <input
                      key={profilePhotoInputKey}
                      ref={profilePhotoInputRef}
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.heic,.heif"
                      onChange={(event) => {
                        void handleProfilePhotoFiles(event.currentTarget.files);
                      }}
                      className="hidden"
                    />
                    <input
                      key={profileCameraInputKey}
                      ref={profileCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => {
                        void handleProfilePhotoFiles(event.currentTarget.files);
                      }}
                      className="hidden"
                    />
                    {liveProfile.bio ? (
                      <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
                        <p className="whitespace-pre py-1 text-sm leading-6 text-[#6c7289] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          {liveProfile.bio}
                        </p>
                      </div>
                    ) : null}
                    <button type="button" onClick={() => setProfileEditModalOpen(true)} className="inline-flex items-center gap-2 pt-2 text-sm font-medium text-[#6c7289]">
                      <span>edit</span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#D8C7A5] text-[0.95rem] leading-none text-[#2C1A0E]">+</span>
                    </button>
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileQrOpen(true);
                          setProfileShareNotice("");
                        }}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#6c7289]"
                      >
                        <span>{copy.profile.share}</span>
                        <span aria-hidden="true" className="text-base leading-none text-[#2C1A0E]">⤴</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReferralNotice("");
                          void shareReferralLink();
                        }}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#6c7289]"
                      >
                        <span>{copy.profile.refer}</span>
                        <span
                          aria-hidden="true"
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-[#D8C7A5] text-[0.95rem] leading-none text-[#2C1A0E]"
                        >
                          +
                        </span>
                      </button>
                    </div>
                    {referralNotice ? <p className="text-sm text-[#6c7289]">{referralNotice}</p> : null}
                    <div className="pt-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          radius="full"
                          size="sm"
                          isLoading={isUpdatingPush}
                          className={pushEnabled ? "bg-[#2C1A0E] text-white" : "bg-[#FFF0D0] text-[#2C1A0E]"}
                          onPress={pushEnabled ? disablePushNotifications : enablePushNotifications}
                        >
                          {pushEnabled ? copy.profile.notificationsOn : copy.profile.turnOnNotifications}
                        </Button>
                      </div>
                      <p className="mt-2 text-sm text-[#6c7289]">
                        {pushSupported
                          ? pushEnabled
                            ? copy.profile.pushEnabled
                            : pushPermission === "denied"
                              ? copy.profile.pushDenied
                              : copy.profile.pushHomeScreen
                          : copy.profile.pushSafari}
                      </p>
                      {pushNotice ? <p className="mt-2 text-sm text-[#F5A623]">{pushNotice}</p> : null}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card id="daily-post-composer" className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{copy.profile.postLabel}</p>
                    <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">
                      {copy.profile.postTitle}
                    </h2>
                    <p className="text-sm text-[#6c7289]">{copy.profile.postBody}</p>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={submitDailyPost}>
                  <button
                    type="button"
                    aria-label={copy.profile.addPostPhoto}
                    disabled={isUploadingDailyPost}
                    onClick={() => dailyPostInputRef.current?.click()}
                    className="flex h-56 w-full items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-[#ffc6b5] bg-[#fff8f5] text-[#ff6a24] transition-transform hover:scale-[1.01] disabled:opacity-50"
                  >
                    {dailyPostMediaUrls[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dailyPostMediaUrls[0]} alt="post preview" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="text-center">
                        <div className="text-5xl leading-none">+</div>
                        <p className="mt-3 text-sm font-medium">{copy.profile.addPostPhoto}</p>
                      </div>
                    )}
                  </button>
                  <div className="relative">
                    <Textarea
                      ref={dailyPostCaptionRef}
                      placeholder={copy.profile.captionPlaceholder}
                      value={dailyPostCaption}
                      onValueChange={(value) => {
                        setDailyPostCaption(value);
                        const cursorPosition = dailyPostCaptionRef.current?.selectionStart ?? value.length;
                        updateDailyPostMentionState(value, cursorPosition);
                      }}
                      onChange={(event) => {
                        updateDailyPostMentionState(event.target.value, event.target.selectionStart ?? event.target.value.length);
                      }}
                      onKeyUp={(event) => {
                        const target = event.currentTarget;
                        updateDailyPostMentionState(target.value, target.selectionStart ?? target.value.length);
                      }}
                      onClick={(event) => {
                        const target = event.currentTarget;
                        updateDailyPostMentionState(target.value, target.selectionStart ?? target.value.length);
                      }}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setDailyPostMentionQuery("");
                          setDailyPostMentionRange(null);
                        }, 120);
                      }}
                      classNames={{ inputWrapper: "rounded-[18px] bg-[#f8f4ec] shadow-none border border-[#f8f4ec]", input: "text-[#8d99ad]" }}
                    />
                    {dailyPostMentionRange ? (
                      <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[20px] border border-[#f3e1cf] bg-white shadow-[0_18px_40px_rgba(44,26,14,0.08)]">
                        {dailyPostMentionSuggestions.length ? (
                          dailyPostMentionSuggestions.map((friend) => (
                            <button
                              key={friend.email || friend.username}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                              }}
                              onClick={() => applyDailyPostMention(friend.username)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FFF7E8]"
                            >
                              <Avatar src={friend.picture} name={friend.fullName} className="h-10 w-10 bg-[#FFF0D0] text-[#F5A623]" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#2C1A0E]">{friend.fullName}</p>
                                <p className="truncate text-sm text-[#6c7289]">@{friend.username}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-[#6c7289]">{copy.common.noFriendsMatch}</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3 rounded-[24px] border border-[#f3e1cf] bg-[#fffaf2] p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">{copy.profile.tagShop} <span className="normal-case tracking-normal text-[#6c7289]">{copy.profile.optional}</span></p>
                      <p className="mt-1 text-sm text-[#6c7289]">{copy.profile.tagShopBody}</p>
                    </div>
                    <Input
                      value={dailyPostPlaceQuery}
                      onValueChange={(value) => {
                        setDailyPostPlaceQuery(value);
                        if (dailyPostNotice) setDailyPostNotice("");
                      }}
                      placeholder={copy.profile.searchIn(dailyPostCity)}
                      startContent={<span className="text-[#B56D19]">⌕</span>}
                      classNames={{ inputWrapper: "rounded-[18px] bg-white shadow-none border border-[#f3e1cf]" }}
                    />
                    {dailyPostTaggedPlace ? (
                      <div className="flex items-start justify-between gap-3 rounded-[18px] bg-white px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.16em] text-[#B56D19]">{dailyPostTaggedPlace.kind}</p>
                          <p className="mt-1 text-base font-semibold text-[#2C1A0E]">{dailyPostTaggedPlace.name}</p>
                          <p className="mt-1 text-sm text-[#6c7289]">{dailyPostTaggedPlace.address}</p>
                        </div>
                        <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={() => setDailyPostTaggedPlace(null)}>
                          {copy.common.change}
                        </Button>
                      </div>
                    ) : null}
                    {dailyPostPlaceSearchLoading ? <p className="text-sm text-[#6c7289]">{copy.common.searchingSpots}</p> : null}
                    {dailyPostPlaceResults.length ? (
                      <div className="grid gap-2">
                        {dailyPostPlaceResults.map((place) => (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => {
                              setDailyPostTaggedPlace(place);
                              setDailyPostPlaceQuery("");
                              setDailyPostPlaceResults([]);
                              if (dailyPostNotice) setDailyPostNotice("");
                            }}
                            className="rounded-[18px] bg-white px-4 py-3 text-left"
                          >
                            <p className="text-sm font-semibold text-[#2C1A0E]">{place.name}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#B56D19]">{place.kind}</p>
                            <p className="mt-1 text-sm text-[#6c7289]">{place.address}</p>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3 rounded-[24px] border border-[#f3e1cf] bg-[#fffaf2] p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">{copy.profile.howWasIt} <span className="normal-case tracking-normal text-[#6c7289]">{copy.profile.optional}</span></p>
                      <p className="mt-1 text-sm text-[#6c7289]">give friends the quick truth if you want.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TASTE_TAG_OPTIONS.map((option) => (
                        <Button
                          key={option.key}
                          type="button"
                          radius="full"
                          variant={dailyPostTasteTag === option.key ? "solid" : "flat"}
                          className={dailyPostTasteTag === option.key ? "bg-[#2C1A0E] text-white" : "bg-white text-[#2C1A0E]"}
                          onPress={() => setDailyPostTasteTag((current) => (current === option.key ? "" : option.key))}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3 rounded-[24px] border border-[#f3e1cf] bg-[#fffaf2] p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">price vibe <span className="normal-case tracking-normal text-[#6c7289]">(optional)</span></p>
                      <p className="mt-1 text-sm text-[#6c7289]">this is where `student friendly` lives if you want to add it.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PRICE_TAG_OPTIONS.map((option) => (
                        <Button
                          key={option.key}
                          type="button"
                          radius="full"
                          variant={dailyPostPriceTag === option.key ? "solid" : "flat"}
                          className={dailyPostPriceTag === option.key ? "bg-[#F5A623] text-white" : "bg-white text-[#2C1A0E]"}
                          onPress={() => setDailyPostPriceTag((current) => (current === option.key ? "" : option.key))}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <input
                    ref={dailyPostInputRef}
                    key={dailyPostInputKey}
                    type="file"
                    accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
                    disabled={isUploadingDailyPost}
                    onChange={(event) => {
                      void handleDailyPostFiles(event.target.files);
                    }}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    {dailyPostNotice ? <p className="text-sm text-[#ff6a24]">{dailyPostNotice}</p> : <div className="flex-1" />}
                    <Button
                      type="submit"
                      radius="full"
                      size="lg"
                      isDisabled={isUploadingDailyPost}
                      className="h-14 min-w-14 bg-[#ff6a24] px-5 text-2xl text-white disabled:opacity-60"
                    >
                      →
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">your posts</p>
                    <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">
                      your archive
                    </h2>
                  </div>
                  <Chip className="bg-[#FFF0D0] text-[#F5A623]">{currentUserAllPosts.length}</Chip>
                </div>

                {currentUserAllPosts.length ? (
                  currentUserAllPosts.length >= 3 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {currentUserAllPosts.map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setSelectedOwnPostId(post.id)}
                          className="group relative aspect-square overflow-hidden rounded-[20px] bg-[#FFF7E8]"
                        >
                          {post.mediaUrls[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.mediaUrls[0]} alt={post.title} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-end bg-[linear-gradient(180deg,_#FFF0D0_0%,_#ffffff_100%)] p-3 text-left">
                              <p className="line-clamp-3 font-[family-name:var(--font-young-serif)] text-[1.3rem] leading-none text-[#2C1A0E]">
                                {post.type === "weekly-dump" ? post.body || "sunday dump" : post.title}
                              </p>
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,_transparent_0%,_rgba(44,26,14,0.68)_100%)] px-3 py-2 text-left">
                            <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-white">
                              {post.type === "weekly-dump" ? "sunday dump" : "post"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {currentUserAllPosts.map((post) => renderFeedCard(post))}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-[#6c7289]">post your first photo and it’ll live here as your personal archive.</p>
                )}
              </CardBody>
            </Card>

          </section>
        ) : null}

        {selectedStoryPost || notificationsOpen || selectedOwnPost || selectedProfileEmail ? null : (
          <nav
            className="fixed left-1/2 z-[1200] w-[calc(100%-1rem)] max-w-[24.5rem] -translate-x-1/2 rounded-[32px] border border-[#FFF0D0] bg-[#2C1A0E] px-4 py-4 shadow-[0_18px_50px_rgba(44,26,14,0.24)] backdrop-blur"
            style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="grid grid-cols-5 gap-1 text-center">
              {[
                { label: copy.tabs.feed, key: "feed" },
                { label: copy.tabs.favorites, key: "favorites" },
                { label: copy.tabs.rewards, key: "rewards" },
                { label: copy.tabs.social, key: "social" },
                { label: copy.tabs.profile, key: "profile" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-[22px] px-2 py-2 transition-colors ${
                    studentTab === item.key ? "bg-white text-[#2C1A0E]" : "bg-transparent text-[#FFF0D0]"
                  }`}
                  onClick={() => {
                    if (item.key === "favorites") {
                      setFavoriteViewCity(null);
                      setHighlightedFavoritePlaceId(null);
                    }
                    setStudentTab(item.key as StudentTab);
                  }}
                >
                  <span className={`text-[24px] leading-none ${studentTab === item.key ? "text-[#F5A623]" : "text-[#FFF0D0]"}`}>
                    {renderStudentTabIcon(item.key as StudentTab, "h-6 w-6")}
                  </span>
                  <span className={`text-[11px] font-medium leading-none ${studentTab === item.key ? "text-[#2C1A0E]" : "text-[#FFF0D0]"}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>

      {notificationsOpen ? (
        <div className="fixed inset-0 z-[2000]">
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
            className="absolute right-0 top-0 h-full w-full border-l border-[#FFF0D0] bg-white px-5 pb-6 pt-6 shadow-[-24px_0_60px_rgba(43,21,48,0.12)] sm:max-w-sm"
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

            <div className="mt-6 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {unreadNotificationItems.length ? (
                unreadNotificationItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-[#FFF0D0] bg-[#FFF0D0] p-4"
                    onTouchStart={(event) => {
                      event.currentTarget.dataset.swipeStartX = String(event.touches[0].clientX);
                    }}
                    onTouchEnd={(event) => {
                      const startX = Number(event.currentTarget.dataset.swipeStartX || 0);
                      const endX = event.changedTouches[0].clientX;
                      if (startX && startX - endX > 70) {
                        markNotificationSeen(item.id);
                      }
                    }}
                  >
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
                                markNotificationSeen(item.id);
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
                                markNotificationSeen(item.id);
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
                              onPress={() => openAnnouncementNotification(item.id, item.id)}
                            >
                              view update
                            </Button>
                          </div>
                        ) : item.kind === "dare_reminder" ? (
                          <div className="mt-3">
                            <Button
                              radius="full"
                              className="bg-[#F5A623] text-white"
                              onPress={() => {
                                markNotificationSeen(item.id);
                                setStudentTab("feed");
                                setNotificationsOpen(false);
                              }}
                            >
                              open dare
                            </Button>
                          </div>
                        ) : item.kind === "friend_favorite" ? (
                          <div className="mt-3">
                            <Button
                              radius="full"
                              className="bg-[#F5A623] text-white"
                              onPress={() => openFriendFavoriteNotification(item.id, item.city, item.place)}
                            >
                              open favorites
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <Button
                              radius="full"
                              className="bg-[#F5A623] text-white"
                              onPress={() => openPostNotification(item.id, item.postId)}
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
                  no notifications yet. friend requests, posts, admin posts, and sunday dumps will show up here.
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      ) : null}

      <Modal
        isOpen={Boolean(selectedProfileEmail && selectedProfileAccount)}
        onOpenChange={(open) => !open && closeSelectedProfile()}
        size="full"
        scrollBehavior="inside"
      >
        <ModalContent className="max-h-[100dvh] bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-start justify-between gap-3 border-b border-[#FFF0D0]">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">friend profile</p>
                  <p className="mt-1 font-[family-name:var(--font-young-serif)] text-[2rem] leading-none text-[#2C1A0E]">
                    {selectedProfileAccount?.profile.fullName || "friend"}
                  </p>
                  <p className="mt-2 text-sm text-[#2C1A0E]">
                    @{selectedProfileAccount?.profile.username || "crumbz-user"}
                    {selectedProfileAccount?.profile.schoolName ? ` • ${selectedProfileAccount.profile.schoolName}` : ""}
                  </p>
                </div>
                <Button
                  radius="full"
                  variant="light"
                  className="text-[#2C1A0E]"
                  onPress={() => {
                    closeSelectedProfile();
                    onClose();
                  }}
                >
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="bg-[#fffaf2] pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5">
                {!selectedProfileIsOwn ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedProfileIsFriend ? (
                      <Chip className="bg-[#FFF0D0] text-[#2C1A0E]">already in your circle</Chip>
                    ) : selectedProfileIncomingRequest ? (
                      <Button radius="full" className="bg-[#F5A623] text-white" onPress={() => selectedProfileEmail && acceptFriendRequest(selectedProfileEmail)}>
                        accept request
                      </Button>
                    ) : selectedProfileRequestPending ? (
                      <Button radius="full" variant="flat" className="bg-[#FFF0D0] text-[#2C1A0E]" onPress={() => selectedProfileEmail && cancelFriendRequest(selectedProfileEmail)}>
                        cancel request
                      </Button>
                    ) : (
                      <Button radius="full" className="bg-[#F5A623] text-white" onPress={() => selectedProfileEmail && addFriend(selectedProfileEmail)}>
                        add to circle
                      </Button>
                    )}
                  </div>
                ) : null}
                {selectedProfileAuthoredPosts.length || selectedProfileTaggedPosts.length ? (
                  <div className="space-y-6">
                    {selectedProfileAuthoredPosts.length ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">posts</p>
                          <Chip className="bg-[#FFF0D0] text-[#F5A623]">{selectedProfileAuthoredPosts.length}</Chip>
                        </div>
                        {selectedProfileAuthoredPosts.map((post) => renderFeedCard(post))}
                      </div>
                    ) : null}
                    {selectedProfileTaggedPosts.length ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">tagged posts</p>
                            <p className="mt-1 text-sm text-[#6c7289]">posts where people mentioned @{selectedProfileAccount?.profile.username || "this user"}.</p>
                          </div>
                          <Chip className="bg-[#FFF0D0] text-[#F5A623]">{selectedProfileTaggedPosts.length}</Chip>
                        </div>
                        {selectedProfileTaggedPosts.map((post) => renderFeedCard(post))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-[22px] bg-white p-4 text-sm text-[#2C1A0E]">
                    no posts on this profile yet.
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={Boolean(profileDrawer)} onOpenChange={(open) => !open && setProfileDrawer(null)} size="full" scrollBehavior="inside">
        <ModalContent className="bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between gap-3 border-b border-[#FFF0D0] bg-[#fffaf2]">
                <div>
                  <p className="font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">
                    {profileDrawer === "followers" ? "your followers" : "your favorites"}
                  </p>
                  <p className="mt-2 text-sm text-[#6c7289]">
                    {profileDrawer === "followers"
                      ? "your crumbz circle lives here."
                      : "the spots you’ve saved most recently."}
                  </p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="bg-[#fffaf2] pb-8 pt-5">
                {profileDrawer === "followers" ? (
                  liveProfile.friends.length ? (
                    <div className="grid gap-3">
                      {liveProfile.friends.map((friendEmail) => {
                        const friend = accounts.find((account) => account.googleProfile?.email === friendEmail);
                        if (!friend || friendEmail.toLowerCase() === ADMIN_EMAIL) return null;

                        return (
                          <button
                            key={friendEmail}
                            type="button"
                            onClick={() => {
                              setProfileDrawer(null);
                              setSelectedProfileEmail(friendEmail);
                            }}
                            className="flex items-center gap-3 rounded-[22px] bg-[#FFF7E8] px-4 py-3 text-left"
                          >
                            <Avatar src={getAccountPicture(friend)} name={friend.profile.fullName} className="h-12 w-12 bg-[#FFF0D0] text-[#F5A623]" />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#2C1A0E]">{friend.profile.fullName}</p>
                              <p className="truncate text-sm text-[#6c7289]">@{friend.profile.username}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[22px] bg-[#FFF7E8] p-4 text-sm text-[#2C1A0E]">
                      no followers yet.
                    </div>
                  )
                ) : profileLikedSpots.length ? (
                  <div className="grid gap-3">
                    {profileLikedSpots.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => {
                          setProfileDrawer(null);
                          focusFavoritePlace(place, currentFavoriteCity);
                        }}
                        className="rounded-[22px] bg-[#FFF7E8] px-4 py-3 text-left"
                      >
                        <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">{place.kind}</p>
                        <p className="mt-2 text-lg font-semibold text-[#2C1A0E]">{place.name}</p>
                        <p className="mt-1 text-sm text-[#6c7289]">{place.address}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[22px] bg-[#FFF7E8] p-4 text-sm text-[#2C1A0E]">
                    no favorites yet.
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={profileQrOpen} onOpenChange={setProfileQrOpen} placement="center">
        <ModalContent className="max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between gap-3 border-b border-[#FFF0D0]">
                <div>
                  <p className="font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">share your profile</p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="items-center gap-4 overflow-y-auto bg-[#fffaf2] pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
                <div className="w-full rounded-[28px] border border-[#FFF0D0] bg-white p-5 text-center shadow-[0_18px_40px_rgba(254,138,1,0.08)]">
                  <div className="mx-auto flex w-fit items-center gap-3 rounded-full bg-[#FFF7E8] px-4 py-2">
                    <Avatar src={currentUserPicture} name={liveProfile.fullName || liveProfile.username} className="h-11 w-11 bg-[#FFF0D0] text-[#F5A623]" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[#2C1A0E]">{liveProfile.fullName || "crumbz user"}</p>
                      <p className="text-sm text-[#6c7289]">@{liveProfile.username}</p>
                    </div>
                  </div>
                  {profileQrImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileQrImageUrl} alt={`QR code for @${liveProfile.username}`} className="mx-auto mt-4 h-64 w-64 rounded-[24px] border border-[#FFF0D0] bg-white p-3" />
                  ) : (
                    <div className="mx-auto mt-4 flex h-64 w-64 items-center justify-center rounded-[24px] border border-[#FFF0D0] bg-[#FFF7E8] text-sm text-[#6c7289]">
                      qr code loading...
                    </div>
                  )}
                  <div className="mt-4 space-y-3">
                    <Button radius="full" className="w-full bg-[#2C1A0E] text-white" onPress={shareProfile}>
                      share profile link
                    </Button>
                    <Button radius="full" variant="flat" className="w-full bg-[#FFF0D0] text-[#2C1A0E]" onPress={shareProfilePhotoToInstagram}>
                      share photo to instagram
                    </Button>
                    <p className="text-sm text-[#6c7289]">this opens your phone share menu with the profile link people can tap.</p>
                  </div>
                  <div className="mt-3 rounded-[18px] bg-[#FFF7E8] px-4 py-3 text-left text-sm text-[#6c7289]">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">link</p>
                    <button type="button" onClick={() => void copyProfileLink()} className="block w-full truncate text-left text-[#2C1A0E]">
                      {profileShareUrl}
                    </button>
                  </div>
                </div>
                {profileShareNotice ? <p className="text-sm text-[#2C1A0E]">{profileShareNotice}</p> : null}
                <div className="flex w-full items-center justify-end gap-2">
                  <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={copyProfileLink}>
                    copy link
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={pushPromptOpen}
        onOpenChange={(open) => {
          if (!open) {
            markPushPromptAsked();
          }
          setPushPromptOpen(open);
        }}
        placement="center"
      >
        <ModalContent className="bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between gap-3 border-b border-[#FFF0D0]">
                <div>
                  <p className="font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">turn on notifications?</p>
                  <p className="mt-2 text-sm text-[#6c7289]">when admin posts, your phone can get the drop right away.</p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="gap-4 bg-[#fffaf2] pb-6 pt-5">
                <div className="rounded-[22px] bg-[#FFF7E8] p-4 text-sm leading-6 text-[#2C1A0E]">
                  apple and android both need one permission tap from you first. crumbz can ask now, but it can’t switch this on silently for everyone.
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button radius="full" className="bg-[#2C1A0E] text-white" isLoading={isUpdatingPush} onPress={enablePushNotifications}>
                    yes, turn them on
                  </Button>
                  <Button
                    radius="full"
                    variant="flat"
                    className="bg-white text-[#2C1A0E]"
                    onPress={() => {
                      markPushPromptAsked();
                      setPushPromptOpen(false);
                      setPushNotice("cool, we’ll leave notifications off for now.");
                    }}
                  >
                    maybe later
                  </Button>
                </div>
                {pushNotice ? <p className="text-sm text-[#F5A623]">{pushNotice}</p> : null}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={Boolean(selectedStoryPost)} onOpenChange={(open) => !open && setSelectedStoryPostId(null)} size="full" hideCloseButton>
        <ModalContent className="min-h-[100dvh] bg-[rgba(16,10,6,0.96)] shadow-none">
          {() => (
            <ModalBody className="flex min-h-[100dvh] items-center justify-center p-0">
              {selectedStoryPost ? (
                <div className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[#140d08]">
                  <button
                    type="button"
                    aria-label="previous story"
                    className="absolute inset-y-0 left-0 z-10 w-1/3"
                    onClick={() => showAdjacentStory(-1)}
                  />
                  <button
                    type="button"
                    aria-label="next story"
                    className="absolute inset-y-0 right-0 z-10 w-1/3"
                    onClick={() => showAdjacentStory(1)}
                  />
                  {selectedStoryPost.mediaKind === "video" && selectedStoryPost.mediaUrls[0] ? (
                    <video
                      src={selectedStoryPost.mediaUrls[0]}
                      className="absolute inset-0 h-full w-full object-cover"
                      autoPlay
                      playsInline
                      controls
                      onEnded={() => showAdjacentStory(1)}
                    />
                  ) : selectedStoryPost.mediaUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedStoryPost.mediaUrls[0]} alt={selectedStoryPost.title} className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,13,8,0.62)_0%,rgba(20,13,8,0.18)_36%,rgba(20,13,8,0.55)_100%)]" />
                  <div className="relative z-10 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
                    <div className="mb-4 grid grid-cols-1 gap-2">
                      <div className="flex gap-1">
                        {adminStorySequence.map((post, index) => (
                          <span key={post.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                            <span
                              className={`block h-full rounded-full ${index <= selectedStoryPostIndex ? "bg-white" : "bg-transparent"}`}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={adminProfilePicture} name="crumbz" className="h-11 w-11 bg-[#F5A623] text-white" />
                        <div>
                          <p className="text-sm font-semibold text-white">crumbz</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                            story {selectedStoryPostIndex + 1} of {adminStorySequence.length} • {selectedStoryPost.createdAt}
                          </p>
                        </div>
                      </div>
                      <Button radius="full" variant="light" className="min-w-0 bg-white/12 px-3 text-white" onPress={() => setSelectedStoryPostId(null)}>
                        close
                      </Button>
                    </div>
                  </div>
                  <div className="relative z-10 mt-auto space-y-3 px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-10 text-white">
                    <p className="font-[family-name:var(--font-young-serif)] text-[2.6rem] leading-none">{selectedStoryPost.title}</p>
                    {selectedStoryPost.body ? <p className="max-w-[18rem] text-base leading-7 text-white/88">{selectedStoryPost.body}</p> : null}
                    <Chip className="w-fit bg-white/14 text-white">{selectedStoryPost.cta}</Chip>
                  </div>
                </div>
              ) : null}
            </ModalBody>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={profileEditModalOpen} onOpenChange={setProfileEditModalOpen} placement="center">
        <ModalContent className="bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between gap-3 border-b border-[#FFF0D0]">
                <div>
                  <p className="font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">edit profile</p>
                  <p className="mt-2 text-sm text-[#6c7289]">change your bio or swap your display photo.</p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="gap-3 bg-[#fffaf2] pb-6 pt-5">
                <Button
                  radius="full"
                  className="bg-[#2C1A0E] text-white"
                  onPress={() => {
                    setProfileEditModalOpen(false);
                    setBioModalOpen(true);
                  }}
                >
                  edit bio
                </Button>
                <Button
                  radius="full"
                  className="bg-[#F5A623] text-white"
                  onPress={() => {
                    setProfileEditModalOpen(false);
                    setProfilePhotoModalOpen(true);
                  }}
                >
                  edit dp
                </Button>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={profilePhotoModalOpen} onOpenChange={setProfilePhotoModalOpen} placement="center">
        <ModalContent className="bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between gap-3 border-b border-[#FFF0D0]">
                <div>
                  <p className="font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">edit dp</p>
                  <p className="mt-2 text-sm text-[#6c7289]">pick a photo from your device or take a new one.</p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="gap-4 bg-[#fffaf2] pb-6 pt-5">
                <div className="flex justify-center">
                  <Avatar
                    src={profilePhotoDraft || currentUserPicture}
                    name={liveProfile.fullName || liveProfile.username || "crumbz"}
                    className="h-28 w-28 border-4 border-[#FFF0D0] bg-[#FFF0D0] text-[#F5A623]"
                  />
                </div>
                <div className="grid gap-2">
                  <Button
                    radius="full"
                    className="bg-[#2C1A0E] text-white"
                    isDisabled={isSavingProfilePhoto}
                    onPress={() => profilePhotoInputRef.current?.click()}
                  >
                    choose from device
                  </Button>
                  <Button
                    radius="full"
                    variant="flat"
                    className="bg-[#FFF0D0] text-[#2C1A0E]"
                    isDisabled={isSavingProfilePhoto}
                    onPress={() => profileCameraInputRef.current?.click()}
                  >
                    take new photo
                  </Button>
                </div>
                {profilePhotoNotice ? <p className="text-sm text-[#6c7289]">{profilePhotoNotice}</p> : null}
                <div className="flex items-center justify-end gap-2">
                  <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                    maybe later
                  </Button>
                  <Button radius="full" className="bg-[#F5A623] text-white" isLoading={isSavingProfilePhoto} onPress={saveProfilePhoto}>
                    save photo
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={bioModalOpen} onOpenChange={setBioModalOpen} placement="center">
        <ModalContent className="bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between gap-3 border-b border-[#FFF0D0]">
                <div>
                  <p className="font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">your bio</p>
                  <p className="mt-2 text-sm text-[#6c7289]">totally optional. keep it under 180 characters.</p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="gap-4 bg-[#fffaf2] pb-6 pt-5">
                <Textarea
                  placeholder="tell people a little about your food taste, vibe, or favorite spots"
                  value={bioDraft}
                  maxLength={180}
                  onValueChange={(value) => {
                    setBioDraft(value.slice(0, 180));
                    if (bioSaveNotice) setBioSaveNotice("");
                  }}
                  classNames={{ inputWrapper: "rounded-[18px] bg-white shadow-none border border-[#FFF0D0]", input: "text-[#2C1A0E] min-h-[7rem]" }}
                />
                <div className="flex items-center justify-between text-sm text-[#6c7289]">
                  <p>{bioDraft.length}/180</p>
                  {bioSaveNotice ? <p>{bioSaveNotice}</p> : null}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                    maybe later
                  </Button>
                  <Button radius="full" className="bg-[#2C1A0E] text-white" isLoading={isSavingBio} onPress={saveProfileBio}>
                    save bio
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={Boolean(selectedOwnPost)}
        onOpenChange={(open) => !open && setSelectedOwnPostId(null)}
        size="full"
        scrollBehavior="inside"
      >
        <ModalContent className="max-h-[100dvh] bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between border-b border-[#FFF0D0]">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">your post</p>
                  <p className="mt-1 font-[family-name:var(--font-young-serif)] text-[2rem] leading-none text-[#2C1A0E]">
                    @{user.profile.username}
                  </p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="bg-[#fffaf2] pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5">
                {selectedOwnPost ? renderFeedCard(selectedOwnPost, true) : null}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={dareReminderModalOpen} onOpenChange={setDareReminderModalOpen} placement="bottom-center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">add the dare reminder</ModalHeader>
              <ModalBody className="pb-6">
                <div className="rounded-[22px] bg-[#FFF8EE] p-4 text-sm text-[#2C1A0E]">
                  next drop: {dareReleaseText}
                </div>
                <p className="text-sm leading-6 text-[#6c7289]">
                  crumbz will keep reminding you in the app. if you want, you can also save the drop to apple or google
                  calendar.
                </p>
                <Button radius="full" className="bg-[#2C1A0E] text-white" onPress={downloadAppleCalendarInvite}>
                  add to apple calendar
                </Button>
                <Button radius="full" className="bg-[#F5A623] text-white" onPress={openGoogleCalendarReminder}>
                  add to google calendar
                </Button>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  not now
                </Button>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  );
}
