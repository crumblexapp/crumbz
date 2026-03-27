"use client";

import { Fragment, type FormEvent, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { supabaseBrowser } from "@/lib/supabase/client";

const FavoritesMap = dynamic(() => import("@/components/favorites-map"), { ssr: false });

const STORAGE_KEY = "crumbz-active-user-v1";
const ACCOUNTS_KEY = "crumbz-accounts-v1";
const POSTS_KEY = "crumbz-posts-v1";
const INTERACTIONS_KEY = "crumbz-interactions-v1";
const DARE_KEY = "crumbz-dare-v1";
const SEEN_NOTIFICATIONS_KEY = "crumbz-seen-notifications-v1";
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
    createdAtIso: new Date().toISOString(),
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
    createdAtIso: new Date().toISOString(),
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
    createdAtIso: new Date().toISOString(),
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
type StudentTab = "feed" | "favorites" | "rewards" | "social" | "profile";

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
    favoriteActivities?: FavoriteActivity[];
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
};

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
    isStudent: null,
    schoolName: "",
    friends: [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    favoritePlaceIds: [],
    favoriteActivities: [],
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

function isLiveDailyPost(post: AppPost, nowTimestamp: number) {
  if (post.authorRole !== "student" || post.type === "weekly-dump") return false;
  const createdTimestamp = getPostTimestamp(post);
  if (!createdTimestamp || createdTimestamp > nowTimestamp) return false;
  return nowTimestamp - createdTimestamp < 24 * 60 * 60 * 1000;
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
  action: "upsert_account" | "send_friend_request" | "accept_friend_request" | "decline_friend_request" | "remove_friend" | "update_favorites" | "delete_account";
  account?: StoredUser;
  currentEmail?: string;
  targetEmail?: string;
  favoritePlaceIds?: string[];
  favoritePlace?: FavoritePlace;
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

function PostMediaPreview({ post }: { post: AppPost }) {
  const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = Math.min(activeIndex, mediaUrls.length - 1);

  if (post.mediaKind === "none" || !mediaUrls.length) {
    return null;
  }

  if (post.mediaKind === "photo") {
    return (
      <>
        {/* uploaded dump images come straight from storage urls, so a plain img avoids remote loader issues here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaUrls[0]}
        alt={post.title}
        className="h-72 w-full rounded-[24px] object-cover ring-1 ring-[#FFF0D0]"
        loading="lazy"
      />
      </>
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
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[24px] bg-[#FFF0D0] ring-1 ring-[#FFF0D0]">
        {/* carousel images use the same direct storage urls as the single-photo case above. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrls[currentIndex]}
          alt={`${post.title} ${currentIndex + 1}`}
          className="h-[28rem] w-full object-cover"
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
  const [studentTab, setStudentTab] = useState<StudentTab>("feed");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
  const [dailyPostMediaUrls, setDailyPostMediaUrls] = useState<string[]>([]);
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
  const [selectedProfileEmail, setSelectedProfileEmail] = useState<string | null>(null);
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
  const dailyPostInputRef = useRef<HTMLInputElement>(null);
  const weeklyDumpInputRef = useRef<HTMLInputElement>(null);
  const userRef = useRef(user);
  const accountsRef = useRef(accounts);
  const lastDraftSyncedDareIdRef = useRef<string | null>(null);
  const authModeRef = useRef<AuthMode>("signup");
  const hasLoadedDataRef = useRef(false);
  const lastSharedStateMutationAtRef = useRef(0);

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
  const accountByEmail = new Map(
    accounts
      .filter((account) => account.googleProfile?.email)
      .map((account) => [account.googleProfile?.email?.toLowerCase() ?? "", account] as const),
  );
  const resolveChallenger = (email: string, submission?: DareSubmission | null) => {
    const account = accountByEmail.get(email.toLowerCase()) ?? null;
    const fallbackName = submission?.authorName || getSafePublicIdentity({ email });

    return {
      email,
      name: account?.profile.fullName || account?.googleProfile?.name || fallbackName,
      username: account?.profile.username || "",
      meta: formatProfileMeta(account?.profile.city ?? "", account?.profile.schoolName ?? ""),
      picture: account?.googleProfile?.picture,
      submission: submission ?? null,
    };
  };
  const reminderChallengers = dare.reminderEmails.map((email) => resolveChallenger(email));
  const acceptedChallengers = dare.acceptedEmails.map((email) => resolveChallenger(email));
  const proofChallengers = dare.submissions.map((submission) => resolveChallenger(submission.authorEmail, submission));
  const adminPosts = posts.filter((post) => post.authorRole !== "student");
  const nowTimestamp = Date.now();
  const currentUserEmail = user.googleProfile?.email?.toLowerCase() ?? "";
  const friendEmails = liveProfile.friends.map((email) => email.toLowerCase());
  const studentDailyPosts = posts
    .filter((post) => post.authorRole === "student" && post.type !== "weekly-dump")
    .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const studentWeeklyDumps = posts.filter((post) => post.authorRole === "student" && post.type === "weekly-dump");
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
    return authorEmail !== currentUserEmail && isLiveDailyPost(post, nowTimestamp);
  });
  const friendWeeklyDumps = visibleStudentWeeklyDumps.filter(
    (post) => post.authorEmail.toLowerCase() !== currentUserEmail,
  );
  const today = new Date();
  const canSubmitWeeklyDumpToday = isSunday(today);
  const shouldShowSundayDumpFeed = canSubmitWeeklyDumpToday;
  const shouldShowAdminPosts = adminPosts.length > 0;
  const currentSundayKey = getSundayKey(today);
  const authoredWeeklyDumps = studentWeeklyDumps.filter(
    (post) => post.authorEmail.toLowerCase() === (user.googleProfile?.email?.toLowerCase() ?? ""),
  );
  const currentUserWeeklyDump =
    authoredWeeklyDumps.find((post) => post.weekKey === currentSundayKey) ??
    authoredWeeklyDumps.find((post) => post.id === `weekly-dump-${currentUserEmail}-${currentSundayKey}`) ??
    authoredWeeklyDumps[0] ??
    null;
  const studentUserPosts = [...studentDailyPosts, ...studentWeeklyDumps].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  const currentUserProfilePosts = studentDailyPosts.filter((post) => post.authorEmail.toLowerCase() === currentUserEmail);
  const selectedProfileAccount = selectedProfileEmail ? accountByEmail.get(selectedProfileEmail.toLowerCase()) ?? null : null;
  const selectedProfilePosts = selectedProfileEmail
    ? studentDailyPosts.filter((post) => post.authorEmail.toLowerCase() === selectedProfileEmail.toLowerCase())
    : [];
  const activeWeeklyDumpMediaUrls = weeklyDumpMediaUrls.length ? weeklyDumpMediaUrls : currentUserWeeklyDump?.mediaUrls ?? [];
  const activeWeeklyDumpCaption = weeklyDumpCaption || currentUserWeeklyDump?.body || "";
  const totalComments = Object.values(interactions).reduce((sum, item) => sum + item.comments.length, 0);
  const totalShares = Object.values(interactions).reduce((sum, item) => sum + item.shares.length, 0);
  const totalLikes = Object.values(interactions).reduce((sum, item) => sum + item.likes.length, 0);
  const uniqueCommenters = new Set(
    Object.values(interactions).flatMap((item) => item.comments.map((comment) => comment.authorEmail)),
  ).size;
  const uniqueSharers = new Set(
    Object.values(interactions).flatMap((item) => item.shares.map((share) => share.authorEmail)),
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
  const currentFavoriteCity = favoriteViewCity ?? liveProfile.city;
  const favoriteCityCenter = cityCenters[normalizeCityKey(currentFavoriteCity)] ?? [52.2297, 21.0122];
  const profileLikedSpots = favoritePlaceIds
    .map((placeId) => favoritePlaces.find((place) => place.id === placeId) ?? allFoodSpots.find((place) => place.id === placeId) ?? null)
    .filter((place): place is FavoritePlace => Boolean(place));
  const friendAccounts = accounts.filter((account) => {
    const email = account.googleProfile?.email ?? "";
    return email.toLowerCase() !== ADMIN_EMAIL && liveProfile.friends.includes(email);
  });
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
      (account.profile.favoriteActivities ?? []).map((activity) => ({
        id: activity.id,
        kind: "friend_favorite" as const,
        title: `${account.profile.fullName} saved ${activity.placeName}`,
        detail: `${activity.placeKind} • ${activity.city || account.profile.city}${activity.placeAddress ? ` • ${activity.placeAddress}` : ""}`,
        picture: account.googleProfile?.picture,
        createdAt: activity.createdAt,
        city: activity.city || account.profile.city,
        place: {
          id: activity.placeId,
          name: activity.placeName,
          kind: activity.placeKind,
          lat: activity.lat,
          lon: activity.lon,
          address: activity.placeAddress,
        } satisfies FavoritePlace,
      })),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const notificationItems = [
    ...(currentUserDareReminder
      ? [
          {
            id: dareReminderNotificationId,
            kind: "dare_reminder" as const,
            title: isDareLiveWindow ? `${dare.title} is live now` : `dare reminder set for ${dareReleaseText}`,
            detail: isDareLiveWindow
              ? "the challenge is open now. jump in and post proof before sunday midnight."
              : "we’ll keep this in your crumbz notifications too, so you don’t miss the drop.",
          },
        ]
      : []),
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
    ...friendDailyFeedPosts
      .slice(0, 6)
      .map((post) => ({
        id: `friend-dump-${post.id}`,
        kind: "friend_dump" as const,
        title: `${post.authorName} posted`,
        detail: `live for 24h • ${formatRelativePostTime(post.createdAtIso, post.createdAt)}`,
        postId: post.id,
        picture: accounts.find((account) => account.googleProfile?.email === post.authorEmail)?.googleProfile?.picture,
      })),
    ...friendFavoriteNotifications,
  ].filter(Boolean) as Array<
    | { id: string; kind: "dare_reminder"; title: string; detail: string; picture?: string }
    | { id: string; kind: "announcement"; title: string; detail: string; picture?: string }
    | { id: string; kind: "friend_request"; title: string; detail: string; email: string; picture?: string }
    | { id: string; kind: "friend_favorite"; title: string; detail: string; picture?: string; createdAt: string; city: string; place: FavoritePlace }
    | { id: string; kind: "admin_post" | "friend_dump"; title: string; detail: string; postId: string; picture?: string }
  >;
  const unreadNotificationItems = notificationItems.filter((item) => !seenNotificationIds.includes(item.id));
  const notificationCount = unreadNotificationItems.length;

  const renderFeedCard = (post: AppPost) => {
    const bucket = getInteractionBucket(interactions, post.id);
    const visibleComments = bucket.comments.filter((comment) => !comment.hidden);
    const currentUserEmail = user.googleProfile?.email?.toLowerCase() ?? "";
    const hasLiked = bucket.likes.some((like) => like.authorEmail.toLowerCase() === currentUserEmail);
    const isStudentPost = post.authorRole === "student";
    const isSundayDump = post.type === "weekly-dump";
    const authorAccount = accounts.find((account) => account.googleProfile?.email === post.authorEmail);
    const profileMeta = authorAccount ? formatProfileMeta(authorAccount.profile.city, authorAccount.profile.schoolName) : "";
    const showPostBody = Boolean(post.body.trim()) && (!isStudentPost || post.body.trim() !== profileMeta);

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
              {isStudentPost
                ? isSundayDump
                  ? `sunday dump • ${post.createdAt}`
                  : `post • ${formatRelativePostTime(post.createdAtIso, post.createdAt)}`
                : `${post.type} • ${post.createdAt}`}
            </p>
          </div>
          {isStudentPost && post.authorEmail.toLowerCase() !== currentUserEmail ? (
            <Button
              radius="full"
              size="sm"
              variant="flat"
              className="bg-white text-[#2C1A0E]"
              onPress={() => setSelectedProfileEmail(post.authorEmail)}
            >
              profile
            </Button>
          ) : null}
          <Chip className="bg-[#FFF0D0] text-[#F5A623]">{post.cta}</Chip>
        </CardHeader>
        <CardBody className="gap-4 p-5">
          <div className="rounded-[24px] bg-[linear-gradient(180deg,_#FFF0D0_0%,_#ffffff_100%)] p-5 ring-1 ring-[#FFF0D0]">
            <h3 className="font-[family-name:var(--font-young-serif)] text-[2rem] leading-none text-[#2C1A0E]">{post.title}</h3>
            {showPostBody ? <p className="mt-2 text-sm leading-6 text-[#2C1A0E]">{post.body}</p> : null}
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

          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#2C1A0E]">
            <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{bucket.likes.length} likes</span>
            <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{visibleComments.length} comments</span>
            <span className="rounded-full bg-[#FFF6E0] px-3 py-2">{bucket.shares.length} shares</span>
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
    nextDare,
    nextAnnouncements,
  }: {
    nextPosts?: AppPost[];
    nextInteractions?: InteractionsMap;
    nextDare?: DareState;
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
        ...(nextDare ? { dare: nextDare } : {}),
        ...(nextAnnouncements ? { announcements: nextAnnouncements } : {}),
      }),
    }).catch(() => undefined);
  };

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
            syncSharedState({
              nextPosts,
              nextInteractions: nextInteractions,
              nextDare,
            });
          } else {
            setAccounts(normalizeAccounts(payload.accounts));
            setPosts(mergePostsPreferLocal(nextPosts, normalizePosts((payload.posts ?? []) as Partial<AppPost>[])));
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
    const currentEmail = user.googleProfile?.email?.toLowerCase();
    if (!currentEmail || !accounts.length) return;

    const freshAccount = accounts.find((account) => account.googleProfile?.email?.toLowerCase() === currentEmail);
    if (!freshAccount) {
      if (!user.signedIn) return;

      persistUser(defaultUser);
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

    const timeout = window.setTimeout(() => {
      syncSharedState({
        nextPosts: posts,
        nextInteractions: interactions,
        nextDare: dare,
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [dare, posts, interactions]);

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
              nextDare: readDare(),
              nextAnnouncements: announcements,
            });
            return;
          }

          setAccounts(normalizeAccounts(payload.accounts));
          const serverPosts = normalizePosts((payload.posts ?? []) as Partial<AppPost>[]);
          const shouldPreserveLocalPosts = Date.now() - lastSharedStateMutationAtRef.current < 5000;
          setPosts((current) => (shouldPreserveLocalPosts ? mergePostsPreferLocal(current, serverPosts) : serverPosts));
          const serverInteractions = normalizeInteractions(payload.interactions);
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
        favoriteActivities: user.profile.favoriteActivities ?? [],
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
    setStudentTab("feed");
    setNotificationsOpen(false);
    window.setTimeout(() => {
      const target = document.getElementById(`post-${postId}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  const openFriendFavoriteNotification = (notificationId: string, cityName: string, place: FavoritePlace) => {
    markNotificationSeen(notificationId);
    setFavoriteViewCity(cityName);
    setHighlightedFavoritePlaceId(place.id);
    setFavoritePlaces((current) => {
      const next = current.filter((item) => item.id !== place.id);
      return [place, ...next].slice(0, 24);
    });
    setStudentTab("favorites");
    setNotificationsOpen(false);
  };

  const openFriendFavoriteMoment = (cityName: string, place: FavoritePlace) => {
    setFavoriteViewCity(cityName);
    setHighlightedFavoritePlaceId(place.id);
    setFavoritePlaces((current) => {
      const next = current.filter((item) => item.id !== place.id);
      return [place, ...next].slice(0, 24);
    });
    setStudentTab("favorites");
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
    };

    lastSharedStateMutationAtRef.current = Date.now();
    setPosts((current) =>
      editingPostId
        ? current.map((post) => (post.id === editingPostId ? nextPost : post))
        : [nextPost, ...current],
    );
    resetComposer();
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
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("delete this post only?");
      if (!confirmed) return;
    }

    const nextPosts = posts.filter((post) => post.id !== postId);
    const nextInteractions = { ...interactions };
    delete nextInteractions[postId];

    lastSharedStateMutationAtRef.current = Date.now();
    setPosts(nextPosts);
    setInteractions(nextInteractions);
    syncSharedState({
      nextPosts,
      nextInteractions,
    });

    if (editingPostId === postId) {
      cancelEditingPost();
    }
  };

  const deleteUserFromAdmin = (targetEmail: string) => {
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
      .catch(() => {
        setAdminActionNotice("that delete didn’t stick. try again.");
      });
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

    const firstName = user.profile.fullName.split(" ")[0] || user.profile.username || "friend";
    const createdAtIso = new Date().toISOString();
    const caption = dailyPostCaption.trim();
    const nextPost: AppPost = {
      id: `daily-post-${Date.now()}`,
      title: `${firstName}'s post`,
      body: caption,
      type: "story",
      cta: "live now",
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
    };

    lastSharedStateMutationAtRef.current = Date.now();
    setPosts((current) => [nextPost, ...current]);
    syncSharedState({
      nextPosts: [nextPost, ...posts],
      nextInteractions: interactions,
    });
    setDailyPostCaption("");
    setDailyPostMediaUrls([]);
    setDailyPostNotice("your post is live for 24 hours.");
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
                <h1 className="mt-2 font-[family-name:var(--font-young-serif)] text-4xl leading-none">
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

                    <Tab key="published-posts" title={`posts (${adminPosts.length})`}>
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
                                          createdAtIso: new Date().toISOString(),
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
                              <Chip className="bg-[#FFF0D0] text-[#F5A623]">{adminPosts.length} total</Chip>
                            </div>
                            {adminPosts.length ? (
                              adminPosts.map((post) => (
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
                  </Tabs>
                </div>
              </Tab>

              <Tab key="community" title="community">
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "signups", value: totalSignups },
                      { label: "student posts", value: studentUserPosts.length },
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
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{userManagementRows.length} users</Chip>
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
                          <p className="mt-1 text-sm text-[#2C1A0E]">remove one student post without deleting the whole account.</p>
                        </div>
                        <Chip className="bg-[#FFF0D0] text-[#F5A623]">{studentUserPosts.length} total</Chip>
                      </div>
                      {studentUserPosts.length ? (
                        <div className="grid gap-2">
                          {studentUserPosts.map((post) => (
                            <div key={post.id} className="rounded-[18px] bg-[#FFF0D0] px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#2C1A0E]">{post.title}</p>
                                  <p className="mt-1 text-sm text-[#2C1A0E]">{post.authorName || "student post"}</p>
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
              <Card
                id={selectedAnnouncement ? `announcement-${selectedAnnouncement.id}` : "announcement-panel"}
                className="overflow-hidden rounded-[30px] border-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_22%),linear-gradient(135deg,_#141b33_0%,_#0e1630_100%)] text-white shadow-[0_24px_60px_rgba(15,22,48,0.24)]"
              >
                <CardBody className="gap-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[#ff7d37]">push notification</p>
                      <h3 className="mt-2 text-[1.85rem] font-bold leading-[1.02] text-white">
                        {selectedAnnouncement?.title || "Upcoming Food Mob"}
                      </h3>
                      <p className="mt-2 max-w-[15rem] text-base leading-7 text-white/76">
                        {selectedAnnouncement?.body || "The Sunday Food Drop is happening soon. Get your camera ready."}
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

              {friendDailyFeedPosts.length ? <div className="space-y-4">{friendDailyFeedPosts.map(renderFeedCard)}</div> : null}

              {shouldShowSundayDumpFeed ? (
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
              ) : null}

              {shouldShowSundayDumpFeed ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">{communityEyebrow}</p>
                      <h3 className="mt-1 font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">{communityTitle}</h3>
                    </div>
                    <Chip className="bg-[#FFF0D0] text-[#F5A623]">{friendWeeklyDumps.length} dumps</Chip>
                  </div>
                  {friendWeeklyDumps.length ? (
                    friendWeeklyDumps.map(renderFeedCard)
                  ) : (
                    <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
                      <CardBody className="p-5 text-sm text-[#2C1A0E]">{communityEmpty}</CardBody>
                    </Card>
                  )}
                </div>
              ) : null}

              <Card className="overflow-hidden rounded-[30px] border-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.14),_transparent_28%),linear-gradient(135deg,_#2d1a10_0%,_#5a2d14_52%,_#f5a623_100%)] text-white shadow-[0_24px_60px_rgba(90,45,20,0.24)]">
                <CardBody className="gap-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[#ffd88b]">🎯 dare to eat</p>
                      <h3 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-[2rem] leading-[1.02] text-white">
                        {isPreDareWindow ? "dare to eat" : dare.title}
                      </h3>
                      <p className="mt-3 text-sm text-white/78">
                        {isPreDareWindow
                          ? `next dare drops ${dareReleaseText}`
                          : dare.prompt}
                      </p>
                    </div>
                    {isDareLiveWindow ? (
                      dareHydrated ? <Chip className="bg-white text-[#5a2d14]">{dare.acceptedEmails.length} in</Chip> : <div className="h-11 w-20 rounded-full bg-white/20" />
                    ) : (
                      <Chip className="bg-white text-[#5a2d14]">{dare.reminderEmails.length} reminded</Chip>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isPreDareWindow ? (
                      <Button
                        radius="full"
                        className={currentUserDareReminder ? "bg-white text-[#5a2d14]" : "bg-[#F5A623] text-white"}
                        onPress={remindMeForDare}
                      >
                        {currentUserDareReminder ? "reminder set" : "remind me"}
                      </Button>
                    ) : (
                      <Button
                        radius="full"
                        className={currentUserAcceptedDare ? "bg-white text-[#5a2d14]" : "bg-[#F5A623] text-white"}
                        onPress={currentUserAcceptedDare ? openDareProof : acceptDare}
                      >
                        {currentUserAcceptedDare ? "submit proof" : "are you in? 🎯"}
                      </Button>
                    )}
                    {winningDareSubmission ? <Chip className="bg-white/15 text-white">winner announced tuesday</Chip> : null}
                  </div>
                </CardBody>
              </Card>

              {winningDareSubmission ? (
                <Card className="rounded-[30px] border border-[#FFD89A] bg-[#FFF6E5] shadow-[0_18px_50px_rgba(245,166,35,0.14)]">
                  <CardBody className="gap-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#F5A623]">tuesday winner</p>
                        <p className="mt-1 font-[family-name:var(--font-young-serif)] text-[2rem] leading-none text-[#2C1A0E]">
                          {winningDareSubmission.authorName} nailed the dare
                        </p>
                      </div>
                      <Chip className="bg-[#F5A623] text-white">winner</Chip>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={winningDareSubmission.photoUrl}
                      alt={winningDareSubmission.caption || winningDareSubmission.authorName}
                      className="h-64 w-full rounded-[24px] object-cover"
                      loading="lazy"
                    />
                    <p className="text-sm text-[#2C1A0E]">{winningDareSubmission.caption || "this one won the week."}</p>
                    <p className="text-sm text-[#6c7289]">{winningDareSubmission.locationTag} • {dare.reward}</p>
                  </CardBody>
                </Card>
              ) : null}

              <Card className="rounded-[30px] border border-[#f1e8da] bg-white shadow-[0_18px_50px_rgba(44,26,14,0.08)]">
                <CardBody className="gap-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-[family-name:var(--font-young-serif)] text-[2.2rem] leading-none text-[#2C1A0E]">
                        what your friends ate
                      </p>
                      <p className="mt-2 text-base text-[#6c7289]">your friends&apos; real food activity this week. no algorithm, no recommendations engine.</p>
                    </div>
                    <Chip className="bg-[#FFF0D0] text-[#F5A623]">{friendFoodMoments.length} updates</Chip>
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
                    <p className="text-sm text-[#6c7289]">once your friends post or like spots this week, they&apos;ll land here.</p>
                  )}
                </CardBody>
              </Card>

              {shouldShowAdminPosts ? <div className="space-y-4">{adminPosts.map(renderFeedCard)}</div> : null}

              <Card className="overflow-hidden rounded-[30px] border-0 bg-[#eadffd] shadow-[0_18px_50px_rgba(123,79,255,0.16)]">
                <CardBody className="flex-row items-center justify-between gap-4 p-5">
                  <div className="max-w-[14rem]">
                    <p className="font-[family-name:var(--font-young-serif)] text-[2.3rem] leading-none text-[#2C1A0E]">
                      this week in {citySpotlightName}
                    </p>
                    <p className="mt-3 text-lg leading-7 text-[#4f526f]">
                      a live snapshot of what&apos;s happening in the city this week.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Chip className="bg-white text-[#2C1A0E]">most posted: {citySnapshot.mostPostedSpot}</Chip>
                      <Chip className="bg-white text-[#2C1A0E]">most liked: {citySnapshot.mostLikedFood}</Chip>
                    </div>
                    <p className="mt-3 text-sm text-[#4f526f]">
                      hottest neighbourhood: {citySnapshot.hottestNeighbourhood} • hidden gem: {citySnapshot.hiddenGem}
                    </p>
                  </div>
                  <div className="relative h-40 w-32 shrink-0">
                    <div className="absolute right-4 top-0 h-20 w-20 rounded-full bg-[#f05c1c]" />
                    <div className="absolute left-2 top-4 rounded-full bg-[#dfff67] px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2C1A0E]">
                      city
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
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">favorites</p>
                    <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">
                      food map for {currentFavoriteCity}
                    </h2>
                    <p className="text-sm text-[#2C1A0E]">
                      heart the cafes, restaurants, bakeries, and food spots you rate. your friends can spot the overlap.
                    </p>
                  </div>
                  <Chip className="bg-[#FFF0D0] text-[#F5A623]">{favoritePlaceIds.length} liked</Chip>
                </div>

                <FavoritesMap
                  cityName={currentFavoriteCity}
                  center={favoriteCityCenter}
                  places={favoritePlaces}
                  favoriteIds={favoritePlaceIds}
                  mutualFansByPlace={mutualFansByPlace}
                  highlightedPlaceId={highlightedFavoritePlaceId}
                  onToggleFavorite={toggleFavoritePlace}
                  friends={friendAccounts.map((account) => ({
                    email: account.googleProfile?.email ?? account.profile.username,
                    name: account.profile.fullName,
                    username: `@${account.profile.username}`,
                    picture: account.googleProfile?.picture,
                    favoritePlaceIds: account.profile.favoritePlaceIds ?? [],
                  }))}
                />

                {sharedFavoriteMoments.length ? (
                  <div className="grid gap-3">
                    {sharedFavoriteMoments.map(({ place, fans }) => (
                      <div key={place.id} className="rounded-[22px] bg-[#FFF7E8] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex -space-x-2">
                              {fans.slice(0, 2).map((fan) => (
                                <Avatar key={`${place.id}-${fan.email}`} src={fan.picture} name={fan.name} className="h-9 w-9 border-2 border-[#FFF7E8]" />
                              ))}
                            </div>
                            <p className="mt-3 text-base font-semibold text-[#2C1A0E]">
                              {fans.length === 1
                                ? `${fans[0]?.username} added ${place.name} in ${user.profile.city}`
                                : `${fans[0]?.username} and ${fans.length - 1} friends added ${place.name} in ${user.profile.city}`}
                            </p>
                            <p className="mt-1 text-sm text-[#6c7289]">{place.address}</p>
                          </div>
                          <Button
                            radius="full"
                            className="bg-[#F5A623] text-white"
                            onPress={() => setHighlightedFavoritePlaceId(place.id)}
                          >
                            show me
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {favoritePlacesLoading ? <p className="text-sm text-[#2C1A0E]">loading food spots around the city...</p> : null}
                {favoritePlacesError ? <p className="text-sm text-[#2C1A0E]">{favoritePlacesError}</p> : null}
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">liked spots</p>
                    <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">
                      your saved places
                    </h2>
                  </div>
                  <Chip className="bg-[#FFF0D0] text-[#F5A623]">{profileLikedSpots.length}</Chip>
                </div>

                {profileLikedSpots.length ? (
                  <div className="grid gap-3">
                    {profileLikedSpots.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        className="rounded-[22px] bg-[#FFF7E8] p-4 text-left"
                        onClick={() => {
                          setHighlightedFavoritePlaceId(place.id);
                          setFavoritePlaces((current) => {
                            const next = current.filter((item) => item.id !== place.id);
                            return [place, ...next].slice(0, 24);
                          });
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.18em] text-[#B56D19]">{place.kind}</p>
                            <p className="mt-2 text-lg font-semibold text-[#2C1A0E]">{place.name}</p>
                            <p className="mt-1 text-sm text-[#6c7289]">{place.address}</p>
                          </div>
                          <div className="rounded-full bg-[#FFF0D0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5A623]">
                            liked
                          </div>
                        </div>
                      </button>
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
                <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">rewards</p>
                <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">{rewardsTitle}</h2>
                <p className="text-sm text-[#2C1A0E]">share crumbz posts, stay active, and this is where discounts and drops will land.</p>
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-[#fff8ee] shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">dare challenge</p>
                    <p className="font-[family-name:var(--font-young-serif)] text-[2rem] leading-none text-[#2C1A0E]">{dare.title}</p>
                    <p className="mt-2 text-sm text-[#6c7289]">{isPreDareWindow ? `next dare drops ${dareReleaseText}` : dare.prompt}</p>
                  </div>
                  <Chip className="bg-[#FFF0D0] text-[#F5A623]">{dare.submissions.length} proofs</Chip>
                </div>

                {isDareLiveWindow && currentUserAcceptedDare ? (
                  <form className="grid gap-3" onSubmit={submitDareProof}>
                    <Input
                      radius="full"
                      placeholder="location tag"
                      value={dareLocationDraft}
                      onValueChange={setDareLocationDraft}
                      classNames={{ inputWrapper: "bg-white border border-[#FFF0D0]" }}
                    />
                    <Textarea
                      placeholder="one line caption"
                      value={dareCaptionDraft}
                      onValueChange={setDareCaptionDraft}
                      classNames={{ inputWrapper: "bg-white border border-[#FFF0D0] shadow-none" }}
                    />
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif"
                      onChange={(event) => {
                        void handleDareProofFile(event.target.files);
                      }}
                      className="rounded-[18px] border border-[#FFF0D0] bg-white px-3 py-3 text-sm text-[#2C1A0E]"
                    />
                    {dareProofPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={dareProofPhotoUrl} alt="dare proof preview" className="h-40 w-full rounded-[22px] object-cover" loading="lazy" />
                    ) : null}
                    <div className="flex items-center gap-3">
                      <Button radius="full" className="bg-[#F5A623] text-white" type="submit" isDisabled={isUploadingDareProof}>
                        {currentUserDareSubmission ? "update proof" : "submit proof"}
                      </Button>
                      {dareNotice ? <p className="text-sm text-[#6c7289]">{dareNotice}</p> : null}
                    </div>
                  </form>
                ) : (
                  <div className="rounded-[18px] bg-[#FFF0D0] px-4 py-3 text-sm text-[#2C1A0E]">
                    {isPreDareWindow
                      ? "save your reminder in feed. once the dare goes live on wednesday, come back here to submit proof."
                      : currentUserAcceptedDare
                        ? "your proof form unlocks here while the dare is live."
                        : "jump into the dare from feed first, then come back here to upload proof."}
                  </div>
                )}
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
                  <p className="text-sm text-[#2C1A0E]">search by exact username only to add someone to your crumbz circle.</p>
                </div>
                <Input
                  radius="full"
                  placeholder="type exact username"
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
                        send request
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-[#2C1A0E]">no exact username match yet.</p>
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
                        <div className="mt-3 flex gap-2">
                          <Button radius="full" variant="flat" className="bg-white text-[#2C1A0E]" onPress={() => setSelectedProfileEmail(friendEmail)}>
                            view profile
                          </Button>
                          <Button radius="full" variant="flat" className="bg-white text-[#2C1A0E]" onPress={() => removeFriend(friendEmail)}>
                            remove friend
                          </Button>
                        </div>
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
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">profile</p>
                    <p className="font-[family-name:var(--font-young-serif)] text-[2rem] leading-none text-[#2C1A0E]">{user.profile.fullName}</p>
                    <p className="text-sm text-[#2C1A0E]">@{user.profile.username}</p>
                    <p className="text-sm text-[#2C1A0E]">{formatProfileMeta(user.profile.city, user.profile.schoolName)}</p>
                    <p className="text-sm text-[#2C1A0E]">{favoritePlaceIds.length} favorite food spots</p>
                  </div>
                  <Button radius="full" variant="bordered" className="border-[#2C1A0E] text-[#2C1A0E]" onPress={signOut}>
                    log out
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#FFF0D0] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">post</p>
                    <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">
                      make a post
                    </h2>
                    <p className="text-sm text-[#6c7289]">post from your profile. it stays live in your friends&apos; feed for 24 hours.</p>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={submitDailyPost}>
                  <button
                    type="button"
                    aria-label="add post photo"
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
                        <p className="mt-3 text-sm font-medium">add your post photo</p>
                      </div>
                    )}
                  </button>
                  <Textarea
                    placeholder="what did you try?"
                    value={dailyPostCaption}
                    onValueChange={setDailyPostCaption}
                    classNames={{ inputWrapper: "rounded-[18px] bg-[#f8f4ec] shadow-none border border-[#f8f4ec]", input: "text-[#8d99ad]" }}
                  />
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
                    <p className="text-xs uppercase tracking-[0.22em] text-[#2C1A0E]">your feed</p>
                    <h2 className="font-[family-name:var(--font-young-serif)] text-[2rem] text-[#2C1A0E]">
                      your posts
                    </h2>
                  </div>
                  <Chip className="bg-[#FFF0D0] text-[#F5A623]">{currentUserProfilePosts.length}</Chip>
                </div>

                {currentUserProfilePosts.length ? (
                  <div className="grid gap-4">
                    {currentUserProfilePosts.map(renderFeedCard)}
                  </div>
                ) : (
                  <p className="text-sm text-[#6c7289]">post your first photo and it’ll live here as your personal archive.</p>
                )}
              </CardBody>
            </Card>

          </section>
        ) : null}

        <nav
          className="fixed left-1/2 z-[1200] w-[calc(100%-1rem)] max-w-[24.5rem] -translate-x-1/2 rounded-[32px] border border-[#FFF0D0] bg-[#2C1A0E] px-4 py-4 shadow-[0_18px_50px_rgba(44,26,14,0.24)] backdrop-blur"
          style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
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

      <Modal isOpen={Boolean(selectedProfileEmail && selectedProfileAccount)} onOpenChange={(open) => !open && setSelectedProfileEmail(null)} size="full">
        <ModalContent>
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
                <Button radius="full" variant="light" className="text-[#2C1A0E]" onPress={onClose}>
                  close
                </Button>
              </ModalHeader>
              <ModalBody className="bg-[#fffaf2] pb-8 pt-5">
                {selectedProfilePosts.length ? (
                  <div className="space-y-4">
                    {selectedProfilePosts.map(renderFeedCard)}
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
