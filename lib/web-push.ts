import webpush, { type PushSubscription } from "web-push";

const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";
const privateKey = process.env.WEB_PUSH_PRIVATE_KEY ?? "";
const subject = process.env.WEB_PUSH_SUBJECT ?? "mailto:hello@crumbz.pl";

let vapidConfigured = false;

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  } catch {
    vapidConfigured = false;
  }
}

export const webPushEnabled = vapidConfigured;

export function getWebPushPublicKey() {
  return publicKey;
}

export function isValidPushSubscription(value: unknown): value is PushSubscription {
  if (!value || typeof value !== "object") return false;
  const candidate = value as PushSubscription;
  return Boolean(candidate.endpoint && candidate.keys?.p256dh && candidate.keys?.auth);
}

export async function sendWebPushNotification(subscription: PushSubscription, payload: Record<string, unknown>) {
  if (!webPushEnabled) return { ok: false as const, reason: "missing_vapid" as const };

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true as const };
  } catch (error) {
    const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
    return {
      ok: false as const,
      reason: statusCode === 404 || statusCode === 410 ? "expired" as const : "failed" as const,
    };
  }
}
