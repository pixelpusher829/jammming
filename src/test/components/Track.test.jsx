import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Track from "@/components/Track";

const track = {
	id: "1",
	name: "Test Song",
	artists: ["Artist 1", "Artist 2"],
	album: "Test Album",
	image: "https://i.scdn.co/image/small.jpg",
	durationMs: 215000,
	explicit: true,
	url: "https://open.spotify.com/track/1",
};

function renderTrack(props) {
	return render(
		<ul>
			<Track track={track} {...props} />
		</ul>,
	);
}

describe("Track", () => {
	it("renders track details", () => {
		renderTrack();
		expect(
			screen.getByRole("heading", { name: "Test Song" }),
		).toBeInTheDocument();
		expect(screen.getByText(/Artist 1, Artist 2/)).toBeInTheDocument();
		expect(screen.getByText("3:35")).toBeInTheDocument();
		expect(screen.getByTitle("Explicit")).toBeInTheDocument();
	});

	it("links to the track on Spotify", () => {
		renderTrack();
		expect(
			screen.getByRole("link", { name: /open test song on spotify/i }),
		).toHaveAttribute("href", track.url);
	});

	it("falls back to placeholder art", () => {
		const { container } = render(
			<ul>
				<Track track={{ ...track, image: null }} />
			</ul>,
		);
		expect(container.querySelector("img").getAttribute("src")).toContain(
			"placeholder",
		);
	});

	it("renders the actions it is given", () => {
		renderTrack({ actions: <button type="button">Do it</button> });
		expect(screen.getByRole("button", { name: "Do it" })).toBeInTheDocument();
	});
});
