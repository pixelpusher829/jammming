import { parse } from "cookie";

export const config = {
	runtime: "edge",
};

//Configuration Helper
function getServiceConfig() {
	const clientId = process.env.SPOTIFY_CLIENT_ID;
	const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
	const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

	if (!clientId || !clientSecret || !redirectUri) {
		throw new Error("Missing Spotify API credentials or Redirect URI.");
	}

	return { clientId, clientSecret, redirectUri };
}

//Logic Helpers
function buildSpotifyAuthParams(body, cookies, redirectUri) {
	const params = new URLSearchParams();
	let isRefresh = false;

	if (body.authorizationCode) {
		// Case 1: Initial Authorization Code Exchange
		if (!body.codeVerifier) {
			throw new Error("Missing code_verifier for PKCE.");
		}
		params.append("grant_type", "authorization_code");
		params.append("code", body.authorizationCode);
		params.append("redirect_uri", redirectUri);
		params.append("code_verifier", body.codeVerifier);

		// Case 2: Refresh Token Exchange
	} else if (cookies.spotify_refresh_token || body.refreshToken) {
		params.append("grant_type", "refresh_token");
		params.append(
			"refresh_token",
			cookies.spotify_refresh_token || body.refreshToken,
		);
		isRefresh = true;

		// Case 3: Invalid Request
	} else {
		throw new Error("Missing authorizationCode or session cookie.");
	}

	return { params, isRefresh };
}

async function fetchSpotifyToken(params, clientId, clientSecret) {
	const authHeader = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
	return fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: authHeader,
		},
		body: params.toString(),
	});
}

// Handles refresh token cookie logic and formats the client response
function handleRefreshToken(
	spotifyResponse,
	data,
	existingRefreshToken,
	isRefresh,
) {
	const headers = new Headers({ "Content-Type": "application/json" });

	if (spotifyResponse.ok) {
		const newRefreshToken = data.refresh_token || existingRefreshToken;

		if (newRefreshToken) {
			headers.append(
				"Set-Cookie",
				`spotify_refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 30}`,
			);
		}

		return new Response(
			JSON.stringify({
				access_token: data.access_token,
				expires_in: data.expires_in,
			}),
			{ status: 200, headers },
		);
	}

	// If refresh failed, clear the cookie
	if (isRefresh) {
		headers.append(
			"Set-Cookie",
			"spotify_refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
		);
	}

	return new Response(JSON.stringify(data), {
		status: spotifyResponse.status,
		headers,
	});
}

//Main Handler
export default async function handler(request) {
	if (request.method !== "POST") {
		return new Response(
			JSON.stringify({
				error: "Method Not Allowed",
				message: "This endpoint only supports POST requests.",
			}),
			{ status: 405, headers: { "Content-Type": "application/json" } },
		);
	}

	let config;
	try {
		config = getServiceConfig();
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: "Server configuration error",
				message: error.message,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	// Parse Request
	const cookieHeader = request.headers.get("cookie") || "";
	const cookies = parse(cookieHeader);
	const body = await request.json().catch(() => ({}));

	let params, isRefresh;
	try {
		const result = buildSpotifyAuthParams(body, cookies, config.redirectUri);
		params = result.params;
		isRefresh = result.isRefresh;
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: "Bad Request",
				message: error.message,
			}),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	try {
		const spotifyResponse = await fetchSpotifyToken(
			params,
			config.clientId,
			config.clientSecret,
		);
		const data = await spotifyResponse.json();

		const currentRefreshToken =
			cookies.spotify_refresh_token || body.refreshToken;
		return handleRefreshToken(
			spotifyResponse,
			data,
			currentRefreshToken,
			isRefresh,
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: "Internal Server Error",
				message: error.message,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}
