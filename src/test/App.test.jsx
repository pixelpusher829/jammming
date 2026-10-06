import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "@/components/App";
import {
	mockFetch,
	rawTrack,
	renderWithProviders,
	searchPage,
} from "@/test/utils";

const guestRoutes = {
	"POST /api/public-auth": { access_token: "public", expires_in: 3600 },
	"GET search": searchPage(["1", "2"], { total: 2 }),
};

const userRoutes = {
	"POST /api/spotify-auth": { access_token: "user", expires_in: 3600 },
	"GET me": {
		id: "user-1",
		display_name: "Jamie",
		images: [],
		external_urls: { spotify: "https://open.spotify.com/user/user-1" },
	},
	"GET search": searchPage(["1", "2"], { total: 2 }),
};

function signIn() {
	localStorage.setItem("jammming:has_session", "1");
}

async function search(term = "test") {
	fireEvent.change(screen.getByRole("searchbox"), { target: { value: term } });
	fireEvent.submit(screen.getByRole("searchbox").closest("form"));
	await screen.findByRole("heading", { name: "Song 1" });
}

function results() {
	return within(screen.getByRole("region", { name: "Results" }));
}

function playlist() {
	return within(
		screen.getByRole("region", { name: /new playlist|editing playlist/i }),
	);
}

describe("App", () => {
	it("invites guests to sign in", async () => {
		mockFetch(guestRoutes);
		renderWithProviders(<App />);

		expect(
			await screen.findByText(/sign in later to save/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /sign in with spotify/i }),
		).toBeInTheDocument();
	});

	it("lets guests search and build a playlist", async () => {
		mockFetch(guestRoutes);
		renderWithProviders(<App />);
		await search();

		fireEvent.click(
			results().getByRole("button", { name: "Add Song 1 to playlist" }),
		);

		expect(
			playlist().getByRole("heading", { name: "Song 1" }),
		).toBeInTheDocument();
		expect(
			results().getByRole("button", { name: "Remove Song 1 from playlist" }),
		).toHaveAttribute("aria-pressed", "true");
		expect(
			playlist().getByRole("button", { name: /sign in to save/i }),
		).toBeEnabled();
	});

	it("undoes removing a track from the playlist", async () => {
		mockFetch(guestRoutes);
		renderWithProviders(<App />);
		await search();
		fireEvent.click(
			results().getByRole("button", { name: "Add Song 1 to playlist" }),
		);
		fireEvent.click(
			results().getByRole("button", { name: "Add Song 2 to playlist" }),
		);

		fireEvent.click(
			playlist().getByRole("button", { name: "Remove Song 1 from playlist" }),
		);
		expect(
			playlist().queryByRole("heading", { name: "Song 1" }),
		).not.toBeInTheDocument();

		fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
		const titles = playlist()
			.getAllByRole("heading", { level: 3 })
			.map((h) => h.textContent);
		expect(titles).toEqual(["Song 1", "Song 2"]);
	});

	it("runs a suggested search from the welcome screen", async () => {
		mockFetch(guestRoutes);
		renderWithProviders(<App />);

		fireEvent.click(screen.getByRole("button", { name: "Daft Punk" }));

		expect(
			await screen.findByRole("heading", { name: "Song 1" }),
		).toBeInTheDocument();
		expect(screen.getByRole("searchbox")).toHaveValue("Daft Punk");
	});

	it("shows a friendly message when search fails", async () => {
		mockFetch({
			...guestRoutes,
			"GET search": new Response(null, { status: 503 }),
		});
		renderWithProviders(<App />);

		fireEvent.change(screen.getByRole("searchbox"), { target: { value: "x" } });
		fireEvent.submit(screen.getByRole("searchbox").closest("form"));

		expect(await screen.findByText(/having trouble/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /try again/i }),
		).toBeInTheDocument();
	});

	it("saves a new playlist for signed-in users", async () => {
		signIn();
		const { calls } = mockFetch({
			...userRoutes,
			"POST me/playlists": {
				id: "new-id",
				external_urls: { spotify: "https://open.spotify.com/playlist/new-id" },
			},
			"PUT playlists/new-id/items": { snapshot_id: "s" },
		});
		renderWithProviders(<App />);

		expect(await screen.findByText("Jamie")).toBeInTheDocument();
		await search();
		fireEvent.click(
			results().getByRole("button", { name: "Add Song 2 to playlist" }),
		);
		fireEvent.change(playlist().getByLabelText("Playlist name"), {
			target: { value: "Weekend" },
		});
		fireEvent.click(
			playlist().getByRole("button", { name: "Save to Spotify" }),
		);

		expect(
			await screen.findByText(/playlist created on spotify/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /open in spotify/i }),
		).toHaveAttribute("href", "https://open.spotify.com/playlist/new-id");
		expect(calls.find((c) => c.path === "me/playlists").body.name).toBe(
			"Weekend",
		);
		expect(calls.find((c) => c.path === "playlists/new-id/items").body).toEqual(
			{
				uris: ["spotify:track:2"],
			},
		);
		expect(playlist().getByRole("button", { name: "Saved" })).toBeDisabled();
	});

	it("shows save errors without losing the draft", async () => {
		signIn();
		mockFetch({
			...userRoutes,
			"POST me/playlists": new Response(null, { status: 403 }),
		});
		renderWithProviders(<App />);
		await screen.findByText("Jamie");
		await search();
		fireEvent.click(
			results().getByRole("button", { name: "Add Song 1 to playlist" }),
		);
		fireEvent.click(
			playlist().getByRole("button", { name: "Save to Spotify" }),
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(/denied/i);
		expect(
			playlist().getByRole("heading", { name: "Song 1" }),
		).toBeInTheDocument();
	});

	it("opens and edits an existing playlist", async () => {
		signIn();
		vi.spyOn(window, "confirm").mockReturnValue(true);
		const { calls } = mockFetch({
			...userRoutes,
			"GET me/playlists": {
				items: [
					{
						id: "p1",
						name: "Old favourites",
						description: "",
						public: false,
						owner: { id: "user-1" },
						images: [],
						items: { total: 1 },
						external_urls: { spotify: "https://open.spotify.com/playlist/p1" },
					},
				],
				next: null,
			},
			"GET playlists/p1/items": {
				items: [{ item: rawTrack("9") }],
				next: null,
			},
			"PUT playlists/p1": null,
			"PUT playlists/p1/items": { snapshot_id: "s" },
		});
		renderWithProviders(<App />);
		await screen.findByText("Jamie");

		fireEvent.click(screen.getByRole("button", { name: "Open" }));
		fireEvent.click(
			await screen.findByRole("button", { name: /old favourites/i }),
		);

		expect(
			await screen.findByRole("heading", { name: "Editing playlist" }),
		).toBeInTheDocument();
		expect(playlist().getByLabelText("Playlist name")).toHaveValue(
			"Old favourites",
		);
		expect(playlist().getByRole("button", { name: "Saved" })).toBeDisabled();

		await search();
		fireEvent.click(
			results().getByRole("button", { name: "Add Song 1 to playlist" }),
		);
		expect(playlist().getByText("Unsaved changes")).toBeInTheDocument();
		fireEvent.click(playlist().getByRole("button", { name: "Save changes" }));

		expect(await screen.findByText("Playlist updated.")).toBeInTheDocument();
		expect(
			calls.find((c) => c.method === "PUT" && c.path === "playlists/p1/items")
				.body.uris,
		).toEqual(["spotify:track:9", "spotify:track:1"]);
	});

	it("signs out", async () => {
		signIn();
		const { calls } = mockFetch({
			...userRoutes,
			"POST /api/logout": new Response(null, { status: 204 }),
		});
		renderWithProviders(<App />);

		fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /sign in with spotify/i }),
			).toBeInTheDocument(),
		);
		expect(calls.some((c) => c.path === "/api/logout")).toBe(true);
		expect(screen.queryByText("Jamie")).not.toBeInTheDocument();
	});
});
