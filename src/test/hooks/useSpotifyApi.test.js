import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSpotifyApi } from "@/hooks/useSpotifyApi";

describe("useSpotifyApi Hook", () => {
	it("makes authenticated request with provided token", async () => {
		const mockData = { data: "success" };
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve(mockData),
			text: () => Promise.resolve(JSON.stringify(mockData)),
		});

		const refreshAccessToken = vi.fn();
		const getPublicAccessToken = vi.fn();

		const { result } = renderHook(() =>
			useSpotifyApi(
				"user-token",
				null,
				refreshAccessToken,
				getPublicAccessToken,
			),
		);

		const data = await result.current.makeAuthenticatedRequest("test", "GET");

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.spotify.com/v1/test",
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer user-token",
				}),
			}),
		);
		expect(data).toEqual({ data: "success" });
	});

	it("attempts to refresh token on 401", async () => {
		const retryData = { data: "retry-success" };
		global.fetch = vi
			.fn()
			.mockResolvedValueOnce({
				status: 401,
				ok: false,
				text: () => Promise.resolve("Unauthorized"),
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve(retryData),
				text: () => Promise.resolve(JSON.stringify(retryData)),
			});

		const refreshAccessToken = vi.fn().mockResolvedValue("new-token");
		const getPublicAccessToken = vi.fn();

		const { result } = renderHook(() =>
			useSpotifyApi(
				"old-token",
				null,
				refreshAccessToken,
				getPublicAccessToken,
			),
		);

		const data = await result.current.makeAuthenticatedRequest("test", "GET");

		expect(refreshAccessToken).toHaveBeenCalled();
		expect(global.fetch).toHaveBeenCalledTimes(2);
		expect(data).toEqual({ data: "retry-success" });
	});
});