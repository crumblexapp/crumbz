import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/lib/google-auth";

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
  const stateData = currentData as { accounts?: unknown; posts?: unknown; interactions?: unknown; announcements?: unknown } | null;
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

  return NextResponse.json({ ok: true });
}
