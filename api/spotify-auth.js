import { Buffer } from "buffer";
import { parse } from "cookie";

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
	if (request.method !== "POST") {
		return new Response(JSON.stringify({
			error: "Method Not Allowed",
			message: "This endpoint only supports POST requests.",
		}), { status: 405, headers: { 'Content-Type': 'application/json' } });
	}

	const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
	const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
	const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

	if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
		return new Response(JSON.stringify({
			error: "Server configuration error",
			message: "Missing Spotify API credentials or Redirect URI.",
		}), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}

	const authHeaderString = Buffer.from(
		`${CLIENT_ID}:${CLIENT_SECRET}`
	).toString("base64");

	const requestBody = new URLSearchParams();
	let isRefresh = false;

	// Parse cookies from the Request object
	const cookieHeader = request.headers.get('cookie') || "";
	const cookies = parse(cookieHeader);
	const refreshTokenFromCookie = cookies.spotify_refresh_token;

    // Parse body
    let body;
    try {
        body = await request.json();
    } catch (e) {
        body = {};
    }

	if (body.authorizationCode) {
		requestBody.append("grant_type", "authorization_code");
		requestBody.append("code", body.authorizationCode);
		requestBody.append("redirect_uri", REDIRECT_URI);

		if (body.codeVerifier) {
			requestBody.append("code_verifier", body.codeVerifier);
		} else {
			return new Response(JSON.stringify({
				error: "Bad Request",
				message: "Missing code_verifier for PKCE.",
			}), { status: 400, headers: { 'Content-Type': 'application/json' } });
		}
	} else if (refreshTokenFromCookie) {
		requestBody.append("grant_type", "refresh_token");
		requestBody.append("refresh_token", refreshTokenFromCookie);
		isRefresh = true;
	} else if (body.refreshToken) {
		// Fallback
		requestBody.append("grant_type", "refresh_token");
		requestBody.append("refresh_token", body.refreshToken);
		isRefresh = true;
	} else {
		return new Response(JSON.stringify({
			error: "Bad Request",
			message: "Missing authorizationCode or session cookie.",
		}), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}

	try {
		const spotifyResponse = await fetch(
			"https://accounts.spotify.com/api/token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${authHeaderString}`,
				},
				body: requestBody.toString(),
			}
		);

		const data = await spotifyResponse.json();

		if (spotifyResponse.ok) {
			const newRefreshToken = data.refresh_token || refreshTokenFromCookie || body.refreshToken;
			
            const headers = new Headers({ 'Content-Type': 'application/json' });

			// Set refresh token in an HttpOnly cookie
			if (newRefreshToken) {
                headers.append('Set-Cookie', `spotify_refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 30}`);
			}

			return new Response(JSON.stringify({
				access_token: data.access_token,
				expires_in: data.expires_in
			}), { status: 200, headers: headers });

		} else {
            const headers = new Headers({ 'Content-Type': 'application/json' });

			// If refresh token is invalid, clear the cookie
			if (isRefresh) {
                headers.append('Set-Cookie', 'spotify_refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
			}
			return new Response(JSON.stringify(data), { status: spotifyResponse.status, headers: headers });
		}
	} catch (error) {
		return new Response(JSON.stringify({
			error: "Internal Server Error",
			message: error.message,
		}), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
}
