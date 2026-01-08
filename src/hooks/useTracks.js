import { useState } from "react";

export function useTracks(makeAuthenticatedRequest) {
	const [tracks, setTracks] = useState([]);

	async function handleSearch(searchTerm) {
		if (!searchTerm?.trim()) {
			setTracks([]);
			return;
		}
		try {
			const url = `search?q=${encodeURIComponent(searchTerm)}&type=track&limit=10`;
			const response = await makeAuthenticatedRequest(url, "GET", null);
			if (response?.tracks?.items) {
				const newTracks = response.tracks.items.map((track) => ({
					...track,
					isInPlaylist: false,
				}));
				setTracks((prev) => {
					const inPlaylist = prev.filter((t) => t.isInPlaylist);
					const inPlaylistIds = new Set(inPlaylist.map((t) => t.id));
					return [
						...inPlaylist,
						...newTracks.filter((t) => !inPlaylistIds.has(t.id)),
					];
				});
			}
		} catch (error) {
			console.error("Search error:", error);
		}
	}

	function togglePlaylist(id) {
		setTracks((prevTracks) =>
			prevTracks.map((track) =>
				track.id === id
					? { ...track, isInPlaylist: !track.isInPlaylist }
					: track,
			),
		);
	}

	return { tracks, setTracks, handleSearch, togglePlaylist };
}
