import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const ADMIN_EMAIL = "crumbleappco@gmail.com";

type VerifiedIdentity = {
  email: string;
  isAdmin: boolean;
  expiresAt: number;
};

const tokenCache = new Map<string, VerifiedIdentity>();

function parseTokenExpiry(idToken: string) {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return 0;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function verifyGoogleIdToken(idToken: string) {
  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const { data, error } = await supabaseServer.auth.getUser(idToken);
  if (error || !data.user?.email) {
    return null;
  }

  const email = String(data.user.email ?? "").toLowerCase();
  const expiresAt = parseTokenExpiry(idToken) || Date.now() + 5 * 60 * 1000;
  const verifiedIdentity = {
    email,
    isAdmin: email === ADMIN_EMAIL,
    expiresAt,
  };

  tokenCache.set(idToken, verifiedIdentity);
  return verifiedIdentity;
}

export async function requireVerifiedIdentity(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [, token] = authorization.match(/^Bearer\s+(.+)$/i) ?? [];

  if (!token) {
    return {
      error: NextResponse.json({ ok: false, message: "sign in with google first." }, { status: 401 }),
      identity: null,
    };
  }

  const identity = await verifyGoogleIdToken(token);
  if (!identity) {
    return {
      error: NextResponse.json({ ok: false, message: "your google session expired. sign in again." }, { status: 401 }),
      identity: null,
    };
  }

  return {
    error: null,
    identity,
  };
}

export { ADMIN_EMAIL };
