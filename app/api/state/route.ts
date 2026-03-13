import { NextResponse } from "next/server";
import { isSiteAuthorized } from "@/lib/site-auth-server";
import { supabaseServer } from "@/lib/supabase/server";

const STATE_ROW_ID = "crumbz-app-state";

export async function GET() {
  if (!(await isSiteAuthorized())) {
    return NextResponse.json({ ok: false, message: "not authorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("app_state")
    .select("accounts, posts, interactions")
    .eq("id", STATE_ROW_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    accounts: data?.accounts ?? [],
    posts: data?.posts ?? [],
    interactions: data?.interactions ?? {},
  });
}

export async function POST(request: Request) {
  if (!(await isSiteAuthorized())) {
    return NextResponse.json({ ok: false, message: "not authorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        accounts?: unknown;
        posts?: unknown;
        interactions?: unknown;
      }
    | null;

  const { data: currentData, error: currentError } = await supabaseServer
    .from("app_state")
    .select("accounts, posts, interactions")
    .eq("id", STATE_ROW_ID)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ ok: false, message: currentError.message }, { status: 500 });
  }

  const { error } = await supabaseServer.from("app_state").upsert(
    {
      id: STATE_ROW_ID,
      accounts: body?.accounts ?? currentData?.accounts ?? [],
      posts: body?.posts ?? currentData?.posts ?? [],
      interactions: body?.interactions ?? currentData?.interactions ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
