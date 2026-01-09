import { createContext, useContext } from "react";
import { useSpotify } from "@/hooks/useSpotify";
import { useTracks } from "@/hooks/useTracks";

const SpotifyContext = createContext();

export function SpotifyProvider({ children }) {
	const spotify = useSpotify();
	const tracks = useTracks(spotify.makeAuthenticatedRequest);

	const value = {
		...spotify,
		...tracks,
	};

	return (
		<SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>
	);
}

export function useSpotifyContext() {
	const context = useContext(SpotifyContext);
	if (!context) {
		throw new Error("useSpotifyContext must be used within a SpotifyProvider");
	}
	return context;
}
