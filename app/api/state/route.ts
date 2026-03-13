import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const STATE_ROW_ID = "crumbz-app-state";
const ANNOUNCEMENTS_META_KEY = "__announcements";

function splitInteractionsAndAnnouncements(rawInteractions: unknown) {
  const interactions =
    rawInteractions && typeof rawInteractions === "object" && !Array.isArray(rawInteractions)
      ? { ...(rawInteractions as Record<string, unknown>) }
      : {};

  const announcements = Array.isArray(interactions[ANNOUNCEMENTS_META_KEY]) ? interactions[ANNOUNCEMENTS_META_KEY] : [];
  delete interactions[ANNOUNCEMENTS_META_KEY];

  return { interactions, announcements };
}

function mergeInteractionsAndAnnouncements(rawInteractions: unknown, rawAnnouncements: unknown) {
  const interactions =
    rawInteractions && typeof rawInteractions === "object" && !Array.isArray(rawInteractions)
      ? { ...(rawInteractions as Record<string, unknown>) }
      : {};

  return {
    ...interactions,
    [ANNOUNCEMENTS_META_KEY]: Array.isArray(rawAnnouncements) ? rawAnnouncements : [],
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

export async function GET() {
  const { data, error, supportsAnnouncements } = await readAppState();
  const stateData = data as { accounts?: unknown; posts?: unknown; interactions?: unknown; announcements?: unknown } | null;
  const fallbackMeta = splitInteractionsAndAnnouncements(stateData?.interactions);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    accounts: stateData?.accounts ?? [],
    posts: stateData?.posts ?? [],
    interactions: supportsAnnouncements ? stateData?.interactions ?? {} : fallbackMeta.interactions,
    announcements: supportsAnnouncements ? stateData?.announcements ?? [] : fallbackMeta.announcements,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        accounts?: unknown;
        posts?: unknown;
        interactions?: unknown;
        announcements?: unknown;
      }
    | null;

  const { data: currentData, error: currentError, supportsAnnouncements } = await readAppState();
  const stateData = currentData as { accounts?: unknown; posts?: unknown; interactions?: unknown; announcements?: unknown } | null;
  const fallbackMeta = splitInteractionsAndAnnouncements(stateData?.interactions);

  if (currentError) {
    return NextResponse.json({ ok: false, message: currentError.message }, { status: 500 });
  }

  const payload = {
    id: STATE_ROW_ID,
    accounts: body?.accounts ?? stateData?.accounts ?? [],
    posts: body?.posts ?? stateData?.posts ?? [],
    interactions: supportsAnnouncements
      ? body?.interactions ?? stateData?.interactions ?? {}
      : mergeInteractionsAndAnnouncements(
          body?.interactions ?? fallbackMeta.interactions,
          body?.announcements ?? fallbackMeta.announcements,
        ),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseServer.from("app_state").upsert(
    supportsAnnouncements
      ? {
          ...payload,
          announcements: body?.announcements ?? stateData?.announcements ?? [],
        }
      : payload,
    { onConflict: "id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
