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
    // Save → ensure row is present and active.
    const { error } = await supabaseServer.from("post_interactions").upsert(
      {
        id,
        post_id: postId,
        interaction_type: "save",
        author_email: identity.email,
        author_name: authorName,
        payload: placeId ? { placeId } : {},
        deleted_at: null,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id" },
    );
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
  } else {
    // Unsave → hard-delete the row.
    const { error } = await supabaseServer.from("post_interactions").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
