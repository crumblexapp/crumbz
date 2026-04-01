import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/lib/google-auth";
import { sendPushToEmails } from "@/lib/push-notifications";
import { webPushEnabled } from "@/lib/web-push";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATE_ROW_ID = "crumbz-app-state";
const ACCOUNTS_ROW_ID = "crumbz-accounts-state";
const ANNOUNCEMENTS_META_KEY = "__announcements";
const DARE_META_KEY = "__dare";

type JsonRecord = Record<string, unknown>;
function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function normalizeObjectArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item && typeof item === "object")) : [];
}

function splitInteractionsAndAnnouncements(rawInteractions: unknown) {
  const interactions =
    rawInteractions && typeof rawInteractions === "object" && !Array.isArray(rawInteractions)
      ? { ...(rawInteractions as Record<string, unknown>) }
      : {};

  const announcements = Array.isArray(interactions[ANNOUNCEMENTS_META_KEY]) ? interactions[ANNOUNCEMENTS_META_KEY] : [];
  const dare = interactions[DARE_META_KEY] && typeof interactions[DARE_META_KEY] === "object" ? interactions[DARE_META_KEY] : null;
  delete interactions[ANNOUNCEMENTS_META_KEY];
  delete interactions[DARE_META_KEY];

  return { interactions, announcements, dare };
}

function mergeInteractionsAndAnnouncements(rawInteractions: unknown, rawAnnouncements: unknown, rawDare: unknown) {
  const interactions =
    rawInteractions && typeof rawInteractions === "object" && !Array.isArray(rawInteractions)
      ? { ...(rawInteractions as Record<string, unknown>) }
      : {};

  return {
    ...interactions,
    [ANNOUNCEMENTS_META_KEY]: Array.isArray(rawAnnouncements) ? rawAnnouncements : [],
    [DARE_META_KEY]: rawDare && typeof rawDare === "object" ? rawDare : {},
  };
}

function sortPosts(posts: JsonRecord[]) {
  return [...posts].sort((a, b) => {
    const aTime = Date.parse(String(a.createdAtIso ?? a.createdAt ?? ""));
    const bTime = Date.parse(String(b.createdAtIso ?? b.createdAt ?? ""));

    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
    }

    return bTime - aTime;
  });
}

function normalizeInteractionsMap(rawInteractions: unknown) {
  if (!rawInteractions || typeof rawInteractions !== "object" || Array.isArray(rawInteractions)) {
    return {} as Record<string, { comments: JsonRecord[]; shares: JsonRecord[]; likes: JsonRecord[] }>;
  }

  return Object.fromEntries(
    Object.entries(rawInteractions).map(([postId, bucket]) => {
      const safeBucket = bucket && typeof bucket === "object" && !Array.isArray(bucket) ? (bucket as JsonRecord) : {};

      return [
        postId,
        {
          comments: normalizeObjectArray(safeBucket.comments),
          shares: normalizeObjectArray(safeBucket.shares),
          likes: normalizeObjectArray(safeBucket.likes),
        },
      ];
    }),
  );
}

function dedupeByKey<T extends JsonRecord>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildTaggedReviewRows(rawPosts: unknown) {
  return normalizeObjectArray(rawPosts)
    .filter(
      (post) =>
        post.authorRole === "student" &&
        typeof post.id === "string" &&
        normalizeText(post.taggedPlaceId) &&
        normalizeText(post.taggedPlaceName),
    )
    .map((post) => ({
      postId: String(post.id),
      placeId: normalizeText(post.taggedPlaceId),
      placeName: normalizeText(post.taggedPlaceName),
      placeKind: normalizeText(post.taggedPlaceKind),
      placeAddress: normalizeText(post.taggedPlaceAddress),
      placeCity: normalizeText(post.taggedPlaceCity),
      placeLat: normalizeNumber(post.taggedPlaceLat),
      placeLon: normalizeNumber(post.taggedPlaceLon),
      authorEmail: normalizeEmail(post.authorEmail),
      authorName: normalizeText(post.authorName),
      caption: normalizeText(post.body),
      tasteTag: normalizeText(post.tasteTag),
      priceTag: normalizeText(post.priceTag),
      photoUrl: Array.isArray(post.mediaUrls) ? post.mediaUrls.find((item): item is string => typeof item === "string") ?? null : null,
      createdAt: normalizeText(post.createdAtIso) || new Date().toISOString(),
    }))
    .filter((post) => post.placeId && post.placeName && post.authorEmail);
}

function encodePostgrestIn(values: string[]) {
  return `(${values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(",")})`;
}

async function syncPlaceReviewTables(rawPosts: unknown) {
  const taggedPosts = buildTaggedReviewRows(rawPosts);
  const timestamp = new Date().toISOString();

  if (!taggedPosts.length) {
    const { error } = await supabaseServer.from("place_reviews").delete().not("post_id", "is", null);
    return error;
  }

  const placeRows = Array.from(
    new Map(
      taggedPosts.map((post) => [
        post.placeId,
        {
          id: post.placeId,
          name: post.placeName,
          kind: post.placeKind,
          address: post.placeAddress,
          city: post.placeCity,
          lat: post.placeLat,
          lon: post.placeLon,
          updated_at: timestamp,
        },
      ]),
    ).values(),
  );

  const { error: placesError } = await supabaseServer.from("places").upsert(placeRows, { onConflict: "id" });
  if (placesError) return placesError;

  const reviewRows = taggedPosts.map((post) => ({
    post_id: post.postId,
    place_id: post.placeId,
    author_email: post.authorEmail,
    author_name: post.authorName,
    caption: post.caption,
    taste_tag: post.tasteTag,
    price_tag: post.priceTag,
    photo_url: post.photoUrl,
    created_at: post.createdAt,
    updated_at: timestamp,
  }));

  const { error: reviewsError } = await supabaseServer.from("place_reviews").upsert(reviewRows, { onConflict: "post_id" });
  if (reviewsError) return reviewsError;

  const { error: deleteError } = await supabaseServer
    .from("place_reviews")
    .delete()
    .not("post_id", "in", encodePostgrestIn(taggedPosts.map((post) => post.postId)));

  return deleteError;
}

async function sendAnnouncementPush(announcement: { id: string; title: string; body: string }) {
  if (!webPushEnabled) return;

  const { data, error } = await supabaseServer.from("push_subscriptions").select("author_email");
  if (error) return;

  await sendPushToEmails(
    (data ?? []).map((row) => String(row.author_email ?? "")).filter(Boolean),
    {
      title: announcement.title,
      body: announcement.body,
      url: "/",
      tag: announcement.id,
    },
  );
}

async function sendFriendPostPush(rawPosts: unknown, previousPosts: unknown, accountsRaw: unknown) {
  if (!webPushEnabled) return;

  const previousIds = new Set(
    normalizeObjectArray(previousPosts)
      .map((post) => String(post.id ?? ""))
      .filter(Boolean),
  );
  const accounts = normalizeObjectArray(accountsRaw);
  const accountByEmail = new Map(
    accounts
      .map((account) => [normalizeEmail(account.googleProfile && typeof account.googleProfile === "object" ? (account.googleProfile as JsonRecord).email : ""), account] as const)
      .filter(([email]) => Boolean(email)),
  );

  const newStudentPosts = normalizeObjectArray(rawPosts).filter((post) => {
    const postId = String(post.id ?? "");
    return Boolean(postId) && !previousIds.has(postId) && post.authorRole === "student" && post.type !== "weekly-dump";
  });

  await Promise.all(
    newStudentPosts.map(async (post) => {
      const authorEmail = normalizeEmail(post.authorEmail);
      if (!authorEmail) return;
      const authorAccount = accountByEmail.get(authorEmail);
      const friendEmails = Array.isArray(authorAccount?.profile && typeof authorAccount.profile === "object" ? (authorAccount.profile as JsonRecord).friends : [])
        ? ((authorAccount?.profile as { friends?: string[] }).friends ?? []).map((email) => email.toLowerCase())
        : [];
      if (!friendEmails.length) return;

      await sendPushToEmails(friendEmails, {
        title: `${normalizeText(post.authorName) || "your friend"} posted`,
        body: normalizeText(post.taggedPlaceName)
          ? `${normalizeText(post.taggedPlaceName)} is on their feed now.`
          : "something new landed in crumbz.",
        url: "/",
        tag: `post-${String(post.id)}`,
      });
    }),
  );
}

async function sendAdminPostPush(rawPosts: unknown, previousPosts: unknown) {
  if (!webPushEnabled) return;

  const previousIds = new Set(
    normalizeObjectArray(previousPosts)
      .map((post) => String(post.id ?? ""))
      .filter(Boolean),
  );
  const newAdminPosts = normalizeObjectArray(rawPosts).filter((post) => {
    const postId = String(post.id ?? "");
    return Boolean(postId) && !previousIds.has(postId) && post.authorRole !== "student";
  });

  if (!newAdminPosts.length) return;

  const { data, error } = await supabaseServer.from("push_subscriptions").select("author_email");
  if (error) return;
  const emails = (data ?? []).map((row) => String(row.author_email ?? "")).filter(Boolean);

  await Promise.all(
    newAdminPosts.map((post) =>
      sendPushToEmails(emails, {
        title: `crumbz posted ${normalizeText(post.title) || "something new"}`,
        body: normalizeText(post.body) || "open crumbz to see the new drop.",
        url: "/",
        tag: `admin-post-${String(post.id)}`,
      }),
    ),
  );
}

function mergePostsForUser(currentPostsRaw: unknown, proposedPostsRaw: unknown, verifiedEmail: string) {
  const currentPosts = normalizeObjectArray(currentPostsRaw);
  const proposedPosts = normalizeObjectArray(proposedPostsRaw);
  const preservedPosts = currentPosts.filter((post) => normalizeEmail(post.authorEmail) !== verifiedEmail);
  const preservedIds = new Set(preservedPosts.map((post) => String(post.id ?? "")).filter(Boolean));
  const nextOwnPosts = proposedPosts.filter(
    (post) =>
      normalizeEmail(post.authorEmail) === verifiedEmail &&
      post.authorRole === "student" &&
      typeof post.id === "string" &&
      !preservedIds.has(post.id),
  );

  return sortPosts([...preservedPosts, ...nextOwnPosts]);
}

function mergeInteractionsForUser(currentRaw: unknown, proposedRaw: unknown, verifiedEmail: string) {
  const current = normalizeInteractionsMap(currentRaw);
  const proposed = normalizeInteractionsMap(proposedRaw);
  const postIds = new Set([...Object.keys(current), ...Object.keys(proposed)]);

  return Object.fromEntries(
    Array.from(postIds).map((postId) => {
      const currentBucket = current[postId] ?? { comments: [], shares: [], likes: [] };
      const proposedBucket = proposed[postId] ?? { comments: [], shares: [], likes: [] };

      const preservedComments = currentBucket.comments.filter((comment) => normalizeEmail(comment.authorEmail) !== verifiedEmail);
      const preservedCommentIds = new Set(preservedComments.map((comment) => String(comment.id ?? "")).filter(Boolean));
      const nextOwnComments = dedupeByKey(
        proposedBucket.comments
          .filter(
            (comment) =>
              normalizeEmail(comment.authorEmail) === verifiedEmail &&
              typeof comment.id === "string" &&
              !preservedCommentIds.has(comment.id),
          )
          .map((comment) => {
            const nextComment = { ...comment };
            delete nextComment.hidden;
            return nextComment;
          }),
        (comment) => String(comment.id ?? ""),
      );

      const preservedShares = currentBucket.shares.filter((share) => normalizeEmail(share.authorEmail) !== verifiedEmail);
      const nextOwnShares = dedupeByKey(
        proposedBucket.shares.filter((share) => normalizeEmail(share.authorEmail) === verifiedEmail),
        (share) => String(share.id ?? `${share.authorEmail}-${share.platform}-${share.createdAt}`),
      );

      const preservedLikes = currentBucket.likes.filter((like) => normalizeEmail(like.authorEmail) !== verifiedEmail);
      const proposedOwnLikes = proposedBucket.likes.filter((like) => normalizeEmail(like.authorEmail) === verifiedEmail);
      const nextOwnLikes = proposedOwnLikes.length ? [proposedOwnLikes[proposedOwnLikes.length - 1]] : [];

      return [
        postId,
        {
          comments: [...preservedComments, ...nextOwnComments],
          shares: [...preservedShares, ...nextOwnShares],
          likes: [...preservedLikes, ...nextOwnLikes],
        },
      ];
    }),
  );
}

function mergeDareForUser(currentRaw: unknown, proposedRaw: unknown, verifiedEmail: string) {
  const current = currentRaw && typeof currentRaw === "object" && !Array.isArray(currentRaw) ? { ...(currentRaw as JsonRecord) } : {};
  const proposed = proposedRaw && typeof proposedRaw === "object" && !Array.isArray(proposedRaw) ? (proposedRaw as JsonRecord) : {};

  const currentAccepted = Array.isArray(current.acceptedEmails) ? current.acceptedEmails.filter((email): email is string => typeof email === "string") : [];
  const proposedAccepted = Array.isArray(proposed.acceptedEmails) ? proposed.acceptedEmails.filter((email): email is string => typeof email === "string") : [];
  const nextAcceptedEmails = [
    ...new Set([
      ...currentAccepted.filter((email) => email.toLowerCase() !== verifiedEmail),
      ...(proposedAccepted.some((email) => email.toLowerCase() === verifiedEmail) ? [verifiedEmail] : []),
    ]),
  ];

  const currentReminders = Array.isArray(current.reminderEmails) ? current.reminderEmails.filter((email): email is string => typeof email === "string") : [];
  const proposedReminders = Array.isArray(proposed.reminderEmails) ? proposed.reminderEmails.filter((email): email is string => typeof email === "string") : [];
  const nextReminderEmails = [
    ...new Set([
      ...currentReminders.filter((email) => email.toLowerCase() !== verifiedEmail),
      ...(proposedReminders.some((email) => email.toLowerCase() === verifiedEmail) ? [verifiedEmail] : []),
    ]),
  ];

  const currentSubmissions = normalizeObjectArray(current.submissions);
  const preservedSubmissions = currentSubmissions.filter((submission) => normalizeEmail(submission.authorEmail) !== verifiedEmail);
  const preservedSubmissionIds = new Set(preservedSubmissions.map((submission) => String(submission.id ?? "")).filter(Boolean));
  const nextOwnSubmissions = normalizeObjectArray(proposed.submissions).filter(
    (submission) =>
      normalizeEmail(submission.authorEmail) === verifiedEmail &&
      typeof submission.id === "string" &&
      !preservedSubmissionIds.has(submission.id),
  );

  return {
    ...current,
    acceptedEmails: nextAcceptedEmails,
    reminderEmails: nextReminderEmails,
    submissions: [...preservedSubmissions, ...nextOwnSubmissions],
  };
}

async function readAppState() {
  const primary = await supabaseServer
    .from("app_state")
    .select("accounts, posts, interactions, announcements")
    .eq("id", STATE_ROW_ID)
    .maybeSingle();

  if (!primary.error) {
    return {
      data: primary.data,
      error: null,
      supportsAnnouncements: true,
    };
  }

  const fallback = await supabaseServer
    .from("app_state")
    .select("accounts, posts, interactions")
    .eq("id", STATE_ROW_ID)
    .maybeSingle();

  return {
    data: fallback.data,
    error: fallback.error,
    supportsAnnouncements: false,
  };
}

async function readAccountState() {
  const { data, error } = await supabaseServer
    .from("app_state")
    .select("accounts")
    .eq("id", ACCOUNTS_ROW_ID)
    .maybeSingle();

  return { data, error };
}

export async function GET() {
  const { data, error, supportsAnnouncements } = await readAppState();
  const { data: accountData } = await readAccountState();
  const stateData = data as { accounts?: unknown; posts?: unknown; interactions?: unknown; announcements?: unknown } | null;
  const accountState = accountData as { accounts?: unknown } | null;
  const fallbackMeta = splitInteractionsAndAnnouncements(stateData?.interactions);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    accounts: accountState?.accounts ?? stateData?.accounts ?? [],
    posts: stateData?.posts ?? [],
    interactions: fallbackMeta.interactions,
    dare: fallbackMeta.dare ?? {},
    announcements: supportsAnnouncements ? stateData?.announcements ?? [] : fallbackMeta.announcements,
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function POST(request: Request) {
  const { error: authError, identity } = await requireVerifiedIdentity(request);
  if (authError || !identity) {
    return authError;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        accounts?: unknown;
        posts?: unknown;
        interactions?: unknown;
        dare?: unknown;
        announcements?: unknown;
        deletePostId?: string;
      }
    | null;

  const { data: currentData, error: currentError, supportsAnnouncements } = await readAppState();
  const { data: currentAccountData } = await readAccountState();
  const stateData = currentData as { accounts?: unknown; posts?: unknown; interactions?: unknown; announcements?: unknown } | null;
  const accountState = currentAccountData as { accounts?: unknown } | null;
  const fallbackMeta = splitInteractionsAndAnnouncements(stateData?.interactions);

  if (currentError) {
    return NextResponse.json({ ok: false, message: currentError.message }, { status: 500 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const deletePostId = body?.deletePostId?.trim() ?? "";
  if (deletePostId) {
    if (!identity.isAdmin) {
      return NextResponse.json({ ok: false, message: "only the admin account can delete posts here." }, { status: 403 });
    }

    const nextPosts = normalizeObjectArray(stateData?.posts).filter((post) => String(post.id ?? "") !== deletePostId);
    const currentMeta = splitInteractionsAndAnnouncements(stateData?.interactions);
    const nextInteractions = { ...currentMeta.interactions };
    delete nextInteractions[deletePostId];

    updates.posts = sortPosts(nextPosts);
    updates.interactions = mergeInteractionsAndAnnouncements(
      nextInteractions,
      supportsAnnouncements ? stateData?.announcements ?? [] : currentMeta.announcements,
      currentMeta.dare,
    );

    if (supportsAnnouncements) {
      updates.announcements = stateData?.announcements ?? [];
    }
  }

  if ("posts" in (body ?? {})) {
    updates.posts = identity.isAdmin
      ? body?.posts ?? []
      : mergePostsForUser(stateData?.posts, body?.posts, identity.email);
  }

  if ("announcements" in (body ?? {}) && !identity.isAdmin) {
    return NextResponse.json({ ok: false, message: "only the admin account can change announcements." }, { status: 403 });
  }

  const nextInteractions = "interactions" in (body ?? {})
    ? (identity.isAdmin ? body?.interactions ?? {} : mergeInteractionsForUser(fallbackMeta.interactions, body?.interactions, identity.email))
    : fallbackMeta.interactions;
  const nextDare = "dare" in (body ?? {})
    ? (identity.isAdmin ? body?.dare ?? fallbackMeta.dare : mergeDareForUser(fallbackMeta.dare, body?.dare, identity.email))
    : fallbackMeta.dare;
  const nextAnnouncements = "announcements" in (body ?? {})
    ? body?.announcements ?? []
    : supportsAnnouncements
      ? stateData?.announcements ?? []
      : fallbackMeta.announcements;
  const currentAnnouncementIds = new Set(
    normalizeObjectArray(supportsAnnouncements ? stateData?.announcements : fallbackMeta.announcements)
      .map((announcement) => String(announcement.id ?? ""))
      .filter(Boolean),
  );
  const newestAnnouncement = normalizeObjectArray(nextAnnouncements)[0] ?? null;
  const shouldSendAnnouncementPush =
    identity.isAdmin &&
    "announcements" in (body ?? {}) &&
    newestAnnouncement &&
    typeof newestAnnouncement.id === "string" &&
    !currentAnnouncementIds.has(newestAnnouncement.id);

  if ("interactions" in (body ?? {}) || "announcements" in (body ?? {}) || "dare" in (body ?? {})) {
    updates.interactions = mergeInteractionsAndAnnouncements(nextInteractions, nextAnnouncements, nextDare);
    if (supportsAnnouncements && "announcements" in (body ?? {})) {
      updates.announcements = nextAnnouncements;
    }
  }

  const hasMeaningfulUpdate = Object.keys(updates).some((key) => key !== "updated_at");
  if (!hasMeaningfulUpdate) {
    return NextResponse.json({ ok: true });
  }

  const nextRow: Record<string, unknown> = {
    id: STATE_ROW_ID,
    updated_at: updates.updated_at,
    accounts: stateData?.accounts ?? [],
    posts: "posts" in updates ? updates.posts : stateData?.posts ?? [],
  };

  if (supportsAnnouncements) {
    nextRow.interactions = "interactions" in updates ? updates.interactions : stateData?.interactions ?? {};
    nextRow.announcements = "announcements" in updates ? updates.announcements : stateData?.announcements ?? [];
  } else {
    nextRow.interactions = "interactions" in updates ? updates.interactions : fallbackMeta.interactions;
  }

  const { error } = await supabaseServer
    .from("app_state")
    .upsert(nextRow, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  if ("posts" in updates) {
    const reviewSyncError = await syncPlaceReviewTables(nextRow.posts);

    if (reviewSyncError && !reviewSyncError.message.includes('relation "public.places" does not exist') && !reviewSyncError.message.includes('relation "public.place_reviews" does not exist')) {
      return NextResponse.json({ ok: false, message: reviewSyncError.message }, { status: 500 });
    }
  }

  if (shouldSendAnnouncementPush) {
    await sendAnnouncementPush({
      id: String(newestAnnouncement.id),
      title: String(newestAnnouncement.title ?? "crumbz"),
      body: String(newestAnnouncement.body ?? "something new dropped."),
    });
  }

  if ("posts" in updates && !identity.isAdmin) {
    await sendFriendPostPush(nextRow.posts, stateData?.posts, accountState?.accounts ?? stateData?.accounts ?? []);
  }

  if ("posts" in updates && identity.isAdmin) {
    await sendAdminPostPush(nextRow.posts, stateData?.posts);
  }

  return NextResponse.json({ ok: true });
}
