import { NextResponse } from "next/server";

const ADMIN_EMAIL = "crumbleappco@gmail.com";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

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

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`, {
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        aud?: string;
        email?: string;
        email_verified?: string | boolean;
        exp?: string;
      }
    | null;

  const email = String(payload?.email ?? "").toLowerCase();
  const audience = String(payload?.aud ?? "");
  const isVerified = payload?.email_verified === true || payload?.email_verified === "true";
  if (!email || audience !== GOOGLE_CLIENT_ID || !isVerified) {
    return null;
  }

  const expiresAtFromPayload = Number(payload?.exp ?? 0) * 1000;
  const expiresAt = expiresAtFromPayload || parseTokenExpiry(idToken) || Date.now() + 5 * 60 * 1000;
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
