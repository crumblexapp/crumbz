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

const PAGE_SIZE = 1000;
const MAX_INTERACTION_ROWS = 100_000;

async function readAllInteractionRows() {
  const rows: InteractionRow[] = [];

  for (let from = 0; from < MAX_INTERACTION_ROWS; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabaseServer
      .from("post_interactions")
      .select("id, post_id, interaction_type, author_email, author_name, payload, deleted_at, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) return { data: rows, error };

    rows.push(...(((data as InteractionRow[] | null) ?? [])));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }

  return { data: rows, error: null };
}

export async function GET() {
  const { data, error } = await readAllInteractionRows();

  if (error) {
    if (error.message.includes('relation "public.post_interactions" does not exist')) {
      return NextResponse.json({ ok: true, interactions: {} }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const interactions: Record<string, InteractionBucket> = {};
  const seenViews = new Set<string>();

  for (const row of data) {
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
        {
          const viewKey = `${row.post_id}:${row.author_email.toLowerCase()}`;
          if (seenViews.has(viewKey)) break;
          seenViews.add(viewKey);
        }
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
          ...(typeof row.payload === "object" ? row.payload : {}),
        });
        break;
    }
  }

  return NextResponse.json(
    { ok: true, interactions },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
