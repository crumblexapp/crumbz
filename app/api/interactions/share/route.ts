import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/lib/google-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { error: authError, identity } = await requireVerifiedIdentity(request);
  if (authError || !identity) return authError!;

  const body = (await request.json().catch(() => null)) as {
    postId?: unknown;
    shareId?: unknown;
    platform?: unknown;
    authorName?: unknown;
  } | null;

  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const shareId = typeof body?.shareId === "string" ? body.shareId.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform.trim() : "unknown";
  const authorName = typeof body?.authorName === "string" ? body.authorName.trim() : "";

  if (!postId || !shareId) {
    return NextResponse.json({ ok: false, message: "postId and shareId are required." }, { status: 400 });
  }

  const rateLimitResult = await checkRateLimit(identity.email, "interaction");
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { ok: false, message: rateLimitResult.message },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) } },
    );
  }

  const now = new Date().toISOString();

  const { error } = await supabaseServer.from("post_interactions").insert({
    id: shareId,
    post_id: postId,
    interaction_type: "share",
    author_email: identity.email,
    author_name: authorName,
    payload: { platform },
    deleted_at: null,
    created_at: now,
    updated_at: now,
  });

  if (error && !error.message.includes("duplicate key")) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
