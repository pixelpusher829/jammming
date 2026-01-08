import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SearchResults from "@/components/SearchResults";

// Mock CSS modules
vi.mock("@/styles/modules/SearchResults.module.css", () => ({
	default: { searchResults: "searchResults" },
}));
vi.mock("@/styles/modules/Track.module.css", () => ({
	default: { track: "track" },
}));

// Mock Tracklist to avoid full render tree
vi.mock("@/components/Tracklist", () => ({
	default: ({ tracks }) => (
		<div data-testid="tracklist">Tracklist with {tracks.length} tracks</div>
	),
}));

describe("SearchResults", () => {
	it("renders title and Tracklist", () => {
		const mockTracks = [{ id: 1 }, { id: 2 }];
		render(<SearchResults tracks={mockTracks} togglePlaylist={() => {}} />);

		expect(screen.getByText("Search Results")).toBeInTheDocument();
		expect(screen.getByTestId("tracklist")).toBeInTheDocument();
		expect(screen.getByText("Tracklist with 2 tracks")).toBeInTheDocument();
	});
});
