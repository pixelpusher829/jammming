import { Buffer } from "buffer";

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

	if (!CLIENT_ID || !CLIENT_SECRET) {
		console.error(
			"Serverless Function Error: Missing Spotify client ID or secret in environment variables."
		);
		return new Response(JSON.stringify({
			error: "Server configuration error",
			message: "Spotify credentials missing.",
		}), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}

	try {
		const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
			"base64"
		);
		
		const params = new URLSearchParams();
		params.append("grant_type", "client_credentials");

		const spotifyResponse = await fetch(
			"https://accounts.spotify.com/api/token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${authString}`,
				},
				body: params.toString(),
			}
		);

		const data = await spotifyResponse.json();

		if (!spotifyResponse.ok) {
			console.error("Spotify Token API Error:", data);
			return new Response(JSON.stringify(data), { status: spotifyResponse.status, headers: { 'Content-Type': 'application/json' } });
		}

		return new Response(JSON.stringify({ access_token: data.access_token }), { status: 200, headers: { 'Content-Type': 'application/json' } });
	} catch (error) {
		console.error("Error in public-auth serverless function:", error);
		return new Response(JSON.stringify({
			error: "Failed to get public access token via serverless function.",
		}), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
}
