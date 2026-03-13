import { cookies } from "next/headers";
import { SITE_AUTH_COOKIE, hasValidAuthToken } from "@/lib/site-auth";

export async function isSiteAuthorized() {
  const cookieStore = await cookies();
  return hasValidAuthToken(cookieStore.get(SITE_AUTH_COOKIE)?.value);
}
