import { supabaseServer } from "./supabase/server";

const RATE_LIMITS = {
  // Friend actions: 10 per minute
  friend_request: { windowMs: 60_000, max: 10 },
  // Posts: 20 per minute
  post: { windowMs: 60_000, max: 20 },
  // Comments/interactions: 30 per minute
  interaction: { windowMs: 60_000, max: 30 },
  // Translation: 10 per minute (costs money)
  translate: { windowMs: 60_000, max: 10 },
  // Upload: 10 per minute
  upload: { windowMs: 60_000, max: 10 },
  // General API: 100 per minute
  default: { windowMs: 60_000, max: 100 },
};

type RateLimitType = keyof typeof RATE_LIMITS;

export async function checkRateLimit(
  email: string,
  type: RateLimitType = "default"
): Promise<{ ok: boolean; message?: string; retryAfter?: number }> {
  const limit = RATE_LIMITS[type];
  const windowStart = Date.now() - limit.windowMs;
  const windowIso = new Date(windowStart).toISOString();

  // Count requests in this window
  const { count, error } = await supabaseServer
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_email", email.toLowerCase())
    .eq("action_type", type)
    .gte("created_at", windowIso);

  if (error) {
    // If table doesn't exist yet, skip rate limiting
    if (error.message.includes('relation "public.rate_limits" does not exist')) {
      return { ok: true };
    }
    console.error("Rate limit check failed:", error.message);
    return { ok: true }; // Fail open - allow if check fails
  }

  if (count !== null && count >= limit.max) {
    return {
      ok: false,
      message: `Rate limit exceeded. Try again in ${Math.ceil(limit.windowMs / 1000)} seconds.`,
      retryAfter: Math.ceil(limit.windowMs / 1000),
    };
  }

  // Log this request
  await supabaseServer.from("rate_limits").insert({
    user_email: email.toLowerCase(),
    action_type: type,
    created_at: new Date().toISOString(),
  });

  return { ok: true };
}

// Clean up old entries (call periodically or on low-traffic requests)
export async function cleanupRateLimits() {
  const oldestWindow = Math.max(...Object.values(RATE_LIMITS).map((l) => l.windowMs));
  const cutoff = new Date(Date.now() - oldestWindow - 60_000).toISOString();

  await supabaseServer.from("rate_limits").delete().lt("created_at", cutoff);
}
