export const SITE_AUTH_COOKIE = "josh_75hard_access";
const SITE_AUTH_TOKEN = "josh-75-hard-private";

export function getAuthToken() {
  return SITE_AUTH_TOKEN;
}

export function hasValidAuthToken(token?: string | null) {
  return token === SITE_AUTH_TOKEN;
}
