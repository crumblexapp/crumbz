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
  Switch,
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
const POST_TRANSLATIONS_KEY = "crumbz-post-translations-v1";
const INTERACTIONS_KEY = "crumbz-interactions-v1";
const DARE_KEY = "crumbz-dare-v1";
const SEEN_NOTIFICATIONS_KEY = "crumbz-seen-notifications-v1";
const PUSH_PROMPT_ASKED_PREFIX = "crumbz-push-prompt-asked-v1";
const INSTALL_PROMPT_DISMISSED_KEY = "crumbz-install-prompt-dismissed-v1";
const PENDING_REFERRAL_CODE_KEY = "crumbz-pending-referral-code-v1";
const POST_SIGNUP_ONBOARDING_PENDING_PREFIX = "crumbz-post-signup-onboarding-pending-v1";
const POST_SIGNUP_ONBOARDING_DONE_PREFIX = "crumbz-post-signup-onboarding-done-v1";
const POST_SIGNUP_ONBOARDING_STEP_PREFIX = "crumbz-post-signup-onboarding-step-v1";
const FAVORITE_LOCATION_MODE_PREFIX = "crumbz-favorite-location-mode-v1";
const FAVORITE_LOCATION_CITY_PREFIX = "crumbz-favorite-location-city-v1";
const FAVORITE_LOCATION_CENTER_PREFIX = "crumbz-favorite-location-center-v1";
const MEDIA_DB_NAME = "crumbz-media-v1";
const MEDIA_STORE_NAME = "post-media";
const AUTH_EXPIRED_EVENT = "crumbz-auth-expired";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const WEB_PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ADMIN_EMAIL = "crumbleappco@gmail.com";
const ADMIN_PUBLIC_HANDLE = "@crumbz.pl";
const ADMIN_POST_IMAGE_SHARE_USERNAMES = new Set(["josheats"]);
const ACCEPTED_VIDEO_TYPES = [".mp4", ".mov", "video/mp4", "video/quicktime"];
const ACCEPTED_IMAGE_TYPES = [".jpg", ".jpeg", ".png", ".heic", "image/jpeg", "image/png", "image/heic", "image/heif"];
const MAX_VIDEO_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const STORY_MAX_VIDEO_FILE_SIZE_BYTES = 500 * 1024 * 1024;
const STORY_MAX_IMAGE_FILE_SIZE_BYTES = 30 * 1024 * 1024;
const STORY_RATIO = 9 / 16;
const STORY_RATIO_TOLERANCE = 0.02;
const STORY_IMAGE_DIMENSIONS = { width: 1080, height: 1920 } as const;
const COMMENT_REACTION_OPTIONS = ["❤️", "😂", "😭", "🔥", "🙏", "👍"] as const;
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
    titlePl: "",
    body: "this is where the first real crumbz story lands once the team posts.",
    bodyPl: "",
    originalLanguage: "en",
    type: "chapter",
    cta: "first drop loading",
    ctaPl: "",
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
    titlePl: "",
    body: "flash deals, restaurant collabs, and campus-only offers will show up here first.",
    bodyPl: "",
    originalLanguage: "en",
    type: "discount",
    cta: "rewards coming soon",
    ctaPl: "",
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
    titlePl: "",
    body: "crumbz is getting ready to drop the first real story. stay close, it lands here first.",
    bodyPl: "",
    originalLanguage: "en",
    type: "chapter",
    cta: "live soon",
    ctaPl: "",
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
type AccountRole = "user" | "influencer" | "admin";
type PostType = "chapter" | "story" | "discount" | "ad" | "collab" | "weekly-dump";
type MediaKind = "none" | "photo" | "video" | "carousel";
type VideoRatio = "9:16" | "4:5" | "1:1" | "16:9";
type CreatorPostFormat = "post" | "carousel" | "reel" | "story";
type StudentTab = "feed" | "favorites" | "rewards" | "social" | "profile";
type InfluencerDashboardTab = "overview" | "content" | "referrals" | "support" | "settings" | "insights";
type ProfilePostTab = "all" | "friend-review" | "post" | "sunday-dump";
type AppNavigationState = {
  studentTab: StudentTab;
  notificationsOpen: boolean;
  selectedProfileEmail: string | null;
  profileDrawer: "followers" | "favorites" | null;
  selectedOwnArchiveOpen: boolean;
  selectedOwnPostId: string | null;
  selectedStoryPostId: string | null;
  favoriteViewCity: string | null;
  highlightedFavoritePlaceId: string | null;
};

type CrumbzHistoryState = {
  crumbzNav?: AppNavigationState;
};

type StoryRailItem = {
  id: string;
  postId: string | null;
  label: string;
  detail: string;
  picture: string;
  ring: string;
  badge: string;
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
    preferredLanguage?: Language;
    accountRole?: AccountRole;
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
  priceLevel?: string;
  openingHours?: string[];
  openNow?: boolean | null;
  reviews?: Array<{
    authorName: string;
    rating: number | null;
    text: string;
  }>;
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

type LocalizedPostContent = {
  title: string;
  body: string;
  cta: string;
};

type DetectedPostLanguage = Language | "unknown";

type PostTranslationCacheEntry = LocalizedPostContent & {
  sourceLanguage: string;
  translatedAt: string;
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
  titlePl: string;
  body: string;
  bodyPl: string;
  originalLanguage: Language;
  type: PostType;
  cta: string;
  ctaPl: string;
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
  titlePl: "",
  bodyPl: "",
  ctaPl: "",
  originalLanguage: "en" as Language,
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

const CREATOR_REEL_DIMENSIONS = [{ width: 1080, height: 1920 }] as const;
const CREATOR_STORY_DIMENSIONS = [{ width: 1080, height: 1920 }] as const;
const CREATOR_POST_DIMENSIONS = [
  { width: 1080, height: 1080 },
  { width: 1080, height: 1350 },
  { width: 1080, height: 566 },
] as const;
const CREATOR_CAROUSEL_DIMENSIONS = [
  { width: 1080, height: 1080 },
  { width: 1080, height: 1350 },
] as const;
const CREATOR_REEL_MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024 * 1024;

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
  reactions?: Array<{
    emoji: string;
    authorEmail: string;
    authorName: string;
    createdAt: string;
  }>;
  replies?: Array<{
    id: string;
    authorEmail: string;
    authorName: string;
    text: string;
    createdAt: string;
    reactions?: Array<{
      emoji: string;
      authorEmail: string;
      authorName: string;
      createdAt: string;
    }>;
  }>;
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

type PostView = {
  authorEmail: string;
  createdAt: string;
};

type PostSave = {
  authorEmail: string;
  authorName: string;
  placeId: string;
  createdAt: string;
};

type AppAnnouncement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  titlePl?: string;
  bodyPl?: string;
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
  views: PostView[];
  saves: PostSave[];
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
    preferredLanguage: "en",
    accountRole: "user",
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

function normalizePostTranslationCache(rawCache: unknown) {
  const candidate = rawCache && typeof rawCache === "object" ? (rawCache as Record<string, unknown>) : {};

  return Object.fromEntries(
    Object.entries(candidate)
      .map(([postId, value]) => {
        if (!value || typeof value !== "object") return null;
        const entry = value as Record<string, unknown>;

        return [
          postId,
          {
            title: typeof entry.title === "string" ? entry.title : "",
            body: typeof entry.body === "string" ? entry.body : "",
            cta: typeof entry.cta === "string" ? entry.cta : "",
            sourceLanguage: typeof entry.sourceLanguage === "string" ? entry.sourceLanguage : "",
            translatedAt: typeof entry.translatedAt === "string" ? entry.translatedAt : "",
          } satisfies PostTranslationCacheEntry,
        ] as const;
      })
      .filter((entry): entry is readonly [string, PostTranslationCacheEntry] => Boolean(entry)),
  );
}

function getLocalizedPostContent(
  post: Pick<AppPost, "title" | "titlePl" | "body" | "bodyPl" | "cta" | "ctaPl" | "originalLanguage">,
  language: Language,
  translationOverride?: LocalizedPostContent | null,
): LocalizedPostContent {
  if (translationOverride) return translationOverride;

  if (post.originalLanguage === "pl") {
    return {
      title: post.title.trim(),
      body: post.body.trim(),
      cta: post.cta.trim(),
    };
  }

  return {
    title: post.title.trim(),
    body: post.body.trim(),
    cta: post.cta.trim(),
  };
}

function hasNativeLocalizedPostContent(
  post: Pick<AppPost, "title" | "titlePl" | "body" | "bodyPl" | "cta" | "ctaPl" | "originalLanguage">,
  targetLanguage: Language,
) {
  if (targetLanguage === "pl" && post.originalLanguage !== "pl") {
    return Boolean(post.titlePl.trim() || post.bodyPl.trim() || post.ctaPl.trim());
  }

  if (targetLanguage === "en" && post.originalLanguage === "pl") {
    return Boolean(post.title.trim() || post.body.trim() || post.cta.trim());
  }

  return false;
}

function getNativeTranslatedPostContent(
  post: Pick<AppPost, "title" | "titlePl" | "body" | "bodyPl" | "cta" | "ctaPl" | "originalLanguage">,
  targetLanguage: Language,
): LocalizedPostContent | null {
  if (targetLanguage === "pl" && post.originalLanguage !== "pl") {
    if (!(post.titlePl.trim() || post.bodyPl.trim() || post.ctaPl.trim())) return null;
    return {
      title: post.titlePl.trim() || post.title.trim(),
      body: post.bodyPl.trim() || post.body.trim(),
      cta: post.ctaPl.trim() || post.cta.trim(),
    };
  }

  if (targetLanguage === "en" && post.originalLanguage === "pl") {
    return {
      title: post.title.trim(),
      body: post.body.trim(),
      cta: post.cta.trim(),
    };
  }

  return null;
}

function getPostTranslationCacheKey(postId: string, targetLanguage: Language) {
  return `${postId}:${targetLanguage}`;
}

function backfillExistingAdminPolishCopy(post: Pick<AppPost, "authorRole" | "title" | "titlePl" | "body" | "bodyPl" | "cta" | "ctaPl">) {
  if (post.authorRole !== "admin") {
    return {
      titlePl: post.titlePl,
      bodyPl: post.bodyPl,
      ctaPl: post.ctaPl,
    };
  }

  const normalizedTitle = post.title.trim().toLowerCase();
  const normalizedBody = post.body.trim().toLowerCase();

  if (normalizedTitle === "share and win" && normalizedBody === "share your referral link and win some crazy prizes") {
    return {
      titlePl: post.titlePl.trim() || "udostępnij i wygraj",
      bodyPl: post.bodyPl.trim() || "udostępnij swój link polecający i zgarnij kozackie nagrody",
      ctaPl: post.ctaPl.trim() || "działamy",
    };
  }

  return {
    titlePl: post.titlePl,
    bodyPl: post.bodyPl,
    ctaPl: post.ctaPl,
  };
}

function inferOriginalPostLanguage(post: Pick<AppPost, "title" | "body" | "cta">): Language {
  const detected = detectPostLanguage({
    title: post.title,
    body: post.body,
    cta: post.cta,
  });

  return detected === "pl" ? "pl" : "en";
}

function detectPostLanguage(content: Pick<LocalizedPostContent, "title" | "body" | "cta">): DetectedPostLanguage {
  const sample = `${content.title} ${content.body} ${content.cta}`.trim().toLowerCase();
  if (!sample) return "unknown";

  const polishCharHits = (sample.match(/[ąćęłńóśźż]/g) ?? []).length;
  const polishWordHits = (sample.match(/\b(i|się|że|nie|jest|dla|tylko|już|bardzo|to|na|po|od|czy)\b/g) ?? []).length;
  if (polishCharHits > 0 || polishWordHits >= 2) return "pl";

  const englishWordHits = (sample.match(/\b(and|the|is|are|this|that|with|for|just|live|new|you|your|from|again)\b/g) ?? []).length;
  if (englishWordHits >= 2) return "en";

  return "unknown";
}

function getPostSignupOnboardingPendingKey(email: string) {
  return `${POST_SIGNUP_ONBOARDING_PENDING_PREFIX}:${email.toLowerCase()}`;
}

function getPostSignupOnboardingDoneKey(email: string) {
  return `${POST_SIGNUP_ONBOARDING_DONE_PREFIX}:${email.toLowerCase()}`;
}

function getPostSignupOnboardingStepKey(email: string) {
  return `${POST_SIGNUP_ONBOARDING_STEP_PREFIX}:${email.toLowerCase()}`;
}

function getFavoriteLocationModeKey(email: string) {
  return `${FAVORITE_LOCATION_MODE_PREFIX}:${email.toLowerCase()}`;
}

function getFavoriteLocationCityKey(email: string) {
  return `${FAVORITE_LOCATION_CITY_PREFIX}:${email.toLowerCase()}`;
}

function getFavoriteLocationCenterKey(email: string) {
  return `${FAVORITE_LOCATION_CENTER_PREFIX}:${email.toLowerCase()}`;
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

function getAccountRole(account: Pick<StoredUser, "googleProfile" | "profile"> | null | undefined): AccountRole {
  if (account?.googleProfile?.email?.toLowerCase() === ADMIN_EMAIL) return "admin";
  return account?.profile.accountRole === "influencer" ? "influencer" : "user";
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
  return posts.map((post) => {
    const normalizedPost = {
      ...defaultPostFields,
      ...post,
      id: typeof post.id === "string" ? post.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: typeof post.title === "string" ? post.title : "untitled post",
      titlePl: typeof post.titlePl === "string" ? post.titlePl : "",
      body: typeof post.body === "string" ? post.body : "",
      bodyPl: typeof post.bodyPl === "string" ? post.bodyPl : "",
      originalLanguage:
        post.originalLanguage === "pl" || post.originalLanguage === "en"
          ? post.originalLanguage
          : inferOriginalPostLanguage({
              title: typeof post.title === "string" ? post.title : "",
              body: typeof post.body === "string" ? post.body : "",
              cta: typeof post.cta === "string" ? post.cta : "",
            }),
      type: typeof post.type === "string" ? post.type : "chapter",
      cta: typeof post.cta === "string" ? post.cta : "live now",
      ctaPl: typeof post.ctaPl === "string" ? post.ctaPl : "",
      createdAt: typeof post.createdAt === "string" ? post.createdAt : formatNow(),
      createdAtIso:
        typeof post.createdAtIso === "string" && !Number.isNaN(Date.parse(post.createdAtIso))
          ? post.createdAtIso
          : new Date().toISOString(),
      mediaUrls: Array.isArray(post.mediaUrls) ? post.mediaUrls : [],
      videoRatio: post.videoRatio ?? "9:16",
      mediaKind: post.mediaKind ?? "none",
      authorRole: (post.authorRole === "student" ? "student" : "admin") as AppPost["authorRole"],
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
    };

    return {
      ...normalizedPost,
      ...backfillExistingAdminPolishCopy(normalizedPost),
    };
  }) as AppPost[];
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

function preserveLocalMedia(localPosts: AppPost[], incomingPosts: AppPost[]) {
  const localPostsById = new Map(localPosts.map((post) => [post.id, post] as const));

  return incomingPosts.map((post): AppPost => {
    const localPost = localPostsById.get(post.id);
    if (!localPost) return post;

    const nextMediaUrls = post.mediaUrls.length ? post.mediaUrls : localPost.mediaUrls;
    const nextMediaKind: MediaKind =
      post.mediaKind !== "none"
        ? post.mediaKind
        : nextMediaUrls.length > 1
          ? "carousel"
          : nextMediaUrls.length === 1
            ? localPost.mediaKind !== "none"
              ? localPost.mediaKind
              : "photo"
            : "none";

    return {
      ...post,
      mediaUrls: nextMediaUrls,
      mediaKind: nextMediaKind,
      videoRatio: post.videoRatio !== "9:16" || post.mediaKind === "video" ? post.videoRatio : localPost.videoRatio,
    };
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

function getPushPromptSnoozeUntil(rawValue: string | null) {
  if (!rawValue) return 0;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLocalizedAnnouncementContent(announcement: AppAnnouncement | null, language: Language) {
  if (!announcement) return null;

  const normalizedTitle = announcement.title.trim().toLowerCase();
  const normalizedBody = announcement.body.trim().toLowerCase();
  const fallbackPolishTitle =
    normalizedTitle === "share and win" && normalizedBody === "share your referral link and win some crazy prizes"
      ? "udostępnij i wygraj"
      : announcement.title;
  const fallbackPolishBody =
    normalizedTitle === "share and win" && normalizedBody === "share your referral link and win some crazy prizes"
      ? "udostępnij swój link polecający i zgarnij kozackie nagrody"
      : announcement.body;

  if (language === "pl") {
    return {
      title: announcement.titlePl?.trim() || fallbackPolishTitle,
      body: announcement.bodyPl?.trim() || fallbackPolishBody,
    };
  }

  return {
    title: announcement.title,
    body: announcement.body,
  };
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

function getReferralLink(referralCode: string, profileUsername?: string) {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.origin);
  const trimmedUsername = profileUsername?.trim().toLowerCase();
  if (trimmedUsername) {
    url.searchParams.set("profile", trimmedUsername);
  }
  url.searchParams.set("ref", referralCode);
  return url.toString();
}

function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const startLat = toRadians(lat1);
  const endLat = toRadians(lat2);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2) * Math.cos(startLat) * Math.cos(endLat);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearestSupportedCity(lat: number, lon: number) {
  return Object.entries(cityCenters).reduce(
    (closest, [city, [cityLat, cityLon]]) => {
      const distance = getDistanceInKm(lat, lon, cityLat, cityLon);
      const displayName = cityOptions.find((option) => normalizeCityKey(option) === city) ?? city;
      if (!closest || distance < closest.distanceKm) {
        return { city: displayName, distanceKm: distance };
      }

      return closest;
    },
    null as { city: string; distanceKm: number } | null,
  );
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
        preferredLanguage: (candidate.profile?.preferredLanguage === "pl" ? "pl" : "en") as Language,
        accountRole: (candidate.googleProfile?.email?.toLowerCase() === ADMIN_EMAIL
          ? "admin"
          : candidate.profile?.accountRole === "influencer"
            ? "influencer"
            : "user") as AccountRole,
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

    return normalized satisfies StoredUser;
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
          views: Array.isArray(safeBucket.views) ? safeBucket.views.filter((item): item is PostView => Boolean(item && typeof item === "object")) : [],
          saves: Array.isArray(safeBucket.saves) ? safeBucket.saves.filter((item): item is PostSave => Boolean(item && typeof item === "object")) : [],
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

function renderInfluencerTabIcon(tabKey: InfluencerDashboardTab, className: string) {
  switch (tabKey) {
    case "overview":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M5 18.25h14" strokeLinecap="round" />
          <path d="M7.5 15V9.5" strokeLinecap="round" />
          <path d="M12 15V6" strokeLinecap="round" />
          <path d="M16.5 15V11.5" strokeLinecap="round" />
        </svg>
      );
    case "content":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <rect x="4.5" y="5" width="15" height="14" rx="2.5" />
          <path d="m8 14 2.5-2.5L13 14l3.5-3.5L19 13" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "referrals":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M10 7.5h7a2.5 2.5 0 0 1 0 5h-7a2.5 2.5 0 0 1 0-5Z" />
          <path d="M14 11.5h-4a2.5 2.5 0 0 0 0 5h7a2.5 2.5 0 0 0 0-5h-1" />
        </svg>
      );
    case "support":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H10l-4 3v-3.5A2.5 2.5 0 0 1 5 13.5Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
          <path d="M19 12a7.37 7.37 0 0 0-.07-1l2.02-1.58-2-3.46-2.42.97a7.2 7.2 0 0 0-1.73-1l-.36-2.57H9.56L9.2 5.93c-.62.23-1.2.57-1.73 1l-2.42-.97-2 3.46L5.07 11a7.37 7.37 0 0 0 0 2l-2.02 1.58 2 3.46 2.42-.97c.53.43 1.11.77 1.73 1l.36 2.57h4.88l.36-2.57c.62-.23 1.2-.57 1.73-1l2.42.97 2-3.46L18.93 13c.05-.33.07-.66.07-1Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "insights":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
          <path d="m5 15 4-4 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 7h3v3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function renderCreatorBadge(compact = false) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[linear-gradient(180deg,_#F6C765_0%,_#E3A736_100%)] font-semibold uppercase tracking-[0.14em] text-[#2C1A0E] shadow-[0_10px_24px_rgba(227,167,54,0.28)] ${
        compact ? "h-7 w-7 justify-center" : "h-8 w-8 justify-center"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true">
        <path
          d="m12 4.8 1.95 4 4.42.64-3.18 3.1.75 4.4L12 14.9l-3.94 2.04.75-4.4-3.18-3.1 4.42-.64L12 4.8Z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function getVideoRatioFromDimensions(width: number, height: number): VideoRatio {
  const ratio = width / height;

  if (Math.abs(ratio - 1) <= 0.03) return "1:1";
  if (Math.abs(ratio - 4 / 5) <= 0.03) return "4:5";
  if (Math.abs(ratio - 9 / 16) <= 0.03) return "9:16";
  return "16:9";
}

function getCreatorFormatRules(format: CreatorPostFormat) {
  switch (format) {
    case "carousel":
      return "2 to 10 slides. 1:1 or 4:5. best size: 1080 x 1350.";
    case "reel":
      return "9:16 vertical. 1080 x 1920. 3 to 90 sec. up to 4 gb.";
    case "story":
      return "9:16. 1080 x 1920. image or video. videos up to 15 sec.";
    default:
      return "single photo or video. 1:1, 4:5, or 1.91:1. videos up to 60 sec.";
  }
}

function getCreatorUploadPrompt(format: CreatorPostFormat) {
  switch (format) {
    case "carousel":
      return "add carousel slides";
    case "reel":
      return "add your reel";
    case "story":
      return "add your story";
    default:
      return "add your post";
  }
}

function inferCreatorFormatFromFiles(files: File[]) {
  if (files.length > 1) return "carousel" as const;
  const firstFile = files[0];
  if (!firstFile) return "post" as const;
  return matchesAcceptedType(firstFile, ACCEPTED_VIDEO_TYPES) ? ("reel" as const) : ("post" as const);
}

function inferCreatorPostFormat(post: AppPost): CreatorPostFormat {
  if (post.type === "story" || post.cta === "story") return "story";
  if (post.cta === "reel") return "reel";
  if (post.mediaKind === "carousel" || post.cta === "carousel") return "carousel";
  return "post";
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

function getDisplayTimestamp(value: string, fallbackOffset = 0) {
  const match = value.trim().match(/^(\d{1,2}) ([A-Za-z]{3}), (\d{2}):(\d{2})$/);
  if (!match) return Date.now() - fallbackOffset;

  const [, dayRaw, monthRaw, hourRaw, minuteRaw] = match;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthIndex = months.indexOf(monthRaw.toLowerCase());
  if (monthIndex === -1) return Date.now() - fallbackOffset;

  const now = new Date();
  return new Date(now.getFullYear(), monthIndex, Number(dayRaw), Number(hourRaw), Number(minuteRaw)).getTime();
}

function formatNotificationActorList(names: string[]) {
  const cleanedNames = names.map((name) => name.trim()).filter(Boolean);
  if (!cleanedNames.length) return "someone";

  const uniqueNames = [...new Set(cleanedNames)];
  const visibleNames = uniqueNames.slice(0, 4);
  const remainingCount = uniqueNames.length - visibleNames.length;
  const namesLabel = visibleNames.join(", ");

  return remainingCount > 0 ? `${namesLabel} +${remainingCount} more` : namesLabel;
}

function groupLikesForNotifications(likes: PostLike[], gapMs = 2 * 60 * 60 * 1000) {
  const sortedLikes = likes
    .slice()
    .sort((a, b) => getDisplayTimestamp(a.createdAt) - getDisplayTimestamp(b.createdAt));

  return sortedLikes.reduce<PostLike[][]>((groups, like) => {
    const currentGroup = groups[groups.length - 1];
    if (!currentGroup?.length) {
      groups.push([like]);
      return groups;
    }

    const previousLike = currentGroup[currentGroup.length - 1];
    const currentLikeTime = getDisplayTimestamp(like.createdAt);
    const previousLikeTime = getDisplayTimestamp(previousLike.createdAt);

    if (currentLikeTime - previousLikeTime >= gapMs) {
      groups.push([like]);
      return groups;
    }

    currentGroup.push(like);
    return groups;
  }, []);
}

function groupTimedNotificationItems<T extends { createdAt: string }>(items: T[], gapMs = 2 * 60 * 60 * 1000) {
  const sortedItems = items
    .slice()
    .sort((a, b) => getDisplayTimestamp(a.createdAt) - getDisplayTimestamp(b.createdAt));

  return sortedItems.reduce<T[][]>((groups, item) => {
    const currentGroup = groups[groups.length - 1];
    if (!currentGroup?.length) {
      groups.push([item]);
      return groups;
    }

    const previousItem = currentGroup[currentGroup.length - 1];
    const currentTime = getDisplayTimestamp(item.createdAt);
    const previousTime = getDisplayTimestamp(previousItem.createdAt);

    if (currentTime - previousTime >= gapMs) {
      groups.push([item]);
      return groups;
    }

    currentGroup.push(item);
    return groups;
  }, []);
}

function getProfilePostTabForPost(post: Pick<AppPost, "type" | "cta">): Exclude<ProfilePostTab, "all"> {
  if (post.type === "weekly-dump") return "sunday-dump";
  return post.cta === "friend review" ? "friend-review" : "post";
}

function getProfilePostTabLabel(tab: ProfilePostTab) {
  switch (tab) {
    case "all":
      return "all";
    case "friend-review":
      return "friend review";
    case "sunday-dump":
      return "sunday dumps";
    default:
      return "post";
  }
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
  return interactions[postId] ?? { comments: [], shares: [], likes: [], views: [], saves: [] };
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
  const effectiveMediaKind =
    post.mediaKind !== "none"
      ? post.mediaKind
      : mediaUrls.length > 1
        ? "carousel"
        : mediaUrls.length === 1
          ? "photo"
          : "none";

  if (effectiveMediaKind === "none" || !mediaUrls.length) {
    return null;
  }

  if (effectiveMediaKind === "photo") {
    return (
      <div className={`overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0] ${detail ? "flex justify-center bg-white p-2" : ""}`}>
        {/* uploaded dump images come straight from storage urls, so a plain img avoids remote loader issues here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrls[0]}
          alt={post.title}
          className={detail ? "max-h-[70vh] w-auto max-w-full object-contain" : "h-auto w-full object-contain"}
          loading="lazy"
        />
      </div>
    );
  }

  if (effectiveMediaKind === "video") {
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
  const [postSignupOnboardingOpen, setPostSignupOnboardingOpen] = useState(false);
  const [postSignupOnboardingStep, setPostSignupOnboardingStep] = useState(0);
  const [postSignupPlaceQuery, setPostSignupPlaceQuery] = useState("");
  const [postSignupPlaceResults, setPostSignupPlaceResults] = useState<FavoritePlace[]>([]);
  const [postSignupPlaceSearchLoading, setPostSignupPlaceSearchLoading] = useState(false);
  const [postSignupSelectedPlace, setPostSignupSelectedPlace] = useState<FavoritePlace | null>(null);
  const [postSignupSelectedPlaces, setPostSignupSelectedPlaces] = useState<FavoritePlace[]>([]);
  const [isSavingPostSignupFavorites, setIsSavingPostSignupFavorites] = useState(false);
  const [postSignupFriendQuery, setPostSignupFriendQuery] = useState("");
  const [postSignupNotice, setPostSignupNotice] = useState("");
  const [language, setLanguage] = useState<Language>(detectPreferredLanguage);
  const [studentTab, setStudentTab] = useState<StudentTab>("feed");
  const [influencerDashboardTab, setInfluencerDashboardTab] = useState<InfluencerDashboardTab>("overview");
  const [creatorDashboardOpen, setCreatorDashboardOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [pushNotice, setPushNotice] = useState("");
  const [pushPromptOpen, setPushPromptOpen] = useState(false);
  const [pushPromptSnoozedUntil, setPushPromptSnoozedUntil] = useState(0);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installPromptMode, setInstallPromptMode] = useState<"android" | "ios" | null>(null);
  const [installPromptExpanded, setInstallPromptExpanded] = useState(false);
  const [friendQuery, setFriendQuery] = useState("");
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>([]);
  const [highlightedFavoritePlaceId, setHighlightedFavoritePlaceId] = useState<string | null>(null);
  const [favoriteViewCity, setFavoriteViewCity] = useState<string | null>(null);
  const [favoriteMapMode, setFavoriteMapMode] = useState<"home" | "nearby">("home");
  const [favoriteNearbyCenter, setFavoriteNearbyCenter] = useState<[number, number] | null>(null);
  const [favoriteNearbyCity, setFavoriteNearbyCity] = useState<string | null>(null);
  const [favoritePlacesLoading, setFavoritePlacesLoading] = useState(false);
  const [favoritePlacesError, setFavoritePlacesError] = useState("");
  const [favoriteLocationNotice, setFavoriteLocationNotice] = useState("");
  const [favoriteLocationLoading, setFavoriteLocationLoading] = useState(false);
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
  const [dailyPostFormat, setDailyPostFormat] = useState<CreatorPostFormat>("post");
  const [dailyPostComposerMediaKind, setDailyPostComposerMediaKind] = useState<MediaKind>("photo");
  const [dailyPostVideoRatio, setDailyPostVideoRatio] = useState<VideoRatio>("4:5");
  const [dailyPostMediaUrls, setDailyPostMediaUrls] = useState<string[]>([]);
  const [dailyPostTaggedPlace, setDailyPostTaggedPlace] = useState<FavoritePlace | null>(null);
  const [editingDailyPostId, setEditingDailyPostId] = useState<string | null>(null);
  const [dailyPostPlaceQuery, setDailyPostPlaceQuery] = useState("");
  const [dailyPostPlaceResults, setDailyPostPlaceResults] = useState<FavoritePlace[]>([]);
  const [dailyPostPlaceSearchLoading, setDailyPostPlaceSearchLoading] = useState(false);
  const [adminPostCity, setAdminPostCity] = useState<string>(cityOptions[0]);
  const [adminPostTaggedPlace, setAdminPostTaggedPlace] = useState<FavoritePlace | null>(null);
  const [adminPostPlaceQuery, setAdminPostPlaceQuery] = useState("");
  const [adminPostPlaceResults, setAdminPostPlaceResults] = useState<FavoritePlace[]>([]);
  const [adminPostPlaceSearchLoading, setAdminPostPlaceSearchLoading] = useState(false);
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
  const [commentReplyDrafts, setCommentReplyDrafts] = useState<Record<string, string>>({});
  const [openReplyComposerId, setOpenReplyComposerId] = useState<string | null>(null);
  const [openReplyComposerLabel, setOpenReplyComposerLabel] = useState<string | null>(null);
  const [openCommentReactionPickerId, setOpenCommentReactionPickerId] = useState<string | null>(null);
  const [commentReactionViewer, setCommentReactionViewer] = useState<{ postId: string; commentId: string; replyId?: string; emoji: string } | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [pendingDeletePostId, setPendingDeletePostId] = useState<string | null>(null);
  const [selectedProfileEmail, setSelectedProfileEmail] = useState<string | null>(null);
  const [profileDrawer, setProfileDrawer] = useState<"followers" | "favorites" | null>(null);
  const [selectedProfilePostTab, setSelectedProfilePostTab] = useState<ProfilePostTab>("all");
  const [selectedProfilePostFiltersOpen, setSelectedProfilePostFiltersOpen] = useState(false);
  const [selectedOwnArchiveOpen, setSelectedOwnArchiveOpen] = useState(false);
  const [selectedOwnPostId, setSelectedOwnPostId] = useState<string | null>(null);
  const [selectedOwnPostSnapshot, setSelectedOwnPostSnapshot] = useState<AppPost | null>(null);
  const [postShareNotice, setPostShareNotice] = useState<{ postId: string; message: string } | null>(null);
  const [pendingOwnArchivePost, setPendingOwnArchivePost] = useState<AppPost | null>(null);
  const [selectedStoryPostId, setSelectedStoryPostId] = useState<string | null>(null);
  const [postTranslations, setPostTranslations] = useState<Record<string, PostTranslationCacheEntry>>({});
  const [translatedPostVisibility, setTranslatedPostVisibility] = useState<Record<string, boolean>>({});
  const [translatingPostIds, setTranslatingPostIds] = useState<Record<string, boolean>>({});
  const [translationNotice, setTranslationNotice] = useState<{ key: string; message: string } | null>(null);
  const [likesViewerPostId, setLikesViewerPostId] = useState<string | null>(null);
  const [likesViewerSearch, setLikesViewerSearch] = useState("");
  const [composerMediaInputKey, setComposerMediaInputKey] = useState(0);
  const [composer, setComposer] = useState({
    title: "",
    titlePl: "",
    body: "",
    bodyPl: "",
    cta: "",
    ctaPl: "",
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
  const currentAccountRole = getAccountRole(liveAccount ?? user);
  const isInfluencer = currentAccountRole === "influencer";
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
  const postSignupReferralUrl = useMemo(() => {
    const referralCode = liveProfile.referralCode?.trim().toUpperCase();
    const referralUsername = liveProfile.username?.trim().toLowerCase();
    return referralCode ? getReferralLink(referralCode, referralUsername) : "";
  }, [liveProfile.referralCode, liveProfile.username]);
  const copy = useMemo(() => translations[language], [language]);
  const navigationState = useMemo<AppNavigationState>(
    () => ({
      studentTab,
      notificationsOpen,
      selectedProfileEmail,
      profileDrawer,
      selectedOwnArchiveOpen,
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
      selectedOwnArchiveOpen,
      selectedOwnPostId,
      selectedProfileEmail,
      selectedStoryPostId,
      studentTab,
    ],
  );
  const navigationKey = JSON.stringify(navigationState);

  const setPostSignupOnboardingStepWithPersistence = (nextStep: number) => {
    setPostSignupOnboardingStep(nextStep);

    if (typeof window === "undefined") return;

    const email = user.googleProfile?.email?.toLowerCase();
    if (!email) return;

    window.localStorage.setItem(getPostSignupOnboardingStepKey(email), String(nextStep));
  };

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
    setPostTranslations(normalizePostTranslationCache(readJson<Record<string, unknown>>(POST_TRANSLATIONS_KEY, {})));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(POST_TRANSLATIONS_KEY, JSON.stringify(postTranslations));
  }, [postTranslations]);

  useEffect(() => {
    if (!user.signedIn || !liveAccount?.googleProfile?.email) return;
    if ((liveProfile.preferredLanguage ?? "en") === language) return;

    const nextAccount: StoredUser = {
      ...liveAccount,
      profile: {
        ...liveAccount.profile,
        preferredLanguage: language,
      },
    };

    persistUser({
      ...(liveAccount.googleProfile?.email?.toLowerCase() === (user.googleProfile?.email?.toLowerCase() ?? "") ? nextAccount : user),
    });
    setAccounts((current) =>
      current.map((account) =>
        account.googleProfile?.email?.toLowerCase() === liveAccount.googleProfile?.email?.toLowerCase() ? nextAccount : account,
      ),
    );

    void mutateAccountState({
      action: "upsert_account",
      account: nextAccount,
    }).then((result) => {
      setAccounts(result.accounts);
    }).catch(() => undefined);
  }, [language, liveAccount, liveProfile.preferredLanguage, user, user.signedIn]);

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
      setSelectedOwnArchiveOpen(nextState.selectedOwnArchiveOpen);
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tabParam = new URLSearchParams(window.location.search).get("tab")?.trim().toLowerCase();
    if (!tabParam) return;

    const validTabs: StudentTab[] = ["feed", "favorites", "rewards", "social", "profile"];
    if (!validTabs.includes(tabParam as StudentTab)) return;

    setStudentTab(tabParam as StudentTab);
  }, []);


  const adminAccount =
    accounts.find((account) => account.googleProfile?.email?.toLowerCase() === ADMIN_EMAIL) ?? null;
  const adminProfilePicture = getAccountPicture(adminAccount);
  const nonAdminAccounts = accounts.filter((account) => account.googleProfile?.email?.toLowerCase() !== ADMIN_EMAIL);
  const influencerAccounts = nonAdminAccounts.filter((account) => getAccountRole(account) === "influencer");
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
  const latestAnnouncementContent = getLocalizedAnnouncementContent(latestAnnouncement, language);
  const selectedAnnouncement =
    announcements.find((announcement) => announcement.id === selectedAnnouncementId) ??
    latestAnnouncement;
  const homeAnnouncement = latestAnnouncement;
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
  const adminPosts = posts.filter((post) => post.authorEmail.toLowerCase() === ADMIN_EMAIL || post.authorRole === "admin");
  const influencerFeedPosts = posts
    .filter((post) => influencerAccounts.some((account) => account.googleProfile?.email?.toLowerCase() === post.authorEmail.toLowerCase()))
    .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const currentUserEmail = user.googleProfile?.email?.toLowerCase() ?? "";
  const friendEmails = liveProfile.friends.map((email) => email.toLowerCase());
  const today = new Date();
  const canSubmitWeeklyDumpToday = isSunday(today);
  const shouldShowSundayDumpFeed = canSubmitWeeklyDumpToday;
  const currentSundayKey = getSundayKey(today);
  const studentDailyPosts = posts
    .filter((post) => post.authorRole === "student" && post.type !== "weekly-dump" && post.type !== "story")
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
  const viewerCityKey = normalizeCityKey(liveProfile.city || "");
  const creatorLiveStoryPosts = posts
    .filter((post) => post.authorRole === "student" && post.type === "story" && isLiveStory(post))
    .filter((post) => {
      const account = accountByEmail.get(post.authorEmail.toLowerCase()) ?? null;
      if (!account || getAccountRole(account) !== "influencer") return false;
      return normalizeCityKey(account.profile.city || "") === viewerCityKey;
    })
    .sort((a, b) => getPostTimestamp(a) - getPostTimestamp(b));
  const creatorStoryGroups = creatorLiveStoryPosts.reduce<Array<{ account: StoredUser; posts: AppPost[] }>>((groups, post) => {
    const account = accountByEmail.get(post.authorEmail.toLowerCase()) ?? null;
    if (!account) return groups;

    const existingGroup = groups.find(
      (group) => group.account.googleProfile?.email?.toLowerCase() === post.authorEmail.toLowerCase(),
    );

    if (existingGroup) {
      existingGroup.posts.push(post);
      return groups;
    }

    groups.push({ account, posts: [post] });
    return groups;
  }, []);
  const adminFeedPosts = adminPosts.filter((post) => post.type !== "story");
  const adminPostArchive = [...adminFeedPosts].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const mixedHomeFeedPosts = [...adminFeedPosts, ...influencerFeedPosts, ...friendDailyFeedPosts].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
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
  const rawOnboardingCityPosts = [...studentDailyPosts, ...studentWeeklyDumps]
    .filter((post) => post.authorEmail.toLowerCase() !== currentUserEmail)
    .filter((post) => {
      const authorCity = accountByEmail.get(post.authorEmail.toLowerCase())?.profile.city ?? "";
      const postCity = post.taggedPlaceCity ?? authorCity;
      return normalizeCityKey(postCity) === normalizeCityKey(liveProfile.city);
    })
    .sort((a, b) => Number(Boolean(b.mediaUrls[0])) - Number(Boolean(a.mediaUrls[0])) || getPostTimestamp(b) - getPostTimestamp(a));
  const onboardingCityPosts = [
    ...rawOnboardingCityPosts.filter(
      (post, index, list) => list.findIndex((candidate) => candidate.authorEmail.toLowerCase() === post.authorEmail.toLowerCase()) === index,
    ),
    ...rawOnboardingCityPosts,
  ].filter((post, index, list) => list.findIndex((candidate) => candidate.id === post.id) === index)
    .slice(0, 3);
  const cityPhotoFallbackPosts = [...studentDailyPosts, ...studentWeeklyDumps]
    .filter((post) => post.authorEmail.toLowerCase() !== currentUserEmail)
    .filter((post) => Boolean(post.mediaUrls[0]))
    .filter((post) => {
      const authorCity = accountByEmail.get(post.authorEmail.toLowerCase())?.profile.city ?? "";
      const postCity = post.taggedPlaceCity ?? authorCity;
      return normalizeCityKey(postCity) === normalizeCityKey(liveProfile.city);
    })
    .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))
    .slice(0, 6);
  const shouldShowCityPhotoFallback = liveProfile.friends.length === 0 && cityPhotoFallbackPosts.length > 0;
  const shouldShowOnboardingCityPosts = liveProfile.friends.length === 0 && (onboardingCityPosts.length > 0 || adminFeedPosts.length > 0);
  const selectedOwnPost =
    selectedOwnPostSnapshot && selectedOwnPostSnapshot.id === selectedOwnPostId
      ? selectedOwnPostSnapshot
      : selectedOwnPostId
        ? currentUserAllPosts.find((post) => post.id === selectedOwnPostId) ?? null
        : null;
  const selectedOwnPostBucket = selectedOwnPost ? getInteractionBucket(interactions, selectedOwnPost.id) : null;
  const selectedOwnPostVisibleComments = selectedOwnPostBucket?.comments.filter((comment) => !comment.hidden) ?? [];
  const selectedOwnPostHasLiked = Boolean(
    selectedOwnPostBucket?.likes.some((like) => like.authorEmail.toLowerCase() === currentUserEmail),
  );
  const currentUsername = liveProfile.username?.trim().toLowerCase() ?? user.profile.username?.trim().toLowerCase() ?? "";
  const shareImageDataUrlCacheRef = useRef<Record<string, string>>({});
  const selectedStoryPostSource =
    selectedStoryPostId
      ? posts.find((post) => post.id === selectedStoryPostId) ??
        adminStorySequence.find((post) => post.id === selectedStoryPostId) ??
        creatorLiveStoryPosts.find((post) => post.id === selectedStoryPostId) ??
        null
      : null;
  const selectedStorySequence = useMemo(
    () =>
      selectedStoryPostSource?.authorRole === "admin"
        ? adminStorySequence
        : selectedStoryPostSource
          ? creatorStoryGroups.find(
              (group) => group.account.googleProfile?.email?.toLowerCase() === selectedStoryPostSource.authorEmail.toLowerCase(),
            )?.posts ?? []
          : [],
    [adminStorySequence, creatorStoryGroups, selectedStoryPostSource],
  );
  const selectedStoryPostIndex = selectedStoryPostId
    ? selectedStorySequence.findIndex((post) => post.id === selectedStoryPostId)
    : -1;
  const selectedStoryPost = selectedStoryPostIndex >= 0 ? selectedStorySequence[selectedStoryPostIndex] : null;
  const selectedStoryPostContent = selectedStoryPost ? getLocalizedPostContent(selectedStoryPost, language) : null;
  const selectedStoryAccount = selectedStoryPost
    ? selectedStoryPost.authorRole === "admin"
      ? adminAccount
      : accountByEmail.get(selectedStoryPost.authorEmail.toLowerCase()) ?? null
    : null;
  const selectedStoryLabel = selectedStoryPost
    ? selectedStoryPost.authorRole === "admin"
      ? ADMIN_PUBLIC_HANDLE
      : `@${selectedStoryAccount?.profile.username || selectedStoryPost.authorName || "creator"}`
    : "";
  const selectedStoryPicture = selectedStoryPost
    ? selectedStoryPost.authorRole === "admin"
      ? adminProfilePicture
      : getAccountPicture(selectedStoryAccount)
    : "";
  const likesViewerPost =
    (likesViewerPostId ? posts.find((post) => post.id === likesViewerPostId) : null) ??
    (selectedOwnPost?.id === likesViewerPostId ? selectedOwnPost : null);
  const likesViewerBucket = likesViewerPost ? getInteractionBucket(interactions, likesViewerPost.id) : null;
  const likesViewerRows = (likesViewerBucket?.likes ?? [])
    .slice()
    .reverse()
    .map((like) => {
      const account = accountByEmail.get(like.authorEmail.toLowerCase()) ?? null;
      const username = account?.profile.username ? `@${account.profile.username}` : "";
      const fullName = account?.profile.fullName || like.authorName || username || like.authorEmail;
      return {
        email: like.authorEmail,
        username,
        fullName,
        picture: getAccountPicture(account),
      };
    })
    .filter((row) => {
      const query = likesViewerSearch.trim().toLowerCase();
      if (!query) return true;
      return row.fullName.toLowerCase().includes(query) || row.username.toLowerCase().includes(query);
    });
  const commentReactionViewerPost = commentReactionViewer ? posts.find((post) => post.id === commentReactionViewer.postId) ?? null : null;
  const commentReactionViewerComment =
    commentReactionViewerPost && commentReactionViewer
      ? getInteractionBucket(interactions, commentReactionViewerPost.id).comments.find((comment) => comment.id === commentReactionViewer.commentId) ?? null
      : null;
  const commentReactionViewerSource =
    commentReactionViewer?.replyId && commentReactionViewerComment
      ? (commentReactionViewerComment.replies ?? []).find((reply) => reply.id === commentReactionViewer.replyId) ?? null
      : commentReactionViewerComment;
  const commentReactionViewerRows = (commentReactionViewerSource?.reactions ?? [])
    .filter((reaction) => reaction.emoji === commentReactionViewer?.emoji)
    .map((reaction) => {
      const account = accountByEmail.get(reaction.authorEmail.toLowerCase()) ?? null;
      return {
        email: reaction.authorEmail,
        username: account?.profile.username ? `@${account.profile.username}` : "",
        fullName: account?.profile.fullName || reaction.authorName || reaction.authorEmail,
        picture: getAccountPicture(account),
      };
    });
  const selectedProfileAccount = selectedProfileEmail ? accountByEmail.get(selectedProfileEmail.toLowerCase()) ?? null : null;
  const selectedProfileUsername = selectedProfileAccount?.profile.username.trim().toLowerCase() ?? "";
  const selectedProfileAuthoredPosts = selectedProfileEmail
    ? [...studentDailyPosts, ...studentWeeklyDumps]
        .filter((post) => post.authorEmail.toLowerCase() === selectedProfileEmail.toLowerCase())
        .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))
    : [];
  const selectedProfileFavoriteCount = selectedProfileAccount?.profile.favoritePlaceIds?.length ?? 0;
  const selectedProfileFilteredPosts =
    selectedProfilePostTab === "all"
      ? selectedProfileAuthoredPosts
      : selectedProfileAuthoredPosts.filter((post) => getProfilePostTabForPost(post) === selectedProfilePostTab);
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
  const selectedProfileFollowersCount = selectedProfileAccount?.profile.friends.length ?? 0;
  const selectedProfileBio = selectedProfileAccount?.profile.bio?.trim() ?? "";
  const selectedProfileIsInfluencer = getAccountRole(selectedProfileAccount) === "influencer";
  const profileDrawerOwner =
    profileDrawer && selectedProfileAccount && !selectedProfileIsOwn
      ? selectedProfileAccount
      : liveAccount ?? user;
  const profileDrawerFollowerEmails = (profileDrawerOwner?.profile.friends ?? []).filter((email) => email.toLowerCase() !== ADMIN_EMAIL);
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
  const influencerPosts = posts
    .filter((post) => post.authorEmail.toLowerCase() === currentUserEmail)
    .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const influencerReferralSignups = nonAdminAccounts.filter(
    (account) => account.profile.referredByEmail?.toLowerCase() === currentUserEmail,
  );
  const influencerMetrics = influencerPosts.map((post) => {
    const bucket = getInteractionBucket(interactions, post.id);
    const uniqueViews = [...new Set(bucket.views.map((view) => view.authorEmail.toLowerCase()))];
    const uniqueSaves = [...new Set(bucket.saves.map((save) => save.authorEmail.toLowerCase()))];
    const cityCounts = uniqueViews.reduce<Record<string, number>>((acc, viewerEmail) => {
      const viewerCity = accountByEmail.get(viewerEmail)?.profile.city?.trim() || "unknown";
      acc[viewerCity] = (acc[viewerCity] ?? 0) + 1;
      return acc;
    }, {});
    return {
      post,
      views: uniqueViews.length,
      likes: bucket.likes.length,
      comments: bucket.comments.filter((comment) => !comment.hidden).length,
      saves: uniqueSaves.length,
      topCities: Object.entries(cityCounts).sort(([, a], [, b]) => b - a).slice(0, 3),
    };
  });
  const influencerOverview = influencerMetrics.reduce(
    (acc, item) => ({
      views: acc.views + item.views,
      likes: acc.likes + item.likes,
      comments: acc.comments + item.comments,
      saves: acc.saves + item.saves,
    }),
    { views: 0, likes: 0, comments: 0, saves: 0 },
  );
  const influencerTopCities = Object.entries(
    influencerMetrics.reduce<Record<string, number>>((acc, item) => {
      item.topCities.forEach(([city, count]) => {
        acc[city] = (acc[city] ?? 0) + count;
      });
      return acc;
    }, {}),
  ).sort(([, a], [, b]) => b - a);
  const influencerTopSavedSpots = influencerMetrics
    .filter((item) => item.post.taggedPlaceName)
    .sort((a, b) => b.saves - a.saves || b.views - a.views)
    .slice(0, 5);
  const influencerChecklist = [
    {
      label: "finish profile",
      done: Boolean(liveProfile.fullName && liveProfile.username && liveProfile.city && (liveProfile.bio ?? "").trim()),
      detail: "make sure your name, city, username, and bio are all filled in.",
    },
    {
      label: "publish 3 posts this week",
      done: influencerPosts.filter((post) => Date.now() - getPostTimestamp(post) < 7 * 24 * 60 * 60 * 1000).length >= 3,
      detail: "keep your page active so people see fresh city picks.",
    },
    {
      label: "get 10 saves",
      done: influencerOverview.saves >= 10,
      detail: "saves are the strongest signal that people want to try your spots.",
    },
    {
      label: "share your referral link",
      done: influencerReferralSignups.length > 0,
      detail: "your link is how we track who joined because of you.",
    },
  ];

  useEffect(() => {
    if (!user.signedIn || isAdmin || isInfluencer || studentTab !== "feed") return;
    const viewerEmail = user.googleProfile?.email?.toLowerCase();
    if (!viewerEmail || !mixedHomeFeedPosts.length) return;

    const postsNeedingViews = mixedHomeFeedPosts.filter((post) => {
      const bucket = getInteractionBucket(interactions, post.id);
      return !bucket.views.some((view) => view.authorEmail.toLowerCase() === viewerEmail);
    });

    if (!postsNeedingViews.length) return;

    lastSharedStateMutationAtRef.current = Date.now();
    setInteractions((current) => {
      const createdAt = formatNow();
      let changed = false;
      const nextInteractions = { ...current };

      postsNeedingViews.forEach((post) => {
        const bucket = getInteractionBucket(nextInteractions, post.id);
        if (bucket.views.some((view) => view.authorEmail.toLowerCase() === viewerEmail)) return;
        changed = true;
        nextInteractions[post.id] = {
          ...bucket,
          views: [...bucket.views, { authorEmail: viewerEmail, createdAt }],
        };
      });

      if (changed) {
        syncSharedState({
          nextPosts: posts,
          nextInteractions,
          source: "auto",
        });
      }

      return changed ? nextInteractions : current;
    });
  }, [interactions, isAdmin, isInfluencer, mixedHomeFeedPosts, posts, studentTab, user.googleProfile?.email, user.signedIn]);
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
  const normalizedPostSignupFriendQuery = postSignupFriendQuery.trim().replace(/^@+/, "").toLowerCase();
  const exactPostSignupFriendMatch = accounts.find((account) => {
    const email = account.googleProfile?.email ?? "";
    const username = account.profile.username?.trim().toLowerCase() ?? "";
    if (!normalizedPostSignupFriendQuery || !username) return false;
    if (email.toLowerCase() === ADMIN_EMAIL) return false;
    if (email.toLowerCase() === currentUserEmail) return false;
    if (liveProfile.friends.some((friendEmail) => friendEmail.toLowerCase() === email.toLowerCase())) return false;
    if (liveProfile.outgoingFriendRequests.some((requestEmail) => requestEmail.toLowerCase() === email.toLowerCase())) return false;
    if (liveProfile.incomingFriendRequests.some((requestEmail) => requestEmail.toLowerCase() === email.toLowerCase())) return false;

    return username === normalizedPostSignupFriendQuery;
  });
  const favoritePlaceIds = liveProfile.favoritePlaceIds ?? [];
  const favoriteActivities = liveProfile.favoriteActivities ?? [];
  const activeLocationCity = favoriteMapMode === "nearby" ? favoriteNearbyCity ?? liveProfile.city : liveProfile.city;
  const activeLocationCenter =
    favoriteMapMode === "nearby" && favoriteNearbyCenter
      ? favoriteNearbyCenter
      : cityCenters[normalizeCityKey(activeLocationCity)] ?? [52.2297, 21.0122];
  const homeFavoriteCity = favoriteViewCity ?? liveProfile.city;
  const currentFavoriteCity = favoriteMapMode === "nearby" ? favoriteNearbyCity ?? homeFavoriteCity : homeFavoriteCity;
  const favoriteCityCenter =
    favoriteMapMode === "nearby" && favoriteNearbyCenter
      ? favoriteNearbyCenter
      : cityCenters[normalizeCityKey(currentFavoriteCity)] ?? [52.2297, 21.0122];
  const dailyPostCity = activeLocationCity || currentFavoriteCity || "Warsaw";
  const dailyPostCityCenter = activeLocationCenter ?? favoriteCityCenter;
  const adminPostCityCenter = cityCenters[normalizeCityKey(adminPostCity)] ?? favoriteCityCenter;
  const resolveFavoritePlaces = (placeIds: string[], activities: FavoriteActivity[]) =>
    placeIds
      .map(
        (placeId) =>
          favoritePlaces.find((place) => place.id === placeId) ??
          allFoodSpots.find((place) => place.id === placeId) ??
          (() => {
            const activity = activities.find((item) => item.placeId === placeId) ?? null;
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
  const profileLikedSpots = resolveFavoritePlaces(favoritePlaceIds, favoriteActivities);
  const postSignupPopularPlaces = allFoodSpots
    .map((place) => {
      const saves = accounts.filter((account) => {
        if (!(account.profile.favoritePlaceIds ?? []).includes(place.id)) return false;
        const matchingActivity = (account.profile.favoriteActivities ?? []).find((activity) => activity.placeId === place.id);
        const placeCity = matchingActivity?.city || account.profile.city;
        return normalizeCityKey(placeCity) === normalizeCityKey(liveProfile.city);
      }).length;

      return {
        ...place,
        saves,
      };
    })
    .filter((place) => place.saves > 0)
    .sort((a, b) => b.saves - a.saves || a.name.localeCompare(b.name))
    .slice(0, 5);
  const selectedProfileLikedSpots = resolveFavoritePlaces(
    selectedProfileAccount?.profile.favoritePlaceIds ?? [],
    selectedProfileAccount?.profile.favoriteActivities ?? [],
  );
  const profileDrawerFavoriteSpots =
    profileDrawerOwner?.googleProfile?.email?.toLowerCase() === selectedProfileEmailLower && !selectedProfileIsOwn
      ? selectedProfileLikedSpots
      : profileLikedSpots;
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
  const storyRailItems: StoryRailItem[] = [
    ...(adminStorySequence.length
      ? [
          {
            id: "crumbz-story-rail",
            postId: adminStorySequence[0]?.id ?? null,
            label: ADMIN_PUBLIC_HANDLE,
            detail: adminStorySequence.length > 1 ? `${adminStorySequence.length} stories` : adminStorySequence[0]?.title ?? "live",
            picture: adminProfilePicture,
            ring: "#F5A623",
            badge: "live",
          } satisfies StoryRailItem,
        ]
      : []),
    ...creatorStoryGroups
      .slice()
      .sort((a, b) => {
        const latestA = a.posts[a.posts.length - 1] ?? a.posts[0];
        const latestB = b.posts[b.posts.length - 1] ?? b.posts[0];
        return getPostTimestamp(latestB) - getPostTimestamp(latestA);
      })
      .map((group) => ({
        id: `story-group-${group.account.googleProfile?.email?.toLowerCase() ?? group.account.profile.username}`,
        postId: group.posts[0]?.id ?? null,
        label: `@${group.account.profile.username || "creator"}`,
        detail: group.posts.length > 1 ? `${group.posts.length} stories` : group.posts[0]?.title || "live",
        picture: getAccountPicture(group.account),
        ring: "#F5A623",
        badge: "live",
      } satisfies StoryRailItem)),
  ];
  const visibleStoryRailItems = storyRailItems.length
    ? storyRailItems
    : [
        {
          id: "crumbz-placeholder",
          postId: null,
          label: ADMIN_PUBLIC_HANDLE,
          detail: copy.feed.storyComingSoon,
          picture: adminProfilePicture,
          ring: "#E7D8BF",
          badge: "",
        } satisfies StoryRailItem,
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
          language,
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
  const ownPostActivityNotifications = posts
    .filter((post) => post.authorEmail.toLowerCase() === currentUserEmail)
    .flatMap((post) => {
      const bucket = getInteractionBucket(interactions, post.id);
      const likeTargetLabel = post.cta === "friend review" ? "friend review" : "post";
      const groupedLikeNotifications = groupLikesForNotifications(
        bucket.likes.filter((like) => like.authorEmail.toLowerCase() !== currentUserEmail),
      )
        .map((group) => {
          const latestLike = group[group.length - 1] ?? null;
          if (!latestLike) return null;

          return {
            id: `like-group-${post.id}-${latestLike.authorEmail.toLowerCase()}-${latestLike.createdAt}`,
            kind: "post_like" as const,
            title:
              language === "pl"
                ? `${formatNotificationActorList(group.map((like) => like.authorName))} polubił${group.length > 1 ? "o" : ""} twój ${likeTargetLabel === "friend review" ? "friend review" : "post"}`
                : `${formatNotificationActorList(group.map((like) => like.authorName))} liked your ${likeTargetLabel}`,
            detail: "",
            postId: post.id,
            picture: getAccountPicture(accountByEmail.get(latestLike.authorEmail.toLowerCase()) ?? null),
            sortTime: getDisplayTimestamp(latestLike.createdAt),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      return [
        ...groupedLikeNotifications,
        ...bucket.comments
          .filter((comment) => !comment.hidden && comment.authorEmail.toLowerCase() !== currentUserEmail)
          .slice()
          .reverse()
          .map((comment, index) => ({
            id: `comment-${comment.id}`,
            kind: "post_comment" as const,
            title: language === "pl" ? `${comment.authorName} skomentował_a twój post` : `${comment.authorName} commented on your post`,
            detail: comment.text,
            postId: post.id,
            picture: getAccountPicture(accountByEmail.get(comment.authorEmail.toLowerCase()) ?? null),
            sortTime: getDisplayTimestamp(comment.createdAt, index),
          })),
        ...bucket.shares
          .filter((share) => share.authorEmail.toLowerCase() !== currentUserEmail)
          .slice()
          .reverse()
          .map((share, index) => ({
            id: `share-${share.id}`,
            kind: "post_share" as const,
            title: language === "pl" ? `${share.authorName} udostępnił_a twój post` : `${share.authorName} shared your post`,
            detail: language === "pl" ? `udostępnienie: ${share.platform}` : `${share.platform} share`,
            postId: post.id,
            picture: getAccountPicture(accountByEmail.get(share.authorEmail.toLowerCase()) ?? null),
            sortTime: getDisplayTimestamp(share.createdAt, index),
          })),
      ];
    });
  const ownCommentActivityNotifications = posts.flatMap((post) => {
    const bucket = getInteractionBucket(interactions, post.id);

    return bucket.comments
      .filter((comment) => comment.authorEmail.toLowerCase() === currentUserEmail)
      .flatMap((comment) => {
        const groupedReactionNotifications = groupTimedNotificationItems(
          (comment.reactions ?? []).filter((reaction) => reaction.authorEmail.toLowerCase() !== currentUserEmail),
        )
          .map((group) => {
            const latestReaction = group[group.length - 1] ?? null;
            if (!latestReaction) return null;

            return {
              id: `comment-reaction-${post.id}-${comment.id}-${latestReaction.authorEmail.toLowerCase()}-${latestReaction.createdAt}`,
              kind: "comment_reaction" as const,
              title:
                language === "pl"
                  ? `${formatNotificationActorList(group.map((reaction) => reaction.authorName))} zareagował${group.length > 1 ? "o" : ""} na twój komentarz`
                  : `${formatNotificationActorList(group.map((reaction) => reaction.authorName))} reacted to your comment`,
              detail: comment.text,
              postId: post.id,
              picture: getAccountPicture(accountByEmail.get(latestReaction.authorEmail.toLowerCase()) ?? null),
              sortTime: getDisplayTimestamp(latestReaction.createdAt),
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

        const groupedReplyNotifications = groupTimedNotificationItems(
          (comment.replies ?? []).filter((reply) => reply.authorEmail.toLowerCase() !== currentUserEmail),
        )
          .map((group) => {
            const latestReply = group[group.length - 1] ?? null;
            if (!latestReply) return null;

            return {
              id: `comment-reply-${post.id}-${comment.id}-${latestReply.authorEmail.toLowerCase()}-${latestReply.createdAt}`,
              kind: "comment_reply" as const,
              title:
                language === "pl"
                  ? `${formatNotificationActorList(group.map((reply) => reply.authorName))} odpisał${group.length > 1 ? "o" : ""} na twój komentarz`
                  : `${formatNotificationActorList(group.map((reply) => reply.authorName))} replied to your comment`,
              detail: comment.text,
              postId: post.id,
              picture: getAccountPicture(accountByEmail.get(latestReply.authorEmail.toLowerCase()) ?? null),
              sortTime: getDisplayTimestamp(latestReply.createdAt),
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

        return [...groupedReactionNotifications, ...groupedReplyNotifications];
      });
  });
  const rawNotificationItems = [
    ...ownPostActivityNotifications,
    ...ownCommentActivityNotifications,
    ...announcements.slice(0, 4).map((announcement) => {
      const copy = buildAnnouncementNotification({
        title: announcement.title,
        body: announcement.body,
        seed: announcement.id,
        language,
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
          language,
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
        const localizedPost = getLocalizedPostContent(post, language);
        const copy = buildAdminPostNotification({
          postType: post.type,
          title: localizedPost.title,
          body: localizedPost.body,
          cta: localizedPost.cta,
          seed: post.id,
          language,
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
          language,
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
    | { id: string; kind: "post_like" | "post_comment" | "post_share" | "comment_reaction" | "comment_reply"; title: string; detail: string; postId: string; picture?: string; sortTime: number }
    | { id: string; kind: "dare_reminder"; title: string; detail: string; picture?: string; sortTime: number }
    | { id: string; kind: "announcement"; title: string; detail: string; picture?: string; sortTime: number }
    | { id: string; kind: "friend_request"; title: string; detail: string; email: string; picture?: string; sortTime: number }
    | { id: string; kind: "friend_favorite"; title: string; detail: string; picture?: string; createdAt: string; city: string; place: FavoritePlace; sortTime: number }
    | { id: string; kind: "admin_post" | "friend_dump" | "tagged_post"; title: string; detail: string; postId: string; picture?: string; sortTime: number }
  >;
  const unreadNotificationItems = notificationItems.filter((item) => !seenNotificationIds.includes(item.id));
  const notificationCount = unreadNotificationItems.length;

  const openProfileByUsername = (username: string, profilePostTab: ProfilePostTab = "all") => {
    const matchedAccount = accountByUsername.get(username.trim().toLowerCase());
    const nextEmail = matchedAccount?.googleProfile?.email;
    if (!nextEmail) return;
    setSelectedProfilePostTab(profilePostTab);
    setSelectedProfilePostFiltersOpen(profilePostTab !== "all");
    setSelectedProfileEmail(nextEmail);
  };

  const openProfileByEmail = (email: string, profilePostTab: ProfilePostTab = "all") => {
    if (!email) return;
    setSelectedProfilePostTab(profilePostTab);
    setSelectedProfilePostFiltersOpen(profilePostTab !== "all");
    setSelectedProfileEmail(email);
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

  const openCommentReplyComposer = (postId: string, commentId: string, targetUsername?: string) => {
    const replyComposerKey = `${postId}:${commentId}`;
    const targetLabel = targetUsername ? `replying to @${targetUsername}` : "replying";

    if (openReplyComposerId === replyComposerKey) {
      setOpenReplyComposerId(null);
      setOpenReplyComposerLabel(null);
      return;
    }

    setOpenReplyComposerId(replyComposerKey);
    setOpenReplyComposerLabel(targetLabel);
  };

  const closeCommentReplyComposer = () => {
    setOpenReplyComposerId(null);
    setOpenReplyComposerLabel(null);
  };

  const renderCommentThread = (postId: string, comment: PostComment) => {
    const commentAuthorAccount = accountByEmail.get(comment.authorEmail.toLowerCase()) ?? null;
    const commentAuthorUsername = accountByEmail.get(comment.authorEmail.toLowerCase())?.profile.username;
    const canOpenCommentAuthorProfile = Boolean(commentAuthorAccount?.googleProfile?.email);
    const currentUserEmail = user.googleProfile?.email?.toLowerCase() ?? "";
    const canReply = Boolean(currentUserEmail);
    const reactionSummary = [...new Set((comment.reactions ?? []).map((reaction) => reaction.emoji))];
    const replyComposerKey = `${postId}:${comment.id}`;
    const reactionPickerId = `${postId}:${comment.id}`;

    return (
      <div key={comment.id} className="relative rounded-[18px] bg-[#FFF0D0] px-2.5 py-2">
        {openCommentReactionPickerId === reactionPickerId ? (
          <div className="absolute -top-14 left-2 right-2 z-20 flex items-center justify-between gap-1 rounded-full bg-[#2C1A0E] px-2 py-2 shadow-[0_18px_40px_rgba(44,26,14,0.24)]">
            {COMMENT_REACTION_OPTIONS.map((emoji) => (
              <button
                key={`${comment.id}-${emoji}`}
                type="button"
                onClick={() => {
                  toggleCommentReaction(postId, comment.id, emoji);
                  setOpenCommentReactionPickerId(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[1.35rem] text-white transition hover:bg-white hover:text-[#2C1A0E]"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-start gap-2">
          {canOpenCommentAuthorProfile ? (
            <button
              type="button"
              onClick={() => openProfileByEmail(commentAuthorAccount?.googleProfile?.email ?? "")}
              className="shrink-0 rounded-full"
            >
              <Avatar
                src={getAccountPicture(commentAuthorAccount)}
                name={comment.authorName}
                className="mt-0.5 h-7 w-7 shrink-0 bg-white text-[#2C1A0E]"
              />
            </button>
          ) : (
            <Avatar
              src={getAccountPicture(commentAuthorAccount)}
              name={comment.authorName}
              className="mt-0.5 h-7 w-7 shrink-0 bg-white text-[#2C1A0E]"
            />
          )}
          <div className="min-w-0 flex-1 text-left">
            {canOpenCommentAuthorProfile ? (
              <button
                type="button"
                onClick={() => openProfileByEmail(commentAuthorAccount?.googleProfile?.email ?? "")}
                className="text-[0.78rem] font-semibold leading-4 text-[#2C1A0E]"
              >
                {commentAuthorUsername ? `@${commentAuthorUsername}` : comment.authorName}
              </button>
            ) : (
              <p className="text-[0.78rem] font-semibold leading-4 text-[#2C1A0E]">{commentAuthorUsername ? `@${commentAuthorUsername}` : comment.authorName}</p>
            )}
            {renderCaptionWithTags(comment.text, "mt-0.5 text-[0.84rem] leading-[1.2rem] text-[#2C1A0E]")}
          </div>
        </div>

        {reactionSummary.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1 pl-[2.15rem]">
            {reactionSummary.map((emoji) => (
              <button
                key={`${comment.id}-${emoji}`}
                type="button"
                onClick={() => setCommentReactionViewer({ postId, commentId: comment.id, emoji })}
                className="rounded-full bg-white px-1.5 py-0.5 text-[0.64rem] font-medium leading-none text-[#2C1A0E]"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[2.15rem]">
          <button
            type="button"
            onClick={() => setOpenCommentReactionPickerId((current) => (current === reactionPickerId ? null : reactionPickerId))}
            className="text-[0.56rem] font-medium uppercase tracking-[0.16em] text-[#6c7289]"
          >
            react
          </button>
          {canReply ? (
            <button
              type="button"
              onClick={() => openCommentReplyComposer(postId, comment.id, commentAuthorUsername)}
              className="text-[0.56rem] font-medium uppercase tracking-[0.16em] text-[#6c7289]"
            >
              reply
            </button>
          ) : null}
        </div>

        {(comment.replies ?? []).length ? (
          <div className="mt-2.5 space-y-2 pl-[2.15rem]">
            {(comment.replies ?? []).map((reply) => {
              const replyAccount = accountByEmail.get(reply.authorEmail.toLowerCase()) ?? null;
              const replyUsername = replyAccount?.profile.username;
              const canOpenReplyAuthorProfile = Boolean(replyAccount?.googleProfile?.email);
              const replyReactionSummary = [...new Set((reply.reactions ?? []).map((reaction) => reaction.emoji))];
              const replyReactionPickerId = `${postId}:${comment.id}:${reply.id}`;
              return (
                <div key={reply.id} className="flex items-start gap-1.5">
                  {canOpenReplyAuthorProfile ? (
                    <button
                      type="button"
                      onClick={() => openProfileByEmail(replyAccount?.googleProfile?.email ?? "")}
                      className="shrink-0 rounded-full"
                    >
                      <Avatar
                        src={getAccountPicture(replyAccount)}
                        name={reply.authorName}
                        className="mt-0.5 h-5 w-5 shrink-0 bg-white text-[#2C1A0E]"
                      />
                    </button>
                  ) : (
                    <Avatar
                      src={getAccountPicture(replyAccount)}
                      name={reply.authorName}
                      className="mt-0.5 h-5 w-5 shrink-0 bg-white text-[#2C1A0E]"
                    />
                  )}
                  <div className="min-w-0 flex-1 rounded-[14px] bg-white/70 px-2 py-1.5">
                    {openCommentReactionPickerId === replyReactionPickerId ? (
                      <div className="mb-1.5 flex items-center gap-1 rounded-full bg-[#2C1A0E] px-1.5 py-1 shadow-[0_12px_28px_rgba(44,26,14,0.18)]">
                        {COMMENT_REACTION_OPTIONS.map((emoji) => (
                          <button
                            key={`${reply.id}-${emoji}`}
                            type="button"
                            onClick={() => {
                              toggleReplyReaction(postId, comment.id, reply.id, emoji);
                              setOpenCommentReactionPickerId(null);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-white transition hover:bg-white hover:text-[#2C1A0E]"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {canOpenReplyAuthorProfile ? (
                      <button
                        type="button"
                        onClick={() => openProfileByEmail(replyAccount?.googleProfile?.email ?? "")}
                        className="text-[0.72rem] font-semibold leading-4 text-[#2C1A0E]"
                      >
                        {replyUsername ? `@${replyUsername}` : reply.authorName}
                      </button>
                    ) : (
                      <p className="text-[0.72rem] font-semibold leading-4 text-[#2C1A0E]">{replyUsername ? `@${replyUsername}` : reply.authorName}</p>
                    )}
                    {renderCaptionWithTags(reply.text, "mt-0.5 text-[0.8rem] leading-[1.1rem] text-[#2C1A0E]")}
                    {replyReactionSummary.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {replyReactionSummary.map((emoji) => (
                          <button
                            key={`${reply.id}-${emoji}`}
                            type="button"
                            onClick={() => setCommentReactionViewer({ postId, commentId: comment.id, replyId: reply.id, emoji })}
                            className="rounded-full bg-white px-1.5 py-0.5 text-[0.62rem] font-medium leading-none text-[#2C1A0E]"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setOpenCommentReactionPickerId((current) => (current === replyReactionPickerId ? null : replyReactionPickerId))}
                        className="text-[0.5rem] font-medium uppercase tracking-[0.16em] text-[#6c7289]"
                      >
                        react
                      </button>
                    {canReply ? (
                      <button
                        type="button"
                        onClick={() => openCommentReplyComposer(postId, comment.id, replyUsername)}
                        className="mt-1 text-[0.5rem] font-medium uppercase tracking-[0.16em] text-[#6c7289]"
                      >
                        reply
                      </button>
                    ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {openReplyComposerId === replyComposerKey ? (
          <form className="mt-2 overflow-hidden rounded-[16px] border border-[#E8D9BB] bg-[#FFF7E8] pl-[2.15rem]" onSubmit={(event) => addReplyToComment(event, postId, comment.id)}>
            <div className="flex items-center justify-between border-b border-[#EEDFBF] px-2.5 py-1.5">
              <p className="text-[0.68rem] text-[#6c7289]">{openReplyComposerLabel ?? "replying"}</p>
              <button
                type="button"
                onClick={closeCommentReplyComposer}
                className="text-lg leading-none text-[#6c7289] transition hover:text-[#2C1A0E]"
                aria-label="close reply composer"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 px-2 py-2">
              <Avatar src={currentUserPicture} name={liveProfile.fullName || user.googleProfile?.name || "you"} className="h-6 w-6 shrink-0 bg-white text-[#2C1A0E]" />
              <Input
                aria-label="reply to comment"
                radius="full"
                placeholder="write a reply"
                value={commentReplyDrafts[replyComposerKey] ?? ""}
                onValueChange={(value) =>
                  setCommentReplyDrafts((current) => ({
                    ...current,
                    [replyComposerKey]: value,
                  }))
                }
                classNames={{
                  input: "text-[0.82rem] text-[#2C1A0E] placeholder:text-[#9A8F7A]",
                  inputWrapper: "min-h-8 bg-white border border-[#E8D9BB] shadow-none",
                }}
              />
              <Button type="submit" radius="full" className="h-8 min-w-[3.8rem] bg-[#F5A623] px-3 text-[0.8rem] text-white">
                send
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    );
  };

  const togglePostTranslation = async (post: AppPost, targetLanguage: Language) => {
    const cacheKey = getPostTranslationCacheKey(post.id, targetLanguage);

    if (translatedPostVisibility[cacheKey]) {
      setTranslatedPostVisibility((current) => ({ ...current, [cacheKey]: false }));
      setTranslationNotice(null);
      return;
    }

    const cachedTranslation = postTranslations[cacheKey];
    if (cachedTranslation) {
      setTranslatedPostVisibility((current) => ({ ...current, [cacheKey]: true }));
      setTranslationNotice(null);
      return;
    }

    const nativeTranslation = getNativeTranslatedPostContent(post, targetLanguage);
    if (nativeTranslation) {
      const nextTranslation: PostTranslationCacheEntry = {
        ...nativeTranslation,
        sourceLanguage: post.originalLanguage,
        translatedAt: new Date().toISOString(),
      };
      setPostTranslations((current) => ({ ...current, [cacheKey]: nextTranslation }));
      setTranslatedPostVisibility((current) => ({ ...current, [cacheKey]: true }));
      setTranslationNotice(null);
      return;
    }

    setTranslatingPostIds((current) => ({ ...current, [cacheKey]: true }));
    setTranslationNotice(null);

    try {
      const response = await fetch("/api/translate-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: post.title,
          body: post.body,
          cta: post.cta,
          targetLanguage,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            translation?: LocalizedPostContent;
            sourceLanguage?: string;
            message?: string;
          }
        | null;

      if (!response.ok || !payload?.translation) {
        throw new Error(payload?.message || "translation failed");
      }

      const nextTranslation: PostTranslationCacheEntry = {
        ...payload.translation,
        sourceLanguage: payload.sourceLanguage ?? "",
        translatedAt: new Date().toISOString(),
      };

      setPostTranslations((current) => ({ ...current, [cacheKey]: nextTranslation }));
      setTranslatedPostVisibility((current) => ({ ...current, [cacheKey]: true }));
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : "translation hit a snag. try once more.";
      setTranslationNotice({
        key: cacheKey,
        message,
      });
    } finally {
      setTranslatingPostIds((current) => ({ ...current, [cacheKey]: false }));
    }
  };

  const renderFeedCard = (post: AppPost, detail = false) => {
    const bucket = getInteractionBucket(interactions, post.id);
    const visibleComments = bucket.comments.filter((comment) => !comment.hidden);
    const currentUserEmail = user.googleProfile?.email?.toLowerCase() ?? "";
    const hasLiked = bucket.likes.some((like) => like.authorEmail.toLowerCase() === currentUserEmail);
    const isStudentPost = post.authorEmail.toLowerCase() !== ADMIN_EMAIL;
    const isSundayDump = post.type === "weekly-dump";
    const authorAccount = accounts.find((account) => account.googleProfile?.email === post.authorEmail);
    const authorUsername = authorAccount?.profile.username ? `@${authorAccount.profile.username}` : post.authorName;
    const profileMeta = authorAccount ? formatProfileMeta(authorAccount.profile.city, authorAccount.profile.schoolName) : "";
    const schoolName = authorAccount?.profile.schoolName?.trim() ?? "";
    const postSourceLanguage = post.originalLanguage;
    const targetTranslationLanguage: Language | null =
      language === "pl" && postSourceLanguage === "en" ? "pl" : language === "en" && postSourceLanguage === "pl" ? "en" : null;
    const hasNativeLocalizedCopy = targetTranslationLanguage ? hasNativeLocalizedPostContent(post, targetTranslationLanguage) : false;
    const translationCacheKey = targetTranslationLanguage ? getPostTranslationCacheKey(post.id, targetTranslationLanguage) : "";
    const translatedContent =
      translationCacheKey && translatedPostVisibility[translationCacheKey] ? postTranslations[translationCacheKey] ?? null : null;
    const localizedPost = getLocalizedPostContent(post, post.originalLanguage, translatedContent);
    const trimmedPostTitle = localizedPost.title.trim();
    const trimmedPostBody = localizedPost.body.trim();
    const showPostBody = Boolean(trimmedPostBody) && (!isStudentPost || (trimmedPostBody !== profileMeta && trimmedPostBody !== schoolName));
    const canOpenProfile = isStudentPost && post.authorEmail.toLowerCase() !== currentUserEmail;
    const isFriendFeedCard = isStudentPost && !isSundayDump;
    const trimmedCta = localizedPost.cta.trim();
    const ctaLabel = trimmedCta ? (trimmedCta === "live now" ? "post" : trimmedCta) : "";
    const canUseSpecialImageShare = canUseImageShareForPost(post);
    const canTranslatePost =
      Boolean(targetTranslationLanguage) &&
      isStudentPost &&
      postSourceLanguage !== language &&
      Boolean(post.title.trim() || post.body.trim() || post.cta.trim());
    const isTranslatingPost = translationCacheKey ? Boolean(translatingPostIds[translationCacheKey]) : false;
    const translationButtonLabel =
      translationCacheKey && translatedPostVisibility[translationCacheKey]
        ? "show original"
        : `see translation (${language === "pl" ? "polish" : "english"})`;
    return (
      <Card
        id={`post-${post.id}`}
        key={post.id}
        className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]"
      >
        <div>
          <CardHeader className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 pb-0 pt-5">
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
            <div className="min-w-0 flex-1 basis-[11rem]">
              {isStudentPost && canOpenProfile ? (
                <button type="button" onClick={() => openProfileByEmail(post.authorEmail)} className="break-words text-left font-semibold text-[#2C1A0E]">
                  {authorUsername}
                </button>
              ) : (
                <p className="break-words font-semibold text-[#2C1A0E]">
                  {isStudentPost ? authorUsername : ADMIN_PUBLIC_HANDLE}
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                {!isSundayDump ? (
                  <p className="text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
                    {isStudentPost ? formatRelativePostTime(post.createdAtIso, post.createdAt) : `${post.type} • ${post.createdAt}`}
                  </p>
                ) : (
                  <span />
                )}
                {isStudentPost && ctaLabel ? (
                  <button
                    type="button"
                    onClick={() => openProfileByEmail(post.authorEmail)}
                    className="ml-auto flex shrink-0 justify-end"
                  >
                    <Chip className="bg-[#FFF0D0] text-[#F5A623]">{ctaLabel}</Chip>
                  </button>
                ) : ctaLabel ? (
                  <Chip className="ml-auto shrink-0 bg-[#FFF0D0] text-[#F5A623]">{ctaLabel}</Chip>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardBody className="gap-4 p-5">
            {isSundayDump ? (
              showPostBody ? renderCaptionWithTags(localizedPost.body, "text-base leading-7 text-[#2C1A0E]") : null
            ) : isFriendFeedCard ? null : (
              <div className="rounded-[24px] bg-[linear-gradient(180deg,_#FFF0D0_0%,_#ffffff_100%)] p-5 ring-1 ring-[#FFF0D0]">
                {trimmedPostTitle ? (
                  <h3 className="font-[family-name:var(--font-young-serif)] text-[2rem] leading-none text-[#2C1A0E]">{localizedPost.title}</h3>
                ) : null}
                {post.taggedPlaceName ? (
                  <div className={`${trimmedPostTitle ? "mt-3" : ""} rounded-[18px] bg-white/90 px-4 py-3 shadow-[0_10px_24px_rgba(44,26,14,0.06)]`}>
                    <button type="button" onClick={() => openPostPlace(post)} className="flex w-full items-start justify-between gap-3 text-left">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.16em] text-[#B56D19]">{post.taggedPlaceKind || "food spot"}</p>
                        <p className="mt-1 truncate text-base font-semibold text-[#2C1A0E]">{post.taggedPlaceName}</p>
                        {post.taggedPlaceAddress ? <p className="mt-1 truncate text-sm text-[#6c7289]">{post.taggedPlaceAddress}</p> : null}
                      </div>
                      <span className="rounded-full bg-[#FFF0D0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A623]">map</span>
                    </button>
                    <div className="mt-3 flex gap-2">
                      <Button
                        radius="full"
                        size="sm"
                        className="bg-[#2C1A0E] text-white"
                        onPress={() =>
                          toggleFavoritePlace(
                            {
                              id: post.taggedPlaceId,
                              name: post.taggedPlaceName,
                              kind: post.taggedPlaceKind || "food spot",
                              lat: post.taggedPlaceLat ?? favoriteCityCenter[0],
                              lon: post.taggedPlaceLon ?? favoriteCityCenter[1],
                              address: post.taggedPlaceAddress,
                            },
                            post.id,
                          )
                        }
                      >
                        {favoritePlaceIds.includes(post.taggedPlaceId) ? "saved" : "save place"}
                      </Button>
                      <Button radius="full" size="sm" variant="flat" className="bg-[#FFF0D0] text-[#2C1A0E]" onPress={() => openPostPlace(post)}>
                        view map
                      </Button>
                    </div>
                  </div>
                ) : null}
                {showPostBody ? renderCaptionWithTags(localizedPost.body, "mt-2 text-sm leading-6 text-[#2C1A0E]") : null}
                {post.tasteTag || post.priceTag ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tasteTag ? <Chip className="bg-[#2C1A0E] text-white">{post.tasteTag}</Chip> : null}
                    {post.priceTag ? <Chip className="bg-white text-[#2C1A0E]">{PRICE_TAG_OPTIONS.find((item) => item.key === post.priceTag)?.label ?? post.priceTag}</Chip> : null}
                  </div>
                ) : null}
              </div>
            )}

            {post.mediaUrls.length ? (
              <PostMediaPreview post={post} detail={detail} />
            ) : post.mediaKind !== "none" ? (
              <div className="rounded-[18px] border border-dashed border-[#FFF0D0] bg-white px-3 py-4 text-sm text-[#2C1A0E]">
                this post’s media needs one re-upload from the admin side.
              </div>
            ) : null}

            {isFriendFeedCard && showPostBody ? renderCaptionWithTags(localizedPost.body, "text-base leading-7 text-[#2C1A0E]") : null}

            {canTranslatePost ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  radius="full"
                  variant="flat"
                  className="bg-[#FFF0D0] text-[#2C1A0E]"
                  isLoading={isTranslatingPost}
                  onPress={() => {
                    if (!targetTranslationLanguage) return;
                    void togglePostTranslation(post, targetTranslationLanguage);
                  }}
                >
                  {isTranslatingPost ? "translating..." : translationButtonLabel}
                </Button>
                {translationCacheKey && translatedPostVisibility[translationCacheKey] ? (
                  <Chip className="bg-white text-[#2C1A0E] ring-1 ring-[#FFF0D0]">{language === "pl" ? "polish" : "english"}</Chip>
                ) : null}
                {translationNotice?.key === translationCacheKey ? <p className="text-sm text-[#B3261E]">{translationNotice.message}</p> : null}
              </div>
            ) : null}

            {isFriendFeedCard && post.taggedPlaceName ? (
              <div className="rounded-[18px] bg-[linear-gradient(180deg,_#FFF8EA_0%,_#ffffff_100%)] px-4 py-3 ring-1 ring-[#FFF0D0]">
                <button type="button" onClick={() => openPostPlace(post)} className="flex w-full items-start justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#B56D19]">{post.taggedPlaceKind || "food spot"}</p>
                    <p className="mt-1 truncate text-base font-semibold text-[#2C1A0E]">{post.taggedPlaceName}</p>
                    {post.taggedPlaceAddress ? <p className="mt-1 truncate text-sm text-[#6c7289]">{post.taggedPlaceAddress}</p> : null}
                  </div>
                  <span className="rounded-full bg-[#FFF0D0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A623]">map</span>
                </button>
                <div className="mt-3 flex gap-2">
                  <Button
                    radius="full"
                    size="sm"
                    className="bg-[#2C1A0E] text-white"
                    onPress={() =>
                      toggleFavoritePlace(
                        {
                          id: post.taggedPlaceId,
                          name: post.taggedPlaceName,
                          kind: post.taggedPlaceKind || "food spot",
                          lat: post.taggedPlaceLat ?? favoriteCityCenter[0],
                          lon: post.taggedPlaceLon ?? favoriteCityCenter[1],
                          address: post.taggedPlaceAddress,
                        },
                        post.id,
                      )
                    }
                  >
                    {favoritePlaceIds.includes(post.taggedPlaceId) ? "saved" : "save place"}
                  </Button>
                </div>
              </div>
            ) : null}

            {isFriendFeedCard && (post.tasteTag || post.priceTag) ? (
              <div className="flex flex-wrap gap-2">
                {post.tasteTag ? <Chip className="bg-[#2C1A0E] text-white">{post.tasteTag}</Chip> : null}
                {post.priceTag ? <Chip className="bg-white text-[#2C1A0E] ring-1 ring-[#FFF0D0]">{PRICE_TAG_OPTIONS.find((item) => item.key === post.priceTag)?.label ?? post.priceTag}</Chip> : null}
              </div>
            ) : null}
          </CardBody>
        </div>

        <CardBody className="gap-4 px-5 pb-5 pt-0">
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
                void (canUseSpecialImageShare ? shareAdminPostCard(post) : sharePost(post.id));
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

          {postShareNotice?.postId === post.id ? <p className="text-sm text-[#6c7289]">{postShareNotice.message}</p> : null}

          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
            <button
              type="button"
              onClick={() => setLikesViewerPostId(post.id)}
              className="rounded-full bg-[#FFF6E0] px-3 py-2 transition hover:bg-[#FFE8B8]"
            >
              {bucket.likes.length} likes
            </button>
            <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{bucket.views.length} views</span>
            <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{visibleComments.length} comments</span>
            <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{bucket.saves.length} saves</span>
            <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{bucket.shares.length} shares</span>
          </div>

          <div className="space-y-3">
            {visibleComments.map((comment) => renderCommentThread(post.id, comment))}

            {openCommentPostId === post.id ? (
              <form className="space-y-2" onSubmit={(event) => addComment(event, post.id)}>
                <div className="flex gap-2">
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
                </div>
                <p className="text-xs text-[#6c7289]">type @username if you want to mention someone.</p>
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

  const markPushPromptAsked = (snoozeDays = 0) => {
    if (typeof window === "undefined") return;
    const email = user.googleProfile?.email?.toLowerCase();
    if (!email) return;
    const snoozeUntil = snoozeDays > 0 ? Date.now() + snoozeDays * 24 * 60 * 60 * 1000 : Number.MAX_SAFE_INTEGER;
    window.localStorage.setItem(getPushPromptAskedKey(email), String(snoozeUntil));
    setPushPromptSnoozedUntil(snoozeUntil);
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

  const snoozePushPrompt = () => {
    markPushPromptAsked(3);
    setPushPromptOpen(false);
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
            setPosts(preserveLocalMedia(nextPosts, normalizePosts((payload.posts ?? []) as Partial<AppPost>[])));
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

    const snoozeUntil = getPushPromptSnoozeUntil(window.localStorage.getItem(getPushPromptAskedKey(email)));
    setPushPromptSnoozedUntil(snoozeUntil);
    if (snoozeUntil <= Date.now()) {
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
    if (typeof window === "undefined" || !user.signedIn || isAdmin || needsOnboarding) {
      setPostSignupOnboardingOpen(false);
      return;
    }

    const email = user.googleProfile?.email?.toLowerCase();
    if (!email) return;

    const hasPendingOnboarding = window.localStorage.getItem(getPostSignupOnboardingPendingKey(email)) === "true";
    const hasCompletedOnboarding = window.localStorage.getItem(getPostSignupOnboardingDoneKey(email)) === "true";

    if (hasPendingOnboarding && !hasCompletedOnboarding) {
      setPostSignupOnboardingOpen(true);
      const savedStep = Number(window.localStorage.getItem(getPostSignupOnboardingStepKey(email)) ?? "0");
      setPostSignupOnboardingStep(Number.isInteger(savedStep) && savedStep >= 0 && savedStep <= 2 ? savedStep : 0);
      setPostSignupNotice("");
    }
  }, [isAdmin, needsOnboarding, user.googleProfile?.email, user.signedIn]);

  useEffect(() => {
    if (typeof window === "undefined" || !user.signedIn || isAdmin) return;

    const email = user.googleProfile?.email?.toLowerCase();
    if (!email) return;

    const savedMode = window.localStorage.getItem(getFavoriteLocationModeKey(email));
    const savedCity = window.localStorage.getItem(getFavoriteLocationCityKey(email));
    const savedCenterRaw = window.localStorage.getItem(getFavoriteLocationCenterKey(email));

    if (savedMode === "nearby") {
      if (savedCity) {
        setFavoriteNearbyCity(savedCity);
      }

      if (savedCenterRaw) {
        try {
          const parsedCenter = JSON.parse(savedCenterRaw) as [number, number];
          if (Array.isArray(parsedCenter) && parsedCenter.length === 2) {
            setFavoriteNearbyCenter([Number(parsedCenter[0]), Number(parsedCenter[1])]);
          }
        } catch {
          // ignore invalid saved center
        }
      }

      setFavoriteMapMode("nearby");
      refreshFavoriteLocationFromDevice({ silent: true });
      return;
    }

    setFavoriteMapMode("home");
  }, [isAdmin, user.googleProfile?.email, user.signedIn]);

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
    const fallbackCenter = cityCenters[cityKey];
    const activeCenter = favoriteMapMode === "nearby" && favoriteNearbyCenter ? favoriteNearbyCenter : fallbackCenter;

    if (!activeCenter) {
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
          lat: String(activeCenter[0]),
          lon: String(activeCenter[1]),
          radius: "7000",
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
  }, [currentFavoriteCity, favoriteMapMode, favoriteNearbyCenter, isAdmin, user.signedIn]);

  useEffect(() => {
    if (!postSignupOnboardingOpen) return;

    const query = postSignupPlaceQuery.trim();
    if (query.length < 2) {
      setPostSignupPlaceResults([]);
      setPostSignupPlaceSearchLoading(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setPostSignupPlaceSearchLoading(true);

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

        setPostSignupPlaceResults((liveResults.length ? liveResults : fallbackResults).slice(0, 8));
      } catch {
        const fallbackResults = [...favoritePlaces, ...getFallbackFavoritePlaces(dailyPostCity)].filter(
          (place, index, list) =>
            place.name.toLowerCase().includes(query.toLowerCase()) && list.findIndex((item) => item.id === place.id) === index,
        );
        setPostSignupPlaceResults(fallbackResults.slice(0, 8));
      } finally {
        setPostSignupPlaceSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    dailyPostCity,
    dailyPostCityCenter,
    favoritePlaces,
    postSignupOnboardingOpen,
    postSignupPlaceQuery,
  ]);

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
    const query = adminPostPlaceQuery.trim();

    if (query.length < 2) {
      setAdminPostPlaceResults([]);
      setAdminPostPlaceSearchLoading(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setAdminPostPlaceSearchLoading(true);

      try {
        const params = new URLSearchParams({
          city: adminPostCity,
          query,
          lat: String(adminPostCityCenter[0]),
          lon: String(adminPostCityCenter[1]),
        });
        const response = await fetch(`/api/places?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({ places: [] }))) as { places?: FavoritePlace[] };
        const liveResults = (payload.places ?? []).slice(0, 8);
        const fallbackResults = [...favoritePlaces, ...getFallbackFavoritePlaces(adminPostCity)].filter(
          (place, index, list) =>
            place.name.toLowerCase().includes(query.toLowerCase()) && list.findIndex((item) => item.id === place.id) === index,
        );

        setAdminPostPlaceResults((liveResults.length ? liveResults : fallbackResults).slice(0, 8));
      } catch {
        const fallbackResults = [...favoritePlaces, ...getFallbackFavoritePlaces(adminPostCity)].filter(
          (place, index, list) =>
            place.name.toLowerCase().includes(query.toLowerCase()) && list.findIndex((item) => item.id === place.id) === index,
        );
        setAdminPostPlaceResults(fallbackResults.slice(0, 8));
      } finally {
        setAdminPostPlaceSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [adminPostCity, adminPostCityCenter, adminPostPlaceQuery, favoritePlaces]);

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
    if (selectedOwnArchiveOpen || !pendingOwnArchivePost) return;

    const timeout = window.setTimeout(() => {
      openOwnPost(pendingOwnArchivePost);
      setPendingOwnArchivePost(null);
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [pendingOwnArchivePost, selectedOwnArchiveOpen]);

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
          const baseServerPosts = filterRecentDeletedPosts(normalizePosts((payload.posts ?? []) as Partial<AppPost>[]), recentDeletedPostIds);
          const shouldPreserveLocalPosts = now - lastSharedStateMutationAtRef.current < 5000;
          setPosts((current) => {
            const serverPosts = preserveLocalMedia(current, baseServerPosts);
            return shouldPreserveLocalPosts ? mergePostsPreferLocal(current, serverPosts) : serverPosts;
          });
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
      if (nextIndex < 0 || nextIndex >= selectedStorySequence.length) {
        setSelectedStoryPostId(null);
        return;
      }

      setSelectedStoryPostId(selectedStorySequence[nextIndex].id);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [selectedStoryPost, selectedStoryPostIndex, selectedStorySequence]);

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
          if (typeof window !== "undefined") {
            window.localStorage.setItem(getPostSignupOnboardingPendingKey(profile.email), "true");
            window.localStorage.removeItem(getPostSignupOnboardingDoneKey(profile.email));
          }
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

    const sourceUser = liveAccount ?? user;
    const nextUser = {
      ...sourceUser,
      profile: {
        fullName: trimmedName,
        username: trimmedUsername,
        city: trimmedCity,
        bio: sourceUser.profile.bio ?? "",
        picture: liveProfile.picture ?? sourceUser.profile.picture ?? "",
        isStudent: isStudentValue,
        schoolName: isStudentValue ? trimmedSchool : "",
        friends: liveProfile.friends,
        incomingFriendRequests: liveProfile.incomingFriendRequests,
        outgoingFriendRequests: liveProfile.outgoingFriendRequests,
        favoritePlaceIds: liveProfile.favoritePlaceIds,
        favoriteActivities: liveProfile.favoriteActivities ?? sourceUser.profile.favoriteActivities ?? [],
        referralCode: liveProfile.referralCode ?? sourceUser.profile.referralCode ?? "",
        referredByCode: matchedReferrer?.profile.referralCode ?? liveProfile.referredByCode ?? sourceUser.profile.referredByCode ?? "",
        referredByEmail: matchedReferrer?.googleProfile?.email ?? liveProfile.referredByEmail ?? sourceUser.profile.referredByEmail ?? "",
        referralCompletedAt: liveProfile.referralCompletedAt ?? sourceUser.profile.referralCompletedAt ?? null,
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
    const referralUsername = liveProfile.username?.trim().toLowerCase();
    if (!referralCode) {
      setReferralNotice("your referral link is getting ready. try again in a second.");
      return;
    }

    const referralLink = getReferralLink(referralCode, referralUsername);
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
    setSelectedProfilePostTab("all");
    setSelectedProfilePostFiltersOpen(false);

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

  const toggleFavoritePlace = (place: FavoritePlace, sourcePostId?: string) => {
    const placeId = place.id;
    const isRemoving = favoritePlaceIds.includes(placeId);
    const nextFavoritePlaceIds = isRemoving ? favoritePlaceIds.filter((id) => id !== placeId) : [...favoritePlaceIds, placeId];

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

        if (!sourcePostId || !user.googleProfile?.email) return;

        const authorEmail = user.googleProfile.email.toLowerCase();
        lastSharedStateMutationAtRef.current = Date.now();
        setInteractions((current) => {
          const bucket = getInteractionBucket(current, sourcePostId);
          const nextSaves = isRemoving
            ? bucket.saves.filter((save) => save.authorEmail.toLowerCase() !== authorEmail)
            : [
                ...bucket.saves.filter((save) => save.authorEmail.toLowerCase() !== authorEmail),
                {
                  authorEmail,
                  authorName: liveProfile.fullName || user.googleProfile?.name || "crumbz user",
                  placeId: place.id,
                  createdAt: formatNow(),
                },
              ];
          const nextInteractions = {
            ...current,
            [sourcePostId]: {
              ...bucket,
              saves: nextSaves,
            },
          };

          syncSharedState({
            nextPosts: posts,
            nextInteractions,
          });

          return nextInteractions;
        });
      })
      .catch((error) => {
        setFavoritePlacesError(error instanceof Error ? error.message : "saving that spot didn’t stick. try again.");
      });
  };

  const completePostSignupOnboarding = () => {
    const email = user.googleProfile?.email?.toLowerCase();
    if (typeof window !== "undefined" && email) {
      window.localStorage.setItem(getPostSignupOnboardingDoneKey(email), "true");
      window.localStorage.removeItem(getPostSignupOnboardingPendingKey(email));
      window.localStorage.removeItem(getPostSignupOnboardingStepKey(email));
    }

    setPostSignupOnboardingOpen(false);
    setPostSignupOnboardingStepWithPersistence(0);
    setPostSignupPlaceQuery("");
    setPostSignupPlaceResults([]);
    setPostSignupPlaceSearchLoading(false);
    setPostSignupSelectedPlace(null);
    setPostSignupSelectedPlaces([]);
    setIsSavingPostSignupFavorites(false);
    setPostSignupFriendQuery("");
    setPostSignupNotice("");
  };

  const skipPostSignupWelcome = () => {
    completePostSignupOnboarding();
  };

  const togglePostSignupFavoritePlace = (place: FavoritePlace) => {
    const exists = postSignupSelectedPlaces.some((item) => item.id === place.id);
    setPostSignupSelectedPlace(exists && postSignupSelectedPlace?.id === place.id ? null : place);
    setPostSignupSelectedPlaces((current) => (exists ? current.filter((item) => item.id !== place.id) : [...current, place]));
    setPostSignupNotice("");
  };

  const continueFromPostSignupFavorites = async () => {
    if (!postSignupSelectedPlaces.length) {
      setPostSignupNotice(copy.onboarding.saveFavoritesFirst);
      return;
    }

    setIsSavingPostSignupFavorites(true);

    try {
      let nextFavoritePlaceIds = [...favoritePlaceIds];
      let latestResult: { accounts: StoredUser[]; user?: StoredUser | null } | null = null;

      for (const place of postSignupSelectedPlaces) {
        if (nextFavoritePlaceIds.includes(place.id)) continue;

        nextFavoritePlaceIds = [...nextFavoritePlaceIds, place.id];
        latestResult = await mutateAccountState({
          action: "update_favorites",
          currentEmail: user.googleProfile?.email ?? "",
          favoritePlaceIds: nextFavoritePlaceIds,
          favoritePlace: place,
        });
      }

      if (latestResult) {
        setAccounts(latestResult.accounts);
        if (latestResult.user) {
          persistUser(latestResult.user as StoredUser);
        }
      }

      setPostSignupNotice(
        postSignupSelectedPlaces.length === 1
          ? `${postSignupSelectedPlaces[0].name} is in your favorites now.`
          : `${postSignupSelectedPlaces.length} spots are in your favorites now.`,
      );
      setPostSignupPlaceQuery("");
      setPostSignupPlaceResults([]);
      setPostSignupOnboardingStepWithPersistence(2);
    } catch (error) {
      setPostSignupNotice(error instanceof Error ? error.message : "saving those spots didn’t stick. try again.");
    } finally {
      setIsSavingPostSignupFavorites(false);
    }
  };

  const copyPostSignupProfileLink = async () => {
    if (!postSignupReferralUrl) return;

    try {
      await navigator.clipboard.writeText(postSignupReferralUrl);
      setPostSignupNotice("referral link copied.");
    } catch {
      setPostSignupNotice("copy didn’t work here, but your referral link is ready below.");
    }
  };

  const persistFavoriteLocationPreference = (
    nextMode: "home" | "nearby",
    nextCity?: string | null,
    nextCenter?: [number, number] | null,
  ) => {
    if (typeof window === "undefined") return;

    const email = user.googleProfile?.email?.toLowerCase();
    if (!email) return;

    window.localStorage.setItem(getFavoriteLocationModeKey(email), nextMode);
    if (nextCity) {
      window.localStorage.setItem(getFavoriteLocationCityKey(email), nextCity);
    }
    if (nextCenter) {
      window.localStorage.setItem(getFavoriteLocationCenterKey(email), JSON.stringify(nextCenter));
    }
  };

  const refreshFavoriteLocationFromDevice = (options?: { silent?: boolean }) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      if (!options?.silent) {
        setFavoriteLocationNotice("this phone isn’t sharing location here yet.");
      }
      return;
    }

    setFavoriteLocationLoading(true);
    if (!options?.silent) {
      setFavoriteLocationNotice("");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter: [number, number] = [position.coords.latitude, position.coords.longitude];
        const nearestCity = getNearestSupportedCity(position.coords.latitude, position.coords.longitude);
        const nextCity = nearestCity?.city ?? liveProfile.city;

        setFavoriteNearbyCenter(nextCenter);
        setFavoriteNearbyCity(nextCity);
        setFavoriteMapMode("nearby");
        persistFavoriteLocationPreference("nearby", nextCity, nextCenter);
        setFavoriteLocationNotice(
          options?.silent ? "" : nearestCity ? `map switched to spots near ${nearestCity.city}.` : "map switched to spots near you.",
        );
        setFavoriteLocationLoading(false);
      },
      () => {
        setFavoriteLocationLoading(false);
        if (!options?.silent) {
          setFavoriteLocationNotice("location permission didn’t come through, so the map is still on home city.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  };

  const useCurrentLocationForFavorites = () => {
    refreshFavoriteLocationFromDevice();
  };

  const useHomeCityForFavorites = () => {
    setFavoriteMapMode("home");
    persistFavoriteLocationPreference("home", liveProfile.city, null);
    setFavoriteLocationNotice(`map switched back to home: ${homeFavoriteCity}.`);
  };

  const openOwnReferralLink = () => {
    if (typeof window === "undefined") return;

    const referralCode = liveProfile.referralCode?.trim().toUpperCase();
    const referralUsername = liveProfile.username?.trim().toLowerCase();
    if (!referralCode) {
      setReferralNotice("your referral link is getting ready. try again in a second.");
      return;
    }

    const referralLink = getReferralLink(referralCode, referralUsername);
    if (!referralLink) {
      setReferralNotice("that referral link didn’t load right. try again in a sec.");
      return;
    }

    window.location.assign(referralLink);
  };

  const sendPostSignupFriendRequest = async () => {
    const friendEmail = exactPostSignupFriendMatch?.googleProfile?.email ?? "";
    if (!friendEmail) return;

    await addFriend(friendEmail);
    setPostSignupFriendQuery("");
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

    if (targetPost?.authorEmail.toLowerCase() === currentUserEmail) {
      setNotificationsOpen(false);
      openOwnPost(targetPost);
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

  const openOwnPost = (post: AppPost) => {
    setSelectedOwnPostSnapshot(post);
    setSelectedOwnPostId(post.id);
  };

  const openOwnArchive = () => {
    setSelectedOwnArchiveOpen(true);
  };

  const closeOwnArchive = () => {
    setSelectedOwnArchiveOpen(false);
  };

  const openOwnArchivePost = (post: AppPost) => {
    setPendingOwnArchivePost(post);
    closeOwnArchive();
  };

  const closeOwnPost = () => {
    setSelectedOwnPostSnapshot(null);
    setSelectedOwnPostId(null);
  };

  const renderArchivePostGrid = (
    posts: AppPost[],
    onPostPress: (post: AppPost) => void,
    options?: { interactive?: boolean; tileClassName?: string; labelSize?: "compact" | "default" },
  ) => (
    <div className="grid grid-cols-3 gap-2">
      {posts.map((post) => (
        options?.interactive === false ? (
          <div
            key={post.id}
            className={`group relative aspect-square overflow-hidden bg-[#FFF7E8] text-left ${options?.tileClassName ?? "rounded-[20px]"}`}
          >
            {post.mediaUrls[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.mediaUrls[0]}
                alt={post.title || "archive post"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-end bg-[linear-gradient(180deg,_#FFF0D0_0%,_#ffffff_100%)] p-3 text-left">
                <p className="line-clamp-3 font-[family-name:var(--font-young-serif)] text-[1.1rem] leading-none text-[#2C1A0E]">
                  {post.type === "weekly-dump" ? post.body || "sunday dump" : post.title || "post"}
                </p>
              </div>
            )}
            <div className={`absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,_transparent_0%,_rgba(44,26,14,0.68)_100%)] text-left ${options?.labelSize === "compact" ? "px-2 py-2" : "px-3 py-2"}`}>
              <p className={`truncate font-semibold uppercase tracking-[0.16em] text-white ${options?.labelSize === "compact" ? "text-[10px]" : "text-xs"}`}>
                {post.type === "weekly-dump" ? "sunday dump" : "post"}
              </p>
            </div>
          </div>
        ) : (
          <button
            key={post.id}
            type="button"
            onClick={() => onPostPress(post)}
            className={`group relative aspect-square overflow-hidden bg-[#FFF7E8] text-left ${options?.tileClassName ?? "rounded-[20px]"}`}
          >
          {post.mediaUrls[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.mediaUrls[0]}
              alt={post.title || "archive post"}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-end bg-[linear-gradient(180deg,_#FFF0D0_0%,_#ffffff_100%)] p-3 text-left">
              <p className="line-clamp-3 font-[family-name:var(--font-young-serif)] text-[1.1rem] leading-none text-[#2C1A0E]">
                {post.type === "weekly-dump" ? post.body || "sunday dump" : post.title || "post"}
              </p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,_transparent_0%,_rgba(44,26,14,0.68)_100%)] px-3 py-2 text-left">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-white">
              {post.type === "weekly-dump" ? "sunday dump" : "post"}
            </p>
          </div>
        </button>
        )
      ))}
    </div>
  );

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
    setDailyPostFormat("post");
    setDailyPostComposerMediaKind("photo");
    setDailyPostVideoRatio("4:5");
    setDailyPostNotice(`posting from ${place.name}. add your photo and tell friends what you thought.`);
    setStudentTab("profile");
    window.setTimeout(() => {
      document.getElementById("daily-post-composer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const openCreatorStoryComposer = () => {
    setStudentTab("profile");
    setEditingDailyPostId(null);
    setDailyPostFormat("story");
    setDailyPostComposerMediaKind("photo");
    setDailyPostVideoRatio("9:16");
    setDailyPostMediaUrls([]);
    setDailyPostNotice("story mode is ready. pick an image or video.");
    setDailyPostInputKey((current) => current + 1);
    window.setTimeout(() => {
      document.getElementById("daily-post-composer")?.scrollIntoView({ behavior: "smooth", block: "start" });
      dailyPostInputRef.current?.click();
    }, 140);
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

    closeOwnPost();
    revealFavoritePlace(place, post.taggedPlaceCity || activeLocationCity || currentFavoriteCity);
  };

  const openStorySequence = (postId?: string | null) => {
    if (!storyRailItems.length) return;
    const fallbackPostId = storyRailItems[0]?.postId ?? null;
    setSelectedStoryPostId(postId && posts.some((post) => post.id === postId) ? postId : fallbackPostId);
  };

  const showAdjacentStory = (direction: -1 | 1) => {
    if (!selectedStorySequence.length || selectedStoryPostIndex < 0) return;
    const nextIndex = selectedStoryPostIndex + direction;

    if (nextIndex < 0 || nextIndex >= selectedStorySequence.length) {
      setSelectedStoryPostId(null);
      return;
    }

    setSelectedStoryPostId(selectedStorySequence[nextIndex].id);
  };

  const resetComposer = (notice = "") => {
    setEditingPostId(null);
    setPendingDeletePostId(null);
    setStorageNotice(notice);
    setAdminPostCity(liveProfile.city || currentFavoriteCity || cityOptions[0]);
    setAdminPostTaggedPlace(null);
    setAdminPostPlaceQuery("");
    setAdminPostPlaceResults([]);
    setAdminPostPlaceSearchLoading(false);
    setComposer({
      title: "",
      titlePl: "",
      body: "",
      bodyPl: "",
      cta: "",
      ctaPl: "",
      type: "chapter",
      mediaKind: "none",
      mediaUrls: [],
      videoRatio: "9:16",
    });
    setComposerMediaInputKey((current) => current + 1);
  };

  const publishComposerPost = () => {
    const trimmedTitle = composer.title.trim();
    const trimmedTitlePl = composer.titlePl.trim();
    const trimmedBody = composer.body.trim();
    const trimmedBodyPl = composer.bodyPl.trim();
    const trimmedCta = composer.cta.trim();
    const trimmedCtaPl = composer.ctaPl.trim();
    const hasTaggedPlace = Boolean(adminPostTaggedPlace);
    const hasMedia = composer.mediaKind !== "none";
    const hasAttachedMedia = composer.mediaUrls.length > 0;

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

    if (composer.mediaKind !== "none" && !hasAttachedMedia) {
      setStorageNotice("your media file is not attached yet. wait for the preview to show up, or pick the file again.");
      return;
    }

    if (composer.type !== "story" && !trimmedTitle && !trimmedBody && !trimmedCta && !hasTaggedPlace && !hasMedia) {
      setStorageNotice("add at least one thing first: a title, body, cta, shop, or media.");
      return;
    }

    const nextPost: AppPost = {
      id: editingPostId ?? `${Date.now()}`,
      title: trimmedTitle,
      titlePl: trimmedTitlePl,
      body: trimmedBody,
      bodyPl: trimmedBodyPl,
      cta: trimmedCta,
      ctaPl: trimmedCtaPl,
      originalLanguage: language,
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
      taggedPlaceId: adminPostTaggedPlace?.id ?? "",
      taggedPlaceName: adminPostTaggedPlace?.name ?? "",
      taggedPlaceKind: adminPostTaggedPlace?.kind ?? "",
      taggedPlaceAddress: adminPostTaggedPlace?.address ?? "",
      taggedPlaceLat: adminPostTaggedPlace?.lat ?? null,
      taggedPlaceLon: adminPostTaggedPlace?.lon ?? null,
      taggedPlaceCity: adminPostTaggedPlace ? adminPostCity : "",
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
      titlePl: "",
      body: caption,
      bodyPl: "",
      cta: "sunday dump",
      ctaPl: "",
      originalLanguage: language,
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
    const taggedCity = post.taggedPlaceCity || liveProfile.city || currentFavoriteCity || cityOptions[0];
    const taggedCityCenter = cityCenters[normalizeCityKey(taggedCity)] ?? favoriteCityCenter;
    setPendingDeletePostId(null);
    setEditingPostId(post.id);
    setAdminPostCity(taggedCity);
    setAdminPostTaggedPlace(
      post.taggedPlaceId && post.taggedPlaceName
        ? {
            id: post.taggedPlaceId,
            name: post.taggedPlaceName,
            kind: post.taggedPlaceKind || "food spot",
            lat: post.taggedPlaceLat ?? taggedCityCenter[0],
            lon: post.taggedPlaceLon ?? taggedCityCenter[1],
            address: post.taggedPlaceAddress,
          }
        : null,
    );
    setAdminPostPlaceQuery("");
    setAdminPostPlaceResults([]);
    setAdminPostPlaceSearchLoading(false);
    setComposer({
      title: post.title,
      titlePl: post.titlePl,
      body: post.body,
      bodyPl: post.bodyPl,
      cta: post.cta,
      ctaPl: post.ctaPl,
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

  const setAccountRoleFromAdmin = async (account: StoredUser, accountRole: AccountRole) => {
    if (!(await ensureAuthenticatedSession("your admin session needs a quick refresh. sign out and sign back in with crumbleappco@gmail.com, then update this creator again."))) {
      return;
    }

    const nextAccount: StoredUser = {
      ...account,
      profile: {
        ...account.profile,
        accountRole,
      },
    };

    setAdminActionNotice("");
    void mutateAccountState({
      action: "upsert_account",
      account: nextAccount,
    })
      .then((result) => {
        setAccounts(result.accounts);
        setAdminActionNotice(accountRole === "influencer" ? "creator dashboard access is on." : "creator dashboard access is off.");
      })
      .catch((error: unknown) => {
        setAdminActionNotice(error instanceof Error ? error.message : "that role change didn’t stick. try again.");
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

    const fileList = Array.from(files);
    const creatorFormat = isInfluencer ? (dailyPostFormat === "story" ? "story" : inferCreatorFormatFromFiles(fileList)) : "post";
    let nextMediaKind: MediaKind = isInfluencer
      ? creatorFormat === "carousel"
        ? "carousel"
        : creatorFormat === "reel"
          ? "video"
          : creatorFormat === "story"
            ? dailyPostComposerMediaKind
            : "photo"
      : "photo";
    let nextVideoRatio: VideoRatio = isInfluencer ? (creatorFormat === "story" ? dailyPostVideoRatio : creatorFormat === "reel" ? "9:16" : "4:5") : "4:5";

    if (!isInfluencer && fileList.length > 1) {
      setDailyPostNotice("pick one photo for your post.");
      setDailyPostInputKey((current) => current + 1);
      return;
    }

    const validateCreatorFiles = async (): Promise<{ notice: string } | { mediaKind: MediaKind; videoRatio: VideoRatio }> => {
      if (creatorFormat === "carousel") {
        if (fileList.length < 2 || fileList.length > 10) {
          return { notice: "carousels need 2 to 10 slides." };
        }

        const invalidImage = fileList.find((file) => !matchesAcceptedType(file, ACCEPTED_IMAGE_TYPES));
        if (invalidImage) {
          return { notice: "carousel slides need image files." };
        }

        for (const file of fileList) {
          try {
            const dimensions = await readImageDimensions(file);
            if (!hasExactDimensions(dimensions, CREATOR_CAROUSEL_DIMENSIONS)) {
              return { notice: "carousel slides need to be 1080 x 1080 or 1080 x 1350." };
            }
          } catch {
            return { notice: "we couldn't read one of those carousel slides. try again." };
          }
        }

        return { mediaKind: "carousel" as MediaKind, videoRatio: "4:5" as VideoRatio };
      }

      if (creatorFormat === "reel") {
        if (fileList.length !== 1) {
          return { notice: "reels need one video file." };
        }

        const file = fileList[0];
        if (!matchesAcceptedType(file, ACCEPTED_VIDEO_TYPES)) {
          return { notice: "reels need to be mp4 or mov." };
        }

        if (file.size > CREATOR_REEL_MAX_FILE_SIZE_BYTES) {
          return { notice: `that reel is ${formatFileSize(file.size)}. keep reels under 4 gb.` };
        }

        try {
          const metadata = await readVideoMetadata(file);
          if (!hasExactDimensions(metadata, CREATOR_REEL_DIMENSIONS)) {
            return { notice: "reels need to be exactly 1080 x 1920." };
          }
          if (metadata.duration < 3 || metadata.duration > 90) {
            return { notice: "reels need to be between 3 and 90 seconds." };
          }
          return { mediaKind: "video" as MediaKind, videoRatio: "9:16" as VideoRatio };
        } catch {
          return { notice: "we couldn't read that reel. try another mp4 or mov." };
        }
      }

      if (creatorFormat === "story") {
        if (fileList.length !== 1) {
          return { notice: "stories need one image or video." };
        }

        const file = fileList[0];
        const isVideo = matchesAcceptedType(file, ACCEPTED_VIDEO_TYPES);
        const isImage = matchesAcceptedType(file, ACCEPTED_IMAGE_TYPES);

        if (!isVideo && !isImage) {
          return { notice: "stories need an image or mp4/mov video." };
        }

        if (isVideo) {
          try {
            const metadata = await readVideoMetadata(file);
            if (!hasExactDimensions(metadata, CREATOR_STORY_DIMENSIONS)) {
              return { notice: "story videos need to be exactly 1080 x 1920." };
            }
            if (metadata.duration > 15) {
              return { notice: "story videos need to be 15 seconds or less." };
            }
            return { mediaKind: "video" as MediaKind, videoRatio: "9:16" as VideoRatio };
          } catch {
            return { notice: "we couldn't read that story video. try another file." };
          }
        }

        try {
          const dimensions = await readImageDimensions(file);
          if (!hasExactDimensions(dimensions, CREATOR_STORY_DIMENSIONS)) {
            return { notice: "story images need to be exactly 1080 x 1920." };
          }
          return { mediaKind: "photo" as MediaKind, videoRatio: "9:16" as VideoRatio };
        } catch {
          return { notice: "we couldn't read that story image. try another one." };
        }
      }

      if (fileList.length !== 1) {
        return { notice: "posts take one image or one video." };
      }

      const file = fileList[0];
      const isVideo = matchesAcceptedType(file, ACCEPTED_VIDEO_TYPES);
      const isImage = matchesAcceptedType(file, ACCEPTED_IMAGE_TYPES);

      if (!isVideo && !isImage) {
        return { notice: "posts need an image or mp4/mov video." };
      }

      if (isVideo) {
        try {
          const metadata = await readVideoMetadata(file);
          if (!hasExactDimensions(metadata, CREATOR_POST_DIMENSIONS)) {
            return { notice: "post videos need to be 1080 x 1080, 1080 x 1350, or 1080 x 566." };
          }
          if (metadata.duration > 60) {
            return { notice: "video posts need to be 60 seconds or less." };
          }
          return { mediaKind: "video" as MediaKind, videoRatio: getVideoRatioFromDimensions(metadata.width, metadata.height) };
        } catch {
          return { notice: "we couldn't read that post video. try another file." };
        }
      }

      try {
        const dimensions = await readImageDimensions(file);
        if (!hasExactDimensions(dimensions, CREATOR_POST_DIMENSIONS)) {
          return { notice: "post images need to be 1080 x 1080, 1080 x 1350, or 1080 x 566." };
        }
        return { mediaKind: "photo" as MediaKind, videoRatio: "4:5" as VideoRatio };
      } catch {
        return { notice: "we couldn't read that post image. try another one." };
      }
    };

    if (isInfluencer) {
      setDailyPostFormat(creatorFormat);
      const validationResult = await validateCreatorFiles();
      if ("notice" in validationResult) {
        setDailyPostNotice(validationResult.notice);
        setDailyPostInputKey((current) => current + 1);
        return;
      }

      nextMediaKind = validationResult.mediaKind;
      nextVideoRatio = validationResult.videoRatio;
      setDailyPostComposerMediaKind(nextMediaKind);
      setDailyPostVideoRatio(nextVideoRatio);
    }

    setIsUploadingDailyPost(true);
    setDailyPostNotice(isInfluencer ? `uploading your ${creatorFormat}...` : "uploading your post...");

    try {
      const uploadResults = await uploadMediaFiles(files, {
        mediaKind: nextMediaKind,
        maxFiles: isInfluencer ? (creatorFormat === "carousel" ? 10 : 1) : 1,
        setNotice: setDailyPostNotice,
        skipSizeLimit: isInfluencer,
      });

      if (!uploadResults?.length) return;

      setDailyPostMediaUrls(
        isInfluencer && creatorFormat === "carousel" ? uploadResults.slice(0, 10) : [uploadResults[0]],
      );
      setDailyPostNotice(
        isInfluencer
          ? creatorFormat === "carousel"
            ? `${uploadResults.length} slides are ready.`
            : `your ${creatorFormat} is ready.`
          : "your photo is ready.",
      );
      setDailyPostInputKey((current) => current + 1);
    } finally {
      setIsUploadingDailyPost(false);
    }
  };

  const clearDailyPostPhoto = () => {
    setDailyPostMediaUrls([]);
    setDailyPostNotice("");
    setDailyPostComposerMediaKind(dailyPostFormat === "reel" ? "video" : dailyPostFormat === "carousel" ? "carousel" : "photo");
    setDailyPostVideoRatio(dailyPostFormat === "reel" || dailyPostFormat === "story" ? "9:16" : "4:5");
    setDailyPostInputKey((current) => current + 1);
  };

  const cancelEditingDailyPost = () => {
    setEditingDailyPostId(null);
    setDailyPostCaption("");
    setDailyPostMentionQuery("");
    setDailyPostMentionRange(null);
    setDailyPostFormat("post");
    setDailyPostComposerMediaKind("photo");
    setDailyPostVideoRatio("4:5");
    setDailyPostMediaUrls([]);
    setDailyPostTaggedPlace(null);
    setDailyPostPlaceQuery("");
    setDailyPostPlaceResults([]);
    setDailyPostTasteTag("");
    setDailyPostPriceTag("");
    setDailyPostNotice("");
    setDailyPostInputKey((current) => current + 1);
  };

  const startEditingDailyPost = (post: AppPost) => {
    const taggedCity = post.taggedPlaceCity || dailyPostCity;
    const taggedCityCenter = cityCenters[normalizeCityKey(taggedCity)] ?? favoriteCityCenter;

    setEditingDailyPostId(post.id);
    setDailyPostCaption(post.body);
    setDailyPostMentionQuery("");
    setDailyPostMentionRange(null);
    setDailyPostFormat(inferCreatorPostFormat(post));
    setDailyPostComposerMediaKind(post.mediaKind === "none" ? "photo" : post.mediaKind);
    setDailyPostVideoRatio(post.videoRatio);
    setDailyPostMediaUrls(post.mediaUrls);
    setDailyPostTaggedPlace(
      post.taggedPlaceId && post.taggedPlaceName
        ? {
            id: post.taggedPlaceId,
            name: post.taggedPlaceName,
            kind: post.taggedPlaceKind || "food spot",
            lat: post.taggedPlaceLat ?? taggedCityCenter[0],
            lon: post.taggedPlaceLon ?? taggedCityCenter[1],
            address: post.taggedPlaceAddress,
          }
        : null,
    );
    setDailyPostPlaceQuery("");
    setDailyPostPlaceResults([]);
    setDailyPostTasteTag(post.tasteTag);
    setDailyPostPriceTag(post.priceTag);
    setDailyPostNotice("editing this post. save when it looks right.");
    setStudentTab("profile");
    closeOwnPost();
    window.setTimeout(() => {
      document.getElementById("daily-post-composer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
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
      setDailyPostNotice(isInfluencer ? `add media for this ${dailyPostFormat}.` : "add at least one photo for today’s drop.");
      return;
    }

    if (isInfluencer && dailyPostFormat === "carousel" && (dailyPostMediaUrls.length < 2 || dailyPostMediaUrls.length > 10)) {
      setDailyPostNotice("carousels need 2 to 10 slides.");
      return;
    }

    const createdAtIso = new Date().toISOString();
    const caption = dailyPostCaption.trim();
    const existingPost = editingDailyPostId ? posts.find((post) => post.id === editingDailyPostId) ?? null : null;
    const nextPost: AppPost = {
      id: existingPost?.id ?? `daily-post-${Date.now()}`,
      title: dailyPostTaggedPlace?.name || `${user.profile.fullName.split(" ")[0] || user.profile.username || "friend"}'s post`,
      titlePl: "",
      body: caption,
      bodyPl: "",
      type: isInfluencer && dailyPostFormat === "story" ? "story" : "chapter",
      cta: isInfluencer ? dailyPostFormat : dailyPostTaggedPlace ? "friend review" : "live now",
      ctaPl: "",
      originalLanguage: existingPost?.originalLanguage ?? language,
      createdAt: existingPost?.createdAt ?? formatNow(),
      createdAtIso: existingPost?.createdAtIso ?? createdAtIso,
      mediaKind: isInfluencer ? dailyPostComposerMediaKind : "photo",
      mediaUrls: isInfluencer && dailyPostFormat === "carousel" ? dailyPostMediaUrls : [dailyPostMediaUrls[0]],
      videoRatio: isInfluencer ? dailyPostVideoRatio : "4:5",
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
    const nextPosts = existingPost
      ? posts.map((post) => (post.id === existingPost.id ? nextPost : post))
      : [nextPost, ...posts];
    setPosts(nextPosts);
    syncSharedState({
      nextPosts,
      nextInteractions: interactions,
    });
    setEditingDailyPostId(null);
    setDailyPostCaption("");
    setDailyPostMentionQuery("");
    setDailyPostMentionRange(null);
    setDailyPostFormat("post");
    setDailyPostComposerMediaKind("photo");
    setDailyPostVideoRatio("4:5");
    setDailyPostMediaUrls([]);
    setDailyPostTaggedPlace(null);
    setDailyPostPlaceQuery("");
    setDailyPostPlaceResults([]);
    setDailyPostTasteTag("");
    setDailyPostPriceTag("");
    setDailyPostNotice(existingPost ? "your post is updated." : isInfluencer ? `your ${dailyPostFormat} is live.` : "your post is live.");
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

  const toggleCommentReaction = (postId: string, commentId: string, emoji: string) => {
    const authorEmail = user.googleProfile?.email?.toLowerCase();
    if (!authorEmail) return;

    lastSharedStateMutationAtRef.current = Date.now();
    setInteractions((current) => {
      const bucket = getInteractionBucket(current, postId);
      const nextInteractions = {
        ...current,
        [postId]: {
          ...bucket,
          comments: bucket.comments.map((comment) => {
            if (comment.id !== commentId) return comment;

            const reactions = comment.reactions ?? [];
            const alreadyReacted = reactions.some(
              (reaction) => reaction.authorEmail.toLowerCase() === authorEmail && reaction.emoji === emoji,
            );

            return {
              ...comment,
              reactions: alreadyReacted
                ? reactions.filter(
                    (reaction) => !(reaction.authorEmail.toLowerCase() === authorEmail && reaction.emoji === emoji),
                  )
                : [
                    ...reactions.filter((reaction) => reaction.authorEmail.toLowerCase() !== authorEmail),
                    {
                      emoji,
                      authorEmail,
                      authorName: user.profile.fullName,
                      createdAt: formatNow(),
                    },
                  ],
            };
          }),
        },
      };

      syncSharedState({
        nextPosts: posts,
        nextInteractions,
      });

      return nextInteractions;
    });
  };

  const toggleReplyReaction = (postId: string, commentId: string, replyId: string, emoji: string) => {
    const authorEmail = user.googleProfile?.email?.toLowerCase();
    if (!authorEmail) return;

    lastSharedStateMutationAtRef.current = Date.now();
    setInteractions((current) => {
      const bucket = getInteractionBucket(current, postId);
      const nextInteractions = {
        ...current,
        [postId]: {
          ...bucket,
          comments: bucket.comments.map((comment) => {
            if (comment.id !== commentId) return comment;

            return {
              ...comment,
              replies: (comment.replies ?? []).map((reply) => {
                if (reply.id !== replyId) return reply;

                const reactions = reply.reactions ?? [];
                const alreadyReacted = reactions.some(
                  (reaction) => reaction.authorEmail.toLowerCase() === authorEmail && reaction.emoji === emoji,
                );

                return {
                  ...reply,
                  reactions: alreadyReacted
                    ? reactions.filter(
                        (reaction) => !(reaction.authorEmail.toLowerCase() === authorEmail && reaction.emoji === emoji),
                      )
                    : [
                        ...reactions.filter((reaction) => reaction.authorEmail.toLowerCase() !== authorEmail),
                        {
                          emoji,
                          authorEmail,
                          authorName: user.profile.fullName,
                          createdAt: formatNow(),
                        },
                      ],
                };
              }),
            };
          }),
        },
      };

      syncSharedState({
        nextPosts: posts,
        nextInteractions,
      });

      return nextInteractions;
    });
  };

  const addReplyToComment = (event: FormEvent<HTMLFormElement>, postId: string, commentId: string) => {
    event.preventDefault();
    const draftKey = `${postId}:${commentId}`;
    const draft = commentReplyDrafts[draftKey]?.trim();
    const authorEmail = user.googleProfile?.email?.toLowerCase();
    if (!draft || !authorEmail) return;

    lastSharedStateMutationAtRef.current = Date.now();
    setInteractions((current) => {
      const bucket = getInteractionBucket(current, postId);
      const nextInteractions = {
        ...current,
        [postId]: {
          ...bucket,
          comments: bucket.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  replies: [
                    ...(comment.replies ?? []),
                    {
                      id: `${Date.now()}-${commentId}`,
                      authorEmail,
                      authorName: user.profile.fullName,
                      text: draft,
                      createdAt: formatNow(),
                    },
                  ],
                }
              : comment,
          ),
        },
      };

      syncSharedState({
        nextPosts: posts,
        nextInteractions,
      });

      return nextInteractions;
    });

    setCommentReplyDrafts((current) => ({
      ...current,
      [draftKey]: "",
    }));
    setOpenReplyComposerId(null);
    setOpenReplyComposerLabel(null);
  };

  const sharePost = async (postId: string) => {
    const authorEmail = user.googleProfile?.email;
    if (!authorEmail) return;

    const post = posts.find((item) => item.id === postId) ?? fallbackFeedPosts.find((item) => item.id === postId);
    if (!post || typeof window === "undefined") return;

    const sharePayload = buildPostSharePayload(post);

    let platform = "copied-link";

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        platform = "native-share";
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharePayload.url);
      } else {
        window.prompt("copy this link", sharePayload.url);
      }
    } catch {
      return;
    }

    recordPostShare(postId, platform);
  };

  const isAdminOwnedPost = (post: AppPost) => post.authorRole === "admin" || post.authorEmail.toLowerCase() === ADMIN_EMAIL;
  const canUseAdminPostImageShare = isAdmin || ADMIN_POST_IMAGE_SHARE_USERNAMES.has(currentUsername);
  const canUseImageShareForPost = (post: AppPost) => {
    const postAuthorUsername =
      accounts
        .find((account) => account.googleProfile?.email?.toLowerCase() === post.authorEmail.toLowerCase())
        ?.profile.username?.trim()
        .toLowerCase() ?? "";

    return (
      isAdminOwnedPost(post) ||
      ADMIN_POST_IMAGE_SHARE_USERNAMES.has(postAuthorUsername) ||
      canUseAdminPostImageShare
    );
  };

  const buildPostSharePayload = (post: AppPost) => {
    const postAuthorAccount = accounts.find((account) => account.googleProfile?.email?.toLowerCase() === post.authorEmail.toLowerCase()) ?? null;
    const profileUsername = postAuthorAccount?.profile.username?.trim().toLowerCase() ?? "";
    const shareUrl =
      post.type === "weekly-dump" && profileUsername
        ? `${window.location.origin}/?profile=${encodeURIComponent(profileUsername)}`
        : `${window.location.origin}/?post=${encodeURIComponent(post.id)}`;

    return {
      title: post.type === "weekly-dump" && profileUsername ? `${profileUsername}'s crumbz profile` : post.title,
      text:
        post.type === "weekly-dump" && profileUsername
          ? `open ${profileUsername}'s crumbz profile and see their sunday dump`
          : `${post.title} • ${post.body}`,
      url: shareUrl,
    };
  };

  const getPostShareCardLabel = (post: AppPost) => {
    const postAuthorAccount = accounts.find((account) => account.googleProfile?.email?.toLowerCase() === post.authorEmail.toLowerCase()) ?? null;
    const username = postAuthorAccount?.profile.username?.trim() || post.authorName || "crumbz";
    const trimmedCaption = post.body.trim();
    return trimmedCaption || `@${username}'s post`;
  };

  const getPostShareFileName = (post: AppPost) => {
    const label = getPostShareCardLabel(post)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    return `${label || post.id}.png`;
  };

  const getPostShareTimestampLabel = (post: AppPost) => {
    const parsed = Date.parse(post.createdAtIso);
    if (Number.isNaN(parsed)) return post.createdAt.toUpperCase();

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(new Date(parsed))
      .replace(",", " AT")
      .toUpperCase();
  };

  const recordPostShare = (postId: string, platform: string) => {
    const authorEmail = user.googleProfile?.email;
    if (!authorEmail) return;

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

  const readBlobAsDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("image read failed"));
      };
      reader.onerror = () => reject(reader.error ?? new Error("image read failed"));
      reader.readAsDataURL(blob);
    });

  const getShareSafeImageUrl = async (url: string) => {
    if (shareImageDataUrlCacheRef.current[url]) {
      return shareImageDataUrlCacheRef.current[url];
    }

    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`image fetch failed: ${response.status}`);
    }

    const dataUrl = await readBlobAsDataUrl(await response.blob());
    shareImageDataUrlCacheRef.current[url] = dataUrl;
    return dataUrl;
  };

  const loadImageForCanvas = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image load failed"));
      image.src = src;
    });

  const getWrappedLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    const lines: string[] = [];
    let currentLine = words[0];

    for (const word of words.slice(1)) {
      const nextLine = `${currentLine} ${word}`;
      if (ctx.measureText(nextLine).width <= maxWidth) {
        currentLine = nextLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    lines.push(currentLine);
    return lines;
  };

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) => {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + width - safeRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    ctx.lineTo(x + width, y + height - safeRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    ctx.lineTo(x + safeRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    ctx.closePath();
  };

  const drawContainedImage = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) => {
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;

    ctx.save();
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, width, height);
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  };

  const drawCoverCircleImage = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    size: number,
  ) => {
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX = x + (size - drawWidth) / 2;
    const drawY = y + (size - drawHeight) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  };

  const canvasToBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("canvas export failed"));
      }, "image/png");
    });

  const ensureShareCardFonts = async () => {
    if (typeof document === "undefined" || !("fonts" in document)) return;

    try {
      await Promise.all([
        document.fonts.load('700 58px "Young Serif"'),
        document.fonts.load('500 22px "Manrope"'),
        document.fonts.load('600 18px "Manrope"'),
        document.fonts.load('700 20px "Manrope"'),
        document.fonts.load('700 21px "Manrope"'),
        document.fonts.load('400 18px "Manrope"'),
        document.fonts.load('400 32px "Manrope"'),
      ]);
      await document.fonts.ready;
    } catch {
      // Fall back to system fonts if the font API isn't available.
    }
  };

  const buildShareCardBlob = async (post: AppPost) => {
    await ensureShareCardFonts();

    const canvas = document.createElement("canvas");
    const width = 1080;
    const outerPaddingX = 28;
    const outerPaddingTop = 110;
    const outerPaddingBottom = 44;
    const cardWidth = width - outerPaddingX * 2;
    const paddingX = 42;
    const contentWidth = cardWidth - paddingX * 2;
    const headerHeight = 170;
    const mediaFramePadding = 12;
    const mediaOuterWidth = contentWidth;
    const mediaInnerWidth = mediaOuterWidth - mediaFramePadding * 2;
    const photoGapTop = 24;
    const sectionGap = 24;
    const placeCardHeight = post.taggedPlaceName ? 154 : 0;
    const tagsHeight = post.tasteTag || post.priceTag ? 72 : 0;

    const postAuthorAccount = accounts.find((account) => account.googleProfile?.email?.toLowerCase() === post.authorEmail.toLowerCase()) ?? null;
    const username = postAuthorAccount?.profile.username?.trim() || post.authorName || "crumbz";
    const authorPicture = post.authorRole === "student" ? getAccountPicture(postAuthorAccount) : adminProfilePicture;
    const priceTagLabel = post.priceTag ? PRICE_TAG_OPTIONS.find((item) => item.key === post.priceTag)?.label ?? post.priceTag : "";
    const shareCardLabel = getPostShareCardLabel(post);
    const timestampLabel = getPostShareTimestampLabel(post);
    const chipLabel = (post.cta === "live now" ? "post" : post.cta || post.type || "post").trim();

    let photoImage: HTMLImageElement | null = null;
    let avatarImage: HTMLImageElement | null = null;
    let mediaHeight = 0;

    if (post.mediaUrls[0]) {
      photoImage = await loadImageForCanvas(await getShareSafeImageUrl(post.mediaUrls[0]));
      const scaledHeight = mediaInnerWidth * (photoImage.naturalHeight / photoImage.naturalWidth);
      mediaHeight = Math.round(scaledHeight) + mediaFramePadding * 2;
    }

    if (authorPicture) {
      try {
        avatarImage = await loadImageForCanvas(await getShareSafeImageUrl(authorPicture));
      } catch {
        avatarImage = null;
      }
    }

    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    if (!measureCtx) throw new Error("canvas context unavailable");
    measureCtx.font = '500 22px "Manrope", system-ui, sans-serif';
    const captionLines = getWrappedLines(measureCtx, shareCardLabel, contentWidth);
    const captionHeight = captionLines.length ? captionLines.length * 34 : 0;
    const captionSectionHeight = captionHeight ? captionHeight + 8 : 0;

    const totalHeight =
      outerPaddingTop +
      headerHeight +
      (mediaHeight ? photoGapTop + mediaHeight : 0) +
      (captionSectionHeight ? sectionGap + captionSectionHeight : 0) +
      (placeCardHeight ? sectionGap + placeCardHeight : 0) +
      (tagsHeight ? sectionGap + tagsHeight : 0) +
      outerPaddingBottom;

    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context unavailable");

    ctx.fillStyle = "#fffaf2";
    ctx.fillRect(0, 0, width, totalHeight);

    const cardX = outerPaddingX;
    const cardY = outerPaddingTop;
    const cardHeight = totalHeight - outerPaddingTop - outerPaddingBottom;

    ctx.save();
    ctx.shadowColor = "rgba(44,26,14,0.08)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = "#fffaf2";
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 36);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#fffaf2";
    ctx.strokeStyle = "#F0E2C1";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 36);
    ctx.fill();
    ctx.stroke();

    let y = cardY;

    ctx.fillStyle = "#fffaf2";
    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardWidth, headerHeight, 36);
    ctx.clip();
    ctx.fillRect(cardX, cardY, cardWidth, headerHeight);
    ctx.restore();
    ctx.strokeStyle = "#F3E4C5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX, cardY + headerHeight - 1);
    ctx.lineTo(cardX + cardWidth, cardY + headerHeight - 1);
    ctx.stroke();

    const avatarSize = 76;
    const avatarX = cardX + paddingX;
    const avatarY = cardY + 28;

    if (avatarImage) {
      drawCoverCircleImage(ctx, avatarImage, avatarX, avatarY, avatarSize);
    } else {
      ctx.fillStyle = "#E9D7BF";
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8B6A4B";
      ctx.font = '700 30px "Manrope", system-ui, sans-serif';
      ctx.fillText(username.slice(0, 1).toUpperCase(), avatarX + 26, avatarY + 20);
    }

    const textX = avatarX + avatarSize + 18;
    ctx.fillStyle = "#2C1A0E";
    ctx.font = '700 42px "Manrope", system-ui, sans-serif';
    ctx.textBaseline = "top";
    ctx.fillText(`@${username}`, textX, cardY + 32);

    ctx.fillStyle = "#5F5245";
    ctx.font = '600 22px "Manrope", system-ui, sans-serif';
    ctx.fillText(timestampLabel, textX, cardY + 88);

    ctx.font = '600 28px "Manrope", system-ui, sans-serif';
    const chipWidth = ctx.measureText(chipLabel).width + 42;
    const chipHeight = 52;
    const chipX = cardX + cardWidth - paddingX - chipWidth;
    const chipY = cardY + 38;
    ctx.fillStyle = "#FFF3CC";
    drawRoundedRect(ctx, chipX, chipY, chipWidth, chipHeight, 26);
    ctx.fill();
    ctx.fillStyle = "#E3A736";
    ctx.fillText(chipLabel, chipX + 21, chipY + 11);

    y = cardY + headerHeight + photoGapTop;

    if (photoImage && mediaHeight) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#F0E2C1";
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, cardX + paddingX, y, mediaOuterWidth, mediaHeight, 28);
      ctx.fill();
      ctx.stroke();

      drawContainedImage(
        ctx,
        photoImage,
        cardX + paddingX + mediaFramePadding,
        y + mediaFramePadding,
        mediaInnerWidth,
        mediaHeight - mediaFramePadding * 2,
        22,
      );
      y += mediaHeight;
    }

    if (captionLines.length) {
      y += sectionGap;
      ctx.fillStyle = "#2C1A0E";
      ctx.font = '500 22px "Manrope", system-ui, sans-serif';
      for (const line of captionLines) {
        ctx.fillText(line, cardX + paddingX, y);
        y += 34;
      }
      y += 8;
    }

    if (post.taggedPlaceName) {
      y += sectionGap;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#F3E4C5";
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, cardX + paddingX, y, contentWidth, placeCardHeight, 28);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#D89A2D";
      ctx.font = '700 20px "Manrope", system-ui, sans-serif';
      ctx.fillText((post.taggedPlaceKind || "food spot").toUpperCase(), cardX + paddingX + 26, y + 24);

      const mapLabel = "MAP";
      ctx.font = '700 20px "Manrope", system-ui, sans-serif';
      const mapWidth = ctx.measureText(mapLabel).width + 34;
      ctx.fillStyle = "#FFF3CC";
      drawRoundedRect(ctx, cardX + cardWidth - paddingX - 26 - mapWidth, y + 16, mapWidth, 40, 20);
      ctx.fill();
      ctx.fillStyle = "#E3A736";
      ctx.fillText(mapLabel, cardX + cardWidth - paddingX - 26 - mapWidth + 17, y + 24);

      ctx.fillStyle = "#2C1A0E";
      ctx.font = '700 21px "Manrope", system-ui, sans-serif';
      const placeLines = getWrappedLines(ctx, post.taggedPlaceName, contentWidth - 52);
      let placeY = y + 62;
      for (const line of placeLines.slice(0, 2)) {
        ctx.fillText(line, cardX + paddingX + 26, placeY);
        placeY += 28;
      }

      if (post.taggedPlaceAddress) {
        ctx.fillStyle = "#7B7F91";
        ctx.font = '400 18px "Manrope", system-ui, sans-serif';
        const addressLines = getWrappedLines(ctx, post.taggedPlaceAddress, contentWidth - 52);
        ctx.fillText(addressLines[0] ?? "", cardX + paddingX + 26, y + placeCardHeight - 38);
      }

      y += placeCardHeight;
    }

    if (post.tasteTag || priceTagLabel) {
      y += sectionGap;
      let chipX = cardX + paddingX;

      if (post.tasteTag) {
        ctx.font = '600 18px "Manrope", system-ui, sans-serif';
        const tasteWidth = ctx.measureText(post.tasteTag).width + 40;
        ctx.fillStyle = "#3A2717";
        drawRoundedRect(ctx, chipX, y, tasteWidth, 46, 23);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(post.tasteTag, chipX + 20, y + 13);
        chipX += tasteWidth + 14;
      }

      if (priceTagLabel) {
        ctx.font = '600 18px "Manrope", system-ui, sans-serif';
        const priceWidth = ctx.measureText(priceTagLabel).width + 40;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#EAD9B5";
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, chipX, y, priceWidth, 46, 23);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#6C5A47";
        ctx.fillText(priceTagLabel, chipX + 20, y + 13);
      }
    }

    return canvasToBlob(canvas);
  };

  const shareAdminPostCard = async (post: AppPost) => {
    if (typeof window === "undefined") return;

    const sharePayload = buildPostSharePayload(post);
    let copiedLink = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharePayload.url);
        copiedLink = true;
      }
    } catch {
      copiedLink = false;
    }

    try {
      const imageBlob = await buildShareCardBlob(post);
      const imageFile = new File([imageBlob], getPostShareFileName(post), { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [imageFile] })) {
        await navigator.share({
          files: [imageFile],
          title: sharePayload.title,
          text: copiedLink ? "post image ready. link copied too." : sharePayload.url,
        });
        recordPostShare(post.id, "native-image-share");
      } else {
        const downloadUrl = URL.createObjectURL(imageBlob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = getPostShareFileName(post);
        anchor.click();
        URL.revokeObjectURL(downloadUrl);
        recordPostShare(post.id, "downloaded-image");
      }

      setPostShareNotice({
        postId: post.id,
        message: copiedLink ? "image is ready and the link is copied." : `image is ready. copy this link: ${sharePayload.url}`,
      });
    } catch {
      setPostShareNotice({
        postId: post.id,
        message: copiedLink ? "link copied. the image part hit a snag, so try again." : `the image part hit a snag. copy this link: ${sharePayload.url}`,
      });
    }
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
                  <p className="text-xs uppercase tracking-[0.3em] text-[#2C1A0E]">{copy.auth.startHere}</p>
                  <h1 className="mt-4 font-[family-name:var(--font-young-serif)] text-[2.1rem] leading-[1.02] text-[#2C1A0E]">
                    {copy.auth.signUpOrLogIn}
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
                      {copy.auth.signUpWithGoogle}
                    </Button>
                    <Button
                      radius="full"
                      className={authMode === "login" ? "bg-[#F5A623] text-white" : "bg-[#FFF0D0] text-[#2C1A0E]"}
                      onPress={() => {
                        setAuthMode("login");
                        setError("");
                      }}
                    >
                      {copy.auth.logInWithGoogle}
                    </Button>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#2C1A0E]">
                    {authMode === "signup"
                      ? copy.auth.signupBody
                      : copy.auth.loginBody}
                  </p>
                </div>

                {GOOGLE_CLIENT_ID ? (
                  <div className="flex flex-col items-center gap-3">
                    <div ref={googleButtonRef} className="min-h-11" />
                    {!googleReady ? (
                      <p className="text-center text-sm text-[#2C1A0E]">{copy.auth.loadingGoogle}</p>
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
                        {copy.auth.retryGoogle}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#FFF0D0] bg-[#FFF0D0] p-4 text-sm leading-6 text-[#2C1A0E]">
                    {copy.auth.missingGoogleClientId}
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
                <p className="text-xs uppercase tracking-[0.24em] text-[#2C1A0E]">{copy.auth.finishStep}</p>
                <h1 className="mt-1 font-[family-name:var(--font-young-serif)] text-4xl leading-none">
                  {copy.auth.finishProfile}
                </h1>
                <p className="mt-1 text-sm text-[#2C1A0E]">{user.googleProfile?.email}</p>
              </div>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={finishOnboarding}>
              <Input
                label={copy.auth.fullName}
                labelPlacement="outside"
                placeholder={copy.auth.fullNamePlaceholder}
                radius="lg"
                value={fullNameValue}
                onValueChange={setFullName}
                classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
              />
              <Input
                label={copy.auth.username}
                labelPlacement="outside"
                placeholder="joeydoesntsharefood"
                radius="lg"
                value={usernameValue}
                onValueChange={setUsername}
                classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
              />
              <Select
                label={copy.auth.city}
                labelPlacement="outside"
                radius="lg"
                placeholder={copy.auth.cityPlaceholder}
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
                <p className="mb-2 text-sm font-medium text-[#2C1A0E]">{copy.auth.studentQuestion}</p>
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
                    {copy.auth.yes}
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
                    {copy.auth.no}
                  </Button>
                </div>
              </div>
              {shouldShowSchoolField ? (
                matchingSchools.length ? (
                  <Select
                    label={copy.auth.school}
                    labelPlacement="outside"
                    placeholder={copy.auth.schoolPlaceholder}
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
                    label={copy.auth.school}
                    labelPlacement="outside"
                    placeholder={copy.auth.schoolTypePlaceholder}
                    radius="lg"
                    value={schoolNameValue}
                    onValueChange={setSchoolName}
                    classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                  />
                )
              ) : null}
              {error ? <p className="text-sm text-[#F5A623]">{error}</p> : null}
              <Button type="submit" radius="full" size="lg" className="bg-[#2C1A0E] font-semibold text-white">
                {copy.auth.enterCrumbz}
              </Button>
            </form>
          </motion.section>
        </div>
      </main>
    );
  }

  if (postSignupOnboardingOpen) {
    const progressDots = [0, 1, 2];
    const firstName = user.profile.fullName.split(" ")[0] || liveProfile.fullName.split(" ")[0] || "friend";
    const onboardingStepLabel = postSignupOnboardingStep === 0 ? copy.onboarding.welcomeLabel : copy.onboarding.stepLabel(postSignupOnboardingStep);
    const onboardingStepTitle =
      postSignupOnboardingStep === 0
        ? copy.onboarding.welcomeTitle(firstName.toLowerCase())
        : postSignupOnboardingStep === 1
          ? copy.onboarding.saveSpotTitle(liveProfile.city)
          : copy.onboarding.feedTitle;
    const onboardingStepBody =
      postSignupOnboardingStep === 0
        ? copy.onboarding.welcomeBody
        : postSignupOnboardingStep === 1
          ? copy.onboarding.saveSpotBody
          : copy.onboarding.feedBody(liveProfile.city);

    return (
      <main className="min-h-screen bg-white text-[#2C1A0E]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_transparent_28%),linear-gradient(180deg,_#fff8ec_0%,_#fff2dc_100%)] px-5 py-6 font-[family-name:var(--font-manrope)]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <Card className="overflow-hidden rounded-[34px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(44,26,14,0.08)]">
              <CardBody className="flex min-h-[calc(100dvh-3rem)] flex-col p-0">
                <div className="bg-[linear-gradient(180deg,_#fffaf2_0%,_#fff4e3_100%)] px-6 pb-7 pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={currentUserPicture}
                        name={liveProfile.fullName || user.googleProfile?.name || "crumbz"}
                        className="h-14 w-14 bg-[#FFF0D0] text-[#F5A623]"
                      />
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[#B56D19]">{onboardingStepLabel}</p>
                        <p className="mt-1 text-sm text-[#6c7289]">{copy.onboarding.setupMoments}</p>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {progressDots.map((dot) => (
                        <span
                          key={dot}
                          className={`h-2.5 w-2.5 rounded-full ${dot <= postSignupOnboardingStep ? "bg-[#F5A623]" : "bg-[#FFE1B0]"}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-7">
                    <p className="font-[family-name:var(--font-young-serif)] text-[2.55rem] leading-[0.95] text-[#2C1A0E]">
                      {onboardingStepTitle}
                    </p>
                    <p className="mt-4 max-w-[18rem] text-base leading-7 text-[#6c7289]">{onboardingStepBody}</p>
                  </div>
                </div>

                {postSignupOnboardingStep === 0 ? (
                  <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                    <div className="grid gap-3">
                      {copy.onboarding.welcomeBullets.map((item) => (
                        <div key={item} className="rounded-[24px] bg-[#FFF7E8] px-4 py-4 text-base text-[#2C1A0E]">
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                      <Button radius="full" size="lg" className="bg-[#2C1A0E] text-white" onPress={() => setPostSignupOnboardingStepWithPersistence(1)}>
                        {copy.onboarding.letsGo}
                      </Button>
                      <button type="button" onClick={skipPostSignupWelcome} className="text-sm font-medium text-[#6c7289]">
                        {copy.onboarding.skipForNow}
                      </button>
                    </div>
                  </div>
                ) : null}

                {postSignupOnboardingStep === 1 ? (
                  <div className="flex flex-1 flex-col gap-5 p-6">
                    {(() => {
                      const displayedSearchResults = postSignupSelectedPlace
                        ? [
                            postSignupSelectedPlace,
                            ...postSignupPlaceResults.filter((place) => place.id !== postSignupSelectedPlace.id).slice(0, 2),
                          ]
                        : postSignupPlaceResults.slice(0, 5);

                      return (
                        <>
                    <Input
                      radius="full"
                      value={postSignupPlaceQuery}
                      onValueChange={(value) => {
                        setPostSignupPlaceQuery(value);
                        setPostSignupSelectedPlace(null);
                        setPostSignupNotice("");
                      }}
                      placeholder={copy.onboarding.searchPlaces}
                      startContent={<span className="text-[#B56D19]">🔍</span>}
                      classNames={{ inputWrapper: "bg-[#FFF7E8] border border-[#FFF0D0] shadow-none" }}
                    />

                    {postSignupPlaceSearchLoading ? <p className="text-sm text-[#6c7289]">{copy.onboarding.lookingUpSpots}</p> : null}

                    {displayedSearchResults.length ? (
                      <div className="grid gap-2">
                        {displayedSearchResults.map((place) => {
                          const isSelected = postSignupSelectedPlaces.some((item) => item.id === place.id);

                          return (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => {
                              togglePostSignupFavoritePlace(place);
                            }}
                            className={`rounded-[22px] border px-4 py-4 text-left transition-colors ${
                              isSelected
                                ? "border-[#F5A623] bg-[#fff4dd] shadow-[0_10px_24px_rgba(245,166,35,0.16)]"
                                : "border-[#FFF0D0] bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-[#2C1A0E]">{place.name}</p>
                                <p className="mt-1 text-sm text-[#6c7289]">{place.address}</p>
                              </div>
                              {isSelected ? (
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5A623] text-sm font-semibold text-white">
                                  ✓
                                </span>
                              ) : null}
                            </div>
                          </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#B56D19]">{copy.onboarding.popularIn(liveProfile.city)}</p>
                      <div className="mt-3 grid gap-2">
                        {(postSignupPopularPlaces.length ? postSignupPopularPlaces : getFallbackFavoritePlaces(liveProfile.city).slice(0, 5)).map((place) => (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => {
                              togglePostSignupFavoritePlace(place);
                            }}
                            className={`flex items-center justify-between rounded-[22px] border px-4 py-4 text-left transition-colors ${
                              postSignupSelectedPlaces.some((item) => item.id === place.id)
                                ? "border-[#F5A623] bg-[#fff4dd] shadow-[0_10px_24px_rgba(245,166,35,0.16)]"
                                : "border-transparent bg-[#FFF7E8]"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#2C1A0E]">{place.name}</p>
                              <p className="mt-1 truncate text-sm text-[#6c7289]">{place.address}</p>
                            </div>
                            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                              postSignupSelectedPlaces.some((item) => item.id === place.id)
                                ? "bg-[#F5A623] text-white"
                                : "text-[#B56D19]"
                            }`}>
                              {postSignupSelectedPlaces.some((item) => item.id === place.id) ? "✓" : "→"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {postSignupSelectedPlaces.length ? (
                      <div className="rounded-[24px] border border-[#FFD7A1] bg-[#fff9ef] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">{copy.onboarding.pickedSpot}</p>
                          <Chip className="bg-[#FFF0D0] text-[#B56D19]">{copy.onboarding.selectedSpots(postSignupSelectedPlaces.length)}</Chip>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {postSignupSelectedPlaces.map((place) => (
                            <button
                              key={place.id}
                              type="button"
                              onClick={() => togglePostSignupFavoritePlace(place)}
                              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#2C1A0E]"
                            >
                              {place.name} ×
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-auto flex w-full flex-col items-start gap-3 pt-6">
                      <Button
                        radius="full"
                        size="lg"
                        className="w-full bg-[#2C1A0E] text-white disabled:opacity-50"
                        isLoading={isSavingPostSignupFavorites}
                        isDisabled={!postSignupSelectedPlaces.length}
                        onPress={() => void continueFromPostSignupFavorites()}
                      >
                        {copy.onboarding.continue}
                      </Button>
                      <button type="button" onClick={() => setPostSignupOnboardingStepWithPersistence(2)} className="text-sm font-medium text-[#6c7289]">
                        {copy.onboarding.skipForNow}
                      </button>
                      {postSignupNotice ? <p className="text-sm text-[#B56D19]">{postSignupNotice}</p> : null}
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ) : null}

                {postSignupOnboardingStep === 2 ? (
                  <div className="flex flex-1 flex-col gap-5 p-6">
                    <div className="rounded-[26px] bg-[#FFF7E8] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">{copy.onboarding.findFriends}</p>
                      <Input
                        radius="full"
                        value={postSignupFriendQuery}
                        onValueChange={(value) => {
                          setPostSignupFriendQuery(value);
                          setPostSignupNotice("");
                        }}
                        placeholder={copy.onboarding.searchByUsername}
                        classNames={{ inputWrapper: "mt-3 bg-white border border-[#FFF0D0] shadow-none" }}
                      />
                      {exactPostSignupFriendMatch ? (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-[20px] bg-white p-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#2C1A0E]">{exactPostSignupFriendMatch.profile.fullName || exactPostSignupFriendMatch.googleProfile?.name}</p>
                            <p className="truncate text-sm text-[#6c7289]">@{exactPostSignupFriendMatch.profile.username}</p>
                          </div>
                          <Button radius="full" className="bg-[#2C1A0E] text-white" onPress={() => void sendPostSignupFriendRequest()}>
                            {copy.onboarding.add}
                          </Button>
                        </div>
                      ) : postSignupFriendQuery.trim() ? (
                        <p className="mt-3 text-sm text-[#6c7289]">{copy.onboarding.noExactUsernameMatch}</p>
                      ) : null}

                      <div className="mt-4 rounded-[20px] border border-[#FFD7A1] bg-[#fff9ef] p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">{copy.onboarding.shareProfile}</p>
                        <p className="mt-2 break-all rounded-[16px] bg-white px-3 py-3 text-sm text-[#2C1A0E]">
                          {postSignupReferralUrl || "your referral link is getting ready."}
                        </p>
                        <Button radius="full" variant="flat" className="mt-3 bg-[#FFF0D0] text-[#2C1A0E]" onPress={() => void copyPostSignupProfileLink()}>
                          {copy.onboarding.copyLink}
                        </Button>
                      </div>
                    </div>

                    {shouldShowOnboardingCityPosts ? (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">{copy.onboarding.whatsHappeningIn(liveProfile.city)}</p>
                          <p className="mt-1 text-sm text-[#6c7289]">{copy.onboarding.cityPostsBody}</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{onboardingCityPosts.length || adminFeedPosts.length ? copy.onboarding.live : copy.onboarding.soon}</Chip>
                      </div>

                      <div className="mt-3 grid gap-3">
                        {(onboardingCityPosts.length ? onboardingCityPosts : adminFeedPosts.slice(0, 3)).map((post) => (
                          <div key={post.id} className="overflow-hidden rounded-[24px] border border-[#FFF0D0] bg-white">
                            {post.mediaUrls[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={post.mediaUrls[0]} alt={post.title || post.taggedPlaceName || copy.onboarding.cityPostAlt} className="h-40 w-full object-cover" loading="lazy" />
                            ) : null}
                            <div className="p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">{post.taggedPlaceName || post.type}</p>
                              <p className="mt-2 text-lg font-semibold text-[#2C1A0E]">
                                @{accountByEmail.get(post.authorEmail.toLowerCase())?.profile.username || "crumbz-user"}
                              </p>
                              <p className="mt-1 text-sm text-[#6c7289]">{(post.body || post.title || copy.onboarding.freshFoodPost).slice(0, 110)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    ) : null}

                    <div className="mt-auto flex flex-col gap-3 pt-2">
                      <Button radius="full" size="lg" className="bg-[#2C1A0E] text-white" onPress={completePostSignupOnboarding}>
                        {copy.onboarding.goToFeed}
                      </Button>
                      <button type="button" onClick={completePostSignupOnboarding} className="text-sm font-medium text-[#6c7289]">
                        {copy.onboarding.finishLater}
                      </button>
                      {postSignupNotice || socialActionNotice ? (
                        <p className="text-sm text-[#B56D19]">{postSignupNotice || socialActionNotice}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </CardBody>
            </Card>
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
                                <p className="text-sm text-[#6c7289]">chapter photos work best as portrait or square, but they don’t need an exact size.</p>
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
                                    mediaUrls:
                                      typeof selected === "string" && selected !== "none" && selected === current.mediaKind ? current.mediaUrls : [],
                                  }));
                                  setStorageNotice("");
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
                              <Input
                                label="title (polish)"
                                labelPlacement="outside"
                                placeholder="nowy rozdział właśnie wleciał"
                                value={composer.titlePl}
                                onValueChange={(value) => setComposer((current) => ({ ...current, titlePl: value }))}
                                classNames={{ inputWrapper: "bg-[#FFF7E8] shadow-none border border-[#FFE1B3]" }}
                              />
                              <Textarea
                                label="body"
                                labelPlacement="outside"
                                placeholder="tell students what’s happening"
                                value={composer.body}
                                onValueChange={(value) => setComposer((current) => ({ ...current, body: value }))}
                                classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                              />
                              <Textarea
                                label="body (polish)"
                                labelPlacement="outside"
                                placeholder="napisz po polsku, co się dzieje"
                                value={composer.bodyPl}
                                onValueChange={(value) => setComposer((current) => ({ ...current, bodyPl: value }))}
                                classNames={{ inputWrapper: "bg-[#FFF7E8] shadow-none border border-[#FFE1B3]" }}
                              />
                              <Input
                                label="cta label"
                                labelPlacement="outside"
                                placeholder="student offer live"
                                value={composer.cta}
                                onValueChange={(value) => setComposer((current) => ({ ...current, cta: value }))}
                                classNames={{ inputWrapper: "bg-[#FFF0D0] shadow-none border border-[#FFF0D0]" }}
                              />
                              <Input
                                label="cta label (polish)"
                                labelPlacement="outside"
                                placeholder="oferta już live"
                                value={composer.ctaPl}
                                onValueChange={(value) => setComposer((current) => ({ ...current, ctaPl: value }))}
                                classNames={{ inputWrapper: "bg-[#FFF7E8] shadow-none border border-[#FFE1B3]" }}
                              />
                              <div className="space-y-3 rounded-[24px] border border-[#FFF0D0] bg-[#FFF7E8] p-4">
                                <div>
                                  <p className="text-sm font-medium text-[#2C1A0E]">tag a shop for this post</p>
                                  <p className="mt-1 text-sm text-[#6c7289]">use this when crumbz is working from a spot, dropping a chapter there, or sending people to a specific place.</p>
                                </div>
                                <Select
                                  label="city"
                                  labelPlacement="outside"
                                  radius="lg"
                                  selectedKeys={[adminPostCity]}
                                  onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0];
                                    if (typeof selected !== "string" || selected === adminPostCity) return;
                                    setAdminPostCity(selected);
                                    setAdminPostTaggedPlace(null);
                                    setAdminPostPlaceQuery("");
                                    setAdminPostPlaceResults([]);
                                    if (storageNotice) setStorageNotice("");
                                  }}
                                  classNames={{
                                    trigger: "bg-white shadow-none border border-[#FFF0D0]",
                                  }}
                                >
                                  {cityOptions.map((city) => (
                                    <SelectItem key={city}>{city}</SelectItem>
                                  ))}
                                </Select>
                                <Input
                                  label="shop"
                                  labelPlacement="outside"
                                  value={adminPostPlaceQuery}
                                  onValueChange={(value) => {
                                    setAdminPostPlaceQuery(value);
                                    if (storageNotice) setStorageNotice("");
                                  }}
                                  placeholder={`search in ${adminPostCity}`}
                                  startContent={<span className="text-[#B56D19]">⌕</span>}
                                  classNames={{ inputWrapper: "bg-white shadow-none border border-[#FFF0D0]" }}
                                />
                                {adminPostTaggedPlace ? (
                                  <div className="flex items-start justify-between gap-3 rounded-[18px] bg-white px-4 py-3">
                                    <div className="min-w-0">
                                      <p className="text-xs uppercase tracking-[0.16em] text-[#B56D19]">{adminPostTaggedPlace.kind}</p>
                                      <p className="mt-1 text-base font-semibold text-[#2C1A0E]">{adminPostTaggedPlace.name}</p>
                                      <p className="mt-1 text-sm text-[#6c7289]">{adminPostTaggedPlace.address}</p>
                                    </div>
                                    <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={() => setAdminPostTaggedPlace(null)}>
                                      change
                                    </Button>
                                  </div>
                                ) : null}
                                {adminPostPlaceSearchLoading ? <p className="text-sm text-[#6c7289]">searching spots...</p> : null}
                                {adminPostPlaceResults.length ? (
                                  <div className="grid gap-2">
                                    {adminPostPlaceResults.map((place) => (
                                      <button
                                        key={place.id}
                                        type="button"
                                        onClick={() => {
                                          setAdminPostTaggedPlace(place);
                                          setAdminPostPlaceQuery("");
                                          setAdminPostPlaceResults([]);
                                          if (storageNotice) setStorageNotice("");
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
                                  <p className="text-sm text-[#6c7289]">
                                    {composer.mediaUrls.length
                                      ? `${composer.mediaUrls.length} ${composer.mediaKind === "carousel" ? "file(s) ready" : "file ready"} for this post.`
                                      : "no media attached yet."}
                                  </p>
                                  {composer.mediaUrls.length ? (
                                    <div className="rounded-[20px] bg-[#FFF0D0] p-3">
                                      <PostMediaPreview
                                        post={{
                                          id: "preview",
                                          title: composer.title || "preview",
                                          titlePl: composer.titlePl,
                                          body: composer.body,
                                          bodyPl: composer.bodyPl,
                                          originalLanguage: language,
                                          type: composer.type,
                                          cta: composer.cta,
                                          ctaPl: composer.ctaPl,
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
                              adminLiveStoryPosts.map((post) => {
                                const trimmedTitle = post.title.trim();
                                const trimmedBody = post.body.trim();

                                return (
                                <div key={post.id} className="rounded-[22px] bg-[#FFF0D0] p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      {trimmedTitle ? <p className="font-semibold text-[#2C1A0E]">{post.title}</p> : null}
                                      <p className={`${trimmedTitle ? "mt-1 " : ""}text-xs uppercase tracking-[0.18em] text-[#2C1A0E]`}>
                                        story • {post.createdAt}
                                      </p>
                                    </div>
                                    <Chip className="bg-white text-[#2C1A0E]">{post.mediaKind}</Chip>
                                  </div>
                                  {post.taggedPlaceName ? (
                                    <button
                                      type="button"
                                      onClick={() => openPostPlace(post)}
                                      className="mt-2 flex w-full items-start justify-between gap-3 rounded-[18px] bg-white/90 px-4 py-3 text-left"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs uppercase tracking-[0.16em] text-[#B56D19]">{post.taggedPlaceKind || "food spot"}</p>
                                        <p className="mt-1 truncate text-base font-semibold text-[#2C1A0E]">{post.taggedPlaceName}</p>
                                        {post.taggedPlaceAddress ? <p className="mt-1 truncate text-sm text-[#6c7289]">{post.taggedPlaceAddress}</p> : null}
                                      </div>
                                      <span className="rounded-full bg-[#FFF0D0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A623]">map</span>
                                    </button>
                                  ) : null}
                                  {trimmedBody ? <p className="mt-2 text-sm text-[#2C1A0E]">{post.body}</p> : null}
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
                              );
                              })
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
                              adminArchivedStoryPosts.map((post) => {
                                const trimmedTitle = post.title.trim();
                                const trimmedBody = post.body.trim();

                                return (
                                <div key={post.id} className="rounded-[22px] bg-[#FFF0D0] p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      {trimmedTitle ? <p className="font-semibold text-[#2C1A0E]">{post.title}</p> : null}
                                      <p className={`${trimmedTitle ? "mt-1 " : ""}text-xs uppercase tracking-[0.18em] text-[#2C1A0E]`}>story • {post.createdAt}</p>
                                    </div>
                                    <Chip className="bg-white text-[#2C1A0E]">{post.mediaKind}</Chip>
                                  </div>
                                  {post.taggedPlaceName ? (
                                    <button
                                      type="button"
                                      onClick={() => openPostPlace(post)}
                                      className="mt-2 flex w-full items-start justify-between gap-3 rounded-[18px] bg-white/90 px-4 py-3 text-left"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs uppercase tracking-[0.16em] text-[#B56D19]">{post.taggedPlaceKind || "food spot"}</p>
                                        <p className="mt-1 truncate text-base font-semibold text-[#2C1A0E]">{post.taggedPlaceName}</p>
                                        {post.taggedPlaceAddress ? <p className="mt-1 truncate text-sm text-[#6c7289]">{post.taggedPlaceAddress}</p> : null}
                                      </div>
                                      <span className="rounded-full bg-[#FFF0D0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A623]">map</span>
                                    </button>
                                  ) : null}
                                  {trimmedBody ? <p className="mt-2 text-sm text-[#2C1A0E]">{post.body}</p> : null}
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
                              );
                              })
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
                              adminPostArchive.map((post) => {
                                const trimmedTitle = post.title.trim();
                                const trimmedBody = post.body.trim();

                                return (
                                <div key={post.id} className="rounded-[22px] bg-[#FFF0D0] p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      {trimmedTitle ? <p className="font-semibold text-[#2C1A0E]">{post.title}</p> : null}
                                      <p className={`${trimmedTitle ? "mt-1 " : ""}text-xs uppercase tracking-[0.18em] text-[#2C1A0E]`}>
                                        {post.type} • {post.createdAt}
                                      </p>
                                    </div>
                                    <Chip className="bg-white text-[#2C1A0E]">{post.mediaKind}</Chip>
                                  </div>
                                  {post.taggedPlaceName ? (
                                    <button
                                      type="button"
                                      onClick={() => openPostPlace(post)}
                                      className="mt-2 flex w-full items-start justify-between gap-3 rounded-[18px] bg-white/90 px-4 py-3 text-left"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs uppercase tracking-[0.16em] text-[#B56D19]">{post.taggedPlaceKind || "food spot"}</p>
                                        <p className="mt-1 truncate text-base font-semibold text-[#2C1A0E]">{post.taggedPlaceName}</p>
                                        {post.taggedPlaceAddress ? <p className="mt-1 truncate text-sm text-[#6c7289]">{post.taggedPlaceAddress}</p> : null}
                                      </div>
                                      <span className="rounded-full bg-[#FFF0D0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A623]">map</span>
                                    </button>
                                  ) : null}
                                  {trimmedBody ? <p className="mt-2 text-sm text-[#2C1A0E]">{post.body}</p> : null}
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
                              );
                              })
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
                                <Chip className={getAccountRole(account) === "influencer" ? "bg-[#2C1A0E] text-white" : "bg-white text-[#2C1A0E]"}>
                                  {getAccountRole(account) === "influencer" ? "influencer" : "user"}
                                </Chip>
                                {account.profile.username && duplicateUsernames[account.profile.username.trim().toLowerCase()] > 1 ? (
                                  <Chip className="bg-[#FFE1D6] text-[#B3261E]">duplicate username</Chip>
                                ) : null}
                                <Chip className="bg-white text-[#2C1A0E]">{account.signedIn ? "active" : "saved"}</Chip>
                                <Button
                                  radius="full"
                                  variant="flat"
                                  className="bg-white text-[#2C1A0E]"
                                  onPress={() => setAccountRoleFromAdmin(account, getAccountRole(account) === "influencer" ? "user" : "influencer")}
                                >
                                  {getAccountRole(account) === "influencer" ? "remove creator" : "make creator"}
                                </Button>
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
                    const adminPostUsername =
                      post.authorRole === "student"
                        ? authorAccount?.profile.username?.trim()
                          ? `@${authorAccount.profile.username.trim()}`
                          : post.authorName
                        : ADMIN_PUBLIC_HANDLE;
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
                                    <p className="text-sm font-semibold text-[#2C1A0E]">{comment.authorName}</p>
                                    <p className="mt-1 text-sm text-[#2C1A0E]">{comment.text}</p>
                                    {(comment.reactions ?? []).length ? (
                                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#6c7289]">
                                        reactions: {[...new Set((comment.reactions ?? []).map((reaction) => reaction.emoji))].join(" ")}
                                      </p>
                                    ) : null}
                                    {comment.hidden ? (
                                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">hidden from students</p>
                                    ) : null}
                                    {(comment.replies ?? []).length ? (
                                      <div className="mt-3 space-y-2 border-l-2 border-[#F5D49A] pl-3">
                                        {(comment.replies ?? []).map((reply) => (
                                          <div key={reply.id} className="rounded-[14px] bg-white/75 px-3 py-2">
                                            <p className="text-xs font-semibold text-[#2C1A0E]">{reply.authorName}</p>
                                            <p className="mt-1 text-sm text-[#2C1A0E]">{reply.text}</p>
                                            {(reply.reactions ?? []).length ? (
                                              <p className="mt-1 text-[0.68rem] uppercase tracking-[0.14em] text-[#6c7289]">
                                                reactions: {[...new Set((reply.reactions ?? []).map((reaction) => reaction.emoji))].join(" ")}
                                              </p>
                                            ) : null}
                                          </div>
                                        ))}
                                      </div>
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

  if (isInfluencer && creatorDashboardOpen) {
    return (
      <main className="min-h-screen bg-[#fff8ef] text-[#2C1A0E]">
        <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-36 pt-5 font-[family-name:var(--font-manrope)]">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden rounded-[32px] border border-[#4A2F1B] bg-[radial-gradient(circle_at_top_right,_rgba(255,221,168,0.14),_transparent_30%),linear-gradient(180deg,_#332013_0%,_#24160D_100%)] p-5 text-white shadow-[0_22px_60px_rgba(44,26,14,0.18)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.7rem] uppercase tracking-[0.32em] text-[#D6B68D]">creator dashboard</p>
                <h1 className="mt-3 truncate font-[family-name:var(--font-young-serif)] text-[2.55rem] leading-none text-white">
                  @{liveProfile.username || "creator"}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/78">
                  <span>{liveProfile.city || "city pending"}</span>
                  <span className="text-white/35">•</span>
                  <span>influencer access on</span>
                </div>
              </div>
              <Button radius="full" className="shrink-0 bg-white text-[#2C1A0E]" onPress={signOut}>
                log out
              </Button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#D6B68D]">creator mode</p>
                <p className="mt-1 text-sm text-white/82">flip this off any time to jump back into normal crumbz.</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="text-sm text-white/82">{creatorDashboardOpen ? "on" : "off"}</p>
                <Switch
                  isSelected={creatorDashboardOpen}
                  onValueChange={setCreatorDashboardOpen}
                  color="warning"
                  aria-label="toggle creator dashboard"
                />
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="mt-5"
          >
            {influencerDashboardTab === "overview" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "views", value: influencerOverview.views },
                    { label: "saves", value: influencerOverview.saves },
                    { label: "likes", value: influencerOverview.likes },
                    { label: "referrals", value: influencerReferralSignups.length },
                  ].map((item) => (
                    <Card key={item.label} className="rounded-[24px] border border-[#FFE7C2] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                      <CardBody className="gap-1 p-4">
                        <p className="text-2xl font-semibold text-[#2C1A0E]">{item.value}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">{item.label}</p>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                <Card className="rounded-[28px] border border-[#FFE7C2] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                  <CardBody className="gap-3 p-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">weekly checklist</p>
                      <p className="mt-1 text-sm text-[#2C1A0E]">the few things to stay on top of this week.</p>
                    </div>
                    <div className="grid gap-2">
                      {influencerChecklist.map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-3 rounded-[18px] bg-[#FFF7E8] px-4 py-3">
                          <div>
                            <p className="font-semibold text-[#2C1A0E]">{item.label}</p>
                            <p className="mt-1 text-sm text-[#6c7289]">{item.detail}</p>
                          </div>
                          <Chip className={item.done ? "bg-[#2C1A0E] text-white" : "bg-white text-[#2C1A0E]"}>
                            {item.done ? "done" : "todo"}
                          </Chip>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </div>
            ) : null}

            {influencerDashboardTab === "content" ? (
              <div className="space-y-4">
                <Card className="rounded-[28px] border border-[#FFE7C2] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                  <CardBody className="gap-3 p-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">content performance</p>
                      <p className="mt-1 text-sm text-[#2C1A0E]">how each post is landing right now.</p>
                    </div>
                    {influencerMetrics.length ? (
                      <div className="grid gap-3">
                        {influencerMetrics.map((item) => (
                          <div key={item.post.id} className="rounded-[20px] bg-[#FFF7E8] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-[#2C1A0E]">{item.post.title || item.post.taggedPlaceName || "untitled post"}</p>
                                <p className="mt-1 text-sm text-[#6c7289]">{item.post.taggedPlaceName || item.post.type} • {item.post.createdAt}</p>
                              </div>
                              <Chip className="bg-white text-[#2C1A0E]">{item.views} views</Chip>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Chip className="bg-white text-[#2C1A0E]">{item.likes} likes</Chip>
                              <Chip className="bg-white text-[#2C1A0E]">{item.comments} comments</Chip>
                              <Chip className="bg-white text-[#2C1A0E]">{item.saves} saves</Chip>
                            </div>
                            {item.topCities.length ? (
                              <p className="mt-3 text-sm text-[#6c7289]">
                                top cities: {item.topCities.map(([city, count]) => `${city} (${count})`).join(", ")}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#6c7289]">your posts will start showing here once people see and save them.</p>
                    )}
                  </CardBody>
                </Card>
              </div>
            ) : null}

            {influencerDashboardTab === "referrals" ? (
              <div className="space-y-4">
                <Card className="rounded-[28px] border border-[#FFE7C2] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                  <CardBody className="gap-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">referral tracking</p>
                        <p className="mt-1 text-sm text-[#2C1A0E]">everyone who joined from your link shows up here.</p>
                      </div>
                      <Chip className="bg-[#FFF0D0] text-[#F5A623]">{influencerReferralSignups.length} signups</Chip>
                    </div>
                    <div className="rounded-[18px] bg-[#FFF7E8] p-4">
                      <p className="text-sm font-semibold text-[#2C1A0E]">your code</p>
                      <p className="mt-1 text-sm text-[#6c7289]">{liveProfile.referralCode || "waiting for referral code"}</p>
                      {postSignupReferralUrl ? <p className="mt-2 break-all text-sm text-[#2C1A0E]">{postSignupReferralUrl}</p> : null}
                    </div>
                    {influencerReferralSignups.length ? (
                      <div className="grid gap-2">
                        {influencerReferralSignups.map((account) => (
                          <div key={account.googleProfile?.email} className="rounded-[18px] bg-[#FFF7E8] px-4 py-3">
                            <p className="font-semibold text-[#2C1A0E]">{account.profile.fullName || account.googleProfile?.name || "new signup"}</p>
                            <p className="mt-1 text-sm text-[#6c7289]">{account.profile.city || "city pending"} • @{account.profile.username || "pending"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#6c7289]">no referral signups yet.</p>
                    )}
                  </CardBody>
                </Card>
              </div>
            ) : null}

            {influencerDashboardTab === "support" ? (
              <div className="space-y-4">
                <Card className="rounded-[28px] border border-[#FFE7C2] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                  <CardBody className="gap-3 p-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">support & resources</p>
                      <p className="mt-1 text-sm text-[#2C1A0E]">need help, ideas, or a quick answer from the founder.</p>
                    </div>
                    <a href="mailto:crumbleappco@gmail.com?subject=crumbz%20creator%20support" className="rounded-[18px] bg-[#FFF7E8] p-4 text-left">
                      <p className="font-semibold text-[#2C1A0E]">message the founder</p>
                      <p className="mt-1 text-sm text-[#6c7289]">crumbleappco@gmail.com</p>
                    </a>
                    <div className="rounded-[18px] bg-[#FFF7E8] p-4">
                      <p className="font-semibold text-[#2C1A0E]">what to post</p>
                      <p className="mt-1 text-sm text-[#6c7289]">best-performing posts tag a place, say why it’s worth saving, and make the city feel specific.</p>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ) : null}

            {influencerDashboardTab === "settings" ? (
              <div className="space-y-4">
                <Card className="rounded-[28px] border border-[#FFE7C2] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                  <CardBody className="gap-3 p-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">settings & profile</p>
                      <p className="mt-1 text-sm text-[#2C1A0E]">same login, same profile, creator access layered on top.</p>
                    </div>
                    <div className="grid gap-2">
                      <div className="rounded-[18px] bg-[#FFF7E8] px-4 py-3 text-sm text-[#2C1A0E]">email: {user.googleProfile?.email}</div>
                      <div className="rounded-[18px] bg-[#FFF7E8] px-4 py-3 text-sm text-[#2C1A0E]">city: {liveProfile.city || "pending"}</div>
                      <div className="rounded-[18px] bg-[#FFF7E8] px-4 py-3 text-sm text-[#2C1A0E]">bio: {(liveProfile.bio ?? "").trim() || "add a short creator bio in your profile"}</div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ) : null}

            {influencerDashboardTab === "insights" ? (
              <div className="space-y-4">
                <Card className="rounded-[28px] border border-[#FFE7C2] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                  <CardBody className="gap-3 p-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">insights & analytics</p>
                      <p className="mt-1 text-sm text-[#2C1A0E]">the deeper read on where attention is coming from.</p>
                    </div>
                    <div className="grid gap-2">
                      <div className="rounded-[18px] bg-[#FFF7E8] p-4">
                        <p className="font-semibold text-[#2C1A0E]">top audience cities</p>
                        <p className="mt-2 text-sm text-[#6c7289]">
                          {influencerTopCities.length ? influencerTopCities.slice(0, 5).map(([city, count]) => `${city} (${count})`).join(", ") : "city data will show once views come in."}
                        </p>
                      </div>
                      <div className="rounded-[18px] bg-[#FFF7E8] p-4">
                        <p className="font-semibold text-[#2C1A0E]">top saved spots</p>
                        <p className="mt-2 text-sm text-[#6c7289]">
                          {influencerTopSavedSpots.length ? influencerTopSavedSpots.map((item) => `${item.post.taggedPlaceName} (${item.saves})`).join(", ") : "saved spots will show once people start bookmarking your recs."}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ) : null}
          </motion.section>

          <nav
            className="fixed left-1/2 z-[1200] w-[calc(100%-1rem)] max-w-[24.5rem] -translate-x-1/2 rounded-[32px] border border-[#4A2F1B] bg-[#2C1A0E] px-3 py-3 shadow-[0_18px_50px_rgba(44,26,14,0.24)] backdrop-blur"
            style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="grid grid-cols-6 gap-1 text-center">
              {[
                { label: "overview", key: "overview" },
                { label: "content", key: "content" },
                { label: "referrals", key: "referrals" },
                { label: "support", key: "support" },
                { label: "settings", key: "settings" },
                { label: "insights", key: "insights" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-[22px] px-1 py-2 transition-colors ${
                    influencerDashboardTab === item.key ? "bg-white text-[#2C1A0E]" : "bg-transparent text-[#FFF0D0]"
                  }`}
                  onClick={() => setInfluencerDashboardTab(item.key as InfluencerDashboardTab)}
                >
                  <span className={`text-[22px] leading-none ${influencerDashboardTab === item.key ? "text-[#F5A623]" : "text-[#FFF0D0]"}`}>
                    {renderInfluencerTabIcon(item.key as InfluencerDashboardTab, "h-5 w-5")}
                  </span>
                  <span className={`text-[10px] font-medium leading-none ${influencerDashboardTab === item.key ? "text-[#2C1A0E]" : "text-[#FFF0D0]"}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </nav>
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
                  {copy.feed.greeting(user.profile.fullName.split(" ")[0].toLowerCase())}
                </p>
                <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">{copy.feed.greetingBody}</p>
              </>
            ) : studentTab === "favorites" ? (
              <>
                <p className="font-[family-name:var(--font-young-serif)] text-[1.7rem] leading-none text-[#57657f] sm:text-[1.9rem]">
                  {copy.feed.favoritesTitle}
                </p>
                <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">{copy.feed.favoritesBody}</p>
              </>
            ) : studentTab === "rewards" ? (
              <>
                <p className="font-[family-name:var(--font-young-serif)] text-[1.7rem] leading-none text-[#57657f] sm:text-[1.9rem]">
                  {copy.feed.rewardsTitle}
                </p>
                <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">{copy.feed.rewardsBody}</p>
              </>
            ) : studentTab === "social" ? (
              <>
                <p className="font-[family-name:var(--font-young-serif)] text-[1.7rem] leading-none text-[#57657f] sm:text-[1.9rem]">
                  {copy.feed.socialTitle}
                </p>
                <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">{copy.feed.socialBody}</p>
              </>
            ) : (
              <>
                <p className="font-[family-name:var(--font-young-serif)] text-[1.7rem] leading-none text-[#57657f] sm:text-[1.9rem]">
                  {copy.feed.profileTitle}
                </p>
                <p className="mt-2 text-sm tracking-[0.04em] text-[#8a93a8]">{copy.feed.profileBody}</p>
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
                {visibleStoryRailItems.map((item) => (
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
                  id={homeAnnouncement ? `announcement-${homeAnnouncement.id}` : "announcement-panel"}
                  className="overflow-hidden rounded-[30px] border-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_22%),linear-gradient(135deg,_#141b33_0%,_#0e1630_100%)] text-white shadow-[0_24px_60px_rgba(15,22,48,0.24)]"
                >
                  <CardBody className="gap-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-[#ff7d37]">{copy.feed.announcementLabel}</p>
                        <h3 className="mt-2 text-[1.85rem] font-bold leading-[1.02] text-white">
                          {latestAnnouncementContent?.title || copy.feed.announcementFallbackTitle}
                        </h3>
                        <p className="mt-2 max-w-[15rem] text-base leading-7 text-white/76">
                          {latestAnnouncementContent?.body || copy.feed.announcementFallbackBody}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-white/6 p-4 text-4xl">📣</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        radius="full"
                        className="h-12 bg-[#ff6a24] px-8 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(255,106,36,0.28)]"
                        onPress={() => {
                          setReferralNotice("");
                          void shareReferralLink();
                        }}
                      >
                        {copy.feed.remindMe}
                      </Button>
                      <Chip className="bg-[#FF3D6B]/18 text-[#ff96b0]">{copy.feed.alerts(notificationCount)}</Chip>
                    </div>
                  </CardBody>
                </Card>
              ) : null}

              {shouldShowCityPhotoFallback ? (
                <Card className="rounded-[30px] border border-[#f1e8da] bg-white shadow-[0_18px_50px_rgba(44,26,14,0.08)]">
                  <CardBody className="gap-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#B56D19]">{copy.feed.cityFallbackLabel}</p>
                        <p className="mt-1 font-[family-name:var(--font-young-serif)] text-[2rem] leading-none text-[#2C1A0E]">
                          {copy.feed.cityFallbackTitle(liveProfile.city)}
                        </p>
                        <p className="mt-2 text-base text-[#6c7289]">{copy.feed.cityFallbackSubtitle}</p>
                      </div>
                      <Chip className="bg-[#FFF0D0] text-[#F5A623]">{copy.feed.cityFallbackCount(cityPhotoFallbackPosts.length)}</Chip>
                    </div>
                    <div className="space-y-4">
                      {cityPhotoFallbackPosts.map((post) => renderFeedCard(post))}
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
                      {copy.favorites.title(favoriteMapMode === "nearby" ? favoriteNearbyCity ?? "near you" : currentFavoriteCity)}
                    </h2>
                    <p className="text-sm text-[#2C1A0E]">
                      {favoriteMapMode === "nearby"
                        ? `showing spots around where they are right now. home stays set to ${liveProfile.city}.`
                        : copy.favorites.subtitle}
                    </p>
                  </div>
                  <Chip className="bg-[#FFF0D0] text-[#F5A623]">{copy.favorites.likedCount(favoritePlaceIds.length)}</Chip>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    radius="full"
                    variant={favoriteMapMode === "nearby" ? "solid" : "flat"}
                    className={favoriteMapMode === "nearby" ? "bg-[#2C1A0E] text-white" : "bg-[#FFF0D0] text-[#2C1A0E]"}
                    isLoading={favoriteLocationLoading}
                    onPress={useCurrentLocationForFavorites}
                  >
                    use my location
                  </Button>
                  <Chip className="bg-white text-[#2C1A0E]">
                    {favoriteMapMode === "nearby" ? `live: ${favoriteNearbyCity ?? "near you"}` : `map: ${currentFavoriteCity}`}
                  </Chip>
                  {favoriteMapMode === "nearby" ? (
                    <button
                      type="button"
                      onClick={useHomeCityForFavorites}
                      className="text-xs font-medium text-[#6c7289] underline underline-offset-4"
                    >
                      see home city
                    </button>
                  ) : null}
                </div>

                {favoriteLocationNotice ? <p className="text-sm text-[#6c7289]">{favoriteLocationNotice}</p> : null}

                <FavoritesMap
                  language={language}
                  cityName={favoriteMapMode === "nearby" ? favoriteNearbyCity ?? "near you" : currentFavoriteCity}
                  searchCityName={favoriteMapMode === "nearby" ? favoriteNearbyCity ?? "" : currentFavoriteCity}
                  center={favoriteCityCenter}
                  places={favoritePlaces}
                  favoriteIds={favoritePlaceIds}
                  isNewUser={favoritePlaceIds.length === 0 && liveProfile.friends.length === 0}
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
                        <p className="text-sm text-[#2C1A0E]">@{requester.profile.username}</p>
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
                        <p className="text-sm text-[#2C1A0E]">@{friend.profile.username}</p>
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
            {!pushEnabled && pushPromptSnoozedUntil <= Date.now() ? (
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
                      onPress={snoozePushPrompt}
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
                    <div className="mt-2 flex items-center">
                      <div className="flex items-center rounded-full border border-[#FFF0D0] bg-[#FFF7E8] p-1">
                        <button
                          type="button"
                          onClick={() => setLanguage("en")}
                          className={`rounded-full px-2 py-0.5 text-[0.62rem] font-semibold transition ${
                            language === "en" ? "bg-white text-[#2C1A0E] shadow-sm" : "text-[#6c7289]"
                          }`}
                          aria-label="switch language to english"
                        >
                          🇬🇧 EN
                        </button>
                        <span className="px-1 text-[0.62rem] text-[#C5A877]">|</span>
                        <button
                          type="button"
                          onClick={() => setLanguage("pl")}
                          className={`rounded-full px-2 py-0.5 text-[0.62rem] font-semibold transition ${
                            language === "pl" ? "bg-white text-[#2C1A0E] shadow-sm" : "text-[#6c7289]"
                          }`}
                          aria-label="switch language to polish"
                        >
                          🇵🇱 PL
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button radius="full" variant="bordered" className="shrink-0 border-[#2C1A0E] text-[#2C1A0E]" onPress={signOut}>
                    log out
                  </Button>
                </div>

                <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-3">
                  <div className="flex justify-start">
                    <Badge
                      isInvisible={!isInfluencer}
                      content={
                        <button
                          type="button"
                          aria-label="add a creator story"
                          onClick={openCreatorStoryComposer}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2C1A0E] text-[1.35rem] leading-none text-white shadow-[0_10px_24px_rgba(44,26,14,0.24)]"
                        >
                          +
                        </button>
                      }
                      placement="bottom-right"
                    >
                      <Avatar
                        src={currentUserPicture}
                        name={liveProfile.fullName || user.googleProfile?.name || "crumbz"}
                        className="h-24 w-24 border-4 border-[#FFF0D0] bg-[#FFF0D0] text-[#F5A623]"
                      />
                    </Badge>
                  </div>
                  <div className="min-w-0 pt-2">
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <button
                        type="button"
                        onClick={openOwnArchive}
                        className="flex min-h-[3.75rem] min-w-0 flex-col items-center justify-start rounded-[18px] px-1 py-1 text-center"
                      >
                        <p className="text-[1.25rem] font-semibold leading-none text-[#2C1A0E]">{currentUserAllPosts.length}</p>
                        <p className="mt-1 whitespace-nowrap text-[0.78rem] text-[#6c7289]">posts</p>
                      </button>
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
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <p className="truncate text-lg font-semibold text-[#2C1A0E]">{liveProfile.fullName}</p>
                      {isInfluencer ? renderCreatorBadge(true) : null}
                    </div>
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

            {isInfluencer ? (
              <Card className="rounded-[24px] border border-[#FFE1B3] bg-[#FFF7E8] shadow-[0_14px_34px_rgba(254,138,1,0.07)]">
                <CardBody className="gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#B56D19]">creator dashboard</p>
                      <p className="mt-1 text-sm text-[#6c7289]">flip this on when you want your creator stats.</p>
                    </div>
                    <Chip className="bg-white text-[#2C1A0E]">creator</Chip>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#2C1A0E]">creator mode</p>
                      <p className="mt-1 text-sm text-[#6c7289]">{creatorDashboardOpen ? "dashboard on" : "dashboard off"}</p>
                    </div>
                    <Switch
                      isSelected={creatorDashboardOpen}
                      onValueChange={setCreatorDashboardOpen}
                      color="warning"
                      aria-label="toggle creator dashboard from profile"
                    />
                  </div>
                </CardBody>
              </Card>
            ) : null}

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
                  {editingDailyPostId ? (
                    <div className="flex items-center justify-between rounded-[20px] bg-[#FFF0D0] px-4 py-3 text-sm">
                      <span className="text-[#2C1A0E]">editing your post</span>
                      <Button type="button" radius="full" variant="light" className="text-[#2C1A0E]" onPress={cancelEditingDailyPost}>
                        cancel
                      </Button>
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    <button
                      type="button"
                      aria-label={isInfluencer ? getCreatorUploadPrompt(dailyPostFormat) : copy.profile.addPostPhoto}
                      disabled={isUploadingDailyPost}
                      onClick={() => dailyPostInputRef.current?.click()}
                      className="relative flex min-h-56 w-full items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-[#ffc6b5] bg-[#fff8f5] text-[#ff6a24] transition-transform hover:scale-[1.01] disabled:opacity-50"
                    >
                      {dailyPostMediaUrls.length ? (
                        <>
                          {dailyPostComposerMediaKind === "video" ? (
                            <video
                              src={dailyPostMediaUrls[0]}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={dailyPostMediaUrls[0]} alt="post preview" className="h-full w-full object-cover" loading="lazy" />
                              {dailyPostComposerMediaKind === "carousel" ? (
                                <div className="absolute left-3 top-3 rounded-full bg-[#2C1A0E]/82 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                                  {dailyPostMediaUrls.length} slides
                                </div>
                              ) : null}
                            </>
                          )}
                          <button
                            type="button"
                            aria-label="remove selected media"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              clearDailyPostPhoto();
                            }}
                            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#2C1A0E]/82 text-2xl leading-none text-white shadow-[0_10px_24px_rgba(44,26,14,0.24)] transition-transform hover:scale-105"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <div className="px-6 text-center">
                          <div className="text-5xl leading-none">+</div>
                          <p className="mt-3 text-sm font-medium">
                            {isInfluencer ? getCreatorUploadPrompt(dailyPostFormat) : copy.profile.addPostPhoto}
                          </p>
                          {isInfluencer && dailyPostFormat === "story" ? (
                            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#b87037]">{getCreatorFormatRules(dailyPostFormat)}</p>
                          ) : null}
                        </div>
                      )}
                    </button>
                    {isInfluencer && dailyPostMediaUrls.length ? (
                      <div className="rounded-[18px] bg-[#fffaf2] px-4 py-3 text-sm text-[#6c7289]">
                        {dailyPostFormat === "carousel"
                          ? "you can swap the whole carousel by picking new slides."
                          : `pick a new file any time to replace this ${dailyPostFormat}.`}
                      </div>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Textarea
                      ref={dailyPostCaptionRef}
                      placeholder={
                        isInfluencer && dailyPostFormat === "story"
                          ? "add to your story"
                          : copy.profile.captionPlaceholder
                      }
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
                    accept={
                      isInfluencer
                        ? dailyPostFormat === "story"
                          ? ".jpg,.jpeg,.png,.heic,.mp4,.mov,image/jpeg,image/png,image/heic,image/heif,video/mp4,video/quicktime"
                          : ".jpg,.jpeg,.png,.heic,.mp4,.mov,image/jpeg,image/png,image/heic,image/heif,video/mp4,video/quicktime"
                        : ".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
                    }
                    multiple={isInfluencer && dailyPostFormat !== "story"}
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
                      className={`h-14 ${isInfluencer ? "min-w-[7.5rem]" : "min-w-14"} bg-[#ff6a24] px-5 ${isInfluencer ? "text-sm font-semibold uppercase tracking-[0.14em]" : "text-2xl"} text-white disabled:opacity-60`}
                    >
                      {editingDailyPostId ? "save" : isInfluencer ? `post ${dailyPostFormat}` : "→"}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={openOwnArchive} className="text-left">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">your posts</p>
                    <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">
                      your archive
                    </h2>
                  </button>
                  <button type="button" onClick={openOwnArchive}>
                    <Chip className="bg-[#FFF0D0] text-[#F5A623]">{currentUserAllPosts.length}</Chip>
                  </button>
                </div>

                {currentUserAllPosts.length ? (
                  <button
                    type="button"
                    onClick={openOwnArchive}
                    className="block w-full rounded-[24px] bg-[#FFF7E8] p-3 text-left"
                  >
                    {renderArchivePostGrid(currentUserAllPosts.slice(0, 6), () => undefined, { interactive: false, labelSize: "compact" })}
                    <p className="mt-3 text-sm font-medium text-[#6c7289]">tap to open your full archive grid.</p>
                  </button>
                ) : (
                  <p className="text-sm text-[#6c7289]">post your first photo and it’ll live here as your personal archive.</p>
                )}
              </CardBody>
            </Card>

          </section>
        ) : null}

        {selectedStoryPost || notificationsOpen || selectedOwnArchiveOpen || selectedOwnPost || selectedProfileEmail ? null : (
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
                        {item.detail ? <p className="mt-1 text-sm text-[#2C1A0E]">{item.detail}</p> : null}
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
        hideCloseButton
      >
        <ModalContent className="max-h-[100dvh] bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-[#FFF0D0]">
                <div className="w-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all font-[family-name:var(--font-young-serif)] text-[1.55rem] leading-none text-[#2C1A0E] sm:text-[2.1rem]">
                        @{selectedProfileAccount?.profile.username || "crumbz-user"}
                      </p>
                      <p className="mt-2 text-sm text-[#6c7289]">their crumbz profile</p>
                    </div>
                    <Button
                      radius="full"
                      variant="light"
                      className="shrink-0 text-[#2C1A0E]"
                      onPress={() => {
                        closeSelectedProfile();
                        onClose();
                      }}
                    >
                      close
                    </Button>
                  </div>

                  <div className="mt-5 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-3">
                    <div className="flex justify-start">
                      <Avatar
                        src={getAccountPicture(selectedProfileAccount)}
                        name={selectedProfileAccount?.profile.fullName || selectedProfileAccount?.profile.username || "friend"}
                        className="h-24 w-24 border-4 border-[#FFF0D0] bg-[#FFF0D0] text-[#F5A623]"
                      />
                    </div>
                    <div className="min-w-0 pt-2">
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <button
                          type="button"
                          onClick={() => setProfileDrawer("followers")}
                          className="flex min-h-[3.75rem] min-w-0 flex-col items-center justify-start rounded-[18px] px-1 py-1 text-center"
                        >
                          <p className="text-[1.25rem] font-semibold leading-none text-[#2C1A0E]">{selectedProfileFollowersCount}</p>
                          <p className="mt-1 whitespace-nowrap text-[0.78rem] text-[#6c7289]">followers</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileDrawer("favorites")}
                          className="flex min-h-[3.75rem] min-w-0 flex-col items-center justify-start rounded-[18px] px-1 py-1 text-center"
                        >
                          <p className="text-[1.25rem] font-semibold leading-none text-[#2C1A0E]">{selectedProfileFavoriteCount}</p>
                          <p className="mt-1 whitespace-nowrap text-[0.78rem] text-[#6c7289]">favorites</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfilePostFiltersOpen(true);
                            setSelectedProfilePostTab("all");
                          }}
                          className="flex min-h-[3.75rem] min-w-0 flex-col items-center justify-start rounded-[18px] px-1 py-1 text-center"
                        >
                          <p className="text-[1.25rem] font-semibold leading-none text-[#2C1A0E]">{selectedProfileAuthoredPosts.length}</p>
                          <p className="mt-1 whitespace-nowrap text-[0.78rem] text-[#6c7289]">posts</p>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <p className="truncate text-lg font-semibold text-[#2C1A0E]">{selectedProfileAccount?.profile.fullName || "friend"}</p>
                      {selectedProfileIsInfluencer ? renderCreatorBadge(true) : null}
                    </div>
                    <p className="text-sm text-[#2C1A0E]">{formatProfileMeta(selectedProfileAccount?.profile.city || "", selectedProfileAccount?.profile.schoolName || "")}</p>
                    {selectedProfileBio ? <p className="pt-2 text-sm leading-6 text-[#6c7289]">{selectedProfileBio}</p> : null}
                  </div>
                </div>
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
                          <Chip className="bg-[#FFF0D0] text-[#F5A623]">{selectedProfileFilteredPosts.length}</Chip>
                        </div>
                        {selectedProfilePostFiltersOpen ? (
                          <Tabs
                            selectedKey={selectedProfilePostTab}
                            onSelectionChange={(key) => setSelectedProfilePostTab(key as ProfilePostTab)}
                            aria-label="profile posts"
                            classNames={{
                              tabList: "grid w-full grid-cols-4 gap-1 rounded-[24px] bg-[#FFF0D0] p-1",
                              cursor: "rounded-full bg-white",
                              tab: "h-10 min-w-0 px-2 text-xs font-medium text-[#2C1A0E]",
                              tabContent: "truncate group-data-[selected=true]:text-[#2C1A0E]",
                            }}
                          >
                            {(["all", "friend-review", "post", "sunday-dump"] as ProfilePostTab[]).map((tab) => (
                              <Tab key={tab} title={getProfilePostTabLabel(tab)} />
                            ))}
                          </Tabs>
                        ) : null}
                        {selectedProfileFilteredPosts.length ? (
                          selectedProfileFilteredPosts.map((post) => renderFeedCard(post))
                        ) : (
                          <div className="rounded-[22px] bg-white p-4 text-sm text-[#2C1A0E]">
                            no {getProfilePostTabLabel(selectedProfilePostTab)} yet.
                          </div>
                        )}
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
                    {profileDrawer === "followers" ? "followers" : "favorites"}
                  </p>
                  <p className="mt-2 text-sm text-[#6c7289]">
                    {profileDrawer === "followers"
                      ? selectedProfileAccount && !selectedProfileIsOwn
                        ? "their crumbz circle lives here."
                        : "your crumbz circle lives here."
                      : "the spots saved on this crumbz profile."}
                  </p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="bg-[#fffaf2] pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5">
                {profileDrawer === "followers" ? (
                  profileDrawerFollowerEmails.length ? (
                    <div className="grid gap-3">
                      {profileDrawerFollowerEmails.map((friendEmail) => {
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
                              <p className="break-all text-sm text-[#6c7289]">@{friend.profile.username}</p>
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
                ) : profileDrawerFavoriteSpots.length ? (
                  <div className="grid gap-3">
                    {profileDrawerFavoriteSpots.map((place) => (
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
            snoozePushPrompt();
            return;
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
                      snoozePushPrompt();
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
                      muted
                      onEnded={() => showAdjacentStory(1)}
                    />
                  ) : selectedStoryPost.mediaUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedStoryPost.mediaUrls[0]}
                      alt={selectedStoryPostContent?.title || selectedStoryPost.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,13,8,0.62)_0%,rgba(20,13,8,0.18)_36%,rgba(20,13,8,0.55)_100%)]" />
                  <div className="relative z-10 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
                    <div className="mb-4 grid grid-cols-1 gap-2">
                      <div className="flex gap-1">
                        {selectedStorySequence.map((post, index) => (
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
                        <Avatar src={selectedStoryPicture} name={selectedStoryLabel} className="h-11 w-11 bg-[#F5A623] text-white" />
                        <div>
                          <p className="text-sm font-semibold text-white">{selectedStoryLabel}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                            story {selectedStoryPostIndex + 1} of {selectedStorySequence.length} • {selectedStoryPost.createdAt}
                          </p>
                        </div>
                      </div>
                      <Button radius="full" variant="light" className="min-w-0 bg-white/12 px-3 text-white" onPress={() => setSelectedStoryPostId(null)}>
                        close
                      </Button>
                    </div>
                  </div>
                  <div className="relative z-10 mt-auto space-y-3 px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-10 text-white">
                    <p className="font-[family-name:var(--font-young-serif)] text-[2.6rem] leading-none">
                      {selectedStoryPostContent?.title || selectedStoryPost.title}
                    </p>
                    {selectedStoryPostContent?.body ? (
                      <p className="max-w-[18rem] text-base leading-7 text-white/88">{selectedStoryPostContent.body}</p>
                    ) : null}
                    <Chip className="w-fit bg-white/14 text-white">{selectedStoryPostContent?.cta || selectedStoryPost.cta}</Chip>
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
        isOpen={selectedOwnArchiveOpen}
        onOpenChange={(open) => !open && closeOwnArchive()}
        size="full"
        scrollBehavior="inside"
      >
        <ModalContent className="max-h-[100dvh] bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between border-b border-[#FFF0D0]">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">your posts</p>
                  <p className="mt-1 font-[family-name:var(--font-young-serif)] text-[2rem] leading-none text-[#2C1A0E]">
                    your archive
                  </p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="bg-[#fffaf2] pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5">
                {currentUserAllPosts.length ? (
                  renderArchivePostGrid(currentUserAllPosts, openOwnArchivePost)
                ) : (
                  <div className="rounded-[22px] bg-white p-4 text-sm text-[#2C1A0E]">
                    post your first photo and it’ll live here as your personal archive.
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={Boolean(selectedOwnPost)}
        onOpenChange={(open) => !open && closeOwnPost()}
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
                {selectedOwnPost ? (
                  <div className="space-y-4">
                    <div className="rounded-[32px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
                      <div className="flex items-center gap-3 px-5 pb-0 pt-5">
                        <Avatar src={currentUserPicture} name={selectedOwnPost.authorName} className="bg-[#FFF0D0] text-[#F5A623]" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#2C1A0E]">@{user.profile.username}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
                            {selectedOwnPost.type === "weekly-dump"
                              ? "sunday dump"
                              : formatRelativePostTime(selectedOwnPost.createdAtIso, selectedOwnPost.createdAt)}
                          </p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">
                          {selectedOwnPost.cta === "live now" ? "post" : selectedOwnPost.cta}
                        </Chip>
                      </div>

                      {selectedOwnPost.type !== "weekly-dump" ? (
                        <div className="px-5 pt-4">
                          <Button
                            radius="full"
                            variant="flat"
                            className="bg-[#FFF0D0] text-[#2C1A0E]"
                            onPress={() => startEditingDailyPost(selectedOwnPost)}
                          >
                            edit post
                          </Button>
                        </div>
                      ) : null}

                      <div className="mt-4">
                        <PostMediaPreview post={selectedOwnPost} detail />
                      </div>

                      <div className="space-y-4 px-5 pb-5 pt-4">
                        {selectedOwnPost.body.trim() ? renderCaptionWithTags(selectedOwnPost.body, "text-base leading-7 text-[#2C1A0E]") : null}

                        {selectedOwnPost.taggedPlaceName ? (
                          <button
                            type="button"
                            onClick={() => openPostPlace(selectedOwnPost)}
                            className="flex w-full items-start justify-between gap-3 rounded-[18px] bg-[linear-gradient(180deg,_#FFF8EA_0%,_#ffffff_100%)] px-4 py-3 text-left ring-1 ring-[#FFF0D0]"
                          >
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-[0.16em] text-[#B56D19]">{selectedOwnPost.taggedPlaceKind || "food spot"}</p>
                              <p className="mt-1 truncate text-base font-semibold text-[#2C1A0E]">{selectedOwnPost.taggedPlaceName}</p>
                              {selectedOwnPost.taggedPlaceAddress ? <p className="mt-1 truncate text-sm text-[#6c7289]">{selectedOwnPost.taggedPlaceAddress}</p> : null}
                            </div>
                            <span className="rounded-full bg-[#FFF0D0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A623]">map</span>
                          </button>
                        ) : null}

                        {selectedOwnPost.tasteTag || selectedOwnPost.priceTag ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedOwnPost.tasteTag ? <Chip className="bg-[#2C1A0E] text-white">{selectedOwnPost.tasteTag}</Chip> : null}
                            {selectedOwnPost.priceTag ? (
                              <Chip className="bg-white text-[#2C1A0E] ring-1 ring-[#FFF0D0]">
                                {PRICE_TAG_OPTIONS.find((item) => item.key === selectedOwnPost.priceTag)?.label ?? selectedOwnPost.priceTag}
                              </Chip>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="flex items-center gap-3">
                          <PostActionIcon label="like post" active={selectedOwnPostHasLiked} onPress={() => toggleLike(selectedOwnPost.id)}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path
                                d="M12 20s-6.5-4.35-8.5-7.8C1.7 9 3.2 5.5 7 5.5c2 0 3.3 1.15 4 2.2.7-1.05 2-2.2 4-2.2 3.8 0 5.3 3.5 3.5 6.7C18.5 15.65 12 20 12 20Z"
                                fill={selectedOwnPostHasLiked ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </PostActionIcon>
                          <PostActionIcon
                            label="comment on post"
                            onPress={() => {
                              setOpenCommentPostId((current) => (current === selectedOwnPost.id ? null : selectedOwnPost.id));
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
                            onPress={() => void (canUseImageShareForPost(selectedOwnPost) ? shareAdminPostCard(selectedOwnPost) : sharePost(selectedOwnPost.id))}
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
                          <button
                            type="button"
                            onClick={() => setLikesViewerPostId(selectedOwnPost.id)}
                            className="rounded-full bg-[#FFF6E0] px-3 py-2 transition hover:bg-[#FFE8B8]"
                          >
                            {selectedOwnPostBucket?.likes.length ?? 0} likes
                          </button>
                          <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{selectedOwnPostVisibleComments.length} comments</span>
                          <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{selectedOwnPostBucket?.shares.length ?? 0} shares</span>
                        </div>

                        <div className="space-y-3">
                          {selectedOwnPostVisibleComments.map((comment) => renderCommentThread(selectedOwnPost.id, comment))}

                          {openCommentPostId === selectedOwnPost.id ? (
                            <form className="space-y-2" onSubmit={(event) => addComment(event, selectedOwnPost.id)}>
                              <div className="flex gap-2">
                                <Input
                                  aria-label={`comment on ${selectedOwnPost.title}`}
                                  radius="full"
                                  placeholder="comment on this post"
                                  value={commentDrafts[selectedOwnPost.id] ?? ""}
                                  onValueChange={(value) =>
                                    setCommentDrafts((current) => ({
                                      ...current,
                                      [selectedOwnPost.id]: value,
                                    }))
                                  }
                                  classNames={{ inputWrapper: "bg-[#FFF0D0] border border-[#FFF0D0]" }}
                                />
                                <Button type="submit" radius="full" className="bg-[#F5A623] text-white">
                                  send
                                </Button>
                              </div>
                              <p className="text-xs text-[#6c7289]">type @username if you want to mention someone.</p>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={Boolean(likesViewerPost)}
        onOpenChange={(open) => {
          if (!open) {
            setLikesViewerPostId(null);
            setLikesViewerSearch("");
          }
        }}
        placement="bottom-center"
        scrollBehavior="inside"
      >
        <ModalContent className="bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between border-b border-[#FFF0D0]">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">reactions</p>
                  <p className="mt-1 font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">
                    {likesViewerBucket?.likes.length ?? 0} likes
                  </p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="gap-4 bg-[#fffaf2] pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5">
                <Input
                  radius="full"
                  placeholder="search people"
                  value={likesViewerSearch}
                  onValueChange={setLikesViewerSearch}
                  classNames={{ inputWrapper: "bg-white border border-[#FFF0D0] shadow-none" }}
                />
                {likesViewerRows.length ? (
                  <div className="space-y-3">
                    {likesViewerRows.map((row) => (
                      <button
                        key={`${row.email}-${row.username}`}
                        type="button"
                        onClick={() => {
                          onClose();
                          openProfileByEmail(row.email);
                        }}
                        className="flex w-full items-center gap-3 rounded-[18px] bg-white px-3 py-3 text-left ring-1 ring-[#FFF0D0]"
                      >
                        <Avatar src={row.picture} name={row.fullName} className="h-12 w-12 bg-[#FFF0D0] text-[#F5A623]" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#2C1A0E]">{row.username || row.fullName}</p>
                          <p className="truncate text-sm text-[#6c7289]">{row.fullName}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6c7289]">no likes to show yet.</p>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={Boolean(commentReactionViewer)}
        onOpenChange={(open) => {
          if (!open) {
            setCommentReactionViewer(null);
          }
        }}
        placement="bottom-center"
        scrollBehavior="inside"
      >
        <ModalContent className="bg-[#fffaf2]">
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between border-b border-[#FFF0D0]">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">comment reactions</p>
                  <p className="mt-1 font-[family-name:var(--font-young-serif)] text-[1.8rem] leading-none text-[#2C1A0E]">
                    {commentReactionViewer?.emoji ?? ""} reactions
                  </p>
                </div>
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="gap-4 bg-[#fffaf2] pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5">
                {commentReactionViewerRows.length ? (
                  <div className="space-y-3">
                    {commentReactionViewerRows.map((row) => (
                      <button
                        key={`${row.email}-${row.username}`}
                        type="button"
                        onClick={() => {
                          onClose();
                          openProfileByEmail(row.email);
                        }}
                        className="flex w-full items-center gap-3 rounded-[18px] bg-white px-3 py-3 text-left ring-1 ring-[#FFF0D0]"
                      >
                        <Avatar src={row.picture} name={row.fullName} className="h-12 w-12 bg-[#FFF0D0] text-[#F5A623]" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#2C1A0E]">{row.username || row.fullName}</p>
                          <p className="truncate text-sm text-[#6c7289]">{row.fullName}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6c7289]">no reactions to show yet.</p>
                )}
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
