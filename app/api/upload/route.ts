import { NextResponse } from "next/server";
import { isSiteAuthorized } from "@/lib/site-auth-server";
import { supabaseServer } from "@/lib/supabase/server";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function POST(request: Request) {
  if (!(await isSiteAuthorized())) {
    return NextResponse.json({ ok: false, message: "not authorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll("files").filter((entry): entry is File => entry instanceof File) ?? [];
  if (!files.length) {
    return NextResponse.json({ ok: false, message: "No files provided." }, { status: 400 });
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
