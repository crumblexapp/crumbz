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

  const body = (await request.json().catch(() => null)) as
    | {
        files?: { name: string; contentType: string }[];
      }
    | null;

  const files = body?.files ?? [];
  if (!files.length) {
    return NextResponse.json({ ok: false, message: "No files provided." }, { status: 400 });
  }

  const uploads = await Promise.all(
    files.map(async (file, index) => {
      const path = `${Date.now()}-${index}-${sanitizeFileName(file.name)}`;
      const { data, error } = await supabaseServer.storage
        .from("crumbz-media")
        .createSignedUploadUrl(path, {
          upsert: true,
        });

      if (error || !data) {
        throw error ?? new Error("Could not create upload url.");
      }

      const { data: publicData } = supabaseServer.storage.from("crumbz-media").getPublicUrl(path);

      return {
        path,
        token: data.token,
        publicUrl: publicData.publicUrl,
        contentType: file.contentType,
      };
    }),
  ).catch((error: { message?: string }) => {
    return NextResponse.json({ ok: false, message: error.message ?? "Upload setup failed." }, { status: 500 });
  });

  if (uploads instanceof NextResponse) {
    return uploads;
  }

  return NextResponse.json({ ok: true, uploads });
}
