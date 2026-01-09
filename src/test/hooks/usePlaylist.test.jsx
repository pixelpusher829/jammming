import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { usePlaylist } from "@/hooks/usePlaylist";
import { SpotifyProvider } from "@/context/SpotifyContext";

// Mock the underlying hooks used by SpotifyProvider
vi.mock("@/hooks/useSpotify", () => ({
	useSpotify: () => ({
		userAccessToken: "fake-token",
		userProfileId: "user-123",
		spotifyLogin: vi.fn(),
		makeAuthenticatedRequest: vi.fn().mockResolvedValue({}),
	}),
}));

vi.mock("@/hooks/useTracks", () => ({
	useTracks: () => ({
		tracks: [],
		setTracks: vi.fn(),
		handleSearch: vi.fn(),
		togglePlaylist: vi.fn(),
	}),
}));

describe("usePlaylist Hook with Context", () => {
	const wrapper = ({ children }) => (
		<SpotifyProvider>{children}</SpotifyProvider>
	);

	beforeEach(() => {
		vi.clearAllMocks();
		// Manually mock localStorage if needed, or just use the global one if in jsdom
		const store = {};
		vi.stubGlobal("localStorage", {
			getItem: vi.fn((key) => store[key] || null),
			setItem: vi.fn((key, value) => {
				store[key] = value.toString();
			}),
			removeItem: vi.fn((key) => {
				delete store[key];
			}),
			clear: vi.fn(() => {
				for (const key in store) delete store[key];
			}),
		});
	});

	it("initializes with default state", () => {
		const { result } = renderHook(() => usePlaylist(), { wrapper });

		expect(result.current.playlistInfo).toEqual({ name: "", id: "" });
		expect(result.current.playlistButtonText).toBe("Save to Spotify");
	});

	it("updates playlist info state", async () => {
		const { result } = renderHook(() => usePlaylist(), { wrapper });

		const newInfo = { name: "My New Playlist", id: "" };

		await act(async () => {
			result.current.setPlaylistInfo(newInfo);
		});

		expect(result.current.playlistInfo.name).toBe("My New Playlist");
	});

	it("handles the button effect toggle", async () => {
		const { result } = renderHook(() => usePlaylist(), { wrapper });

		expect(result.current.isActiveEffect).toBe(false);

		await act(async () => {
			result.current.handleButtonEffect();
		});

		expect(result.current.isActiveEffect).toBe(true);

		await waitFor(
			() => {
				expect(result.current.isActiveEffect).toBe(false);
			},
			{ timeout: 1000 },
		);
	});
});
