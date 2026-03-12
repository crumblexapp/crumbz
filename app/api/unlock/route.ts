import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthToken, SITE_AUTH_COOKIE } from "@/lib/site-auth";

const SITE_PASSWORD_HASH =
  "d20530e8770d3c57f756082774b690f022879fc90f8a1c143dabd12da2e71fff";

function isValidPassword(password: string) {
  const incoming = Buffer.from(createHash("sha256").update(password).digest("hex"));
  const expected = Buffer.from(SITE_PASSWORD_HASH);

  return incoming.length === expected.length && timingSafeEqual(incoming, expected);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password?.trim();

  if (!password || !isValidPassword(password)) {
    return NextResponse.json({ ok: false, message: "wrong password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SITE_AUTH_COOKIE, getAuthToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
