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
const cityCenters: Record<string, [number, number]> = {
  warsaw: [52.2297, 21.0122],
  krakow: [50.0647, 19.945],
  wroclaw: [51.1079, 17.0385],
  gdansk: [54.352, 18.6466],
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

function getFallbackFavoritePlaces(cityName: string) {
  return fallbackFavoritePlacesByCity[cityName.trim().toLowerCase()] ?? [];
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
        className="h-72 w-full rounded-[24px] object-cover ring-1 ring-[#ffead1]"
        width={1200}
        height={1200}
      />
    );
  }

  if (post.mediaKind === "video") {
    return (
      <div className={`${getVideoAspectClass(post.videoRatio)} overflow-hidden rounded-[24px] bg-[#fff8f0] ring-1 ring-[#ffead1]`}>
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
          className="h-64 w-56 shrink-0 rounded-[24px] object-cover ring-1 ring-[#ffead1]"
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
        active ? "border-[#FE8A01] bg-[#FE8A01] text-white" : "border-[#ffe2c2] bg-white text-[#c66b00]"
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
  const [fullName, setFullName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [studentTab, setStudentTab] = useState<"feed" | "favorites" | "rewards" | "social" | "profile">("feed");
  const [friendQuery, setFriendQuery] = useState("");
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>([]);
  const [favoritePlacesLoading, setFavoritePlacesLoading] = useState(false);
  const [favoritePlacesError, setFavoritePlacesError] = useState("");
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
  const authModeRef = useRef<AuthMode>("signup");
  const hasLoadedDataRef = useRef(false);

  const isAdmin = user.googleProfile?.email?.toLowerCase() === ADMIN_EMAIL;
  const needsOnboarding =
    user.signedIn && (!user.profile.fullName || !user.profile.username || !user.profile.city || !user.profile.schoolName);
  const fullNameValue = fullName ?? user.profile.fullName ?? user.googleProfile?.name ?? "";
  const usernameValue = username ?? user.profile.username ?? "";
  const cityValue = city ?? user.profile.city ?? "";
  const schoolNameValue = schoolName ?? user.profile.schoolName ?? "";
  const matchingSchools = schoolsByCity[cityValue.trim().toLowerCase()] ?? [];
  const adminPosts = posts.filter((post) => post.authorRole !== "student");
  const studentWeeklyDumps = posts.filter((post) => post.authorRole === "student" && post.type === "weekly-dump");
  const visibleStudentWeeklyDumps = studentWeeklyDumps.filter((post) => {
    const authorEmail = post.authorEmail.toLowerCase();
    const currentEmail = user.googleProfile?.email?.toLowerCase() ?? "";

    return authorEmail === currentEmail || user.profile.friends.includes(post.authorEmail);
  });
  const displayPosts = adminPosts.length ? adminPosts : fallbackFeedPosts;
  const fallbackStories = [
    {
      id: "story-coming-soon",
      title: "chapter one",
      type: "coming soon",
    },
  ];
  const storyPosts = (
    displayPosts.filter((post) => post.type === "chapter" || post.type === "story" || post.type === "collab").slice(0, 5) || []
  ).length
    ? displayPosts.filter((post) => post.type === "chapter" || post.type === "story" || post.type === "collab").slice(0, 5)
    : fallbackStories;
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
  const cityBreakdown = accounts.reduce<Record<string, number>>((acc, account) => {
    const key = account.profile.city || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const friendableAccounts = accounts.filter((account) => {
    const email = account.googleProfile?.email ?? "";
    const query = friendQuery.trim().toLowerCase();
    if (!query || email === user.googleProfile?.email) return false;
    if (email.toLowerCase() === ADMIN_EMAIL) return false;
    if (user.profile.friends.includes(email)) return false;
    if (user.profile.outgoingFriendRequests.includes(email)) return false;
    if (user.profile.incomingFriendRequests.includes(email)) return false;

    return (
      email.toLowerCase().includes(query) ||
      account.profile.username.toLowerCase().includes(query)
    );
  });
  const favoritePlaceIds = user.profile.favoritePlaceIds ?? [];
  const favoriteCityCenter = cityCenters[user.profile.city.trim().toLowerCase()] ?? [52.2297, 21.0122];
  const friendAccounts = accounts.filter((account) => {
    const email = account.googleProfile?.email ?? "";
    return email.toLowerCase() !== ADMIN_EMAIL && user.profile.friends.includes(email);
  });
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

  const renderFeedCard = (post: AppPost) => {
    const bucket = getInteractionBucket(interactions, post.id);
    const visibleComments = bucket.comments.filter((comment) => !comment.hidden);
    const hasLiked = bucket.likes.some((like) => like.authorEmail === user.googleProfile?.email);
    const isStudentPost = post.authorRole === "student";

    return (
      <Card
        id={`post-${post.id}`}
        key={post.id}
        className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]"
      >
        <CardHeader className="items-start gap-3 px-5 pb-0 pt-5">
          <Avatar
            src={isStudentPost ? accounts.find((account) => account.googleProfile?.email === post.authorEmail)?.googleProfile?.picture : undefined}
            name={isStudentPost ? post.authorName : "C"}
            className={isStudentPost ? "bg-[#fff5e8] text-[#d97706]" : "bg-[#FE8A01] text-white"}
          />
          <div className="flex-1">
            <p className="font-semibold text-[#2b1530]">{isStudentPost ? post.authorName : "crumbz"}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-[#b56d19]">
              {isStudentPost ? `weekly food dump • ${post.createdAt}` : `${post.type} • ${post.createdAt}`}
            </p>
            {isStudentPost ? <p className="mt-1 text-xs text-[#9a6b33]">{post.schoolName}</p> : null}
          </div>
          <Chip className="bg-[#fff5e8] text-[#d97706]">{post.cta}</Chip>
        </CardHeader>
        <CardBody className="gap-4 p-5">
          <div className="rounded-[24px] bg-[linear-gradient(180deg,_#fff8f0_0%,_#ffffff_100%)] p-5 ring-1 ring-[#ffead1]">
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-2xl text-[#2b1530]">{post.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#785c42]">{post.body}</p>
          </div>

          {post.mediaKind !== "none" ? (
            post.mediaUrls.length ? (
              <PostMediaPreview post={post} />
            ) : (
              <div className="rounded-[18px] border border-dashed border-[#ffd9ab] bg-white px-3 py-4 text-sm text-[#8b6338]">
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

          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#b56d19]">
            <span className="rounded-full bg-[#fff5e8] px-3 py-2">{bucket.likes.length} likes</span>
            <span className="rounded-full bg-[#fff5e8] px-3 py-2">{visibleComments.length} comments</span>
            <span className="rounded-full bg-[#fff5e8] px-3 py-2">{bucket.shares.length} shares</span>
          </div>

          <div className="space-y-3">
            {visibleComments.map((comment) => (
              <div key={comment.id} className="rounded-[18px] bg-[#fff8f0] p-3">
                <p className="text-sm font-semibold text-[#2b1530]">
                  {comment.authorName} • {comment.schoolName}
                </p>
                <p className="mt-1 text-sm text-[#785c42]">{comment.text}</p>
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
                  classNames={{ inputWrapper: "bg-[#fff8f0] border border-[#ffe2c2]" }}
                />
                <Button type="submit" radius="full" className="bg-[#FE8A01] text-white">
                  send
                </Button>
              </form>
            ) : null}
          </div>
        </CardBody>
      </Card>
    );
  };

  const syncSharedState = (nextAccounts: StoredUser[], nextPosts = posts, nextInteractions = interactions) => {
    void fetch("/api/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accounts: nextAccounts,
        posts: serializePostsForStorage(nextPosts),
        interactions: nextInteractions,
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
        setUsername(nextUser.profile.username || (nextUser.googleProfile?.email?.toLowerCase() === "joshrejis@gmail.com" ? "josheats" : ""));
        hasLoadedDataRef.current = true;
      });
    });

    void fetch("/api/state")
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.ok) return;

        queueMicrotask(() => {
          setAccounts(payload.accounts ?? nextAccounts);
          setPosts(normalizePosts((payload.posts ?? nextPosts) as Partial<AppPost>[]));
          setInteractions(payload.interactions ?? nextInteractions);
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

    const cityKey = user.profile.city.trim().toLowerCase();
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
      void fetch("/api/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accounts,
          posts: serializePostsForStorage(posts),
          interactions,
        }),
      }).catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [accounts, posts, interactions]);

  useEffect(() => {
    if (!user.signedIn) return;

    const syncFromServer = () => {
      void fetch("/api/state")
        .then((response) => response.json())
        .then((payload) => {
          if (!payload?.ok) return;

          setAccounts(payload.accounts ?? []);
          setPosts(normalizePosts((payload.posts ?? []) as Partial<AppPost>[]));
          setInteractions(payload.interactions ?? {});
        })
        .catch(() => undefined);
    };

    syncFromServer();
    const interval = window.setInterval(syncFromServer, 5000);

    return () => window.clearInterval(interval);
  }, [user.signedIn]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const existingScript = document.querySelector('script[data-google-identity="true"]');

    const setupGoogle = () => {
      if (!window.google?.accounts.id || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: GoogleCredentialResponse) => {
          const profile = response.credential ? parseJwtCredential(response.credential) : null;
          if (!profile) {
            setError("google sign-in didn’t come through. try again.");
            return;
          }

          const currentMode = authModeRef.current;
          const existingAccount =
            readAccounts().find((account) => account.googleProfile?.email === profile.email) ?? null;

          setError("");

          if (currentMode === "login") {
            if (!existingAccount) {
              setError("that google account hasn’t signed up yet. use sign up first.");
              return;
            }

            persistUser({ ...existingAccount, signedIn: true });
            setFullName(null);
            setUsername(null);
            setCity(null);
            setSchoolName(null);
            return;
          }

          if (existingAccount) {
            setError("that google account already exists. use log in instead.");
            return;
          }

          const currentUser = userRef.current;
          persistUser({
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
          });
          setFullName(profile.name);
          setUsername((current) => current ?? (profile.email.toLowerCase() === "joshrejis@gmail.com" ? "josheats" : ""));
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

    if (!trimmedName || !trimmedUsername || !trimmedCity || !trimmedSchool) {
      setError("drop your full name, username, city, and school so we can finish your profile.");
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
        schoolName: trimmedSchool,
        friends: user.profile.friends,
        incomingFriendRequests: user.profile.incomingFriendRequests,
        outgoingFriendRequests: user.profile.outgoingFriendRequests,
        favoritePlaceIds: user.profile.favoritePlaceIds,
      },
    };

    const nextAccounts = [
      ...accounts.filter((account) => account.googleProfile?.email !== nextUser.googleProfile?.email),
      nextUser,
    ];

    setAccounts(nextAccounts);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
    }
    persistUser(nextUser);
    syncSharedState(nextAccounts);
    setError("");
  };

  const signOut = () => {
    persistUser(defaultUser);
    setFullName(null);
    setUsername(null);
    setCity(null);
    setSchoolName(null);
    setError("");
    setAuthMode("signup");
    setShowWelcomeScreen(true);
  };

  const addFriend = (friendEmail: string) => {
    if (!friendEmail || friendEmail === user.googleProfile?.email) return;
    if (user.profile.friends.includes(friendEmail) || user.profile.outgoingFriendRequests.includes(friendEmail)) return;

    const nextAccounts = accounts.map((account) => {
      if (account.googleProfile?.email === user.googleProfile?.email) {
        return {
          ...account,
          profile: {
            ...account.profile,
            outgoingFriendRequests: [...new Set([...account.profile.outgoingFriendRequests, friendEmail])],
          },
        };
      }

      if (account.googleProfile?.email === friendEmail) {
        const requesterEmail = user.googleProfile?.email ?? "";
        return {
          ...account,
          profile: {
            ...account.profile,
            incomingFriendRequests: [...new Set([...account.profile.incomingFriendRequests, requesterEmail])],
          },
        };
      }

      return account;
    });

    const nextUser = nextAccounts.find((account) => account.googleProfile?.email === user.googleProfile?.email) ?? user;

    setAccounts(nextAccounts);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
    }
    persistUser(nextUser);
    syncSharedState(nextAccounts);
    setFriendQuery("");
  };

  const acceptFriendRequest = (requesterEmail: string) => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail) return;

    const nextAccounts = accounts.map((account) => {
      if (account.googleProfile?.email === currentEmail) {
        return {
          ...account,
          profile: {
            ...account.profile,
            friends: [...new Set([...account.profile.friends, requesterEmail])],
            incomingFriendRequests: account.profile.incomingFriendRequests.filter((email) => email !== requesterEmail),
          },
        };
      }

      if (account.googleProfile?.email === requesterEmail) {
        return {
          ...account,
          profile: {
            ...account.profile,
            friends: [...new Set([...account.profile.friends, currentEmail])],
            outgoingFriendRequests: account.profile.outgoingFriendRequests.filter((email) => email !== currentEmail),
          },
        };
      }

      return account;
    });

    const nextUser = nextAccounts.find((account) => account.googleProfile?.email === currentEmail) ?? user;
    setAccounts(nextAccounts);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
    }
    persistUser(nextUser);
    syncSharedState(nextAccounts);
  };

  const declineFriendRequest = (requesterEmail: string) => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail) return;

    const nextAccounts = accounts.map((account) => {
      if (account.googleProfile?.email === currentEmail) {
        return {
          ...account,
          profile: {
            ...account.profile,
            incomingFriendRequests: account.profile.incomingFriendRequests.filter((email) => email !== requesterEmail),
          },
        };
      }

      if (account.googleProfile?.email === requesterEmail) {
        return {
          ...account,
          profile: {
            ...account.profile,
            outgoingFriendRequests: account.profile.outgoingFriendRequests.filter((email) => email !== currentEmail),
          },
        };
      }

      return account;
    });

    const nextUser = nextAccounts.find((account) => account.googleProfile?.email === currentEmail) ?? user;
    setAccounts(nextAccounts);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
    }
    persistUser(nextUser);
    syncSharedState(nextAccounts);
  };

  const removeFriend = (friendEmail: string) => {
    const currentEmail = user.googleProfile?.email;
    if (!currentEmail) return;

    const nextAccounts = accounts.map((account) => {
      if (account.googleProfile?.email === currentEmail) {
        return {
          ...account,
          profile: {
            ...account.profile,
            friends: account.profile.friends.filter((email) => email !== friendEmail),
          },
        };
      }

      if (account.googleProfile?.email === friendEmail) {
        return {
          ...account,
          profile: {
            ...account.profile,
            friends: account.profile.friends.filter((email) => email !== currentEmail),
          },
        };
      }

      return account;
    });

    const nextUser = nextAccounts.find((account) => account.googleProfile?.email === currentEmail) ?? user;
    setAccounts(nextAccounts);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
    }
    persistUser(nextUser);
    syncSharedState(nextAccounts);
  };

  const toggleFavoritePlace = (placeId: string) => {
    const nextFavoritePlaceIds = favoritePlaceIds.includes(placeId)
      ? favoritePlaceIds.filter((id) => id !== placeId)
      : [...favoritePlaceIds, placeId];

    const nextUser = {
      ...user,
      profile: {
        ...user.profile,
        favoritePlaceIds: nextFavoritePlaceIds,
      },
    };

    const nextAccounts = accounts.map((account) =>
      account.googleProfile?.email === user.googleProfile?.email ? nextUser : account,
    );

    setAccounts(nextAccounts);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
    }
    persistUser(nextUser);
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
      body: caption || `${user.profile.city} • ${user.profile.schoolName}`,
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
        <main className="min-h-screen bg-white text-[#2b1530]">
          <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between bg-[linear-gradient(180deg,_#fff4df_0%,_#ffffff_28%,_#fff7ef_100%)] px-5 pb-8 pt-6 font-[family-name:var(--font-manrope)]">
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden rounded-[36px] border border-[#ffd29a] bg-white shadow-[0_28px_80px_rgba(254,138,1,0.24)]"
            >
              <Image
                src="/brand/crumbz-onboarding.png"
                alt="crumbz onboarding"
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
              className="mt-6 rounded-[32px] border border-[#ffe0bf] bg-white p-6 shadow-[0_22px_60px_rgba(254,138,1,0.14)]"
            >
              <p className="text-xs uppercase tracking-[0.28em] text-[#c66b00]">welcome</p>
              <h1 className="mt-3 font-[family-name:var(--font-bricolage)] text-5xl leading-none text-[#2b1530]">
                welcome to the feed that makes you hungry
              </h1>
              <p className="mt-4 text-sm leading-6 text-[#785c42]">
                crumbz is the student food world where the team drops the story live and your friends post one weekly food dump every sunday.
              </p>
              <Button
                radius="full"
                size="lg"
                className="mt-6 w-full bg-[#FE8A01] text-white"
                onPress={() => setShowWelcomeScreen(false)}
              >
                continue
              </Button>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.16 }}
              className="mt-5 grid grid-cols-3 gap-3"
            >
              {["stories first", "sunday dumps", "friends only"].map((item) => (
                <div key={item} className="rounded-[24px] border border-[#ffe4c4] bg-white px-3 py-4 text-center">
                  <div className="mx-auto h-14 w-14 rounded-full bg-[linear-gradient(135deg,_#FE8A01,_#ffd09a)] p-[3px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[#d97706]">
                      live
                    </div>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#b56d19]">{item}</p>
                </div>
              ))}
            </motion.section>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-white text-[#2b1530]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between bg-[radial-gradient(circle_at_top,_rgba(254,138,1,0.22),_transparent_40%),linear-gradient(180deg,_#ffffff_0%,_#fff8f0_55%,_#ffffff_100%)] px-5 pb-8 pt-6 font-[family-name:var(--font-manrope)]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[32px] bg-[#FE8A01] p-6 text-white shadow-[0_26px_70px_rgba(254,138,1,0.24)]"
          >
            <Chip className="bg-white/20 text-white">crumbz</Chip>
            <div className="mt-4 rounded-[24px] bg-[#FE8A01] p-2">
              <Image
                src="/brand/crumbz-logo.png"
                alt="crumbz logo"
                width={1600}
                height={1600}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-white/88">
              the food brand app where the crumble team posts chapters, stories, deals, and collabs live.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="mt-5"
          >
            <Card className="rounded-[30px] border border-[#ffe0bf] bg-white shadow-[0_22px_60px_rgba(254,138,1,0.14)]">
              <CardBody className="gap-5 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#c66b00]">start here</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      radius="full"
                      className={authMode === "signup" ? "bg-[#FE8A01] text-white" : "bg-[#fff5e8] text-[#c66b00]"}
                      onPress={() => {
                        setAuthMode("signup");
                        setError("");
                      }}
                    >
                      sign up with google
                    </Button>
                    <Button
                      radius="full"
                      className={authMode === "login" ? "bg-[#FE8A01] text-white" : "bg-[#fff5e8] text-[#c66b00]"}
                      onPress={() => {
                        setAuthMode("login");
                        setError("");
                      }}
                    >
                      log in with google
                    </Button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#785c42]">
                    {authMode === "signup"
                      ? "new people sign up first, then fill in name, city, and school."
                      : "returning people log in and land on the homepage straight away."}
                  </p>
                </div>

                {GOOGLE_CLIENT_ID ? (
                  <div className="flex justify-center">
                    <div ref={googleButtonRef} className="min-h-11" />
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#ffd3a1] bg-[#fff8f0] p-4 text-sm leading-6 text-[#8b6338]">
                    add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and the real google button will appear here.
                  </div>
                )}

                {GOOGLE_CLIENT_ID && !googleReady ? (
                  <p className="text-center text-sm text-[#b56d19]">loading google sign-in…</p>
                ) : null}

                {error ? <p className="text-sm text-[#b45309]">{error}</p> : null}
              </CardBody>
            </Card>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.16 }}
            className="mt-5 grid grid-cols-3 gap-3"
          >
            {["stories", "deals", "campus"].map((item) => (
              <div key={item} className="rounded-[24px] border border-[#ffe4c4] bg-white px-3 py-4 text-center">
                <div className="mx-auto h-14 w-14 rounded-full bg-[linear-gradient(135deg,_#FE8A01,_#ffd09a)] p-[3px]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-semibold text-[#d97706]">
                    live
                  </div>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#b56d19]">{item}</p>
              </div>
            ))}
          </motion.section>
        </div>
      </main>
    );
  }

  if (needsOnboarding) {
    return (
      <main className="min-h-screen bg-white text-[#2b1530]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[radial-gradient(circle_at_top,_rgba(254,138,1,0.18),_transparent_42%),linear-gradient(180deg,_#ffffff_0%,_#fff8f0_100%)] px-5 py-6 font-[family-name:var(--font-manrope)]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[32px] bg-white p-6 shadow-[0_22px_60px_rgba(254,138,1,0.16)] ring-1 ring-[#ffe2c2]"
          >
            <div className="flex items-center gap-4">
              <Avatar
                src={user.googleProfile?.picture}
                name={user.googleProfile?.name ?? "C"}
                className="h-16 w-16 bg-[#FE8A01] text-white"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#c66b00]">one more step</p>
                <h1 className="mt-1 font-[family-name:var(--font-space-grotesk)] text-3xl">
                  finish your profile
                </h1>
                <p className="mt-1 text-sm text-[#785c42]">{user.googleProfile?.email}</p>
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
                classNames={{ inputWrapper: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]" }}
              />
              <Input
                label="username"
                labelPlacement="outside"
                placeholder="josheats"
                radius="lg"
                value={usernameValue}
                onValueChange={setUsername}
                classNames={{ inputWrapper: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]" }}
              />
              <Input
                label="city"
                labelPlacement="outside"
                placeholder="warsaw"
                radius="lg"
                value={cityValue}
                onValueChange={(value) => {
                  setCity(value);
                  setSchoolName(null);
                }}
                classNames={{ inputWrapper: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]" }}
              />
              <Select
                label="university or school"
                labelPlacement="outside"
                placeholder={matchingSchools.length ? "pick your school" : "enter a supported city first"}
                radius="lg"
                selectedKeys={schoolNameValue ? [schoolNameValue] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0];
                  setSchoolName(typeof selected === "string" ? selected : "");
                }}
                isDisabled={!matchingSchools.length}
                classNames={{
                  trigger: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]",
                  value: "text-[#2b1530]",
                }}
              >
                {matchingSchools.map((school) => (
                  <SelectItem key={school}>{school}</SelectItem>
                ))}
              </Select>
              {cityValue && !matchingSchools.length ? (
                <p className="text-sm text-[#8b6338]">
                  school lists are ready for warsaw, krakow, wroclaw, and gdansk right now.
                </p>
              ) : null}
              {error ? <p className="text-sm text-[#b45309]">{error}</p> : null}
              <Button type="submit" radius="full" size="lg" className="bg-[#FE8A01] font-semibold text-white">
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
      <main className="min-h-screen bg-white text-[#2b1530]">
        <div className="mx-auto min-h-screen w-full max-w-md bg-[radial-gradient(circle_at_top,_rgba(254,138,1,0.18),_transparent_34%),linear-gradient(180deg,_#ffffff_0%,_#fff8f0_100%)] px-4 pb-24 pt-5 font-[family-name:var(--font-manrope)]">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[30px] bg-[#FE8A01] p-5 text-white shadow-[0_22px_60px_rgba(254,138,1,0.22)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/80">crumbz admin</p>
                <h1 className="mt-2 font-[family-name:var(--font-bricolage)] text-4xl leading-none">
                  control room
                </h1>
                <p className="mt-2 text-sm text-white/88">{user.googleProfile?.email}</p>
              </div>
              <Button radius="full" className="bg-white text-[#c66b00]" onPress={signOut}>
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
                cursor: "rounded-full bg-[#FE8A01]",
                tab: "h-11 text-sm font-medium text-[#8b6338]",
                tabContent: "group-data-[selected=true]:text-white",
              }}
            >
              <Tab key="overview" title="overview">
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "signed in", value: accounts.length },
                      { label: "posts live", value: posts.length },
                      { label: "likes", value: totalLikes },
                      { label: "comments", value: totalComments },
                      { label: "shares", value: totalShares },
                    ].map((item) => (
                      <Card key={item.label} className="rounded-[24px] border border-[#ffe4c4] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                        <CardBody className="gap-1 p-4">
                          <p className="text-2xl font-semibold text-[#2b1530]">{item.value}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-[#b56d19]">{item.label}</p>
                        </CardBody>
                      </Card>
                    ))}
                  </div>

                  <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">audience analytics</p>
                      <div className="flex flex-wrap gap-2">
                        <Chip className="bg-[#fff5e8] text-[#d97706]">{uniqueCommenters} unique commenters</Chip>
                        <Chip className="bg-[#fff5e8] text-[#d97706]">{uniqueSharers} unique sharers</Chip>
                      </div>
                      <div className="grid gap-2">
                        {Object.entries(cityBreakdown).map(([cityName, count]) => (
                          <div key={cityName} className="flex items-center justify-between rounded-[18px] bg-[#fff8f0] px-3 py-3 text-sm">
                            <span className="text-[#785c42]">{cityName}</span>
                            <span className="font-semibold text-[#2b1530]">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">recent activity</p>
                      {recentActivity.length ? (
                        recentActivity.map((item, index) => (
                          <div key={`${item.kind}-${item.postId}-${item.createdAt}-${index}`} className="rounded-[18px] bg-[#fff8f0] px-3 py-3">
                            <p className="text-sm font-semibold text-[#2b1530]">{item.label}</p>
                            <p className="mt-1 text-sm text-[#785c42]">{item.detail}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#b56d19]">{item.createdAt}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[#785c42]">no student activity yet.</p>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </Tab>

              <Tab key="post" title="post">
                <div className="mt-4 space-y-4">
                  <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="p-5">
                      <form className="grid gap-4" onSubmit={createPost}>
                      {editingPostId ? (
                        <div className="flex items-center justify-between rounded-[20px] bg-[#fff8f0] px-4 py-3 text-sm">
                          <span className="text-[#785c42]">editing an existing post</span>
                          <Button type="button" radius="full" variant="light" className="text-[#c66b00]" onPress={cancelEditingPost}>
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
                          trigger: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]",
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
                          trigger: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]",
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
                            trigger: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]",
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
                        classNames={{ inputWrapper: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]" }}
                      />
                      <Textarea
                        label="body"
                        labelPlacement="outside"
                        placeholder="tell students what’s happening"
                        value={composer.body}
                        onValueChange={(value) => setComposer((current) => ({ ...current, body: value }))}
                        classNames={{ inputWrapper: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]" }}
                      />
                      <Input
                        label="cta label"
                        labelPlacement="outside"
                        placeholder="student offer live"
                        value={composer.cta}
                        onValueChange={(value) => setComposer((current) => ({ ...current, cta: value }))}
                        classNames={{ inputWrapper: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]" }}
                      />
                      {composer.mediaKind !== "none" ? (
                        <div className="grid gap-3">
                          <label className="text-sm font-medium text-[#2b1530]">
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
                            className="rounded-[18px] border border-[#ffe2c2] bg-[#fff8f0] px-3 py-3 text-sm text-[#785c42]"
                          />
                          {composer.mediaUrls.length ? (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                radius="full"
                                className="bg-white text-[#c66b00]"
                                onPress={() => setComposer((current) => ({ ...current, mediaUrls: [] }))}
                              >
                                remove media
                              </Button>
                              <p className="self-center text-xs uppercase tracking-[0.18em] text-[#b56d19]">
                                pick a new file to replace it
                              </p>
                            </div>
                          ) : null}
                          {composer.mediaUrls.length ? (
                            <div className="rounded-[20px] bg-[#fff8f0] p-3">
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
                      {storageNotice ? <p className="text-sm text-[#b45309]">{storageNotice}</p> : null}
                      <Button
                        type="submit"
                        radius="full"
                        size="lg"
                        isDisabled={isUploadingMedia}
                        className="bg-[#FE8A01] text-white disabled:opacity-60"
                      >
                        {isUploadingMedia ? "uploading media..." : editingPostId ? "save changes" : "publish post"}
                      </Button>
                      </form>
                    </CardBody>
                  </Card>

                  <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                    <CardBody className="gap-3 p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">all posts</p>
                        <Chip className="bg-[#fff5e8] text-[#d97706]">{posts.length} total</Chip>
                      </div>
                      {posts.length ? (
                        posts.map((post) => (
                          <div key={post.id} className="rounded-[22px] bg-[#fff8f0] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#2b1530]">{post.title}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#b56d19]">
                                  {post.type} • {post.createdAt}
                                </p>
                              </div>
                              <Chip className="bg-white text-[#c66b00]">{post.mediaKind}</Chip>
                            </div>
                            <p className="mt-2 text-sm text-[#785c42]">{post.body}</p>
                            {post.mediaKind !== "none" ? (
                              <div className="mt-3">
                                {post.mediaUrls.length ? (
                                  <PostMediaPreview post={post} />
                                ) : (
                                  <div className="rounded-[18px] border border-dashed border-[#ffd9ab] bg-white px-3 py-4 text-sm text-[#8b6338]">
                                    media is missing on this saved post. open edit and upload it again once.
                                  </div>
                                )}
                              </div>
                            ) : null}
                            <div className="mt-3 flex gap-2">
                              <Button type="button" radius="full" className="bg-white text-[#c66b00]" onPress={() => startEditingPost(post)}>
                                edit
                              </Button>
                              <Button type="button" radius="full" color="danger" variant="flat" onPress={() => deletePost(post.id)}>
                                delete
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[#785c42]">no posts yet.</p>
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
                      <Card key={post.id} className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_14px_40px_rgba(254,138,1,0.08)]">
                        <CardHeader className="flex items-start justify-between gap-3 px-5 pb-0 pt-5">
                          <div>
                            <p className="font-semibold text-[#2b1530]">{post.title}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#b56d19]">
                              {post.type} • {post.createdAt}
                            </p>
                          </div>
                          <Chip className="bg-[#fff5e8] text-[#d97706]">{bucket.comments.length} comments</Chip>
                        </CardHeader>
                        <CardBody className="gap-3 p-5">
                          <p className="text-sm text-[#785c42]">{post.body}</p>
                          <div className="flex flex-wrap gap-2">
                            <Chip className="bg-[#fff5e8] text-[#d97706]">{bucket.likes.length} likes</Chip>
                            <Chip className="bg-[#fff5e8] text-[#d97706]">{bucket.shares.length} shares</Chip>
                            <Chip className="bg-[#fff5e8] text-[#d97706]">{post.cta}</Chip>
                          </div>
                          {bucket.comments.length ? (
                            bucket.comments.map((comment) => (
                              <div key={comment.id} className="rounded-[18px] bg-[#fff8f0] px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[#2b1530]">
                                      {comment.authorName} • {comment.schoolName}
                                    </p>
                                    <p className="mt-1 text-sm text-[#785c42]">{comment.text}</p>
                                    {comment.hidden ? (
                                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#b56d19]">hidden from students</p>
                                    ) : null}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      radius="full"
                                      className="bg-white text-[#c66b00]"
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
                            <p className="text-sm text-[#785c42]">no comments yet.</p>
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
    <main className="min-h-screen bg-white text-[#2b1530]">
      <div className="mx-auto min-h-screen w-full max-w-md bg-[radial-gradient(circle_at_top,_rgba(254,138,1,0.18),_transparent_34%),linear-gradient(180deg,_#ffffff_0%,_#fff8f0_100%)] px-4 pb-24 pt-5 font-[family-name:var(--font-manrope)]">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#c66b00]">crumbz</p>
            <h1 className="mt-2 font-[family-name:var(--font-bricolage)] text-4xl leading-none text-[#2b1530]">
              hey, {user.profile.fullName.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm text-[#785c42]">
              {user.profile.city} • {user.profile.schoolName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="light" radius="full" className="text-[#c66b00]" onPress={signOut}>
              log out
            </Button>
            <Badge color="warning" content={posts.length} shape="circle">
              <Avatar
                src={user.googleProfile?.picture}
                name={user.profile.fullName}
                className="h-12 w-12 border-2 border-[#FE8A01] bg-[#fff5e8] text-[#d97706]"
              />
            </Badge>
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
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl">stories</h2>
                <Chip className="bg-[#fff5e8] text-[#d97706]">live</Chip>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2">
                {storyPosts.map((story) => (
                  <div key={story.id} className="min-w-[82px] text-center">
                    <div className="mx-auto rounded-full bg-[linear-gradient(135deg,_#FE8A01,_#ffd29f)] p-[3px] shadow-[0_10px_30px_rgba(254,138,1,0.22)]">
                      <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white px-3 text-center">
                        <span className="text-xs font-semibold leading-4 text-[#c66b00]">{story.title}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-[#9a6b33]">{story.type}</p>
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
              <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
                <CardBody className="gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">weekly dump</p>
                      <h3 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-2xl text-[#2b1530]">
                        sunday weekly food dump
                      </h3>
                      <p className="mt-2 text-sm text-[#785c42]">
                        one sunday post only. add up to 7 food photos, and only your friends will see it in their feed.
                      </p>
                    </div>
                    <Chip className="bg-[#fff5e8] text-[#d97706]">1 per sunday</Chip>
                  </div>

                  <form className="space-y-4" onSubmit={submitWeeklyDump}>
                    <Textarea
                      label="caption"
                      labelPlacement="outside"
                      placeholder="what hit this week?"
                      value={weeklyDumpCaption}
                      onValueChange={setWeeklyDumpCaption}
                      classNames={{ inputWrapper: "bg-[#fff8f0] shadow-none border border-[#ffe2c2]" }}
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
                      className="rounded-[18px] border border-[#ffe2c2] bg-[#fff8f0] px-3 py-3 text-sm text-[#785c42] disabled:opacity-50"
                    />
                    {weeklyDumpMediaUrls.length ? (
                      <div className="rounded-[20px] bg-[#fff8f0] p-3">
                        <PostMediaPreview
                          post={{
                            id: "weekly-dump-preview",
                            title: `${user.profile.fullName.split(" ")[0] || "your"}'s weekly food dump`,
                            body: weeklyDumpCaption || `${user.profile.city} • ${user.profile.schoolName}`,
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
                    {weeklyDumpNotice ? <p className="text-sm text-[#b45309]">{weeklyDumpNotice}</p> : null}
                    <Button
                      type="submit"
                      radius="full"
                      size="lg"
                      isDisabled={!canSubmitWeeklyDumpToday || hasSubmittedWeeklyDumpThisWeek || isUploadingWeeklyDump}
                      className="bg-[#FE8A01] text-white disabled:opacity-60"
                    >
                      {isUploadingWeeklyDump
                        ? "uploading your dump..."
                        : hasSubmittedWeeklyDumpThisWeek
                          ? "already posted this sunday"
                          : canSubmitWeeklyDumpToday
                            ? "submit weekly food dump"
                            : "drops open on sunday"}
                    </Button>
                  </form>
                </CardBody>
              </Card>

              <div className="space-y-4">
                {displayPosts.map(renderFeedCard)}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">student dumps</p>
                    <h3 className="mt-1 font-[family-name:var(--font-space-grotesk)] text-2xl text-[#2b1530]">
                      weekly food spots from the community
                    </h3>
                  </div>
                  <Chip className="bg-[#fff5e8] text-[#d97706]">{visibleStudentWeeklyDumps.length} dumps</Chip>
                </div>
                {visibleStudentWeeklyDumps.length ? (
                  visibleStudentWeeklyDumps.map(renderFeedCard)
                ) : (
                  <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
                    <CardBody className="p-5 text-sm text-[#785c42]">
                      no friend food dumps yet. your own sunday post and your friends' dumps will land here.
                    </CardBody>
                  </Card>
                )}
              </div>
            </motion.section>
          </>
        ) : null}

        {studentTab === "favorites" ? (
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">favorites</p>
                    <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl text-[#2b1530]">
                      food map for {user.profile.city}
                    </h2>
                    <p className="text-sm text-[#785c42]">
                      heart the cafes, restaurants, bakeries, and food spots you rate. your friends can spot the overlap.
                    </p>
                  </div>
                  <Chip className="bg-[#fff5e8] text-[#d97706]">{favoritePlaceIds.length} liked</Chip>
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

                {favoritePlacesLoading ? <p className="text-sm text-[#8b6338]">loading food spots around the city...</p> : null}
                {favoritePlacesError ? <p className="text-sm text-[#8b6338]">{favoritePlacesError}</p> : null}
              </CardBody>
            </Card>
          </section>
        ) : null}

        {studentTab === "rewards" ? (
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">rewards</p>
                <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl text-[#2b1530]">student perks loading</h2>
                <p className="text-sm text-[#785c42]">share crumbz posts, stay active, and this is where discounts and drops will land.</p>
              </CardBody>
            </Card>
          </section>
        ) : null}

        {studentTab === "social" ? (
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">friend requests</p>
                {user.profile.incomingFriendRequests.length ? (
                  user.profile.incomingFriendRequests.map((requestEmail) => {
                    const requester = accounts.find((account) => account.googleProfile?.email === requestEmail);
                    if (!requester || requestEmail.toLowerCase() === ADMIN_EMAIL) return null;

                    return (
                      <div key={requestEmail} className="rounded-[18px] bg-[#fff8f0] px-3 py-3">
                        <p className="text-sm font-semibold text-[#2b1530]">{requester.profile.fullName}</p>
                        <p className="text-sm text-[#785c42]">@{requester.profile.username} • {requester.profile.schoolName}</p>
                        <div className="mt-3 flex gap-2">
                          <Button radius="full" className="bg-[#FE8A01] text-white" onPress={() => acceptFriendRequest(requestEmail)}>
                            accept
                          </Button>
                          <Button radius="full" variant="flat" className="bg-white text-[#c66b00]" onPress={() => declineFriendRequest(requestEmail)}>
                            decline
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#785c42]">no requests waiting right now.</p>
                )}
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-4 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">social</p>
                  <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl text-[#2b1530]">add your friends</h2>
                  <p className="text-sm text-[#785c42]">search by email or username and add them to your crumbz circle.</p>
                </div>
                <Input
                  radius="full"
                  placeholder="search email or username"
                  value={friendQuery}
                  onValueChange={setFriendQuery}
                  classNames={{ inputWrapper: "bg-[#fff8f0] border border-[#ffe2c2]" }}
                />
                {friendQuery ? (
                  friendableAccounts.length ? (
                    friendableAccounts.map((account) => (
                      <div key={account.googleProfile?.email} className="flex items-center justify-between rounded-[18px] bg-[#fff8f0] px-3 py-3">
                        <div>
                          <p className="text-sm font-semibold text-[#2b1530]">{account.profile.fullName}</p>
                          <p className="text-sm text-[#785c42]">@{account.profile.username} • {account.googleProfile?.email}</p>
                        </div>
                        <Button radius="full" className="bg-[#FE8A01] text-white" onPress={() => addFriend(account.googleProfile?.email ?? "")}>
                          send request
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#785c42]">no matching account yet.</p>
                  )
                ) : null}

                {user.profile.outgoingFriendRequests.length ? (
                  <div className="rounded-[18px] bg-[#fff8f0] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#b56d19]">pending</p>
                    <p className="mt-1 text-sm text-[#785c42]">
                      waiting on {user.profile.outgoingFriendRequests.length} friend request{user.profile.outgoingFriendRequests.length === 1 ? "" : "s"}.
                    </p>
                  </div>
                ) : null}
              </CardBody>
            </Card>

            <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">your people</p>
                {user.profile.friends.length ? (
                  user.profile.friends.map((friendEmail) => {
                    const friend = accounts.find((account) => account.googleProfile?.email === friendEmail);
                    if (!friend || friendEmail.toLowerCase() === ADMIN_EMAIL) return null;

                    return (
                      <div key={friendEmail} className="rounded-[18px] bg-[#fff8f0] px-3 py-3">
                        <p className="text-sm font-semibold text-[#2b1530]">{friend.profile.fullName}</p>
                        <p className="text-sm text-[#785c42]">@{friend.profile.username} • {friend.profile.schoolName}</p>
                        <Button radius="full" variant="flat" className="mt-3 bg-white text-[#c66b00]" onPress={() => removeFriend(friendEmail)}>
                          remove friend
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#785c42]">no friends added yet.</p>
                )}
              </CardBody>
            </Card>
          </section>
        ) : null}

        {studentTab === "profile" ? (
          <section className="mt-6 space-y-4">
            <Card className="rounded-[28px] border border-[#ffe4c4] bg-white shadow-[0_18px_50px_rgba(254,138,1,0.1)]">
              <CardBody className="gap-3 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#b56d19]">profile</p>
                <p className="text-2xl font-semibold text-[#2b1530]">{user.profile.fullName}</p>
                <p className="text-sm text-[#785c42]">@{user.profile.username}</p>
                <p className="text-sm text-[#785c42]">{user.profile.city} • {user.profile.schoolName}</p>
                <p className="text-sm text-[#785c42]">{favoritePlaceIds.length} favorite food spots</p>
              </CardBody>
            </Card>
          </section>
        ) : null}

        <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 rounded-t-[28px] border border-[#ffe4c4] bg-white/96 px-4 py-4 shadow-[0_-12px_40px_rgba(254,138,1,0.12)] backdrop-blur">
          <div className="grid grid-cols-5 gap-1 text-center">
            {[
              { label: "Feed", symbol: "⌂", key: "feed" },
              { label: "Favorites", symbol: "♥", key: "favorites" },
              { label: "Rewards", symbol: "🎟", key: "rewards" },
              { label: "Social", symbol: "👥", key: "social" },
              { label: "Profile", symbol: "◔", key: "profile" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex min-w-0 flex-col items-center gap-1"
                onClick={() => setStudentTab(item.key as "feed" | "favorites" | "rewards" | "social" | "profile")}
              >
                <span className={`text-[24px] leading-none ${studentTab === item.key ? "text-[#FE8A01]" : "text-[#a5b2c9]"}`}>{item.symbol}</span>
                <span className={`text-[11px] font-medium leading-none ${studentTab === item.key ? "text-[#FE8A01]" : "text-[#a5b2c9]"}`}>
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
