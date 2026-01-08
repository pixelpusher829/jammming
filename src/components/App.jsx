import "../styles/App.css";
import { useState, useEffect, useCallback, useRef } from "react";
import Playlist from "./Playlist";
import SearchResults from "./SearchResults";
import SearchBar from "./SearchBar";
import SignInBanner from "./SignInBanner";

const generateRandomString = (length) => {
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const values = crypto.getRandomValues(new Uint8Array(length));
	return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
	const encoder = new TextEncoder(); 
	const data = encoder.encode(plain);
	return window.crypto.subtle.digest("SHA-256", data);
};

const base64encode = (input) => {
	return btoa(String.fromCharCode(...new Uint8Array(input)))
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
};

function App() {
	const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
	const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

	const [publicAccessToken, setPublicAccessToken] = useState(null);
	const [userAccessToken, setUserAccessToken] = useState(null);
	const [userProfileId, setUserProfileId] = useState(null);
	const [tracks, setTracks] = useState([]);
	const [expiresAt, setExpiresAt] = useState(0);
	const [isProcessingAuth, setIsProcessingAuth] = useState(false);
	const initialRefreshAttempted = useRef(false);

	const refreshAccessToken = useCallback(async () => {
		setIsProcessingAuth(true);
		try {
			const response = await fetch("/api/spotify-auth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to refresh Spotify token.");
			}

			const data = await response.json();
			setUserAccessToken(data.access_token);
			const expiryTime = Date.now() + data.expires_in * 1000 - 5 * 60 * 1000;
			setExpiresAt(expiryTime);

			localStorage.setItem("spotify_access_token", data.access_token);
			localStorage.setItem("spotify_token_expires_at", expiryTime);
			localStorage.setItem("spotify_logged_in", "true");

			return data.access_token;
		} catch (error) {
			setUserAccessToken(null);
			setExpiresAt(0);
			localStorage.removeItem("spotify_access_token");
			localStorage.removeItem("spotify_token_expires_at");
			localStorage.removeItem("spotify_logged_in");
			return null;
		} finally {
			setIsProcessingAuth(false);
		}
	}, []);

	const getPublicAccessToken = useCallback(async () => {
		setIsProcessingAuth(true);
		try {
			const response = await fetch("/api/public-auth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message || "Failed to get public access token."
				);
			}

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
	}, []);

	const exchangeAuthorizationCodeForTokens = useCallback(async (code) => {
		setIsProcessingAuth(true);
		const codeVerifier = localStorage.getItem("code_verifier");
		if (!codeVerifier) {
			setIsProcessingAuth(false);
			return;
		}

		try {
			const response = await fetch("/api/spotify-auth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					authorizationCode: code,
					codeVerifier: codeVerifier,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to get Spotify tokens from backend.");
			}

			const data = await response.json();
			localStorage.removeItem("code_verifier");

			setUserAccessToken(data.access_token);
			const expiryTime = Date.now() + data.expires_in * 1000 - 5 * 60 * 1000;
			setExpiresAt(expiryTime);

			localStorage.setItem("spotify_access_token", data.access_token);
			localStorage.setItem("spotify_token_expires_at", expiryTime);
			localStorage.setItem("spotify_logged_in", "true");

			window.history.replaceState({}, document.title, window.location.pathname);
		} catch (error) {
			console.error("Error during token exchange:", error);
			setUserAccessToken(null);
			setExpiresAt(0);
			localStorage.clear();
		} finally {
			setIsProcessingAuth(false);
		}
	}, []);

	const makeAuthenticatedRequest = useCallback(
		async (url, method, data) => {
			let currentAccessToken = userAccessToken || publicAccessToken;

			const headers = (token) => ({
				"Content-Type": "application/json",
				...(token && { Authorization: `Bearer ${token}` }),
			});

			const performFetch = async (token) => {
				return await fetch(`https://api.spotify.com/v1/${url}`, {
					method: method,
					headers: headers(token),
					body: data ? JSON.stringify(data) : undefined,
				});
			};

			try {
				let response = await performFetch(currentAccessToken);

				if (response.status === 401 || response.status === 403) {
					if (userAccessToken) {
						const newAccessToken = await refreshAccessToken();
						if (newAccessToken) {
							response = await performFetch(newAccessToken);
						} else {
							throw new Error("User session expired. Please log in again.");
						}
					} else if (publicAccessToken) {
						const newPublicToken = await getPublicAccessToken();
						if (newPublicToken) {
							response = await performFetch(newPublicToken);
						} else {
							throw new Error("Failed to acquire new public token.");
						}
					}
				}

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
				}
				const text = await response.text();
				return text ? JSON.parse(text) : null;
			} catch (error) {
				console.error("Error in makeAuthenticatedRequest:", error);
				throw error;
			}
		},
		[userAccessToken, publicAccessToken, refreshAccessToken, getPublicAccessToken]
	);

	const getUserProfileId = useCallback(async () => {
		try {
			const response = await makeAuthenticatedRequest("me", "GET", null);
			if (response && response.id) {
				setUserProfileId(response.id);
			}
		} catch (error) {
			console.error("Error fetching user profile ID:", error);
		}
	}, [makeAuthenticatedRequest]);

	useEffect(() => {
		if (isProcessingAuth) return;

		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get("code");

		if (code && !userAccessToken) {
			exchangeAuthorizationCodeForTokens(code);
			return;
		}

		const storedAccessToken = localStorage.getItem("spotify_access_token");
		const storedExpiresAt = parseInt(localStorage.getItem("spotify_token_expires_at"), 10);
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
	}, [exchangeAuthorizationCodeForTokens, refreshAccessToken, getPublicAccessToken, userAccessToken, publicAccessToken, isProcessingAuth]);

	useEffect(() => {
		if (userAccessToken && !userProfileId) {
			getUserProfileId();
		}
	}, [userAccessToken, userProfileId, getUserProfileId]);

	useEffect(() => {
		const interval = setInterval(() => {
			if (userAccessToken && expiresAt < Date.now()) {
				refreshAccessToken();
			}
		}, 5 * 60 * 1000);
		return () => clearInterval(interval);
	}, [userAccessToken, expiresAt, refreshAccessToken]);

	async function spotifyLogin() {
		const codeVerifier = generateRandomString(64);
		const hashed = await sha256(codeVerifier);
		const codeChallenge = base64encode(hashed);
		const scope = "user-read-private user-read-email playlist-modify-private playlist-modify-public";
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
	}

	async function handleSearch(searchTerm) {
		if (!searchTerm?.trim()) {
			setTracks([]);
			return;
		}
		try {
			const url = `search?q=${encodeURIComponent(searchTerm)}&type=track&limit=10`;
			const response = await makeAuthenticatedRequest(url, "GET", null);
			if (response?.tracks?.items) {
				const newTracks = response.tracks.items.map(track => ({ ...track, isInPlaylist: false }));
				setTracks(prev => {
					const inPlaylist = prev.filter(t => t.isInPlaylist);
					const inPlaylistIds = new Set(inPlaylist.map(t => t.id));
					return [...inPlaylist, ...newTracks.filter(t => !inPlaylistIds.has(t.id))];
				});
			}
		} catch (error) {
			console.error("Search error:", error);
		}
	}

	function togglePlaylist(id) {
		setTracks(tracks.map(track => track.id === id ? { ...track, isInPlaylist: !track.isInPlaylist } : track));
	}

	return (
		<>
			<header><h1>Ja<span>mmm</span>ing</h1></header>
			{!userAccessToken && <SignInBanner spotifyLogin={spotifyLogin} />}
			<main>
				<SearchBar handleSearch={handleSearch} />
				<div className="contents">
					<SearchResults togglePlaylist={togglePlaylist} tracks={tracks} />
					<Playlist
						togglePlaylist={togglePlaylist}
						tracks={tracks}
						setTracks={setTracks}
						userAccessToken={userAccessToken}
						userProfileId={userProfileId}
						spotifyLogin={spotifyLogin}
						makeAuthenticatedRequest={makeAuthenticatedRequest}
					/>
				</div>
			</main>
		</>
	);
}

export default App;