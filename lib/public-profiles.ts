import { supabaseServer } from "@/lib/supabase/server";

const ACCOUNTS_ROW_ID = "crumbz-accounts-state";

type StoredAccount = {
  googleProfile?: {
    picture?: string;
  } | null;
  profile?: {
    fullName?: string;
    username?: string;
    bio?: string;
    city?: string;
    schoolName?: string;
  } | null;
};

export type PublicProfilePreview = {
  fullName: string;
  username: string;
  bio: string;
  city: string;
  schoolName: string;
  picture: string;
};

export async function readPublicProfilePreview(handle: string): Promise<PublicProfilePreview | null> {
  const normalizedHandle = handle.trim().replace(/^@+/, "").toLowerCase();
  if (!normalizedHandle) return null;

  const { data, error } = await supabaseServer
    .from("app_state")
    .select("accounts")
    .eq("id", ACCOUNTS_ROW_ID)
    .maybeSingle();

  if (error || !Array.isArray(data?.accounts)) return null;

  const matchedAccount = (data.accounts as StoredAccount[]).find(
    (account) => account.profile?.username?.trim().toLowerCase() === normalizedHandle,
  );

  if (!matchedAccount) return null;

  return {
    fullName: matchedAccount.profile?.fullName?.trim() || normalizedHandle,
    username: matchedAccount.profile?.username?.trim() || normalizedHandle,
    bio: matchedAccount.profile?.bio?.trim() || "",
    city: matchedAccount.profile?.city?.trim() || "",
    schoolName: matchedAccount.profile?.schoolName?.trim() || "",
    picture: matchedAccount.googleProfile?.picture?.trim() || "",
  };
}
