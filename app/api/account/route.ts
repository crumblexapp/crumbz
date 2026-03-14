import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const STATE_ROW_ID = "crumbz-app-state";

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
  const { data, error } = await supabaseServer
    .from("app_state")
    .select("accounts")
    .eq("id", STATE_ROW_ID)
    .maybeSingle();

  return {
    accounts: Array.isArray(data?.accounts) ? (data.accounts as StoredUser[]).map(normalizeAccount) : [],
    error,
  };
}

async function writeAccounts(accounts: StoredUser[]) {
  return supabaseServer
    .from("app_state")
    .update({
      accounts,
      updated_at: new Date().toISOString(),
    })
    .eq("id", STATE_ROW_ID);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        action?: "upsert_account" | "send_friend_request" | "accept_friend_request" | "decline_friend_request" | "remove_friend" | "update_favorites";
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

  const { error: writeError } = await writeAccounts(nextAccounts);
  if (writeError) {
    return NextResponse.json({ ok: false, message: writeError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    accounts: nextAccounts,
    user: nextUser,
  });
}
