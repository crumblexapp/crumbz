import { NextResponse } from "next/server";
import { requireVerifiedIdentity } from "@/lib/google-auth";
import { sendWebPushNotification, webPushEnabled, isValidPushSubscription } from "@/lib/web-push";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NativePushTokenPayload = {
  token?: unknown;
  platform?: unknown;
};

function normalizeNativePlatform(value: unknown) {
  return value === "ios" || value === "android" ? value : "";
}

export async function POST(request: Request) {
  const { error: authError, identity } = await requireVerifiedIdentity(request);
  if (authError || !identity) {
    return authError;
  }

  const body = (await request.json().catch(() => null)) as { action?: string; subscription?: unknown; nativeToken?: NativePushTokenPayload } | null;
  if (body?.action === "test") {
    if (!webPushEnabled) {
      return NextResponse.json({ ok: false, message: "web push isn't configured on the server yet." }, { status: 500 });
    }

    const { data, error } = await supabaseServer
      .from("push_subscriptions")
      .select("endpoint, subscription")
      .eq("author_email", identity.email)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    const row = data?.[0];
    if (!row || !isValidPushSubscription(row.subscription)) {
      return NextResponse.json({ ok: false, message: "no saved device alert subscription found for this account yet." }, { status: 404 });
    }

    const result = await sendWebPushNotification(row.subscription, {
      title: "crumbz test alert",
      body: "if you can see this outside the app, real device notifications are working.",
      url: "/",
      tag: `test-${Date.now()}`,
    });

    if (!result.ok) {
      if (result.reason === "expired") {
        await supabaseServer.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
      }

      return NextResponse.json(
        {
          ok: false,
          message:
            result.reason === "expired"
              ? "that saved device alert expired, so crumbz removed it. turn notifications off and on again on this phone."
              : "the test alert couldn't be delivered to this device.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, message: "test alert sent." });
  }

  const nativeToken = typeof body?.nativeToken?.token === "string" ? body.nativeToken.token.trim() : "";
  const nativePlatform = normalizeNativePlatform(body?.nativeToken?.platform);

  if (nativeToken || nativePlatform) {
    if (!nativeToken || !nativePlatform) {
      return NextResponse.json({ ok: false, message: "invalid native push token." }, { status: 400 });
    }

    const { error } = await supabaseServer.from("native_push_tokens").upsert(
      {
        token: nativeToken,
        author_email: identity.email,
        platform: nativePlatform,
        user_agent: request.headers.get("user-agent") ?? "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

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

  const body = (await request.json().catch(() => null)) as { endpoint?: string; nativeToken?: string } | null;
  const endpoint = body?.endpoint?.trim();
  const nativeToken = body?.nativeToken?.trim();

  if (!endpoint && !nativeToken) {
    return NextResponse.json({ ok: false, message: "missing endpoint or native token." }, { status: 400 });
  }

  if (nativeToken) {
    const { error } = await supabaseServer
      .from("native_push_tokens")
      .delete()
      .eq("token", nativeToken)
      .eq("author_email", identity.email);

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
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
