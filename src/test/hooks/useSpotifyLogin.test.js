import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpotifyLogin } from "@/hooks/useSpotifyLogin";

// Mock the auth helpers
vi.mock("@/utils/authHelpers", () => ({
	generateRandomString: () => "test_random_string",
	sha256: async () => new ArrayBuffer(32),
	base64encode: () => "test_code_challenge",
}));

describe("useSpotifyLogin Hook", () => {
	const originalLocation = window.location;

	beforeEach(() => {
		vi.stubGlobal("localStorage", {
			setItem: vi.fn(),
		});

		delete window.location;
		window.location = { href: "" };
	});

	afterEach(() => {
		window.location = originalLocation;
		vi.restoreAllMocks();
	});

	it("spotifyLogin redirects user to Spotify", async () => {
		const { result } = renderHook(() => useSpotifyLogin());

		await act(async () => {
			await result.current.spotifyLogin();
		});

		expect(localStorage.setItem).toHaveBeenCalledWith(
			"code_verifier",
			"test_random_string",
		);
		expect(window.location.href).toContain("accounts.spotify.com/authorize");
	});
});
