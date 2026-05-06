import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InteractionRow = {
  id: string;
  post_id: string;
  interaction_type: string;
  author_email: string;
  author_name: string;
  payload: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
};

type InteractionBucket = {
  likes: unknown[];
  comments: unknown[];
  shares: unknown[];
  views: unknown[];
  saves: unknown[];
};

export async function GET() {
  const { data, error } = await supabaseServer
    .from("post_interactions")
    .select("id, post_id, interaction_type, author_email, author_name, payload, deleted_at, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.includes('relation "public.post_interactions" does not exist')) {
      return NextResponse.json({ ok: true, interactions: {} }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const interactions: Record<string, InteractionBucket> = {};

  for (const row of (data as InteractionRow[]) ?? []) {
    if (!interactions[row.post_id]) {
      interactions[row.post_id] = { likes: [], comments: [], shares: [], views: [], saves: [] };
    }
    const bucket = interactions[row.post_id];

    switch (row.interaction_type) {
      case "like":
        bucket.likes.push({
          authorEmail: row.author_email,
          authorName: row.author_name,
          createdAt: row.created_at,
        });
        break;
      case "comment":
        bucket.comments.push({
          id: row.id,
          authorEmail: row.author_email,
          authorName: row.author_name,
          createdAt: row.created_at,
          ...(typeof row.payload === "object" ? row.payload : {}),
        });
        break;
      case "share":
        bucket.shares.push({
          id: row.id,
          authorEmail: row.author_email,
          authorName: row.author_name,
          createdAt: row.created_at,
          ...(typeof row.payload === "object" ? row.payload : {}),
        });
        break;
      case "view":
        bucket.views.push({
          id: row.id,
          authorEmail: row.author_email,
          authorName: row.author_name,
          createdAt: row.created_at,
        });
        break;
      case "save":
        bucket.saves.push({
          authorEmail: row.author_email,
          authorName: row.author_name,
          createdAt: row.created_at,
        });
        break;
    }
  }

  return NextResponse.json(
    { ok: true, interactions },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
