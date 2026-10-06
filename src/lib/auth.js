import {
	base64encode,
	generateRandomString,
	sha256,
} from "@/utils/authHelpers";

const SCOPES = [
	"user-read-private",
	"playlist-read-private",
	"playlist-read-collaborative",
	"playlist-modify-private",
	"playlist-modify-public",
	"ugc-image-upload",
];

// Refresh a minute early so in-flight requests don't race the expiry
const EXPIRY_BUFFER_MS = 60 * 1000;

const SESSION_FLAG = "jammming:has_session";
const VERIFIER_KEY = "jammming:code_verifier";
const STATE_KEY = "jammming:oauth_state";

// Access tokens live in memory only. The long-lived refresh token is held in
// an HttpOnly cookie by the /api/spotify-auth function, so a page reload just
// re-runs the refresh exchange.
const tokens = {
	user: null,
	public: null,
};
const inflight = {
	user: null,
	public: null,
};
const expiryListeners = new Set();
let initPromise = null;

export function onSessionExpired(listener) {
	expiryListeners.add(listener);
	return () => expiryListeners.delete(listener);
}

function isFresh(token) {
	return token && token.expiresAt > Date.now();
}

function storeToken(kind, data) {
	tokens[kind] = {
		value: data.access_token,
		expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - EXPIRY_BUFFER_MS,
	};
	return tokens[kind].value;
}

async function postJson(url, body) {
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "same-origin",
		body: body ? JSON.stringify(body) : undefined,
	});
	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		const error = new Error(data.message || data.error || "Request failed");
		error.status = response.status;
		throw error;
	}
	return data;
}

// Collapse concurrent refreshes into a single network request
function singleFlight(kind, fn) {
	if (!inflight[kind]) {
		inflight[kind] = fn().finally(() => {
			inflight[kind] = null;
		});
	}
	return inflight[kind];
}

function safeStorage(storage, op, key, value) {
	try {
		if (op === "get") return storage.getItem(key);
		if (op === "set") return storage.setItem(key, value);
		return storage.removeItem(key);
	} catch {
		return null;
	}
}

export function hasStoredSession() {
	return safeStorage(localStorage, "get", SESSION_FLAG) === "1";
}

export function hasUserToken() {
	return Boolean(tokens.user);
}

export function refreshUserToken() {
	return singleFlight("user", async () => {
		try {
			const data = await postJson("/api/spotify-auth");
			return storeToken("user", data);
		} catch (error) {
			const hadSession = Boolean(tokens.user);
			tokens.user = null;
			safeStorage(localStorage, "remove", SESSION_FLAG);
			if (hadSession) {
				for (const listener of expiryListeners) listener();
			}
			throw error;
		}
	});
}

export function fetchPublicToken() {
	return singleFlight("public", async () => {
		const data = await postJson("/api/public-auth");
		return storeToken("public", data);
	});
}

/**
 * Returns the best available token. Signed-in users always use their own
 * token; guests fall back to an app-level client-credentials token, which can
 * search but cannot touch playlists.
 */
export async function getAccessToken({ forceRefresh = false } = {}) {
	if (tokens.user) {
		if (!forceRefresh && isFresh(tokens.user)) return tokens.user.value;
		return refreshUserToken();
	}
	if (!forceRefresh && isFresh(tokens.public)) return tokens.public.value;
	return fetchPublicToken();
}

export async function beginLogin() {
	const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
	const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

	const codeVerifier = generateRandomString(64);
	const codeChallenge = base64encode(await sha256(codeVerifier));
	const state = generateRandomString(16);

	safeStorage(sessionStorage, "set", VERIFIER_KEY, codeVerifier);
	safeStorage(sessionStorage, "set", STATE_KEY, state);

	const authUrl = new URL("https://accounts.spotify.com/authorize");
	authUrl.search = new URLSearchParams({
		response_type: "code",
		client_id: clientId,
		scope: SCOPES.join(" "),
		code_challenge_method: "S256",
		code_challenge: codeChallenge,
		redirect_uri: redirectUri,
		state,
	}).toString();

	window.location.assign(authUrl.toString());
}

/**
 * Completes the OAuth redirect if the current URL carries one.
 * Returns true when a login completed, false when there was nothing to do,
 * and throws with a user-facing message when the callback was invalid.
 */
export async function completeLoginFromUrl() {
	const params = new URLSearchParams(window.location.search);
	const code = params.get("code");
	const error = params.get("error");
	if (!code && !error) return false;

	const expectedState = safeStorage(sessionStorage, "get", STATE_KEY);
	const codeVerifier = safeStorage(sessionStorage, "get", VERIFIER_KEY);
	safeStorage(sessionStorage, "remove", STATE_KEY);
	safeStorage(sessionStorage, "remove", VERIFIER_KEY);
	window.history.replaceState({}, document.title, window.location.pathname);

	if (error) {
		throw new Error(
			error === "access_denied"
				? "Spotify sign-in was cancelled."
				: "Spotify sign-in failed. Please try again.",
		);
	}
	if (!codeVerifier || params.get("state") !== expectedState) {
		throw new Error("Sign-in link expired or was invalid. Please try again.");
	}

	const data = await singleFlight("user", async () =>
		storeToken(
			"user",
			await postJson("/api/spotify-auth", {
				authorizationCode: code,
				codeVerifier,
			}),
		),
	);
	safeStorage(localStorage, "set", SESSION_FLAG, "1");
	return Boolean(data);
}

/**
 * Resolves to true when the visitor ends up signed in. Memoised so React
 * StrictMode's double-mount can't exchange the same auth code twice.
 */
export function initSession() {
	if (!initPromise) {
		initPromise = (async () => {
			if (await completeLoginFromUrl()) return true;
			if (!hasStoredSession()) return false;
			try {
				await refreshUserToken();
				return true;
			} catch {
				return false;
			}
		})();
	}
	return initPromise;
}

export async function logout() {
	tokens.user = null;
	safeStorage(localStorage, "remove", SESSION_FLAG);
	await fetch("/api/logout", {
		method: "POST",
		credentials: "same-origin",
	}).catch(() => {});
}

// Test-only reset hook
export function __resetAuthState() {
	tokens.user = null;
	tokens.public = null;
	inflight.user = null;
	inflight.public = null;
	initPromise = null;
	expiryListeners.clear();
}
