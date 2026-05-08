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
    saved?: unknown;
    authorName?: unknown;
    placeId?: unknown;
  } | null;

  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const saved = Boolean(body?.saved);
  const authorName = typeof body?.authorName === "string" ? body.authorName.trim() : "";
  const placeId = typeof body?.placeId === "string" ? body.placeId.trim() : "";

  if (!postId) {
    return NextResponse.json({ ok: false, message: "postId is required." }, { status: 400 });
  }

  const rateLimitResult = await checkRateLimit(identity.email, "interaction");
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { ok: false, message: rateLimitResult.message },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) } },
    );
  }

  const id = `save:${postId}:${identity.email}`;
  const now = new Date().toISOString();

  if (saved) {
    const { error: deleteError } = await supabaseServer.from("post_interactions").delete().eq("id", id);
    if (deleteError) {
      console.error("[save] pre-insert delete failed", { id, postId, email: identity.email, error: deleteError });
    }
    const { error } = await supabaseServer.from("post_interactions").insert({
      id,
      post_id: postId,
      interaction_type: "save",
      author_email: identity.email,
      author_name: authorName,
      payload: placeId ? { placeId } : {},
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
    if (error && !error.message.includes("duplicate key")) {
      console.error("[save] insert failed", { id, postId, email: identity.email, error });
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseServer.from("post_interactions").delete().eq("id", id);
    if (error) {
      console.error("[save] delete failed", { id, postId, email: identity.email, error });
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
