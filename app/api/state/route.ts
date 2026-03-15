import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATE_ROW_ID = "crumbz-app-state";
const ACCOUNTS_ROW_ID = "crumbz-accounts-state";
const ANNOUNCEMENTS_META_KEY = "__announcements";
const PLANS_META_KEY = "__plans";

function splitInteractionsAndAnnouncements(rawInteractions: unknown) {
  const interactions =
    rawInteractions && typeof rawInteractions === "object" && !Array.isArray(rawInteractions)
      ? { ...(rawInteractions as Record<string, unknown>) }
      : {};

  const announcements = Array.isArray(interactions[ANNOUNCEMENTS_META_KEY]) ? interactions[ANNOUNCEMENTS_META_KEY] : [];
  const plans = Array.isArray(interactions[PLANS_META_KEY]) ? interactions[PLANS_META_KEY] : [];
  delete interactions[ANNOUNCEMENTS_META_KEY];
  delete interactions[PLANS_META_KEY];

  return { interactions, announcements, plans };
}

function mergeInteractionsAndAnnouncements(rawInteractions: unknown, rawAnnouncements: unknown, rawPlans: unknown) {
  const interactions =
    rawInteractions && typeof rawInteractions === "object" && !Array.isArray(rawInteractions)
      ? { ...(rawInteractions as Record<string, unknown>) }
      : {};

  return {
    ...interactions,
    [ANNOUNCEMENTS_META_KEY]: Array.isArray(rawAnnouncements) ? rawAnnouncements : [],
    [PLANS_META_KEY]: Array.isArray(rawPlans) ? rawPlans : [],
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
    announcements: supportsAnnouncements ? stateData?.announcements ?? [] : fallbackMeta.announcements,
    plans: fallbackMeta.plans,
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        accounts?: unknown;
        posts?: unknown;
        interactions?: unknown;
        plans?: unknown;
        announcements?: unknown;
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

  if ("posts" in (body ?? {})) {
    updates.posts = body?.posts ?? [];
  }

  if (supportsAnnouncements) {
    if ("interactions" in (body ?? {})) {
      updates.interactions = body?.interactions ?? {};
    }

    if ("announcements" in (body ?? {})) {
      updates.announcements = body?.announcements ?? [];
    }

    if ("interactions" in (body ?? {}) || "plans" in (body ?? {})) {
      updates.interactions = mergeInteractionsAndAnnouncements(
        "interactions" in (body ?? {}) ? body?.interactions ?? {} : stateData?.interactions ?? {},
        "announcements" in (body ?? {}) ? body?.announcements ?? stateData?.announcements ?? [] : stateData?.announcements ?? [],
        "plans" in (body ?? {}) ? body?.plans ?? fallbackMeta.plans : fallbackMeta.plans,
      );
    }
  } else {
    const nextInteractions =
      "interactions" in (body ?? {}) ? body?.interactions ?? {} : fallbackMeta.interactions;
    const nextAnnouncements =
      "announcements" in (body ?? {}) ? body?.announcements ?? [] : fallbackMeta.announcements;
    const nextPlans = "plans" in (body ?? {}) ? body?.plans ?? [] : fallbackMeta.plans;

    if ("interactions" in (body ?? {}) || "announcements" in (body ?? {}) || "plans" in (body ?? {})) {
      updates.interactions = mergeInteractionsAndAnnouncements(nextInteractions, nextAnnouncements, nextPlans);
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
