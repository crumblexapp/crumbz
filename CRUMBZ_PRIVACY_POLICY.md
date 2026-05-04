# Crumbz Privacy Policy

**Last updated:** May 2026  
**Effective date:** May 2026  
**Company:** Crumble App Co.  
**Contact:** crumbleappco@gmail.com  
**App domain:** app.crumbz.pl

---

## Table of Contents

1. [Who We Are](#1-who-we-are)
2. [What This Policy Covers](#2-what-this-policy-covers)
3. [Data We Collect and Why](#3-data-we-collect-and-why)
4. [Complete Data Inventory](#4-complete-data-inventory)
5. [How We Store Your Data](#5-how-we-store-your-data)
6. [Data Stored on Your Device](#6-data-stored-on-your-device)
7. [Third-Party Services](#7-third-party-services)
8. [How We Use Your Data](#8-how-we-use-your-data)
9. [Who Can See Your Data](#9-who-can-see-your-data)
10. [Data Retention](#10-data-retention)
11. [Your Rights](#11-your-rights)
12. [Account Deletion](#12-account-deletion)
13. [Push Notifications](#13-push-notifications)
14. [Children's Privacy](#14-childrens-privacy)
15. [International Transfers](#15-international-transfers)
16. [Security](#16-security)
17. [Changes to This Policy](#17-changes-to-this-policy)
18. [Contact Us](#18-contact-us)

---

## 1. Who We Are

Crumbz is operated by **Crumble App Co.**, a student food discovery platform based in Poland. The app is available at `app.crumbz.pl` and as a native mobile application on iOS and Android.

For questions about this policy or your data, contact us at **crumbleappco@gmail.com**.

---

## 2. What This Policy Covers

This policy applies to all data collected by Crumbz when you:

- Visit or use the Crumbz web app at `app.crumbz.pl`
- Use the Crumbz iOS or Android app
- Interact with any content, features, or notifications on the platform

It does not cover third-party websites or services that we link to, even if you reach them through Crumbz.

---

## 3. Data We Collect and Why

We collect data to:

1. **Authenticate you** — verify who you are via Google Sign-In
2. **Provide the service** — show you posts, maps, friends' activity, and your saved spots
3. **Enable social features** — friend requests, notifications, shared favorites
4. **Personalize your experience** — show content in your city and language
5. **Operate notifications** — deliver push alerts to your device
6. **Prevent abuse** — rate-limit actions, protect API keys, enforce authorization
7. **Improve the platform** — understand how features are used

We do **not** use your data for targeted advertising. We do **not** sell your data to third parties.

---

## 4. Complete Data Inventory

This section lists every piece of data Crumbz collects, where it is stored, and why.

---

### 4.1 Account Data (stored in Supabase)

Collected when you sign up and complete your profile.

| Data field | Example | Why collected |
|---|---|---|
| Google email address | `user@gmail.com` | Primary identifier; used to authenticate every API request |
| Full name | `Anna Kowalska` | Displayed on your profile and in notifications to friends |
| Username | `annakowalska` | Public handle; used for @mentions and profile URL |
| City | `Warsaw` | Used to show local content, places, and city-specific feed |
| Student status | `true` or `false` | Used to display student-targeted content and discounts |
| School name | `University of Warsaw` | Displayed on profile; used for school-based content grouping |
| Bio | `coffee first, everything else after` | Displayed on your public profile |
| Preferred language | `en` or `pl` | Controls UI language and notification language |
| Account role | `user`, `influencer`, or `admin` | Controls what features and API actions are available |
| Profile picture URL | Google CDN URL | Displayed on profile and in comments |
| Referral code | `AB12CD34EF` | Unique 10-character code you share to invite others |
| Referred-by code | `XY78ZW90QR` | Code of the person who referred you (if any) |
| Referred-by email | `friend@gmail.com` | Email of the person who referred you |
| Referral completed timestamp | ISO timestamp | When your profile was considered complete for referral tracking |
| Sign-in status | `true` or `false` | Whether the account is currently active |

---

### 4.2 Social Graph Data (stored in Supabase)

Collected as you interact with other users.

| Data field | Example | Why collected |
|---|---|---|
| Friends list | Array of email addresses | Determines whose posts appear in your feed; friend map overlaps |
| Incoming friend requests | Array of email addresses | Shows pending requests you need to respond to |
| Outgoing friend requests | Array of email addresses | Shows requests you have sent but not yet been accepted |

---

### 4.3 Saved Places Data (stored in Supabase)

Collected when you save food spots.

| Data field | Example | Why collected |
|---|---|---|
| Favorite place IDs | `["ChIJ...abc", "warsaw-hala-koszyki"]` | Tracks which places you have saved; shown on map |
| Favorite activity log | Array of up to 30 entries | Shows your saved-spot history; visible to friends on their map |

Each activity log entry contains:
- Place ID, name, kind, and address
- Latitude and longitude
- City name
- Timestamp of when you saved it

---

### 4.4 Posts You Create (stored in Supabase)

Collected when you publish a post.

| Data field | Example | Why collected |
|---|---|---|
| Post ID | UUID | Unique identifier |
| Title and caption | Text | The content of your post |
| Post type | `story`, `weekly-dump`, etc. | Used to categorize and display content |
| Media URLs | Supabase Storage URLs | Links to your uploaded photos or videos |
| Author email | `user@gmail.com` | Links the post to your account |
| Author name | `Anna Kowalska` | Displayed with the post |
| School name | `University of Warsaw` | Displayed with the post |
| Tagged place | Name, address, lat/lon, city | Links your post to a food spot on the map |
| Taste tag | `fire`, `solid`, or `skip` | Your rating of the food spot |
| Price tag | `student-friendly`, etc. | Your assessment of the price level |
| Timestamp | ISO datetime | When the post was published |
| Language | `en` or `pl` | Original language of the post |

---

### 4.5 Interactions You Make (stored in Supabase)

Collected when you interact with posts.

| Interaction type | Data stored | Why collected |
|---|---|---|
| Like | Your email, timestamp | Records that you liked a post |
| Comment | Your email, display name, comment text, timestamp, comment ID | Stores your comments under posts |
| Comment reaction | Your email, emoji, timestamp | Records emoji reactions you add to comments |
| Reply to comment | Your email, display name, reply text, timestamp | Stores replies within comment threads |
| Share | Your email, platform, timestamp | Records that you shared a post |
| View | Timestamp | Records that a post was viewed (no personally identifiable info beyond context) |
| Save | Timestamp | Records that you saved a post |

---

### 4.6 Media Files (stored in Supabase Storage)

Collected when you upload photos or videos.

| Type | Formats | Max size | Why collected |
|---|---|---|---|
| Post photos | JPEG, PNG, HEIC, WebP, GIF | 15 MB | Displayed in your post |
| Post videos | MP4, MOV | 50 MB | Displayed in your post |
| Story/reel photos | JPEG, PNG, HEIC | 30 MB | Displayed in your story |
| Story/reel videos | MP4, MOV | 500 MB | Displayed in your story |

Files are stored in the `crumbz-media` Supabase Storage bucket as **publicly readable** files. Anyone with the URL can view them. Do not upload content you wish to keep private.

---

### 4.7 Push Notification Subscriptions (stored in Supabase)

Collected when you enable push notifications.

| Data field | Example | Why collected |
|---|---|---|
| Push endpoint URL | Browser push service URL | Required to deliver notifications to your device |
| Push subscription keys | p256dh key, auth key | Required for encrypted push delivery |
| Your email address | `user@gmail.com` | Links the subscription to your account |
| User agent string | `Mozilla/5.0...` | Browser/device identification for debugging |
| Subscription timestamp | ISO datetime | Tracks when the subscription was created or updated |

One subscription row per device. If you use Crumbz on multiple devices, you will have multiple subscription rows.

---

### 4.8 Rate Limit Logs (stored in Supabase)

Collected automatically on every API action.

| Data field | Why collected |
|---|---|
| Your email address | Identifies who performed the action |
| Action type | Type of action (post, comment, upload, friend request, translation, etc.) |
| Timestamp | When the action occurred |

Rate limit logs older than 2 minutes are automatically deleted by the system.

---

### 4.9 Place Review Index (stored in Supabase)

Automatically generated from your tagged posts.

| Data field | Why collected |
|---|---|
| Post ID | Links the review to your post |
| Place ID, name, address, city, lat/lon | Describes the tagged food spot |
| Your email address | Links the review to you |
| Your display name | Shown with the review |
| Caption text | The review content |
| Taste tag, price tag | Your ratings |
| Photo URL | A photo from your post |
| Timestamps | When created and updated |

This is a structured index built from posts you've already published. It mirrors your post data into a queryable format.

---

### 4.10 Dare / Challenge Data (stored in Supabase)

Collected when you participate in a community challenge.

| Data field | Why collected |
|---|---|
| Your email address | Tracks that you accepted the challenge |
| Reminder preference | Whether you asked for a reminder notification |
| Submission content | Your submission media URL, caption, display name, email, timestamp |

---

## 5. How We Store Your Data

All server-side data is stored by **Supabase**, our database and storage provider, on infrastructure located in the **European Union (eu-west-1 / Frankfurt region)**.

Data is held in:

| Storage | What's stored |
|---|---|
| Supabase PostgreSQL database | Account profiles, posts, interactions, social graph, notifications, rate limits, place index |
| Supabase Storage (`crumbz-media`) | All uploaded photos and videos |

Supabase's privacy policy is available at: https://supabase.com/privacy

---

## 6. Data Stored on Your Device

Crumbz stores data locally in your browser or device storage for performance and offline access to your own data. This data does not leave your device unless explicitly synced to the server.

### localStorage (browser)

| Key | What's stored |
|---|---|
| `crumbz-active-user-v1` | Your active session (profile, friends, favorites) |
| `crumbz-accounts-v1` | Cached copy of all public account data |
| `crumbz-posts-v1` | Cached copy of all posts |
| `crumbz-post-translations-v1` | Cached AI translations of posts |
| `crumbz-interactions-v1` | Cached post interactions (likes, comments) |
| `crumbz-dare-v1` | Cached dare/challenge data |
| `crumbz-seen-notifications-v1` | IDs of notifications you have already seen |
| `crumbz-push-prompt-asked-v1-{email}` | Whether you have been asked to enable push |
| `crumbz-install-prompt-dismissed-v1` | Whether you dismissed the install prompt |
| `crumbz-pending-referral-code-v1` | Referral code from a signup link (cleared after use) |
| `crumbz-post-signup-onboarding-*` | Onboarding progress state |
| `crumbz-favorite-location-*` | Your preferred map view (mode, city, center) |
| `crumbz-language-v1` | Your preferred language (en/pl) |

### IndexedDB (browser)

| Database | Store | What's stored |
|---|---|---|
| `crumbz-media-v1` | `post-media` | Draft media files staged for upload (cleared after upload) |

All localStorage and IndexedDB data is cleared when you clear your browser data or when you delete your account and sign out.

---

## 7. Third-Party Services

We use the following third-party services. Each receives some of your data to operate.

---

### 7.1 Google (Authentication)

**What we send:** Your Google ID token (JWT) on every authenticated request  
**What Google provides us:** Your verified email address and profile info (name, picture)  
**What Google receives from the sign-in flow:** Your consent to share email and basic profile info with Crumbz  
**Why:** We have no other authentication system. Google Sign-In is the only way to use Crumbz.  
**Google's privacy policy:** https://policies.google.com/privacy

---

### 7.2 Google Places API

**What we send:** GPS coordinates and search text queries from our server  
**What Google provides us:** Lists of nearby food spots, place details, reviews from Google Maps  
**Important:** These queries are made from our server using a private API key — **your browser does not communicate directly with Google Places**. Google does not receive your device IP or browser fingerprint from Places API queries.  
**Why:** To power the food discovery map.  
**Google's privacy policy:** https://policies.google.com/privacy

---

### 7.3 Supabase

**What we send:** All structured data described in Section 4  
**What Supabase does:** Stores and serves data via PostgreSQL and object storage  
**Why:** Our primary database and file storage provider  
**Data location:** EU (Frankfurt)  
**Supabase's privacy policy:** https://supabase.com/privacy

---

### 7.4 OpenAI

**What we send:** The title, body text, and call-to-action of a specific post — only when you explicitly request a translation  
**What OpenAI provides:** Translated text in the target language  
**Important:** Translation is entirely opt-in. We never send post content to OpenAI unless you press the "see translation" button.  
**Why:** To provide bilingual translations of food content  
**OpenAI's privacy policy:** https://openai.com/policies/privacy-policy

---

### 7.5 Vercel

**What Vercel receives:** All HTTP requests made to `app.crumbz.pl`, including request headers, IP addresses, and response times  
**Why:** Vercel hosts our web application and API routes  
**Data location:** EU edge network where possible  
**Vercel's privacy policy:** https://vercel.com/legal/privacy-policy

---

### 7.6 Browser Push Services (Web Push)

**What we send:** Encrypted push notification payloads to your browser's push service endpoint  
**Which push services:** Depends on your browser — Google FCM (Chrome), Mozilla Push Service (Firefox), Apple APNS (Safari/iOS)  
**Why:** To deliver real-time notifications to your device  
**Important:** Push payloads are encrypted end-to-end between our server and your device. The push service provider can see the payload metadata (timing, size) but not the content.

---

## 8. How We Use Your Data

| Data | How used |
|---|---|
| Email address | Authentication, linking your account, authorization checks, push subscriptions, rate limiting |
| Full name | Displayed on your profile and in notifications sent to friends |
| Username | Public profile URL, @mentions in posts, friend search |
| City | Local feed, map center, city-specific content |
| Student status | Student discount eligibility, content targeting |
| School name | Profile display, school-based content grouping |
| Bio | Public profile display |
| Profile picture | Shown on your profile, in comments, and in friend lists |
| Friend list | Determining whose posts appear in your feed, friend map overlaps, push notifications |
| Saved places | Displaying your map, notifying friends when you save a spot |
| Posts | Displaying content in the feed and on your profile |
| Comments and interactions | Displaying under posts, triggering notifications |
| Media files | Displaying in posts and stories |
| Push subscription | Delivering notifications |
| Rate limit logs | Preventing spam and abuse (auto-deleted after 2 minutes) |
| Place review index | Structured map of community-recommended spots |
| Referral data | Tracking referral credit and influencer performance |
| Language preference | Showing UI and notifications in your preferred language |

---

## 9. Who Can See Your Data

### Public (visible to anyone with a link, no login required)

- Your profile page at `/@username`: full name, username, bio, city, school, profile picture, post history, follower count, favorites count
- Your posts and their tagged places, taste tags, price tags, and captions
- Open Graph preview images generated from your profile

### Friends only (visible only to your mutual friends in-app)

- Your favorite places on the shared map
- Your recent "favorite activity" log (which places you saved and when)
- Your posts appearing in friends' feeds
- Your name and avatar in the social tab

### Other Crumbz users (visible while logged in)

- Your username (for search)
- Your public profile when another user visits `/@yourusername` in the app

### Admin only (`crumbleappco@gmail.com`)

- All account data for all users
- All posts, interactions, and dare submissions from all users
- Push subscription records
- Rate limit activity

### Not visible to other users

- Your email address (never displayed in the UI; used only server-side for identification)
- Your friend request inbox/outbox (only you see this)
- Your referral chain (who referred you)
- Your device push subscription keys
- Your rate limit records

---

## 10. Data Retention

| Data type | Retention period |
|---|---|
| Account profile | Until you delete your account |
| Posts | Until you delete the post or your account |
| Comments and likes | Until you delete your account |
| Media files | Until the associated post is deleted or your account is deleted |
| Push subscriptions | Until you unsubscribe, the subscription expires (HTTP 410), or your account is deleted |
| Rate limit logs | ~2 minutes (auto-deleted by system) |
| Place reviews (indexed from posts) | Until the source post is deleted |
| localStorage / device data | Until you clear browser data or delete your account |
| Google authentication tokens (server-side cache) | Until token expiry (typically 1 hour), then evicted |

We do not retain data for longer than necessary to provide the service.

---

## 11. Your Rights

Depending on your location, you may have the following rights under applicable data protection law (including GDPR if you are in the EU/EEA):

### Right to access

You can request a copy of all data we hold about you. Contact us at crumbleappco@gmail.com.

### Right to rectification

You can update your profile information directly in the app (full name, username, bio, city, school, language). For other corrections, contact us.

### Right to erasure ("right to be forgotten")

You can delete your account through the admin panel (if you are the admin) or by contacting us. Account deletion permanently removes:
- Your profile
- All your posts and their media files from storage
- All your comments, likes, and shares
- Your entries in all friend lists and pending requests
- Your dare participations and submissions
- Your push subscriptions

See Section 12 for the full deletion cascade.

### Right to data portability

You can request an export of your data in a machine-readable format. Contact us at crumbleappco@gmail.com.

### Right to object

You can object to certain uses of your data. For example, you can disable push notifications at any time from your profile settings.

### Right to restrict processing

You can request that we restrict processing your data in certain circumstances. Contact us at crumbleappco@gmail.com.

### Right to withdraw consent

Where processing is based on consent (e.g., push notifications), you can withdraw consent at any time by disabling notifications in your profile or device settings.

### How to exercise your rights

Contact us at **crumbleappco@gmail.com**. We will respond within 30 days.

---

## 12. Account Deletion

When your account is deleted (by you or by the admin), the following happens immediately and permanently:

1. **Your profile** is removed from the accounts database
2. **All your posts** are removed from the shared posts list
3. **All your media files** (photos, videos) are deleted from Supabase Storage
4. **All your interactions** — comments, likes, and shares on any post — are removed
5. **Your dare participations** — your email is removed from accepted and reminder lists; your submissions are deleted
6. **Dare winner cleared** — if you were selected as the dare winner, the winner record is set to null
7. **Friend graph cleaned** — you are removed from every other user's friends list, incoming request list, and outgoing request list
8. **Push subscriptions** — your push subscription records are removed
9. **Place reviews** — your tagged-post reviews are removed from the place review index

Data stored in your browser (localStorage, IndexedDB) is not automatically cleared by account deletion on the server. You should clear your browser data manually after deleting your account.

---

## 13. Push Notifications

### What triggers a notification

Crumbz sends push notifications for the following events:

- A user sends you a friend request
- A user accepts your friend request
- A friend of yours saves a food spot
- A friend of yours publishes a post
- Someone tags you (`@yourusername`) in a post caption
- Admin publishes a new post or drop
- Admin sends a platform-wide announcement
- Someone comments on your post
- Someone reacts to your comment
- Someone replies to your comment

### How to turn off notifications

- Go to your **Profile** tab → tap the notifications section → toggle off
- Or revoke permission in your device/browser settings

### What happens when you unsubscribe

Your push subscription endpoint is deleted from our database. You will no longer receive push notifications on that device. Other devices you use are unaffected.

### Expired subscriptions

If your push subscription expires (common after browser updates or clearing browser data), our system detects the expiry (HTTP 410 from the push service) and automatically deletes the dead subscription. You will need to re-enable notifications in the app to receive them again.

---

## 14. Children's Privacy

Crumbz is intended for users aged **16 and older**. We do not knowingly collect personal data from children under 16. If you believe a child under 16 has provided us with personal data, please contact us at crumbleappco@gmail.com and we will delete it promptly.

---

## 15. International Transfers

Crumbz is a Polish product. Our primary server infrastructure (Supabase) is located in the **European Union (Frankfurt, Germany)**. If you access Crumbz from outside the EU, your data will be transferred to and processed within the EU.

For users in the EU/EEA: Your data is processed within the EU and does not require cross-border transfer safeguards for the primary storage layer.

For users outside the EU: By using Crumbz, you consent to the transfer of your data to the EU for processing.

---

## 16. Security

We take the following technical measures to protect your data:

### Authentication security

- All API mutations require a verified Google ID token
- Tokens are verified server-side via Supabase Auth on every request
- Users can only access and modify their own data (server enforces this)
- Admin access is locked to a single hardcoded email address

### Transport security

- All communications are encrypted via HTTPS/TLS
- Web Push payloads are encrypted end-to-end

### HTTP security headers

All pages and API responses are served with:
- `Content-Security-Policy` — restricts what resources the browser can load
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
- `X-XSS-Protection: 1; mode=block` — enables browser XSS filtering
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer header leakage
- `Permissions-Policy` — disables camera, microphone, geolocation, and interest-cohort access from web context

### API key protection

- The Google Places API key is stored only in server-side environment variables
- It is never exposed to the browser or included in client-side code
- All Google Places queries are proxied through our backend

### File upload protection

- MIME type is validated server-side against an allowlist
- File size limits are enforced per user tier
- File names are sanitized before storage

### Rate limiting

- All write actions are rate-limited per user to prevent spam and abuse
- Limits: 10–30 actions per minute depending on action type

### What we cannot guarantee

No system is 100% secure. While we use industry-standard security practices, we cannot guarantee the absolute security of your data transmitted over the internet. Media files stored in Supabase Storage are publicly readable by anyone with the URL — treat uploaded content accordingly.

---

## 17. Changes to This Policy

We may update this Privacy Policy from time to time. When we make material changes, we will:

- Update the "Last updated" date at the top of this document
- Post the updated policy at `app.crumbz.pl` and in the app
- Where required by law, notify you via in-app announcement or email

Continued use of Crumbz after changes are posted constitutes acceptance of the updated policy.

---

## 18. Contact Us

For any privacy-related questions, requests to exercise your rights, or data deletion requests:

**Email:** crumbleappco@gmail.com  
**App:** app.crumbz.pl  
**Response time:** Within 30 days

For urgent security issues (suspected data breach, unauthorized access), please email with the subject line: **SECURITY - Crumbz**

---

*End of Privacy Policy*
