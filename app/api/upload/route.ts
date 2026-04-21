import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireVerifiedIdentity } from "@/lib/google-auth";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total per request
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

function sanitizeFileName(fileName: string) {
  return fileName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function POST(request: Request) {
  const { error: authError, identity } = await requireVerifiedIdentity(request);
  if (authError) {
    return authError;
  }

  // Rate limit uploads (10 per minute)
  const rateLimit = await checkRateLimit(identity.email, "upload");
  if (!rateLimit.ok) {
    return NextResponse.json({ ok: false, message: rateLimit.message }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter ?? 60) } });
  }

  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll("files").filter((entry): entry is File => entry instanceof File) ?? [];
  if (!files.length) {
    return NextResponse.json({ ok: false, message: "No files provided." }, { status: 400 });
  }

  if (files.length > 7) {
    return NextResponse.json({ ok: false, message: "Too many files at once." }, { status: 400 });
  }

  // Validate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return NextResponse.json({ ok: false, message: `Total file size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit.` }, { status: 400 });
  }

  // Validate individual file size and MIME type
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, message: `File "${file.name}" exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.` }, { status: 400 });
    }
    if (!file.type || !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, message: `File "${file.name}" has an unsupported file type.` }, { status: 400 });
    }
  }

  const uploads = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const contentType = file.type || "application/octet-stream";
      const path = `${Date.now()}-${sanitizeFileName(file.name)}`;

      const { error } = await supabaseServer.storage
        .from("crumbz-media")
        .upload(path, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const { data } = supabaseServer.storage.from("crumbz-media").getPublicUrl(path);
      return data.publicUrl;
    }),
  ).catch((error: { message?: string }) => {
    return NextResponse.json({ ok: false, message: error.message ?? "Upload failed." }, { status: 500 });
  });

  if (uploads instanceof NextResponse) {
    return uploads;
  }

  return NextResponse.json({ ok: true, urls: uploads });
}
