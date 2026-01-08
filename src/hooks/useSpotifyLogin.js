import { useCallback } from "react";
import {
	base64encode,
	generateRandomString,
	sha256,
} from "@/utils/authHelpers";

export function useSpotifyLogin() {
	const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
	const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

	const spotifyLogin = useCallback(async () => {
		const codeVerifier = generateRandomString(64);
		const hashed = await sha256(codeVerifier);
		const codeChallenge = base64encode(hashed);
		const scope =
			"user-read-private user-read-email playlist-modify-private playlist-modify-public";
		const authUrl = new URL("https://accounts.spotify.com/authorize");

		localStorage.setItem("code_verifier", codeVerifier);

		const params = {
			response_type: "code",
			client_id: clientId,
			scope,
			code_challenge_method: "S256",
			code_challenge: codeChallenge,
			redirect_uri: redirectUri,
		};

		authUrl.search = new URLSearchParams(params).toString();
		window.location.href = authUrl.toString();
	}, [clientId, redirectUri]);

	return { spotifyLogin };
}
