import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SITE_AUTH_COOKIE } from "@/lib/site-auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SITE_AUTH_COOKIE);

  return NextResponse.json({ ok: true });
}
