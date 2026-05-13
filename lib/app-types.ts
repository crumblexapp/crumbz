import type { Language } from "@/lib/i18n";

export type AuthMode = "signup" | "login";
export type AccountRole = "user" | "influencer" | "admin";
export type PostType = "chapter" | "story" | "discount" | "ad" | "collab" | "weekly-dump";
export type MediaKind = "none" | "photo" | "video" | "carousel";
export type VideoRatio = "9:16" | "4:5" | "1:1" | "16:9";
export type CreatorPostFormat = "post" | "carousel" | "reel" | "story";
export type AdminDashboardTab = "overview" | "challengers" | "post" | "community" | "referrals";
export type StudentTab = "feed" | "favorites" | "rewards" | "social" | "profile";
export type InfluencerDashboardTab = "overview" | "content" | "referrals" | "support" | "settings" | "insights";
export type ProfilePostTab = "all" | "friend-review" | "post" | "sunday-dump";

export type AppNavigationState = {
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

export type CrumbzHistoryState = {
  crumbzNav?: AppNavigationState;
};

export type StoryRailItem = {
  id: string;
  postId: string | null;
  label: string;
  detail: string;
  picture: string;
  ring: string;
  badge: string;
};

export type GoogleCredentialResponse = {
  credential?: string;
};

export type GoogleProfile = {
  name: string;
  email: string;
  picture?: string;
};

export type FavoritePlace = {
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

export type FavoriteActivity = {
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

export type StoredUser = {
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
    blockedUserEmails: string[];
    favoritePlaceIds: string[];
    favoriteActivities?: FavoriteActivity[];
    referralCode?: string;
    referredByCode?: string;
    referredByEmail?: string;
    referralCompletedAt?: string | null;
    seenNotificationIds?: string[];
  };
};

export type LocalizedPostContent = {
  title: string;
  body: string;
  cta: string;
};

export type DetectedPostLanguage = Language | "unknown";

export type PostTranslationCacheEntry = LocalizedPostContent & {
  sourceLanguage: string;
  translatedAt: string;
};

export type AppPost = {
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
  cropOffsets?: { x: number; y: number }[];
  mediaTypes?: string[];
};

export type CarouselStagingSlide = {
  file: File;
  previewUrl: string;
  isVideo: boolean;
  cropOffset: { x: number; y: number };
};

export type PostComment = {
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

export type PostShare = {
  id: string;
  authorEmail: string;
  authorName: string;
  platform: string;
  createdAt: string;
};

export type PostLike = {
  authorEmail: string;
  authorName: string;
  createdAt: string;
};

export type PostView = {
  authorEmail: string;
  createdAt: string;
};

export type PostSave = {
  authorEmail: string;
  authorName: string;
  placeId: string;
  createdAt: string;
};

export type AppAnnouncement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  titlePl?: string;
  bodyPl?: string;
};

export type DareSubmission = {
  id: string;
  authorEmail: string;
  authorName: string;
  photoUrl: string;
  locationTag: string;
  caption: string;
  createdAt: string;
};

export type DareState = {
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

export type PostInteraction = {
  comments: PostComment[];
  shares: PostShare[];
  likes: PostLike[];
  views: PostView[];
  saves: PostSave[];
};

export type InteractionsMap = Record<string, PostInteraction>;

export type GoogleAccounts = {
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

export const TASTE_TAG_OPTIONS = [
  { key: "fire", label: "fire" },
  { key: "solid", label: "solid" },
  { key: "skip", label: "skip" },
] as const;

export const PRICE_TAG_OPTIONS = [
  { key: "student-friendly", label: "student friendly" },
  { key: "kinda-pricey", label: "kinda pricey" },
  { key: "special-occasion", label: "special occasion" },
] as const;
