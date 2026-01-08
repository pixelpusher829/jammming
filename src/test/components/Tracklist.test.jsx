import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Tracklist from "@/components/Tracklist";

// Mock CSS module (Track component uses it)
vi.mock("@/styles/modules/Track.module.css", () => ({
	default: { track: "track" },
}));

// Mock Track component to isolate Tracklist testing
vi.mock("@/components/Track", () => ({
	default: ({ name, isInPlaylist}) => (
		<div data-testid="track">
			{name} - {isInPlaylist ? "In Playlist" : "Not In Playlist"}
		</div>
	),
}));

describe("Tracklist", () => {
	const mockTracks = [
		{ id: "1", name: "Track 1", artists: [], album: {}, isInPlaylist: false },
		{ id: "2", name: "Track 2", artists: [], album: {}, isInPlaylist: true },
		{ id: "3", name: "Track 3", artists: [], album: {}, isInPlaylist: false },
	];

	it("renders only tracks that are NOT in the playlist", () => {
		render(<Tracklist tracks={mockTracks} togglePlaylist={() => {}} />);

		const renderedTracks = screen.getAllByTestId("track");
		expect(renderedTracks).toHaveLength(2);
		expect(screen.getByText("Track 1 - Not In Playlist")).toBeInTheDocument();
		expect(screen.getByText("Track 3 - Not In Playlist")).toBeInTheDocument();
		expect(screen.queryByText("Track 2 - In Playlist")).not.toBeInTheDocument();
	});
});
