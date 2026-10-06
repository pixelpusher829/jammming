import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	draftReducer,
	emptyDraft,
	fingerprint,
	usePlaylistDraft,
} from "@/hooks/usePlaylistDraft";

const track = (id) => ({ id, uri: `spotify:track:${id}`, durationMs: 1000 });

describe("draftReducer", () => {
	it("adds tracks once and removes them", () => {
		let state = draftReducer(emptyDraft, { type: "add", track: track("a") });
		state = draftReducer(state, { type: "add", track: track("a") });
		expect(state.tracks).toHaveLength(1);

		state = draftReducer(state, { type: "remove", id: "a" });
		expect(state.tracks).toHaveLength(0);
	});

	it("reorders tracks and ignores out-of-range moves", () => {
		let state = { ...emptyDraft, tracks: [track("a"), track("b"), track("c")] };
		state = draftReducer(state, { type: "move", id: "c", offset: -1 });
		expect(state.tracks.map((t) => t.id)).toEqual(["a", "c", "b"]);

		const same = draftReducer(state, { type: "move", id: "a", offset: -1 });
		expect(same).toBe(state);
	});

	it("reorders by drag target and re-inserts removed tracks in place", () => {
		let state = { ...emptyDraft, tracks: [track("a"), track("b"), track("c")] };
		state = draftReducer(state, {
			type: "reorder",
			activeId: "a",
			overId: "c",
		});
		expect(state.tracks.map((t) => t.id)).toEqual(["b", "c", "a"]);

		state = draftReducer(state, {
			type: "insert",
			track: track("z"),
			index: 1,
		});
		expect(state.tracks.map((t) => t.id)).toEqual(["b", "z", "c", "a"]);
	});

	it("adds many tracks without duplicates", () => {
		const state = draftReducer(
			{ ...emptyDraft, tracks: [track("a")] },
			{ type: "addMany", tracks: [track("a"), track("b"), track("c")] },
		);
		expect(state.tracks.map((t) => t.id)).toEqual(["a", "b", "c"]);
	});

	it("sorts by title, artist and duration, and shuffles", () => {
		const t = (id, name, artist, durationMs) => ({
			id,
			name,
			artists: [artist],
			durationMs,
		});
		const base = {
			...emptyDraft,
			tracks: [
				t("1", "beta", "Zed", 300),
				t("2", "Alpha", "amy", 100),
				t("3", "gamma", "Bob", 200),
			],
		};
		const ids = (by) =>
			draftReducer(base, { type: "sort", by }).tracks.map((x) => x.id);

		expect(ids("title")).toEqual(["2", "1", "3"]);
		expect(ids("artist")).toEqual(["2", "3", "1"]);
		expect(ids("duration")).toEqual(["2", "3", "1"]);
		expect(ids("shuffle").sort()).toEqual(["1", "2", "3"]);
	});

	it("marks a custom cover as unsaved until it uploads", () => {
		const loaded = draftReducer(emptyDraft, {
			type: "load",
			playlist: {
				id: "p",
				url: "u",
				name: "n",
				description: "",
				isPublic: false,
			},
			tracks: [],
		});
		const withCover = draftReducer(loaded, {
			type: "setCover",
			dataUrl: "data:image/jpeg;base64,AAA",
		});
		expect(fingerprint(withCover)).not.toBe(withCover.savedFingerprint);

		const saved = draftReducer(withCover, {
			type: "saved",
			id: "p",
			fingerprint: fingerprint(withCover),
			coverSaved: true,
		});
		expect(saved.coverDirty).toBe(false);
		expect(fingerprint(saved)).toBe(saved.savedFingerprint);
	});

	it("loads an existing playlist as a clean draft", () => {
		const state = draftReducer(emptyDraft, {
			type: "load",
			playlist: {
				id: "p1",
				url: "u",
				name: "Mix",
				description: "d",
				isPublic: true,
			},
			tracks: [track("a")],
		});
		expect(state.playlistId).toBe("p1");
		expect(state.savedFingerprint).toBe(fingerprint(state));
	});

	it("records the fingerprint that was actually saved", () => {
		const saved = fingerprint({ ...emptyDraft, name: "Before" });
		const state = draftReducer(
			{ ...emptyDraft, name: "After" },
			{ type: "saved", id: "p1", url: "u", fingerprint: saved },
		);
		expect(state.savedFingerprint).toBe(saved);
		expect(fingerprint(state)).not.toBe(saved);
	});
});

describe("usePlaylistDraft", () => {
	it("persists the draft across reloads and tracks dirty state", () => {
		const first = renderHook(() => usePlaylistDraft());
		expect(first.result.current.isDirty).toBe(false);

		act(() =>
			first.result.current.dispatch({ type: "add", track: track("a") }),
		);
		expect(first.result.current.isDirty).toBe(true);
		first.unmount();

		const second = renderHook(() => usePlaylistDraft());
		expect(second.result.current.draft.tracks.map((t) => t.id)).toEqual(["a"]);
	});

	it("starts fresh when stored data is corrupt", () => {
		localStorage.setItem("jammming:draft:v1", "{not json");
		const { result } = renderHook(() => usePlaylistDraft());
		expect(result.current.draft).toEqual(emptyDraft);
	});
});
