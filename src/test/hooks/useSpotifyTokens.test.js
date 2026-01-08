import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpotifyTokens } from "@/hooks/useSpotifyTokens";

describe("useSpotifyTokens Hook", () => {
	const originalLocation = window.location;

	beforeEach(() => {
		vi.stubGlobal("localStorage", {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		});

		delete window.location;
		window.location = {
			href: "",
			search: "",
			pathname: "/",
		};

		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ access_token: "test_token" }),
			text: () => Promise.resolve(JSON.stringify({ access_token: "test_token" })),
		});
	});

	afterEach(() => {
		window.location = originalLocation;
		vi.restoreAllMocks();
	});

	it("initializes and fetches public token if not logged in", async () => {
		let result;
		await act(async () => {
			const rendered = renderHook(() => useSpotifyTokens());
			result = rendered.result;
		});

		expect(global.fetch).toHaveBeenCalledWith("/api/public-auth", expect.anything());
		expect(result.current.publicAccessToken).toBe("test_token");
	});

	it("refreshes token when refreshAccessToken is called", async () => {
		const mockData = { access_token: "new-token", expires_in: 3600 };
		global.fetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockData),
		});

		let result;
		await act(async () => {
			const rendered = renderHook(() => useSpotifyTokens());
			result = rendered.result;
		});

		let newToken;
		await act(async () => {
			newToken = await result.current.refreshAccessToken();
		});

		expect(newToken).toBe("new-token");
		expect(result.current.userAccessToken).toBe("new-token");
	});
});
