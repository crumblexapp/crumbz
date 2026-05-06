/**
 * One-shot backfill: reads all interactions from the app_state JSON blob
 * and writes them to the post_interactions table.
 *
 * Run:
 *   npx ts-node --project tsconfig.json scripts/backfill-interactions.ts
 *
 * Safe to re-run — uses upsert so existing rows are not duplicated.
 * After the backfill completes, flip USE_INTERACTIONS_TABLE to true in app/page.tsx.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually without needing the dotenv package
try {
  const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* .env.local not found, rely on existing env */ }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type JsonRecord = Record<string, unknown>;

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

// Converts display timestamps like "9 Apr at 21:45" or "9 Apr, 21:45" to ISO string.
// Falls back to `now` if unparseable.
function safeIso(value: unknown, now: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return now;

  // Try native parse first (handles ISO strings)
  const direct = Date.parse(text);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();

  // "9 Apr, 21:45" or "9 Apr at 21:45"
  const match = text.match(/^(\d{1,2})\s+([A-Za-z]{3})(?:,|\s+at)\s+(\d{1,2}):(\d{2})$/);
  if (match) {
    const months: Record<string, number> = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const monthIndex = months[match[2].toLowerCase()];
    if (monthIndex !== undefined) {
      const year = new Date().getFullYear();
      const d = new Date(year, monthIndex, Number(match[1]), Number(match[3]), Number(match[4]));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }

  return now;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeObjectArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => Boolean(item && typeof item === "object"))
    : [];
}

type InteractionRow = {
  id: string;
  post_id: string;
  interaction_type: string;
  author_email: string;
  author_name: string;
  payload: JsonRecord;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

async function main() {
  console.log("Fetching app_state interactions...");

  const { data: stateData, error: stateError } = await supabase
    .from("app_state")
    .select("interactions")
    .eq("id", "crumbz-app-state")
    .maybeSingle();

  if (stateError) {
    console.error("Failed to fetch app_state:", stateError.message);
    process.exit(1);
  }

  const rawInteractions = stateData?.interactions;
  if (!rawInteractions || typeof rawInteractions !== "object" || Array.isArray(rawInteractions)) {
    console.log("No interactions found in app_state. Nothing to backfill.");
    return;
  }

  const now = new Date().toISOString();
  const rows: InteractionRow[] = [];

  for (const [postId, bucket] of Object.entries(rawInteractions as Record<string, unknown>)) {
    if (postId.startsWith("__")) continue;
    if (!bucket || typeof bucket !== "object" || Array.isArray(bucket)) continue;
    const b = bucket as JsonRecord;

    // Likes
    for (const like of normalizeObjectArray(b.likes)) {
      const email = normalizeEmail(like.authorEmail);
      if (!email) continue;
      rows.push({
        id: `like:${postId}:${email}`,
        post_id: postId,
        interaction_type: "like",
        author_email: email,
        author_name: normalizeText(like.authorName),
        payload: {},
        deleted_at: null,
        created_at: safeIso(like.createdAt, now),
        updated_at: now,
      });
    }

    // Comments
    for (const comment of normalizeObjectArray(b.comments)) {
      const commentId = normalizeText(comment.id);
      const email = normalizeEmail(comment.authorEmail);
      if (!commentId || !email) continue;
      rows.push({
        id: commentId,
        post_id: postId,
        interaction_type: "comment",
        author_email: email,
        author_name: normalizeText(comment.authorName),
        payload: {
          text: normalizeText(comment.text),
          schoolName: normalizeText(comment.schoolName),
          reactions: normalizeObjectArray(comment.reactions),
          replies: normalizeObjectArray(comment.replies),
          hidden: Boolean(comment.hidden),
        },
        deleted_at: null,
        created_at: safeIso(comment.createdAt, now),
        updated_at: now,
      });
    }

    // Shares
    for (const share of normalizeObjectArray(b.shares)) {
      const shareId = normalizeText(share.id);
      const email = normalizeEmail(share.authorEmail);
      if (!email) continue;
      const id = shareId || `share:${postId}:${email}:${normalizeText(share.createdAt)}`;
      rows.push({
        id,
        post_id: postId,
        interaction_type: "share",
        author_email: email,
        author_name: normalizeText(share.authorName),
        payload: { platform: normalizeText(share.platform) },
        deleted_at: null,
        created_at: safeIso(share.createdAt, now),
        updated_at: now,
      });
    }

    // Views
    for (const view of normalizeObjectArray(b.views)) {
      const viewId = normalizeText(view.id);
      const email = normalizeEmail(view.authorEmail);
      if (!email) continue;
      const id = viewId || `view:${postId}:${email}:${normalizeText(view.createdAt)}`;
      rows.push({
        id,
        post_id: postId,
        interaction_type: "view",
        author_email: email,
        author_name: "",
        payload: {},
        deleted_at: null,
        created_at: safeIso(view.createdAt, now),
        updated_at: now,
      });
    }

    // Saves
    for (const save of normalizeObjectArray(b.saves)) {
      const email = normalizeEmail(save.authorEmail);
      if (!email) continue;
      rows.push({
        id: `save:${postId}:${email}`,
        post_id: postId,
        interaction_type: "save",
        author_email: email,
        author_name: normalizeText(save.authorName),
        payload: {},
        deleted_at: null,
        created_at: safeIso(save.createdAt, now),
        updated_at: now,
      });
    }
  }

  // Deduplicate by id — keep first occurrence
  const deduped = [...new Map(rows.map((r) => [r.id, r])).values()];
  console.log(`Found ${rows.length} interactions (${deduped.length} after dedup).`);

  if (!deduped.length) {
    console.log("Nothing to insert.");
    return;
  }

  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("post_interactions").upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rUpserted ${inserted} / ${deduped.length}`);
    }
  }

  console.log("\nBackfill complete.");
  console.log('\nNext step: set USE_INTERACTIONS_TABLE = true in app/page.tsx and deploy.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
