import { NextResponse } from "next/server";
import { requireVerifiedIdentity } from "@/lib/google-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REPORT_REASONS = new Set([
  "Spam or fake post",
  "Misleading or false information",
  "Inappropriate or offensive content",
  "Bullying or harassment",
  "Fake account or impersonation",
  "Other",
]);

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const { error: authError, identity } = await requireVerifiedIdentity(request);
  if (authError || !identity) return authError!;

  const body = (await request.json().catch(() => null)) as {
    targetType?: unknown;
    targetId?: unknown;
    postId?: unknown;
    targetAuthorEmail?: unknown;
    targetAuthorName?: unknown;
    reason?: unknown;
    details?: unknown;
    contentPreview?: unknown;
  } | null;

  const targetType = body?.targetType === "comment" ? "comment" : body?.targetType === "post" ? "post" : "";
  const targetId = cleanText(body?.targetId, 160);
  const postId = cleanText(body?.postId, 160);
  const targetAuthorEmail = cleanText(body?.targetAuthorEmail, 320).toLowerCase();
  const targetAuthorName = cleanText(body?.targetAuthorName, 160);
  const reason = cleanText(body?.reason, 120);
  const details = cleanText(body?.details, 1200);
  const contentPreview = cleanText(body?.contentPreview, 500);

  if (!targetType || !targetId || !postId || !REPORT_REASONS.has(reason)) {
    return NextResponse.json({ ok: false, message: "choose a reason before submitting this report." }, { status: 400 });
  }

  const rateLimitResult = await checkRateLimit(identity.email, "interaction");
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { ok: false, message: rateLimitResult.message },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter ?? 60) } },
    );
  }

  const { error } = await supabaseServer.from("content_reports").insert({
    reporter_email: identity.email.toLowerCase(),
    target_type: targetType,
    target_id: targetId,
    post_id: postId,
    target_author_email: targetAuthorEmail,
    target_author_name: targetAuthorName,
    reason,
    details,
    content_preview: contentPreview,
    status: "open",
  });

  if (error) {
    if (error.message.includes('relation "public.content_reports" does not exist')) {
      return NextResponse.json(
        { ok: false, message: "reports are almost ready. the content_reports table still needs to be added in supabase." },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: false, message: "we could not save this report yet." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
