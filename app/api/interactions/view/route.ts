import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { error: authError, identity } = await requireVerifiedIdentity(request);
  if (authError || !identity) return authError!;

  const body = (await request.json().catch(() => null)) as { postId?: unknown; viewId?: unknown } | null;
  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const viewId = typeof body?.viewId === "string" ? body.viewId.trim() : "";

  if (!postId || !viewId) {
    return NextResponse.json({ ok: false, message: "postId and viewId are required." }, { status: 400 });
  }

  const now = new Date().toISOString();

  await supabaseServer.from("post_interactions").insert({
    id: viewId,
    post_id: postId,
    interaction_type: "view",
    author_email: identity.email,
    author_name: "",
    payload: {},
    deleted_at: null,
    created_at: now,
    updated_at: now,
  });

  return NextResponse.json({ ok: true });
}
