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
    liked?: unknown;
    authorName?: unknown;
  } | null;

  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const liked = Boolean(body?.liked);
  const authorName = typeof body?.authorName === "string" ? body.authorName.trim() : "";

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

  const id = `like:${postId}:${identity.email}`;
  const now = new Date().toISOString();

  if (liked) {
    // Like → ensure row is present and active.
    const { error } = await supabaseServer.from("post_interactions").upsert(
      {
        id,
        post_id: postId,
        interaction_type: "like",
        author_email: identity.email,
        author_name: authorName,
        payload: {},
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
    // Unlike → hard-delete the row (cleaner than soft-delete + works around any constraint that prevents un-deleting).
    const { error } = await supabaseServer.from("post_interactions").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
