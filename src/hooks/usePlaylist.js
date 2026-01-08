import { useEffect, useState } from "react";
import { useSpotifyContext } from "@/context/SpotifyContext";

export function usePlaylist() {
	const {
		userAccessToken,
		userProfileId,
		spotifyLogin,
		makeAuthenticatedRequest,
		tracks,
		setTracks,
	} = useSpotifyContext();

	const [isActiveEffect, setIsActiveEffect] = useState(false);
	const [fadeKey, setFadeKey] = useState(0);
	const [playlistButtonText, setPlaylistButtonText] =
		useState("Login to Spotify");
	const [playlistInfo, setPlaylistInfo] = useState({
		name: "",
		id: "",
	});

	// Restore playlist state from local storage on mount
	useEffect(() => {
		const storedPlaylistInfo = window.localStorage.getItem("playlistInfo");
		const storedTracks = window.localStorage.getItem("tracks");

		if (storedPlaylistInfo) {
			setPlaylistInfo(JSON.parse(storedPlaylistInfo));
		}
		if (storedTracks) {
			setTracks(JSON.parse(storedTracks));
		}
		window.localStorage.removeItem("playlistInfo");
		window.localStorage.removeItem("tracks");
	}, [setTracks]);

	// Update button text
	useEffect(() => {
		if (userAccessToken && !playlistInfo.id) {
			setPlaylistButtonText("Save to Spotify");
		} else if (playlistInfo.id) {
			setPlaylistButtonText("Update Playlist");
		} else if (!userAccessToken) {
			setPlaylistButtonText("Login to Spotify");
		}
	}, [userAccessToken, playlistInfo.id]);

	async function getPlaylist(id) {
		if (!id) return;
		const url = `playlists/${id}`;
		return await makeAuthenticatedRequest(url, "GET", null);
	}

	async function updateSpotifyPlaylist(playlistId) {
		const tracksInPlaylist = tracks.filter((track) => track.isInPlaylist);
		const url = `playlists/${playlistId}/tracks`;
		const body = { uris: tracksInPlaylist.map((track) => track.uri) };
		return makeAuthenticatedRequest(url, "PUT", body);
	}

	async function createNewPlaylist() {
		const url = `users/${userProfileId}/playlists`;
		const body = {
			name: playlistInfo.name,
			description: "Created with Jammming",
			public: false,
		};
		return makeAuthenticatedRequest(url, "POST", body);
	}

	async function updatePlaylistName(playlistId) {
		const url = `playlists/${playlistId}`;
		const body = { name: playlistInfo.name };
		return makeAuthenticatedRequest(url, "PUT", body);
	}

	function handleButtonEffect() {
		if (isActiveEffect) return;
		setIsActiveEffect(true);
		setTimeout(() => setIsActiveEffect(false), 500);
	}

	function triggerFadeOut() {
		setFadeKey((prevKey) => prevKey + 1);
	}

	async function handleSaveToSpotify(e) {
		e.preventDefault();

		if (!userAccessToken) {
			window.localStorage.setItem("playlistInfo", JSON.stringify(playlistInfo));
			window.localStorage.setItem("tracks", JSON.stringify(tracks));
			await spotifyLogin();
			return;
		}

		try {
			const response = await getPlaylist(playlistInfo.id);
			const existingPlaylist = !!response;

			if (!existingPlaylist) {
				const newPlaylist = await createNewPlaylist();
				if (newPlaylist?.id) {
					setPlaylistInfo((prev) => ({ ...prev, id: newPlaylist.id }));
					const response = await updateSpotifyPlaylist(newPlaylist.id);
					if (response) triggerFadeOut();
				}
			} else {
				const response = await updateSpotifyPlaylist(playlistInfo.id);
				await updatePlaylistName(playlistInfo.id);
				if (response) triggerFadeOut();
			}
		} catch (error) {
			console.error(error);
		}
	}

	return {
		playlistInfo,
		setPlaylistInfo,
		playlistButtonText,
		isActiveEffect,
		fadeKey,
		handleSaveToSpotify,
		handleButtonEffect,
		tracks, // Re-exporting for the component
	};
}
