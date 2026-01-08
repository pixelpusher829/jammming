import { describe, expect, it } from "vitest";

describe("Environment Configuration", () => {
	it("should have the Spotify Client ID configured", () => {
		const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
		expect(clientId).toBeDefined();
		expect(clientId).not.toBe("");
		expect(typeof clientId).toBe("string");
	});

	it("should have the Spotify Redirect URI configured", () => {
		const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
		expect(redirectUri).toBeDefined();
		expect(redirectUri).not.toBe("");
		expect(typeof redirectUri).toBe("string");
		expect(redirectUri).toMatch(/^https?:\/\//);
	});
});
