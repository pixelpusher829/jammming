import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../components/App";

vi.mock("../styles/App.css", () => ({ default: {} }));
vi.mock("../styles/modules/SignInBanner.module.css", () => ({
	default: { signInBanner: "signInBanner" },
}));
vi.mock("../styles/modules/SearchBar.module.css", () => ({
	default: { searchbar: "searchbar", icon: "icon" },
}));
vi.mock("../styles/modules/Playlist.module.css", () => ({
	default: { playlist: "playlist" },
}));
vi.mock("../styles/modules/SearchResults.module.css", () => ({
	default: { searchResults: "searchResults" },
}));
vi.mock("../styles/modules/Tracklist.modules.css", () => ({
	default: { tracklist: "tracklist" },
}));
vi.mock("../styles/modules/Track.module.css", () => ({
	default: { track: "track" },
}));

const mockFetchResponse = (data, ok = true, status = 200) => ({
	ok,
	status,
	json: () => Promise.resolve(data),
	text: () => Promise.resolve(JSON.stringify(data)),
});

describe("Authentication Flow", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		window.localStorage.clear();

		// Mock window.location
		delete window.location;
		window.location = new URL("http://localhost:5173");
		window.location.href = "http://localhost:5173";
	});

	it("shows sign in banner when not logged in", async () => {
		// Mock public auth response
		global.fetch = vi
			.fn()
			.mockResolvedValue(mockFetchResponse({ access_token: "public_token" }));

		render(<App />);

		const banner = await screen.findByText(/Log in to Spotify/i);
		expect(banner).toBeInTheDocument();
	});

	it("attempts to refresh token if spotify_logged_in is true in localStorage", async () => {
		window.localStorage.setItem("spotify_logged_in", "true");

		// Mock failed refresh then success public auth
		global.fetch = vi
			.fn()
			.mockResolvedValueOnce(
				mockFetchResponse({ error: "expired" }, false, 401),
			)
			.mockResolvedValueOnce(
				mockFetchResponse({ access_token: "public_token" }),
			);

		render(<App />);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				"/api/spotify-auth",
				expect.anything(),
			);
		});
	});

	it("exchanges code for token when 'code' param is in URL", async () => {
		window.location.search = "?code=test_code";
		window.localStorage.setItem("code_verifier", "test_verifier");

		global.fetch = vi.fn().mockResolvedValue(
			mockFetchResponse({
				access_token: "user_token",
				expires_in: 3600,
			}),
		);

		render(<App />);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				"/api/spotify-auth",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						authorizationCode: "test_code",
						codeVerifier: "test_verifier",
					}),
				}),
			);
		});

		expect(window.localStorage.getItem("spotify_logged_in")).toBe("true");
	});
});
