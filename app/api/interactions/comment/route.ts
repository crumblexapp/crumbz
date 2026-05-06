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
    commentId?: unknown;
    text?: unknown;
    authorName?: unknown;
    schoolName?: unknown;
    createdAt?: unknown;
  } | null;

  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const commentId = typeof body?.commentId === "string" ? body.commentId.trim() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const authorName = typeof body?.authorName === "string" ? body.authorName.trim() : "";
  const schoolName = typeof body?.schoolName === "string" ? body.schoolName.trim() : "";
  const createdAt = typeof body?.createdAt === "string" ? body.createdAt : new Date().toISOString();

  if (!postId || !commentId) {
    return NextResponse.json({ ok: false, message: "postId and commentId are required." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ ok: false, message: "comment text is required." }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json({ ok: false, message: "comment is too long (max 1000 characters)." }, { status: 400 });
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
    id: commentId,
    post_id: postId,
    interaction_type: "comment",
    author_email: identity.email,
    author_name: authorName,
    payload: { text, schoolName, reactions: [], replies: [], hidden: false },
    deleted_at: null,
    created_at: createdAt,
    updated_at: now,
  });

  if (error && !error.message.includes("duplicate key")) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
