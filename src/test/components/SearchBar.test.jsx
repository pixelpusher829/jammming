import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import SearchBar from "@/components/SearchBar";

function Harness({ onSubmit }) {
	const [value, setValue] = useState("");
	return <SearchBar value={value} onChange={setValue} onSubmit={onSubmit} />;
}

describe("SearchBar", () => {
	it("has an accessible label", () => {
		render(<Harness onSubmit={() => {}} />);
		expect(screen.getByLabelText(/search spotify/i)).toBeInTheDocument();
	});

	it("submits the current value", () => {
		const onSubmit = vi.fn();
		render(<Harness onSubmit={onSubmit} />);
		const input = screen.getByRole("searchbox");

		fireEvent.change(input, { target: { value: "test song" } });
		fireEvent.submit(input.closest("form"));

		expect(onSubmit).toHaveBeenLastCalledWith("test song");
	});

	it("clears with the button or Escape", () => {
		const onSubmit = vi.fn();
		render(<Harness onSubmit={onSubmit} />);
		const input = screen.getByRole("searchbox");

		fireEvent.change(input, { target: { value: "abc" } });
		fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
		expect(onSubmit).toHaveBeenLastCalledWith("");

		onSubmit.mockClear();
		fireEvent.change(input, { target: { value: "xyz" } });
		fireEvent.keyDown(input, { key: "Escape" });
		expect(onSubmit).toHaveBeenLastCalledWith("");
	});

	it("focuses the search box when / is pressed", () => {
		render(<Harness onSubmit={() => {}} />);
		fireEvent.keyDown(window, { key: "/" });
		expect(screen.getByRole("searchbox")).toHaveFocus();
	});
});
