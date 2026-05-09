import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/lib/google-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendCommentReplyNotifications } from "@/lib/comment-notifications";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeObjectArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => Boolean(item && typeof item === "object"))
    : [];
}

export async function POST(request: Request) {
  const { error: authError, identity } = await requireVerifiedIdentity(request);
  if (authError || !identity) return authError!;

  const body = (await request.json().catch(() => null)) as {
    postId?: unknown;
    commentId?: unknown;
    reactions?: unknown;
    replies?: unknown;
    hidden?: unknown;
  } | null;

  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const commentId = typeof body?.commentId === "string" ? body.commentId.trim() : "";

  if (!postId || !commentId) {
    return NextResponse.json({ ok: false, message: "postId and commentId are required." }, { status: 400 });
  }

  const rateLimitResult = await checkRateLimit(identity.email, "interaction");
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { ok: false, message: rateLimitResult.message },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) } },
    );
  }

  // Read current state
  const { data: current, error: fetchError } = await supabaseServer
    .from("post_interactions")
    .select("payload, author_email")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ ok: false, message: fetchError.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ ok: false, message: "comment not found." }, { status: 404 });
  }

  const currentPayload = (current.payload ?? {}) as JsonRecord;
  const now = new Date().toISOString();

  // Reactions: this author replaces only their own reactions
  const currentReactions = normalizeObjectArray(currentPayload.reactions);
  const nextReactions = "reactions" in (body ?? {})
    ? [
        ...currentReactions.filter((r) => normalizeEmail(r.authorEmail) !== identity.email),
        ...normalizeObjectArray(body?.reactions).filter((r) => normalizeEmail(r.authorEmail) === identity.email),
      ]
    : currentReactions;

  // Replies: this author can add/update their own replies
  const currentReplies = normalizeObjectArray(currentPayload.replies);
  let nextReplies = currentReplies;
  if ("replies" in (body ?? {})) {
    const proposedReplies = normalizeObjectArray(body?.replies).filter(
      (r) => normalizeEmail(r.authorEmail) === identity.email,
    );
    const keptReplies = currentReplies.filter((r) => normalizeEmail(r.authorEmail) !== identity.email);
    const updatedReplies = proposedReplies.map((r) => {
      const existing = currentReplies.find(
        (cr) => normalizeEmail(cr.authorEmail) === identity.email && normalizeText(cr.id) === normalizeText(r.id),
      );
      return existing ? { ...existing, ...r } : r;
    });
    nextReplies = [...keptReplies, ...updatedReplies];
  }

  // Hidden: only admin or comment author can hide/unhide
  const proposedHidden = typeof body?.hidden === "boolean" ? body.hidden : undefined;
  const nextHidden =
    proposedHidden !== undefined && (identity.isAdmin || identity.email === normalizeEmail(current.author_email))
      ? proposedHidden
      : currentPayload.hidden;

  const { error } = await supabaseServer
    .from("post_interactions")
    .update({
      payload: { ...currentPayload, reactions: nextReactions, replies: nextReplies, hidden: nextHidden },
      updated_at: now,
    })
    .eq("id", commentId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  if ("replies" in (body ?? {})) {
    await sendCommentReplyNotifications({
      postId,
      commentId,
      commentText: normalizeText(currentPayload.text),
      commentOwnerEmail: current.author_email,
      actorEmail: identity.email,
      previousReplies: currentReplies,
      nextReplies,
    });
  }

  return NextResponse.json({ ok: true });
}
