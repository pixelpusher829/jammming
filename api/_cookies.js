// Files prefixed with "_" are not exposed as routes by Vercel.

export const REFRESH_COOKIE = "spotify_refresh_token";
const THIRTY_DAYS = 60 * 60 * 24 * 30;
// Scope the cookie to the API so it isn't sent with every page and asset request
const COOKIE_ATTRS = "HttpOnly; Secure; SameSite=Strict; Path=/api";

export function refreshCookie(token) {
	return `${REFRESH_COOKIE}=${encodeURIComponent(token)}; ${COOKIE_ATTRS}; Max-Age=${THIRTY_DAYS}`;
}

export function clearRefreshCookies() {
	return [
		`${REFRESH_COOKIE}=; ${COOKIE_ATTRS}; Max-Age=0`,
		// Earlier versions set the cookie on Path=/; clear that too
		`${REFRESH_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
	];
}
