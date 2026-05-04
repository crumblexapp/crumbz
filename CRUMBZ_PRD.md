# Crumbz — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** May 2026  
**Company:** Crumble App Co.  
**Contact:** crumbleappco@gmail.com  
**Primary Domain:** app.crumbz.pl  
**Tagline:** *the feed that keeps you hungry.*

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Target Audience](#2-target-audience)
3. [User Roles](#3-user-roles)
4. [Core Features](#4-core-features)
5. [Navigation Architecture](#5-navigation-architecture)
6. [Authentication & Onboarding](#6-authentication--onboarding)
7. [Feed](#7-feed)
8. [Map & Food Discovery](#8-map--food-discovery)
9. [Social Graph](#9-social-graph)
10. [Notifications](#10-notifications)
11. [Profile](#11-profile)
12. [Rewards](#12-rewards)
13. [Dare / Challenge System](#13-dare--challenge-system)
14. [Creator (Influencer) Features](#14-creator-influencer-features)
15. [Admin Features](#15-admin-features)
16. [Referral System](#16-referral-system)
17. [Content & Media](#17-content--media)
18. [Localization](#18-localization)
19. [Rate Limiting & Safety](#19-rate-limiting--safety)
20. [Technical Infrastructure](#20-technical-infrastructure)
21. [Mobile App (Capacitor)](#21-mobile-app-capacitor)
22. [Data Architecture](#22-data-architecture)
23. [Security](#23-security)
24. [Supported Cities](#24-supported-cities)
25. [What Is Not Built Yet](#25-what-is-not-built-yet)

---

## 1. Product Vision

Crumbz is a food-first social platform for university students in Poland. It combines:

- An **Instagram-style content feed** where students and creators post food content
- A **Google Maps-powered food discovery layer** where users find and save restaurants, cafes, bakeries, and bars
- A **social friend graph** where shared food preferences are surfaced between people who know each other

The core product loop: **discover a food spot on the map → see what friends saved → post content about it → earn social credibility and rewards.**

Crumbz is not a review platform like Yelp. It is a taste-graph social app where trust comes from real people you know, not anonymous strangers.

---

## 2. Target Audience

**Primary users:** University students in Polish cities aged 18–26  
**Secondary users:** Food content creators (influencers) posting city-specific food content  
**Operator:** Admin account (`crumbleappco@gmail.com` / `@crumbz.pl`)

**Geographic focus:** 14 Polish cities at launch  
**Language:** English and Polish (bilingual throughout)

---

## 3. User Roles

| Role | How assigned | Capabilities |
|---|---|---|
| `user` | Default on signup | Full student experience: feed, map, social, profile, post creation |
| `influencer` | Manually assigned by admin | All user capabilities + creator dashboard, larger upload limits, post format controls |
| `admin` | Hardcoded to `crumbleappco@gmail.com` | Full platform control: post anything, delete anyone, manage announcements, dare system, push to all users |

Role is determined server-side on every authenticated request. Users cannot self-elevate.

---

## 4. Core Features

| Feature | Status |
|---|---|
| Google Sign-In authentication | Live |
| Onboarding flow (3 steps) | Live |
| Content feed (posts, stories, reels) | Live |
| Interactive food map (Leaflet + Google Places) | Live |
| Save / favorite food spots | Live |
| Friend graph (add, accept, remove) | Live |
| Push notifications (web) | Live |
| Bilingual UI (EN / PL) | Live |
| AI-powered post translation (OpenAI) | Live |
| Creator / influencer dashboard | Live |
| Admin dashboard | Live |
| Referral code system | Live |
| Dare / challenge system | Live |
| QR code profile sharing | Live |
| Public profile pages (`/@username`) | Live |
| Media upload (photo, video, carousel) | Live |
| HEIC image conversion | Live |
| Place review syncing to database | Live |
| Rate limiting (per user, per action) | Live |
| Push notification test mode | Live |
| Native mobile app (Capacitor) | In progress |

---

## 5. Navigation Architecture

### Student navigation (5 tabs)

| Tab | Purpose |
|---|---|
| **Feed** | Social content from friends, creators, and admin |
| **Favorites** | Interactive map of saved food spots |
| **Rewards** | Student discounts, flash deals, restaurant collabs |
| **Social** | Friend requests, friend list, friend activity |
| **Profile** | Own profile, post history, settings, notifications, referral code |

### State management

Navigation state is tracked in-memory and synced to browser history (`pushState`/`popState`), enabling the back button to work correctly within the app. State includes:

- Active tab
- Notifications panel open/closed
- Selected profile email (when viewing another user's profile)
- Profile drawer type (followers / favorites)
- Own archive open state
- Selected post ID (story or regular)
- Favorite view city
- Highlighted favorite place ID

---

## 6. Authentication & Onboarding

### Sign-in

- **Provider:** Google Sign-In only (OAuth 2.0 / OIDC)
- Google ID token is verified server-side via Supabase Auth on every API request
- No email/password authentication exists

### Profile completion (required after first sign-in)

Fields required before accessing the app:
- Full name
- Username (unique, lowercase, alphanumeric)
- City (from supported city list)
- Student status (yes/no boolean)
- School name (optional dropdown or free-text if school not listed)

### Onboarding flow (3 steps, skippable)

**Step 1 — Welcome:** Explains core concept, lists key actions  
**Step 2 — Save a spot:** Search-and-save a food spot from the user's city. Uses Google Places API. Falls back to curated city list if API unavailable.  
**Step 3 — Find friends & see the feed:** Friend search by exact username, profile link sharing, and a preview of city posts  

### Referral code at signup

If a referral code is present in localStorage (`crumbz-pending-referral-code-v1`), it is applied automatically at account creation and linked to the referrer's account.

---

## 7. Feed

### Post types

| Type | Description | Who can post |
|---|---|---|
| `chapter` | Editorial long-form story or drop | Admin, Influencer |
| `story` | Short vertical photo or video | All users |
| `discount` | Student deal announcement | Admin |
| `collab` | Restaurant partnership content | Admin, Influencer |
| `weekly-dump` | Curated weekly food roundup | All users |
| `ad` | Promoted placement | Admin |

### Post structure

Every post contains:
- `id` — unique identifier
- `title` + `titlePl` — bilingual title
- `body` + `bodyPl` — bilingual caption
- `cta` + `ctaPl` — bilingual call-to-action label
- `originalLanguage` — `en` or `pl`
- `type` — one of the post types above
- `createdAt` — human-readable display date
- `createdAtIso` — ISO 8601 timestamp
- `mediaKind` — `none`, `photo`, `video`, or `carousel`
- `mediaUrls` — array of public Supabase Storage URLs
- `videoRatio` — `9:16`, `4:5`, `1:1`, or `16:9`
- `authorRole` — `admin` or `student`
- `authorName`, `authorEmail`, `schoolName`
- `weekKey` — for weekly dump grouping
- `taggedPlaceId`, `taggedPlaceName`, `taggedPlaceKind`, `taggedPlaceAddress`, `taggedPlaceLat`, `taggedPlaceLon`, `taggedPlaceCity`
- `tasteTag` — `fire`, `solid`, `skip`, or empty
- `priceTag` — `student-friendly`, `kinda-pricey`, `special-occasion`, or empty
- `cropOffsets` — per-slide carousel crop positions
- `mediaTypes` — per-item MIME type array

### Feed sections

1. **Story rail** — horizontal scroll of friend and admin stories
2. **Friend activity** — posts from friends this week, with no algorithmic ranking
3. **City week snapshot** — aggregated city stats (most posted, most liked, hottest area, hidden gem)
4. **Admin / creator drops** — editorial content from `@crumbz.pl` and influencers
5. **City fallback** — recent city posts, shown when a user has no friends yet

### Post interactions

- **Likes** — one per user per post; toggled
- **Comments** — threaded (comment → replies → reactions on replies)
  - Emoji reactions on comments: ❤️ 😂 😭 🔥 🙏 👍
  - Comments can be hidden by admin
- **Shares** — logged with platform, author email, and timestamp
- **Views** — logged per post
- **Saves** — logged per post

### AI translation

- Available on any post
- Sends `title`, `body`, `cta` to OpenAI GPT-4o-mini
- Returns localized version in the target language (EN ↔ PL)
- Translation cached in localStorage with key `crumbz-post-translations-v1`
- Rate limited: 10 translations per minute per user

### Feed post merge logic (server-side)

- All existing server posts are preserved; a client payload can never remove another user's posts
- Only genuinely new posts authored by the verified caller are accepted
- Admin can replace the entire posts array

---

## 8. Map & Food Discovery

### Map technology

- **Rendering:** Leaflet + React-Leaflet (dynamically imported, SSR disabled)
- **Location data:** Google Places API (server-side proxy — API key never exposed to client)
- **Fallback:** Curated hardcoded list of 3 spots per city for cold start or API outage

### Nearby search (initial map load)

Six parallel Google Places `nearbysearch` queries run simultaneously:
1. `restaurant`
2. `cafe`
3. `bakery`
4. `bar`
5. `meal_takeaway`
6. `ice_cream_shop`

Each type fetches up to 2 pages (20 results per page = up to 40 per type), totalling up to 240 raw results. Results are deduplicated by `name + lat + lon` key before returning.

Page 2 requires a 2-second delay for Google's `next_page_token` to become valid. All 6 types run page 2 in parallel, so the total delay is ~2 seconds total, not 2 × 6.

### Text search

Uses Google Places `textsearch` API. The city name is appended to the query string to anchor results geographically (e.g., searching "burger" in Warsaw sends "burger Warsaw" to Google). Results are further filtered server-side by checking the address field against the expected city name.

### Place details

Fetched on-demand when a user taps a place. Fields retrieved:
- Name, address, geometry (lat/lon)
- Price level (mapped to 4-tier: inexpensive / moderate / expensive / very expensive)
- Opening hours (weekday text array)
- Current opening status (`open_now`)
- Google rating
- Up to 5 Google reviews (author name, rating, text)
- Place type (mapped to Crumbz category: cafe, bakery, bar, pizza, burger, etc.)

If no `placeId` is available, the system falls back to a text search by name + coordinates.

### Saving places

- User taps a heart on a place card
- `favoritePlaceIds` array in their profile is updated via `POST /api/account` (`update_favorites` action)
- A `favoriteActivities` entry is created: `{ id, placeId, placeName, placeKind, placeAddress, lat, lon, city, createdAt }` — capped at 30 entries
- Friends of the user who added a favorite receive a push notification
- Removing a favorite deletes the corresponding activity entry

### Friend map overlay

Friends' `favoriteActivities` are displayed on the map as distinct markers. Users can see which friends saved which spots and when.

### Place reviews sync

When a student posts with a tagged place, a server-side sync writes to two Supabase tables:
- `places` — one row per unique place (id, name, kind, address, city, lat, lon)
- `place_reviews` — one row per tagged post (post_id, place_id, author_email, author_name, caption, taste_tag, price_tag, photo_url, created_at)

This creates a structured review index from organic UGC.

---

## 9. Social Graph

### Friend system

Bidirectional. Both parties must consent. Process:

1. User A sends a request → `outgoingFriendRequests` on A, `incomingFriendRequests` on B
2. User B accepts → both move to `friends` on each other's profile; requests cleared
3. Either party can cancel (before acceptance) or remove (after acceptance)
4. User B can decline → request cleared from both sides

Friend lists are stored as email address arrays in the user profile. The server merges social graph fields carefully — a stale client payload can never remove existing friends or friend requests.

### Username search

Users search by exact username only. Partial matching is not supported for privacy reasons.

---

## 10. Notifications

### Web Push (current)

- VAPID-based Web Push via `web-push` npm package
- Subscription stored in `push_subscriptions` Supabase table with: endpoint, author_email, subscription keys, user_agent, updated_at
- Subscriptions are upserted on conflict by endpoint (one row per device)
- Expired subscriptions (HTTP 404/410) are deleted automatically on failed delivery

### Native Push (Capacitor target)

- `@capacitor/push-notifications` replaces web push for iOS and Android
- Same notification types, delivered via APNS (iOS) and FCM (Android)

### Notification types

| Trigger | Recipient | Content |
|---|---|---|
| Friend request sent | Target user | Sender name + username |
| Friend request accepted | Original sender | Acceptor name + username |
| Friend saves a place | All friends of saver | Saver name + place name |
| Friend publishes a post | All friends of poster | Author name + tagged place (if any) |
| User tagged in a post body (`@username`) | Tagged user | Who tagged them + place |
| Admin publishes a post/drop | All subscribed users | Post type + title + body |
| Admin sends announcement | All subscribed users | Announcement title + body |
| New comment on own post | Post author | Commenter name + comment preview |
| Reaction on own comment | Comment author | Reactor names |
| Reply to own comment | Comment author | Replier names |

All notifications are sent in the recipient's preferred language (EN or PL).

Grouped notifications: reactions and replies within a 2-hour window are batched into a single notification to avoid spam.

### Test mode

Users can trigger a test push from their profile to verify delivery is working on their device.

---

## 11. Profile

### Public profile

Accessible at `/@username`. Available to anyone with the link (no login required to view). Contains:
- Full name, username, bio, city, school
- Profile picture (from Google or custom)
- Post history (tabs: All / Friend Reviews / Posts / Sunday Dump)
- Follower count
- Favorites count

### OG image

Each profile generates a dynamic Open Graph image at `/@username/opengraph-image` for link preview cards on social media.

### Private profile controls

- Edit bio
- Change language preference (EN / PL)
- Toggle notification permissions
- View referral code and sharing link
- Generate QR code for profile
- Delete own posts

### Creator mode toggle (influencers only)

Influencer users see a "creator mode" switch in their profile. When enabled, the creator dashboard replaces the normal profile view.

---

## 12. Rewards

Currently delivered as `discount` post type in the feed. Content includes:
- Student discount announcements
- Flash deal drops
- Restaurant collab promotions
- Campus-only offers

A dedicated rewards redemption flow (claim, verify, redeem) is on the roadmap but not yet built.

---

## 13. Dare / Challenge System

Admin-created community challenge. Structure:

- **Challenge definition:** Stored in the `dare` key of the interactions object in Supabase
- **Opt-in:** Users accept the dare; their email is added to `acceptedEmails`
- **Reminders:** Users can request a reminder; added to `reminderEmails`
- **Submissions:** Users submit content (with media URL, caption, authorEmail, authorName, createdAt, id)
- **Winner:** Admin selects a `winnerSubmissionId` from submissions
- **Cleanup on account deletion:** All dare acceptances and submissions by the deleted user are removed. If the deleted user was the winner, `winnerSubmissionId` is set to null.

---

## 14. Creator (Influencer) Features

### Post formats

| Format | Specs |
|---|---|
| Post | Single photo or video |
| Carousel | 2–10 slides, photos or videos, cropped to 4:5 |
| Reel | 9:16 vertical, 1080×1920, 3–90 seconds, up to 4GB |
| Story | 9:16, 1080×1920, image or video, ratio tolerance ±2% |

### Carousel handling

- Up to 10 slides
- Mixed photo/video allowed
- Per-slide crop offset stored (x, y) for repositioning
- Drag-to-reposition UI
- Slides can be added, removed, or reordered

### Upload limits

| User type | Per-file limit | Total per request |
|---|---|---|
| Regular user | 10 MB | 50 MB |
| Influencer / Admin | No per-file limit | No total limit |

Maximum 7 files per upload request for all users.

### Influencer dashboard tabs

| Tab | Content |
|---|---|
| Overview | Total views, saves, likes, referrals; weekly checklist |
| Content | Per-post performance (views, likes, comments, saves) |
| Referrals | List of users who joined via their referral code |
| Insights | Top audience cities, top saved spots |
| Support | Link to message the founder |
| Settings | Account info (email, city, bio) |

### Weekly checklist

- Finish profile (name, city, username, bio all filled)
- Publish 3 posts this week
- Get 10 saves
- Share referral link

---

## 15. Admin Features

### Admin dashboard tabs

| Tab | Content |
|---|---|
| Overview | Platform health summary |
| Challengers | Dare/challenge management — create, view submissions, pick winner |
| Post | Publish platform-wide content (all post types and formats) |
| Community | User list — view all accounts, delete accounts with full cascade |
| Referrals | Referral funnel — who referred whom, completion rates |

### Admin-only capabilities

- Post on behalf of `@crumbz.pl` to all users
- Replace the entire posts array (can reorder, edit, delete any post)
- Send announcements to all push-subscribed users
- Delete any user account with full cascade:
  - Remove all their posts
  - Remove all their comments, likes, shares on any post
  - Remove their interactions from the dare system
  - Remove their media files from Supabase Storage
  - Remove them from all friends lists and pending requests of other users
  - Null out dare winner if the winner was the deleted user
- Hide any comment (`hidden` field preserved across merges)
- Manage the dare system (create, modify, resolve)
- Send push notifications targeted to specific usernames (e.g., `ADMIN_POST_IMAGE_SHARE_USERNAMES` set)

### Admin identity

Admin status is determined purely by email address (`crumbleappco@gmail.com`). Verified server-side on every request. Cannot be faked or self-granted.

---

## 16. Referral System

### How it works

1. Every user gets a unique 10-character alphanumeric referral code on first profile save (auto-generated via `crypto.randomUUID`)
2. Code is shared via profile share sheet or direct link
3. New user enters referral code during onboarding (stored in localStorage before signup, applied at account creation)
4. Server links the new user's `referredByCode` and `referredByEmail` to the referrer
5. Referral is "completed" once the new user has set: full name, username, city, and student status
6. `referralCompletedAt` timestamp is recorded

### Rules

- A user cannot refer themselves (own code is rejected)
- Referral code from existing account is preserved across profile edits (cannot be changed once set)
- If a referrer account doesn't exist (code not found), the `referredByCode` is not stored
- Referral data is visible in both the influencer dashboard and admin referrals tab

---

## 17. Content & Media

### Accepted file types

| Category | Formats |
|---|---|
| Photos | JPEG, PNG, HEIC, HEIF, WebP, GIF |
| Videos | MP4, MOV, WebM |

HEIC files are converted client-side to JPEG using `heic2any` before upload.

### Upload flow

Two upload paths exist:

**Path A — Direct upload (regular posts):**  
`POST /api/upload` — Server receives file, validates MIME type and size, uploads to Supabase Storage, returns public URL.

**Path B — Signed URL upload (large files / stories):**  
`POST /api/upload-url` — Server creates a signed upload URL. Client uploads directly to Supabase Storage using the token. Server returns public URL.

### Storage

All media stored in the `crumbz-media` Supabase Storage bucket as public files. Path format: `{timestamp}-{sanitized-filename}`.

### File size limits

| Content type | Limit |
|---|---|
| Regular post image | 15 MB |
| Regular post video | 50 MB |
| Story image | 30 MB |
| Story video | 500 MB |
| Per-file (API, non-influencer) | 10 MB |
| Total per upload request (non-influencer) | 50 MB |

### Media stored in browser (IndexedDB)

Staged carousel media and draft post files are stored in IndexedDB (`crumbz-media-v1` / `post-media` store) before upload, so they survive page refreshes during the upload flow.

---

## 18. Localization

### Languages

- **English** (default)
- **Polish**

### Language detection order

1. Check localStorage for previously saved preference (`crumbz-language-v1`)
2. Check `navigator.language` — if it starts with `pl`, default to Polish
3. Fall back to English

### Bilingual content

All post fields have dual-language versions: `title`/`titlePl`, `body`/`bodyPl`, `cta`/`ctaPl`, `originalLanguage`.

### AI translation

On-demand translation via OpenAI GPT-4o-mini. System prompt instructs the model to preserve @mentions, URLs, emoji, line breaks, slang energy, and brand names. Response is strict JSON: `{ sourceLanguage, title, body, cta }`. Cached per post per device.

### Push notification localization

All push notifications are sent in the recipient's preferred language. Accounts are grouped by language before sending to avoid sending bilingual notifications.

---

## 19. Rate Limiting & Safety

Rate limits are enforced server-side per user email per action type. Stored in the `rate_limits` Supabase table.

| Action | Limit |
|---|---|
| Friend actions | 10 per minute |
| Posts | 20 per minute |
| Interactions (comments, likes) | 30 per minute |
| Translation | 10 per minute |
| Uploads | 10 per minute |
| General API | 100 per minute |

On exceeding a limit, a `429 Too Many Requests` response is returned with a `Retry-After` header.

Old rate limit records are cleaned up periodically (entries older than the maximum window + 60 seconds).

If the `rate_limits` table doesn't exist (new environment), rate limiting fails open (requests are allowed through).

---

## 20. Technical Infrastructure

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| UI components | HeroUI v2 |
| Animations | Framer Motion v12 |
| Maps | Leaflet + React-Leaflet |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (`crumbz-media` bucket) |
| Auth | Google Sign-In + Supabase Auth token verification |
| Hosting | Vercel |
| Push notifications | Web Push (VAPID) via `web-push` |
| AI translation | OpenAI GPT-4o-mini |
| Places data | Google Places API (Nearby Search + Text Search + Place Details) |
| QR codes | `qrcode` npm package |
| Image export | `html-to-image` |
| HEIC conversion | `heic2any` |
| Fonts | Manrope (sans), Young Serif (serif) |

### API routes

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/places` | GET | Google Places nearby + text search proxy |
| `/api/place-details` | GET | Google Place details proxy |
| `/api/account` | POST | All account mutations |
| `/api/state` | GET, POST | Read/write shared app state |
| `/api/translate-post` | POST | AI post translation |
| `/api/upload` | POST | Direct media upload |
| `/api/upload-url` | POST | Signed upload URL generation |
| `/api/push-subscriptions` | POST, DELETE | Push subscription management |

All POST endpoints (except `/api/places` and `/api/place-details`) require a verified Google Bearer token.

### Supabase tables

| Table | Purpose |
|---|---|
| `app_state` | Single-row store for accounts, posts, interactions, announcements, dare |
| `push_subscriptions` | Web push device subscriptions |
| `rate_limits` | Per-user, per-action rate limit log |
| `places` | Structured place index (synced from tagged posts) |
| `place_reviews` | Per-post tagged place review index |

### Google API key protection

The Google Places API key is stored only in server-side environment variables (`GOOGLE_PLACES_API_KEY` / `GOOGLE_MAPS_SERVER_API_KEY`). All Google Places calls are made from Next.js API routes, never from the browser. Only the Google Maps JavaScript API for map tile rendering uses a public key (`NEXT_PUBLIC_GOOGLE_CLIENT_ID` is for auth, separate key for maps).

---

## 21. Mobile App (Capacitor)

### Approach

Capacitor wraps the deployed Next.js application in a native shell. The app points to the live Vercel URL. No static export is required — all API routes remain on Vercel. The native shell adds:

- App Store / Play Store distribution
- Native push notifications
- Haptic feedback
- Native status bar and keyboard handling
- Splash screen

### Configuration

- App ID: `com.crumbz.app`
- App Name: `Crumbz`
- Production server URL: Vercel deployment
- Development server URL: `http://localhost:3000`

### Native plugins

| Plugin | Replaces / Adds |
|---|---|
| `@capacitor/push-notifications` | Replaces Web Push / VAPID |
| `@capacitor/haptics` | New — vibration on key actions |
| `@capacitor/status-bar` | Control status bar style and color |
| `@capacitor/splash-screen` | 1.5s branded launch screen |
| `@capacitor/keyboard` | Fix keyboard push-up behavior on inputs |

### Target platforms

- iOS (Xcode → App Store)
- Android (Android Studio → Google Play)

---

## 22. Data Architecture

### Supabase `app_state` table structure

The app uses two key rows in a single `app_state` table:

**Row: `crumbz-accounts-state`**
- `accounts` (JSONB array): all user records

**Row: `crumbz-app-state`**
- `posts` (JSONB array): all published posts
- `interactions` (JSONB object): keyed by post ID, contains comments/likes/shares/views/saves + embedded announcements + embedded dare
- `announcements` (JSONB array): platform announcements (separate column if supported)

### Data merge strategy

The server enforces merge semantics — no client can overwrite another user's data:
- Users can only write posts authored by their verified email
- Users can only write interactions attributed to their verified email
- Friends, friend requests, and favorite places are preserved during profile updates (server-side merge)
- Admin can write anything

---

## 23. Security

### Authentication

- Google ID tokens are verified via Supabase Auth on every authenticated API call
- Tokens are cached server-side in a `Map<string, VerifiedIdentity>` with TTL matching the token expiry
- Unauthenticated requests to protected routes receive `401 Unauthorized`
- Admin status checked on every request — cannot be derived from client-supplied data

### Authorization

- Users can only mutate their own account, their own posts, and their own interactions
- Friend graph mutations are validated: both accounts must exist, emails must match the caller
- Account deletion is admin-only
- Announcement management is admin-only
- Post replacement (bulk) is admin-only

### HTTP security headers (all routes)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `Content-Security-Policy`: strict allowlist (self + Google APIs + Supabase + OpenAI)
- `frame-ancestors: none`

### File upload validation

- MIME type checked against allowlist (no executable or document types accepted)
- File size limits enforced per user tier
- File names sanitized before storage (spaces → dashes, special chars removed)

### Google API key

Never exposed to the browser. All Google Places calls are proxied through server-side API routes.

---

## 24. Supported Cities

| City | Province |
|---|---|
| Warsaw (Warszawa) | Masovian |
| Kraków | Lesser Poland |
| Łódź | Łódź |
| Wrocław | Lower Silesian |
| Poznań | Greater Poland |
| Gdańsk | Pomeranian |
| Szczecin | West Pomeranian |
| Bydgoszcz | Kuyavian-Pomeranian |
| Lublin | Lublin |
| Katowice | Silesian |
| Białystok | Podlaskie |
| Gdynia | Pomeranian |
| Częstochowa | Silesian |
| Toruń | Kuyavian-Pomeranian |

Each city has: a hardcoded city center coordinate pair, a fallback list of 3 curated food spots, and a list of major universities.

---

## 25. What Is Not Built Yet

| Feature | Notes |
|---|---|
| In-app direct messaging (DMs) | No peer-to-peer messaging between users |
| Native video playback controls | Videos play in browser WebView without custom controls |
| Rewards redemption flow | Currently rewards are just feed posts; no claim/verify/redeem logic |
| Offline mode | App requires internet for maps and places; no offline caching |
| Analytics data pipeline | Creator insights tab is scaffolded but live data not wired |
| Native push for Capacitor | Currently web push only; Capacitor plugin not yet integrated |
| Explore / discover tab | No global public feed or hashtag/category browsing |
| Block / report user | No content moderation tools for regular users |
| Verified badges | No formal verification system for influencers |
| In-app purchases | No payment or subscription system |

---

*End of PRD*
