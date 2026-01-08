import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Track from "@/components/Track";

// Mock CSS module
vi.mock("../styles/modules/Track.module.css", () => ({
	default: { track: "track" },
}));

describe("Track", () => {
	const mockTrack = {
		name: "Test Song",
		artists: [{ name: "Artist 1" }, { name: "Artist 2" }],
		album: { name: "Test Album" },
		id: "1",
	};

	it("renders track information correctly", () => {
		render(
			<Track
				name={mockTrack.name}
				artists={mockTrack.artists}
				album={mockTrack.album}
				id={mockTrack.id}
				isInPlaylist={false}
				togglePlaylist={() => {}}
			/>,
		);

		expect(screen.getByText("Test Song")).toBeInTheDocument();
		expect(
			screen.getByText("Artist 1, Artist 2 | Test Album"),
		).toBeInTheDocument();
	});

	it("displays '+' button when not in playlist", () => {
		render(
			<Track
				name={mockTrack.name}
				artists={mockTrack.artists}
				album={mockTrack.album}
				id={mockTrack.id}
				isInPlaylist={false}
				togglePlaylist={() => {}}
			/>,
		);
		expect(screen.getByText("+")).toBeInTheDocument();
	});

	it("displays '-' button when in playlist", () => {
		render(
			<Track
				name={mockTrack.name}
				artists={mockTrack.artists}
				album={mockTrack.album}
				id={mockTrack.id}
				isInPlaylist={true}
				togglePlaylist={() => {}}
			/>,
		);
		expect(screen.getByText("-")).toBeInTheDocument();
	});

	it("calls togglePlaylist with id when button is clicked", () => {
		const togglePlaylistMock = vi.fn();
		render(
			<Track
				name={mockTrack.name}
				artists={mockTrack.artists}
				album={mockTrack.album}
				id={mockTrack.id}
				isInPlaylist={false}
				togglePlaylist={togglePlaylistMock}
			/>,
		);

		fireEvent.click(screen.getByRole("button"));
		expect(togglePlaylistMock).toHaveBeenCalledWith("1");
	});
});
