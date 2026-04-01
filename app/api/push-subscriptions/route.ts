import { NextResponse } from "next/server";
import { requireVerifiedIdentity } from "@/lib/google-auth";
import { supabaseServer } from "@/lib/supabase/server";
import { isValidPushSubscription } from "@/lib/web-push";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const { error: authError, identity } = await requireVerifiedIdentity(request);
  if (authError || !identity) {
    return authError;
  }

  const body = (await request.json().catch(() => null)) as { subscription?: unknown } | null;
  const subscription = body?.subscription;

  if (!isValidPushSubscription(subscription)) {
    return NextResponse.json({ ok: false, message: "invalid push subscription." }, { status: 400 });
  }

  const { error } = await supabaseServer.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      author_email: identity.email,
      subscription,
      user_agent: request.headers.get("user-agent") ?? "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { error: authError, identity } = await requireVerifiedIdentity(request);
  if (authError || !identity) {
    return authError;
  }

  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const endpoint = body?.endpoint?.trim();

  if (!endpoint) {
    return NextResponse.json({ ok: false, message: "missing endpoint." }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("author_email", identity.email);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
