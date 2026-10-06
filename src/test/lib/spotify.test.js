import { describe, expect, it } from "vitest";
import {
	getEditablePlaylists,
	getPlaylistTracks,
	SpotifyError,
	savePlaylist,
	searchTracks,
} from "@/lib/spotify";
import { jsonResponse, mockFetch, rawTrack, searchPage } from "@/test/utils";

const publicToken = {
	"POST /api/public-auth": { access_token: "public", expires_in: 3600 },
};

function draft(overrides = {}) {
	return {
		playlistId: null,
		name: "Road trip",
		description: "",
		isPublic: false,
		tracks: [{ id: "a", uri: "spotify:track:a" }],
		...overrides,
	};
}

describe("searchTracks", () => {
	it("normalises tracks and computes the next offset", async () => {
		const { calls } = mockFetch({
			...publicToken,
			"GET search": searchPage(["1", "2"], { total: 25, next: "next-url" }),
		});

		const result = await searchTracks("lofi", { offset: 10 });

		expect(result.tracks[0]).toMatchObject({
			id: "1",
			name: "Song 1",
			artists: ["Artist 1"],
			album: "Album 1",
			durationMs: 180000,
		});
		expect(result.nextOffset).toBe(20);
		const search = new URLSearchParams(calls.at(-1).search);
		expect(search.get("limit")).toBe("10");
		expect(search.get("offset")).toBe("10");
	});

	it("stops paging at the last page", async () => {
		mockFetch({
			...publicToken,
			"GET search": searchPage(["1"], { total: 1, next: null }),
		});
		const result = await searchTracks("x");
		expect(result.nextOffset).toBeUndefined();
	});

	it("turns API failures into friendly SpotifyErrors", async () => {
		mockFetch({
			...publicToken,
			"GET search": jsonResponse({ error: { message: "boom" } }, 503),
		});
		const error = await searchTracks("x").catch((e) => e);
		expect(error).toBeInstanceOf(SpotifyError);
		expect(error.status).toBe(503);
		expect(error.message).toMatch(/having trouble/i);
	});
});

describe("savePlaylist", () => {
	it("creates a new playlist via /me/playlists and fills it", async () => {
		const { calls } = mockFetch({
			...publicToken,
			"POST me/playlists": {
				id: "new",
				external_urls: { spotify: "https://open.spotify.com/playlist/new" },
			},
			"PUT playlists/new/items": { snapshot_id: "s" },
		});

		const result = await savePlaylist(draft());

		expect(result).toEqual({
			id: "new",
			url: "https://open.spotify.com/playlist/new",
			created: true,
		});
		const create = calls.find((c) => c.path === "me/playlists");
		expect(create.body).toEqual({ name: "Road trip", public: false });
		const fill = calls.find((c) => c.path === "playlists/new/items");
		expect(fill.body).toEqual({ uris: ["spotify:track:a"] });
	});

	it("updates details and items for an existing playlist", async () => {
		const { calls } = mockFetch({
			...publicToken,
			"PUT playlists/p1": null,
			"PUT playlists/p1/items": { snapshot_id: "s" },
		});

		const result = await savePlaylist(
			draft({ playlistId: "p1", description: "Summer", isPublic: true }),
		);

		expect(result).toEqual({ id: "p1", created: false });
		expect(calls.find((c) => c.path === "playlists/p1").body).toEqual({
			name: "Road trip",
			description: "Summer",
			public: true,
		});
	});

	it("recreates the playlist if it was deleted on Spotify", async () => {
		const { calls } = mockFetch({
			...publicToken,
			"PUT playlists/gone": jsonResponse({ error: { message: "nope" } }, 404),
			"POST me/playlists": { id: "fresh", external_urls: {} },
			"PUT playlists/fresh/items": { snapshot_id: "s" },
		});

		const result = await savePlaylist(draft({ playlistId: "gone" }));

		expect(result.id).toBe("fresh");
		expect(calls.some((c) => c.path === "me/playlists")).toBe(true);
	});

	it("uploads a pending cover and reports cover failures without failing the save", async () => {
		const { calls } = mockFetch({
			...publicToken,
			"PUT playlists/p1": null,
			"PUT playlists/p1/items": { snapshot_id: "s" },
			"PUT playlists/p1/images": jsonResponse(null, 401),
			"POST /api/spotify-auth": jsonResponse({ error: "no" }, 400),
		});

		const result = await savePlaylist(
			draft({
				playlistId: "p1",
				cover: "data:image/jpeg;base64,QUJD",
				coverDirty: true,
			}),
		);

		const upload = calls.find((c) => c.path === "playlists/p1/images");
		expect(upload).toBeDefined();
		expect(result.coverSaved).toBeUndefined();
		expect(result.coverError).toMatch(/sign out and back in/i);
	});

	it("writes large playlists in chunks of 100", async () => {
		const tracks = Array.from({ length: 250 }, (_, i) => ({
			id: `${i}`,
			uri: `spotify:track:${i}`,
		}));
		const { calls } = mockFetch({
			...publicToken,
			"PUT playlists/p1": null,
			"PUT playlists/p1/items": { snapshot_id: "s" },
			"POST playlists/p1/items": { snapshot_id: "s" },
		});

		await savePlaylist(draft({ playlistId: "p1", tracks }));

		const writes = calls.filter((c) => c.path === "playlists/p1/items");
		expect(writes.map((w) => [w.method, w.body.uris.length])).toEqual([
			["PUT", 100],
			["POST", 100],
			["POST", 50],
		]);
	});
});

describe("playlist loading", () => {
	it("only lists playlists the user can edit", async () => {
		mockFetch({
			...publicToken,
			"GET me/playlists": {
				items: [
					{
						id: "mine",
						name: "Mine",
						owner: { id: "me" },
						items: { total: 3 },
					},
					{
						id: "collab",
						name: "Collab",
						owner: { id: "x" },
						collaborative: true,
					},
					{ id: "theirs", name: "Theirs", owner: { id: "x" } },
				],
				next: null,
			},
		});

		const playlists = await getEditablePlaylists("me");

		expect(playlists.map((p) => p.id)).toEqual(["mine", "collab"]);
		expect(playlists[0].total).toBe(3);
	});

	it("follows pagination and skips local files and episodes", async () => {
		mockFetch({
			...publicToken,
			"GET playlists/p1/items?limit=50": {
				items: [
					{ item: rawTrack("1") },
					{ item: { ...rawTrack("local"), id: null }, is_local: true },
				],
				next: "https://api.spotify.com/v1/playlists/p1/items?offset=50&limit=50",
			},
			"GET playlists/p1/items?offset=50&limit=50": {
				items: [
					{ item: { type: "episode", id: "ep" } },
					{ track: rawTrack("2") },
				],
				next: null,
			},
		});

		const { tracks, skipped } = await getPlaylistTracks("p1");

		expect(tracks.map((t) => t.id)).toEqual(["1", "2"]);
		expect(skipped).toBe(2);
	});
});
