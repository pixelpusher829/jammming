import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSpotify } from "@/hooks/useSpotify";

// Mock the sub-hooks
vi.mock("@/hooks/useSpotifyTokens", () => ({
	useSpotifyTokens: () => ({
		userAccessToken: "mock-user-token",
		publicAccessToken: "mock-public-token",
		refreshAccessToken: vi.fn(),
		getPublicAccessToken: vi.fn(),
	}),
}));

vi.mock("@/hooks/useSpotifyLogin", () => ({
	useSpotifyLogin: () => ({
		spotifyLogin: vi.fn(),
	}),
}));

vi.mock("@/hooks/useSpotifyApi", () => ({
	useSpotifyApi: () => ({
		makeAuthenticatedRequest: vi.fn(),
	}),
}));

vi.mock("@/hooks/useSpotifyProfile", () => ({
	useSpotifyProfile: () => ({
		userProfileId: "mock-profile-id",
	}),
}));

describe("useSpotify Composition Hook", () => {
	it("combines all sub-hooks correctly", () => {
		const { result } = renderHook(() => useSpotify());

		expect(result.current.userAccessToken).toBe("mock-user-token");
		expect(result.current.userProfileId).toBe("mock-profile-id");
		expect(typeof result.current.spotifyLogin).toBe("function");
		expect(typeof result.current.makeAuthenticatedRequest).toBe("function");
	});
});
