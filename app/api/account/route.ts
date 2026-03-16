import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ACCOUNTS_ROW_ID = "crumbz-accounts-state";
const STATE_ROW_ID = "crumbz-app-state";
const MEDIA_BUCKET = "crumbz-media";
const DARE_META_KEY = "__dare";

type StoredUser = {
  signedIn: boolean;
  googleProfile: {
    name: string;
    email: string;
    picture?: string;
  } | null;
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

function normalizeAccount(account: StoredUser) {
  return {
    ...account,
    profile: {
      ...account.profile,
      friends: account.profile.friends ?? [],
      incomingFriendRequests: account.profile.incomingFriendRequests ?? [],
      outgoingFriendRequests: account.profile.outgoingFriendRequests ?? [],
      favoritePlaceIds: account.profile.favoritePlaceIds ?? [],
    },
  };
}

function getEmail(account: StoredUser) {
  return account.googleProfile?.email?.toLowerCase() ?? "";
}

async function readAccounts() {
  const primary = await supabaseServer
    .from("app_state")
    .select("accounts")
    .eq("id", ACCOUNTS_ROW_ID)
    .maybeSingle();

  if (Array.isArray(primary.data?.accounts) && primary.data.accounts.length) {
    return {
      accounts: (primary.data.accounts as StoredUser[]).map(normalizeAccount),
      error: primary.error,
    };
  }

  const fallback = await supabaseServer
    .from("app_state")
    .select("accounts")
    .eq("id", "crumbz-app-state")
    .maybeSingle();

  return {
    accounts: Array.isArray(fallback.data?.accounts) ? (fallback.data.accounts as StoredUser[]).map(normalizeAccount) : [],
    error: primary.error ?? fallback.error,
  };
}

async function writeAccounts(accounts: StoredUser[]) {
  return supabaseServer
    .from("app_state")
    .upsert({
      id: ACCOUNTS_ROW_ID,
      accounts,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })
    .select("accounts")
    .single();
}

async function readSharedState() {
  return supabaseServer
    .from("app_state")
    .select("posts, interactions, announcements")
    .eq("id", STATE_ROW_ID)
    .maybeSingle();
}

async function writeSharedState(payload: {
  posts: unknown;
  interactions: unknown;
  announcements: unknown;
}) {
  return supabaseServer
    .from("app_state")
    .upsert({
      id: STATE_ROW_ID,
      posts: payload.posts,
      interactions: payload.interactions,
      announcements: payload.announcements,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
}

function getMediaPath(url: string) {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  return url.slice(index + marker.length);
}

function splitDareFromInteractions(rawInteractions: unknown) {
  const interactions =
    rawInteractions && typeof rawInteractions === "object" && !Array.isArray(rawInteractions)
      ? { ...(rawInteractions as Record<string, unknown>) }
      : {};
  const dare = interactions[DARE_META_KEY] && typeof interactions[DARE_META_KEY] === "object" ? interactions[DARE_META_KEY] : null;
  delete interactions[DARE_META_KEY];

  return { interactions, dare };
}

function mergeDareIntoInteractions(rawInteractions: unknown, rawDare: unknown) {
  const interactions =
    rawInteractions && typeof rawInteractions === "object" && !Array.isArray(rawInteractions)
      ? { ...(rawInteractions as Record<string, unknown>) }
      : {};

  return {
    ...interactions,
    [DARE_META_KEY]: rawDare && typeof rawDare === "object" ? rawDare : {},
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        action?: "upsert_account" | "send_friend_request" | "accept_friend_request" | "decline_friend_request" | "remove_friend" | "update_favorites" | "delete_account";
        account?: StoredUser;
        currentEmail?: string;
        targetEmail?: string;
        favoritePlaceIds?: string[];
      }
    | null;

  const action = body?.action;
  if (!action) {
    return NextResponse.json({ ok: false, message: "missing account action" }, { status: 400 });
  }

  const { accounts, error } = await readAccounts();
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  let nextAccounts = [...accounts];
  let nextUser: StoredUser | null = null;

  if (action === "upsert_account") {
    const account = body?.account ? normalizeAccount(body.account) : null;
    const email = account ? getEmail(account) : "";
    if (!account || !email) {
      return NextResponse.json({ ok: false, message: "missing account payload" }, { status: 400 });
    }

    nextAccounts = [...accounts.filter((item) => getEmail(item) !== email), account];
    nextUser = account;
  }

  if (action === "send_friend_request") {
    const currentEmail = body?.currentEmail?.toLowerCase() ?? "";
    const targetEmail = body?.targetEmail?.toLowerCase() ?? "";
    if (!currentEmail || !targetEmail) {
      return NextResponse.json({ ok: false, message: "missing emails" }, { status: 400 });
    }

    const hasCurrent = accounts.some((account) => getEmail(account) === currentEmail);
    const hasTarget = accounts.some((account) => getEmail(account) === targetEmail);
    if (!hasCurrent || !hasTarget) {
      return NextResponse.json({ ok: false, message: "one of those accounts is missing from shared data" }, { status: 400 });
    }

    nextAccounts = accounts.map((account) => {
      const email = getEmail(account);
      if (email === currentEmail) {
        const next = normalizeAccount({
          ...account,
          profile: {
            ...account.profile,
            outgoingFriendRequests: [...new Set([...account.profile.outgoingFriendRequests, targetEmail])],
          },
        });
        nextUser = next;
        return next;
      }

      if (email === targetEmail) {
        return normalizeAccount({
          ...account,
          profile: {
            ...account.profile,
            incomingFriendRequests: [...new Set([...account.profile.incomingFriendRequests, currentEmail])],
          },
        });
      }

      return account;
    });
  }

  if (action === "accept_friend_request") {
    const currentEmail = body?.currentEmail?.toLowerCase() ?? "";
    const targetEmail = body?.targetEmail?.toLowerCase() ?? "";
    if (!currentEmail || !targetEmail) {
      return NextResponse.json({ ok: false, message: "missing emails" }, { status: 400 });
    }

    const hasCurrent = accounts.some((account) => getEmail(account) === currentEmail);
    const hasTarget = accounts.some((account) => getEmail(account) === targetEmail);
    if (!hasCurrent || !hasTarget) {
      return NextResponse.json({ ok: false, message: "one of those accounts is missing from shared data" }, { status: 400 });
    }

    nextAccounts = accounts.map((account) => {
      const email = getEmail(account);
      if (email === currentEmail) {
        const next = normalizeAccount({
          ...account,
          profile: {
            ...account.profile,
            friends: [...new Set([...account.profile.friends, targetEmail])],
            incomingFriendRequests: account.profile.incomingFriendRequests.filter((item) => item !== targetEmail),
          },
        });
        nextUser = next;
        return next;
      }

      if (email === targetEmail) {
        return normalizeAccount({
          ...account,
          profile: {
            ...account.profile,
            friends: [...new Set([...account.profile.friends, currentEmail])],
            outgoingFriendRequests: account.profile.outgoingFriendRequests.filter((item) => item !== currentEmail),
          },
        });
      }

      return account;
    });
  }

  if (action === "decline_friend_request") {
    const currentEmail = body?.currentEmail?.toLowerCase() ?? "";
    const targetEmail = body?.targetEmail?.toLowerCase() ?? "";
    if (!currentEmail || !targetEmail) {
      return NextResponse.json({ ok: false, message: "missing emails" }, { status: 400 });
    }

    const hasCurrent = accounts.some((account) => getEmail(account) === currentEmail);
    const hasTarget = accounts.some((account) => getEmail(account) === targetEmail);
    if (!hasCurrent || !hasTarget) {
      return NextResponse.json({ ok: false, message: "one of those accounts is missing from shared data" }, { status: 400 });
    }

    nextAccounts = accounts.map((account) => {
      const email = getEmail(account);
      if (email === currentEmail) {
        const next = normalizeAccount({
          ...account,
          profile: {
            ...account.profile,
            incomingFriendRequests: account.profile.incomingFriendRequests.filter((item) => item !== targetEmail),
          },
        });
        nextUser = next;
        return next;
      }

      if (email === targetEmail) {
        return normalizeAccount({
          ...account,
          profile: {
            ...account.profile,
            outgoingFriendRequests: account.profile.outgoingFriendRequests.filter((item) => item !== currentEmail),
          },
        });
      }

      return account;
    });
  }

  if (action === "remove_friend") {
    const currentEmail = body?.currentEmail?.toLowerCase() ?? "";
    const targetEmail = body?.targetEmail?.toLowerCase() ?? "";
    if (!currentEmail || !targetEmail) {
      return NextResponse.json({ ok: false, message: "missing emails" }, { status: 400 });
    }

    const hasCurrent = accounts.some((account) => getEmail(account) === currentEmail);
    const hasTarget = accounts.some((account) => getEmail(account) === targetEmail);
    if (!hasCurrent || !hasTarget) {
      return NextResponse.json({ ok: false, message: "one of those accounts is missing from shared data" }, { status: 400 });
    }

    nextAccounts = accounts.map((account) => {
      const email = getEmail(account);
      if (email === currentEmail) {
        const next = normalizeAccount({
          ...account,
          profile: {
            ...account.profile,
            friends: account.profile.friends.filter((item) => item !== targetEmail),
          },
        });
        nextUser = next;
        return next;
      }

      if (email === targetEmail) {
        return normalizeAccount({
          ...account,
          profile: {
            ...account.profile,
            friends: account.profile.friends.filter((item) => item !== currentEmail),
          },
        });
      }

      return account;
    });
  }

  if (action === "update_favorites") {
    const currentEmail = body?.currentEmail?.toLowerCase() ?? "";
    if (!currentEmail) {
      return NextResponse.json({ ok: false, message: "missing email" }, { status: 400 });
    }

    nextAccounts = accounts.map((account) => {
      if (getEmail(account) !== currentEmail) return account;

      const next = normalizeAccount({
        ...account,
        profile: {
          ...account.profile,
          favoritePlaceIds: Array.isArray(body?.favoritePlaceIds) ? body.favoritePlaceIds : [],
        },
      });
      nextUser = next;
      return next;
    });
  }

  if (action === "delete_account") {
    const targetEmail = body?.targetEmail?.toLowerCase() ?? "";
    if (!targetEmail) {
      return NextResponse.json({ ok: false, message: "missing target email" }, { status: 400 });
    }

    const existingAccount = accounts.find((account) => getEmail(account) === targetEmail);
    if (!existingAccount) {
      return NextResponse.json({ ok: false, message: "account not found" }, { status: 404 });
    }

    nextAccounts = accounts
      .filter((account) => getEmail(account) !== targetEmail)
      .map((account) =>
        normalizeAccount({
          ...account,
          profile: {
            ...account.profile,
            friends: account.profile.friends.filter((item) => item !== targetEmail),
            incomingFriendRequests: account.profile.incomingFriendRequests.filter((item) => item !== targetEmail),
            outgoingFriendRequests: account.profile.outgoingFriendRequests.filter((item) => item !== targetEmail),
          },
        }),
      );

    const { data: savedData, error: writeError } = await writeAccounts(nextAccounts);
    if (writeError) {
      return NextResponse.json({ ok: false, message: writeError.message }, { status: 500 });
    }

    const savedAccounts = Array.isArray(savedData?.accounts) ? (savedData.accounts as StoredUser[]).map(normalizeAccount) : nextAccounts;

    const { data: sharedState } = await readSharedState().catch(() => ({ data: null }));
    const posts = Array.isArray(sharedState?.posts) ? (sharedState.posts as Array<Record<string, unknown>>) : [];
    const deletedPosts = posts.filter((post) => String(post.authorEmail ?? "").toLowerCase() === targetEmail);
    const deletedPostIds = new Set(deletedPosts.map((post) => String(post.id ?? "")));
    const nextPosts = posts.filter((post) => String(post.authorEmail ?? "").toLowerCase() !== targetEmail);
    const { interactions: currentInteractions, dare } = splitDareFromInteractions(sharedState?.interactions);

    const nextInteractions = Object.fromEntries(
      Object.entries(currentInteractions)
        .filter(([postId]) => !deletedPostIds.has(postId))
        .map(([postId, bucket]) => {
          const typedBucket = bucket as {
            comments?: Array<{ authorEmail?: string } & Record<string, unknown>>;
            shares?: Array<{ authorEmail?: string } & Record<string, unknown>>;
            likes?: Array<{ authorEmail?: string } & Record<string, unknown>>;
          };

          return [
            postId,
            {
              ...typedBucket,
              comments: (typedBucket.comments ?? []).filter((comment) => String(comment.authorEmail ?? "").toLowerCase() !== targetEmail),
              shares: (typedBucket.shares ?? []).filter((share) => String(share.authorEmail ?? "").toLowerCase() !== targetEmail),
              likes: (typedBucket.likes ?? []).filter((like) => String(like.authorEmail ?? "").toLowerCase() !== targetEmail),
            },
          ];
        }),
    );

    await writeSharedState({
      posts: nextPosts,
      interactions: mergeDareIntoInteractions(
        nextInteractions,
        dare && typeof dare === "object"
          ? {
              ...(dare as Record<string, unknown>),
              acceptedEmails: Array.isArray((dare as { acceptedEmails?: unknown[] }).acceptedEmails)
                ? ((dare as { acceptedEmails?: string[] }).acceptedEmails ?? []).filter((email) => email.toLowerCase() !== targetEmail.toLowerCase())
                : [],
              submissions: Array.isArray((dare as { submissions?: Array<{ authorEmail?: string }> }).submissions)
                ? ((dare as { submissions?: Array<Record<string, unknown>> }).submissions ?? []).filter(
                    (submission) => String(submission.authorEmail ?? "").toLowerCase() !== targetEmail.toLowerCase(),
                  )
                : [],
              winnerSubmissionId:
                Array.isArray((dare as { submissions?: Array<{ id?: string; authorEmail?: string }> }).submissions) &&
                (dare as { winnerSubmissionId?: string | null }).winnerSubmissionId
                  ? ((dare as { submissions?: Array<{ id?: string; authorEmail?: string }> }).submissions ?? []).some(
                      (submission) =>
                        submission.id === (dare as { winnerSubmissionId?: string | null }).winnerSubmissionId &&
                        String(submission.authorEmail ?? "").toLowerCase() !== targetEmail.toLowerCase(),
                    )
                    ? (dare as { winnerSubmissionId?: string | null }).winnerSubmissionId ?? null
                    : null
                  : null,
            }
          : {},
      ),
      announcements: sharedState?.announcements ?? [],
    }).catch(() => undefined);

    const mediaPaths = deletedPosts
      .flatMap((post) => (Array.isArray(post.mediaUrls) ? post.mediaUrls : []))
      .map((url) => (typeof url === "string" ? getMediaPath(url) : null))
      .filter((path): path is string => Boolean(path));

    if (mediaPaths.length) {
      await supabaseServer.storage.from(MEDIA_BUCKET).remove(mediaPaths).catch(() => undefined);
    }

    return NextResponse.json({
      ok: true,
      accounts: savedAccounts,
      user: null,
    });
  }

  const { data: savedData, error: writeError } = await writeAccounts(nextAccounts);
  if (writeError) {
    return NextResponse.json({ ok: false, message: writeError.message }, { status: 500 });
  }

  const savedAccounts = Array.isArray(savedData?.accounts) ? (savedData.accounts as StoredUser[]).map(normalizeAccount) : nextAccounts;
  if (action !== "upsert_account" && nextUser) {
    nextUser = savedAccounts.find((account) => getEmail(account) === getEmail(nextUser as StoredUser)) ?? nextUser;
  }

  return NextResponse.json({
    ok: true,
    accounts: savedAccounts,
    user: nextUser,
  });
}
