import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Track from "@/components/Track";

// Mock CSS module
vi.mock("@/styles/modules/Track.module.css", () => ({
	default: { 
        track: "track", 
        trackContent: "trackContent",
        imageContainer: "imageContainer",
        albumArt: "albumArt",
        spotifyLink: "spotifyLink",
        trackInfo: "trackInfo",
        toggleButton: "toggleButton"
    },
}));

describe("Track", () => {
	const mockTrack = {
		name: "Test Song",
		artists: [{ name: "Artist 1" }],
		album: { 
            name: "Test Album",
            images: [{}, {}, { url: "http://image.url" }]
        },
		id: "1",
		external_urls: { spotify: "http://spotify.url" }
	};

	it("renders track information and artwork link", () => {
		render(
			<Track
				track={mockTrack}
				isInPlaylist={false}
				togglePlaylist={() => {}}
			/>,
		);

		expect(screen.getByText("Test Song")).toBeInTheDocument();
		expect(screen.getByAltText("Test Album")).toHaveAttribute("src", "http://image.url");
		expect(screen.getByRole("link")).toHaveAttribute("href", "http://spotify.url");
	});

	it("renders toggle button correctly", () => {
		render(
			<Track
				track={mockTrack}
				isInPlaylist={true}
				togglePlaylist={() => {}}
			/>,
		);
		expect(screen.getByText("-")).toBeInTheDocument();
	});
});
