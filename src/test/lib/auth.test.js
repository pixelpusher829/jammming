import { describe, expect, it, vi } from "vitest";
import {
	beginLogin,
	getAccessToken,
	hasStoredSession,
	initSession,
	onSessionExpired,
} from "@/lib/auth";
import { spotifyFetch } from "@/lib/spotify";
import { jsonResponse, mockFetch } from "@/test/utils";

function setCallbackUrl(params) {
	window.history.replaceState({}, "", `/?${new URLSearchParams(params)}`);
}

describe("auth", () => {
	it("uses a cached public token for guests", async () => {
		const { fetch } = mockFetch({
			"POST /api/public-auth": { access_token: "public", expires_in: 3600 },
		});

		const [a, b] = await Promise.all([getAccessToken(), getAccessToken()]);
		const c = await getAccessToken();

		expect([a, b, c]).toEqual(["public", "public", "public"]);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("starts PKCE login with a state parameter", async () => {
		const assign = vi.fn();
		vi.spyOn(window, "location", "get").mockReturnValue({
			...window.location,
			assign,
		});

		await beginLogin();

		const url = new URL(assign.mock.calls[0][0]);
		expect(url.origin).toBe("https://accounts.spotify.com");
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");
		expect(url.searchParams.get("state")).toBe(
			sessionStorage.getItem("jammming:oauth_state"),
		);
		expect(url.searchParams.get("scope")).toContain("playlist-read-private");
	});

	it("completes login when the callback state matches", async () => {
		sessionStorage.setItem("jammming:oauth_state", "abc");
		sessionStorage.setItem("jammming:code_verifier", "verifier");
		setCallbackUrl({ code: "the-code", state: "abc" });
		const { calls } = mockFetch({
			"POST /api/spotify-auth": { access_token: "user", expires_in: 3600 },
		});

		await expect(initSession()).resolves.toBe(true);

		expect(calls[0].body).toEqual({
			authorizationCode: "the-code",
			codeVerifier: "verifier",
		});
		expect(window.location.search).toBe("");
		expect(hasStoredSession()).toBe(true);
		await expect(getAccessToken()).resolves.toBe("user");
	});

	it("rejects a callback with a mismatched state", async () => {
		sessionStorage.setItem("jammming:oauth_state", "abc");
		sessionStorage.setItem("jammming:code_verifier", "verifier");
		setCallbackUrl({ code: "the-code", state: "evil" });
		const { fetch } = mockFetch({});

		await expect(initSession()).rejects.toThrow(/expired or was invalid/);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("reports a cancelled sign-in", async () => {
		setCallbackUrl({ error: "access_denied", state: "abc" });
		await expect(initSession()).rejects.toThrow(/cancelled/);
	});

	it("restores a session from the refresh cookie on reload", async () => {
		localStorage.setItem("jammming:has_session", "1");
		mockFetch({
			"POST /api/spotify-auth": { access_token: "refreshed", expires_in: 3600 },
		});

		await expect(initSession()).resolves.toBe(true);
		await expect(getAccessToken()).resolves.toBe("refreshed");
	});

	it("refreshes once on 401 and notifies listeners when the session is gone", async () => {
		localStorage.setItem("jammming:has_session", "1");
		let refreshes = 0;
		mockFetch({
			"POST /api/spotify-auth": () => {
				refreshes += 1;
				return refreshes === 1
					? { access_token: "user", expires_in: 3600 }
					: jsonResponse({ error: "invalid_grant" }, 400);
			},
			"GET me": jsonResponse({ error: { message: "expired" } }, 401),
		});
		await initSession();
		const expired = vi.fn();
		onSessionExpired(expired);

		await expect(spotifyFetch("me")).rejects.toThrow();

		expect(expired).toHaveBeenCalledTimes(1);
		expect(hasStoredSession()).toBe(false);
	});
});
