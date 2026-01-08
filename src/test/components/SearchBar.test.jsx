import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SearchBar from "@/components/SearchBar";

// Mock CSS module
vi.mock("../styles/modules/SearchBar.module.css", () => ({
	default: { searchbar: "searchbar", icon: "icon" },
}));

describe("SearchBar", () => {
	it("renders input and search button", () => {
		render(<SearchBar handleSearch={() => {}} />);
		expect(
			screen.getByPlaceholderText("Enter a song name"),
		).toBeInTheDocument();
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("updates input value when typing", () => {
		render(<SearchBar handleSearch={() => {}} />);
		const input = screen.getByPlaceholderText("Enter a song name");
		fireEvent.change(input, { target: { value: "test song" } });
		expect(input.value).toBe("test song");
	});

	it("calls handleSearch with input value when form is submitted", () => {
		const handleSearchMock = vi.fn();
		render(<SearchBar handleSearch={handleSearchMock} />);

		const input = screen.getByPlaceholderText("Enter a song name");
		fireEvent.change(input, { target: { value: "test song" } });

		const form = input.closest("form");
		fireEvent.submit(form);

		expect(handleSearchMock).toHaveBeenCalledWith("test song");
	});
});
