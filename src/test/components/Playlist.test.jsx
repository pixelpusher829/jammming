import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Playlist from "@/components/Playlist";
import { SpotifyProvider } from "@/context/SpotifyContext";

// Mock CSS modules
vi.mock("@/styles/modules/Playlist.module.css", () => ({
	default: {
		playlist: "playlist",
		saveButton: "saveButton",
		buttonEffect: "buttonEffect",
		success: "success",
		fadeOut: "fadeOut",
	},
}));
vi.mock("@/styles/modules/Track.module.css", () => ({
	default: { track: "track" },
}));

// Mock Track to simplify testing
vi.mock("@/components/Track", () => ({
	default: ({ name, togglePlaylist, id }) => (
		<div data-testid="track-in-playlist">
			{name}
			<button onClick={() => togglePlaylist(id)} type="button">
				Remove
			</button>
		</div>
	),
}));

// Mock useSpotify and useTracks since SpotifyProvider uses them
vi.mock("@/hooks/useSpotify", () => ({
	useSpotify: () => ({
		userAccessToken: "token",
		userProfileId: "user",
		spotifyLogin: vi.fn(),
		makeAuthenticatedRequest: vi.fn(),
	}),
}));

vi.mock("@/hooks/useTracks", () => ({
	useTracks: () => ({
		tracks: [
			{ id: "1", name: "Track 1", isInPlaylist: true, artists: [], album: {} },
		],
		setTracks: vi.fn(),
		handleSearch: vi.fn(),
		togglePlaylist: vi.fn(),
	}),
}));

describe("Playlist", () => {
	it("renders input for playlist name", () => {
		render(
			<SpotifyProvider>
				<Playlist togglePlaylist={vi.fn()} />
			</SpotifyProvider>,
		);
		expect(
			screen.getByPlaceholderText("Enter Playlist Name"),
		).toBeInTheDocument();
	});

	it("renders tracks in playlist", () => {
		render(
			<SpotifyProvider>
				<Playlist togglePlaylist={vi.fn()} />
			</SpotifyProvider>,
		);
		expect(screen.getByText("Track 1")).toBeInTheDocument();
	});
});