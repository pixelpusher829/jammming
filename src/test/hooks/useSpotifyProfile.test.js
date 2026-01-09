import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSpotifyProfile } from "@/hooks/useSpotifyProfile";

describe("useSpotifyProfile Hook", () => {
	it("fetches profile id when token is provided", async () => {
		const makeAuthenticatedRequest = vi
			.fn()
			.mockResolvedValue({ id: "user-123" });

		let result;
		await act(async () => {
			const rendered = renderHook(() =>
				useSpotifyProfile(makeAuthenticatedRequest, "some-token"),
			);
			result = rendered.result;
		});

		expect(makeAuthenticatedRequest).toHaveBeenCalledWith("me", "GET", null);
		expect(result.current.userProfileId).toBe("user-123");
	});

	it("resets profile id when token is removed", async () => {
		const makeAuthenticatedRequest = vi.fn();
		const { result, rerender } = renderHook(
			({ token }) => useSpotifyProfile(makeAuthenticatedRequest, token),
			{
				initialProps: { token: "some-token" },
			},
		);

		await act(async () => {
			rerender({ token: null });
		});

		expect(result.current.userProfileId).toBeNull();
	});
});
