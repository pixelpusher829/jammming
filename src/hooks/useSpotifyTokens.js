import { useEffect, useRef, useState } from "react";

export function useSpotifyTokens() {
	const [publicAccessToken, setPublicAccessToken] = useState(null);
	const [userAccessToken, setUserAccessToken] = useState(null);
	const [expiresAt, setExpiresAt] = useState(0);
	const [isProcessingAuth, setIsProcessingAuth] = useState(false);
	const initialRefreshAttempted = useRef(false);

	const saveUserTokens = (token, expiresIn) => {
		const expiryTime = Date.now() + expiresIn * 1000 - 5 * 60 * 1000;
		setUserAccessToken(token);
		setExpiresAt(expiryTime);

		localStorage.setItem("spotify_access_token", token);
		localStorage.setItem("spotify_token_expires_at", expiryTime);
		localStorage.setItem("spotify_logged_in", "true");
	};

	const clearUserTokens = () => {
		setUserAccessToken(null);
		setExpiresAt(0);
		localStorage.removeItem("spotify_access_token");
		localStorage.removeItem("spotify_token_expires_at");
		localStorage.removeItem("spotify_logged_in");
	};

	const refreshAccessToken = async () => {
		setIsProcessingAuth(true);
		try {
			const response = await fetch("/api/spotify-auth", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) throw new Error("Failed to refresh token.");

			const data = await response.json();
			saveUserTokens(data.access_token, data.expires_in);
			return data.access_token;
		} catch {
			clearUserTokens();
			return null;
		} finally {
			setIsProcessingAuth(false);
		}
	};

	const getPublicAccessToken = async () => {
		setIsProcessingAuth(true);
		try {
			const response = await fetch("/api/public-auth", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) throw new Error("Failed to get public token.");

			const data = await response.json();
			setPublicAccessToken(data.access_token);
			return data.access_token;
		} catch (error) {
			console.error("Error fetching public access token:", error);
			setPublicAccessToken(null);
			return null;
		} finally {
			setIsProcessingAuth(false);
		}
	};

	const exchangeAuthorizationCodeForTokens = 
		async (code) => {
			setIsProcessingAuth(true);
			const codeVerifier = localStorage.getItem("code_verifier");
			if (!codeVerifier) {
				setIsProcessingAuth(false);
				return;
			}

			try {
				const response = await fetch("/api/spotify-auth", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						authorizationCode: code,
						codeVerifier: codeVerifier,
					}),
				});

				if (!response.ok) throw new Error("Failed to exchange code.");

				const data = await response.json();
				localStorage.removeItem("code_verifier");
				saveUserTokens(data.access_token, data.expires_in);

				window.history.replaceState(
					{},
					document.title,
					window.location.pathname,
				);
			} catch (error) {
				console.error("Error during token exchange:", error);
				clearUserTokens();
				localStorage.clear();
			} finally {
				setIsProcessingAuth(false);
			}
		};


	useEffect(() => {
		if (isProcessingAuth) return;

		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get("code");

		if (code && !userAccessToken) {
			exchangeAuthorizationCodeForTokens(code);
			return;
		}

		const storedAccessToken = localStorage.getItem("spotify_access_token");
		const storedExpiresAt = parseInt(
			localStorage.getItem("spotify_token_expires_at"),
			10,
		);
		const isLoggedIn = localStorage.getItem("spotify_logged_in") === "true";

		if (storedAccessToken && storedExpiresAt > Date.now()) {
			setUserAccessToken(storedAccessToken);
			setExpiresAt(storedExpiresAt);
		} else if (isLoggedIn && !initialRefreshAttempted.current) {
			initialRefreshAttempted.current = true;
			refreshAccessToken();
		} else if (!userAccessToken && !publicAccessToken) {
			getPublicAccessToken();
		}
	}, [
		exchangeAuthorizationCodeForTokens,
		refreshAccessToken,
		getPublicAccessToken,
		userAccessToken,
		publicAccessToken,
		isProcessingAuth,
	]);

	useEffect(() => {
		const interval = setInterval(
			() => {
				if (userAccessToken && expiresAt < Date.now()) {
					refreshAccessToken();
				}
			},
			5 * 60 * 1000,
		);
		return () => clearInterval(interval);
	}, [userAccessToken, expiresAt, refreshAccessToken]);

	return {
		userAccessToken,
		publicAccessToken,
		isProcessingAuth,
		refreshAccessToken,
		getPublicAccessToken,
	};
}
