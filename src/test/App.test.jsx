import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/components/App";

// Mock CSS modules
vi.mock("@/styles/App.css", () => ({ default: {} }));
vi.mock("@/styles/modules/SignInBanner.module.css", () => ({ default: {} }));
vi.mock("@/styles/modules/SearchBar.module.css", () => ({ default: {} }));
vi.mock("@/styles/modules/Playlist.module.css", () => ({ default: {} }));
vi.mock("@/styles/modules/SearchResults.module.css", () => ({ default: {} }));
vi.mock("@/styles/modules/Tracklist.modules.css", () => ({ default: {} }));
vi.mock("@/styles/modules/Track.module.css", () => ({
	default: { track: "track" },
}));

const mockSearchResponse = {
	tracks: {
		items: [
			{
				id: "1",
				name: "Song 1",
				artists: [{ name: "Artist 1" }],
				album: { name: "Album 1", images: [] },
				uri: "spotify:track:1",
			},
			{
				id: "2",
				name: "Song 2",
				artists: [{ name: "Artist 2" }],
				album: { name: "Album 2", images: [] },
				uri: "spotify:track:2",
			},
		],
	},
};

const mockFetchResponse = (data, ok = true, status = 200) => ({
	ok,
	status,
	json: () => Promise.resolve(data),
	text: () => Promise.resolve(JSON.stringify(data)),
});

describe("App Integration Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		window.localStorage.clear();
		global.fetch = vi.fn();

		// Mock window.location
		delete window.location;
		window.location = new URL("http://localhost:5173");
		window.location.href = "http://localhost:5173";
	});

	it("shows sign in banner when not logged in", async () => {
		global.fetch.mockResolvedValueOnce(
			mockFetchResponse({ access_token: "public_token" }),
		);

		render(<App />);

		const banner = await screen.findByText(/Log in to Spotify/i);
		expect(banner).toBeInTheDocument();
	});

	it("adds and removes tracks from playlist", async () => {
		global.fetch.mockResolvedValueOnce(
			mockFetchResponse({ access_token: "public_token" }),
		);

		render(<App />);

		global.fetch.mockResolvedValueOnce(mockFetchResponse(mockSearchResponse));

		const input = screen.getByPlaceholderText("Enter a song name");
		fireEvent.change(input, { target: { value: "test" } });
		fireEvent.submit(input.closest("form"));

		await waitFor(() => {
			expect(screen.getByText("Song 1")).toBeInTheDocument();
		});

		const addButtons = screen.getAllByText("+");
		fireEvent.click(addButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("-")).toBeInTheDocument();
		});
	});

	it("saves playlist to Spotify when authenticated", async () => {
		window.localStorage.setItem("spotify_access_token", "user_token");
		window.localStorage.setItem(
			"spotify_token_expires_at",
			(Date.now() + 3600000).toString(),
		);
		window.localStorage.setItem("spotify_logged_in", "true");

		// Mocks for:
		// 1. Profile fetch on mount
		global.fetch.mockResolvedValueOnce(mockFetchResponse({ id: "user-123" }));
		// 2. Search
		global.fetch.mockResolvedValueOnce(mockFetchResponse(mockSearchResponse));
		// 3. Create playlist (skipped getPlaylist check because ID is empty)
		global.fetch.mockResolvedValueOnce(mockFetchResponse({ 
			id: "new-id",
			external_urls: { spotify: "http://playlist.url" }
		}));
		// 4. Add tracks
		global.fetch.mockResolvedValueOnce(
			mockFetchResponse({ snapshot_id: "snap-123" }),
		);

		render(<App />);

		const input = screen.getByPlaceholderText("Enter a song name");
		fireEvent.change(input, { target: { value: "test" } });
		fireEvent.submit(input.closest("form"));

		await waitFor(() => expect(screen.getByText("Song 1")).toBeInTheDocument());
		fireEvent.click(screen.getAllByText("+")[0]);

		const playlistInput = screen.getByPlaceholderText("Enter Playlist Name");
		fireEvent.change(playlistInput, { target: { value: "My New Playlist" } });

		fireEvent.click(screen.getByText("Save to Spotify"));

		await waitFor(() => {
			expect(screen.getByText("Playlist saved!")).toBeInTheDocument();
		});
	});
});
