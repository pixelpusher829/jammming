import { useEffect, useReducer } from "react";

const STORAGE_KEY = "jammming:draft:v1";
// Spotify's hard limit on playlist length
export const MAX_PLAYLIST_TRACKS = 10000;

export const emptyDraft = {
	playlistId: null,
	url: null,
	name: "",
	description: "",
	isPublic: false,
	tracks: [],
	// Custom cover as a JPEG data URL, pending upload while `coverDirty`
	cover: null,
	coverDirty: false,
	// Existing cover on Spotify for loaded playlists
	coverUrl: null,
	// Fingerprint of the last saved/loaded state, used to flag unsaved changes
	savedFingerprint: null,
};

export function fingerprint(draft) {
	return JSON.stringify([
		draft.name.trim(),
		draft.description.trim(),
		draft.isPublic,
		draft.tracks.map((t) => t.id),
		draft.coverDirty,
	]);
}

function moveItem(list, from, to) {
	if (from === to || from < 0 || to < 0 || to >= list.length) return list;
	const next = [...list];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
}

const collator = new Intl.Collator(undefined, { sensitivity: "base" });
const sorters = {
	title: (a, b) => collator.compare(a.name, b.name),
	artist: (a, b) =>
		collator.compare(a.artists[0] ?? "", b.artists[0] ?? "") ||
		collator.compare(a.name, b.name),
	duration: (a, b) => a.durationMs - b.durationMs,
};

function shuffle(list) {
	const next = [...list];
	for (let i = next.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[next[i], next[j]] = [next[j], next[i]];
	}
	return next;
}

export function draftReducer(state, action) {
	switch (action.type) {
		case "add": {
			if (state.tracks.length >= MAX_PLAYLIST_TRACKS) return state;
			if (state.tracks.some((t) => t.id === action.track.id)) return state;
			return { ...state, tracks: [...state.tracks, action.track] };
		}
		case "addMany": {
			const existing = new Set(state.tracks.map((t) => t.id));
			const fresh = action.tracks.filter((t) => !existing.has(t.id));
			const room = MAX_PLAYLIST_TRACKS - state.tracks.length;
			return { ...state, tracks: [...state.tracks, ...fresh.slice(0, room)] };
		}
		case "insert": {
			if (state.tracks.some((t) => t.id === action.track.id)) return state;
			const tracks = [...state.tracks];
			tracks.splice(action.index, 0, action.track);
			return { ...state, tracks };
		}
		case "remove":
			return {
				...state,
				tracks: state.tracks.filter((t) => t.id !== action.id),
			};
		case "move": {
			const from = state.tracks.findIndex((t) => t.id === action.id);
			const tracks = moveItem(state.tracks, from, from + action.offset);
			return tracks === state.tracks ? state : { ...state, tracks };
		}
		case "reorder": {
			const from = state.tracks.findIndex((t) => t.id === action.activeId);
			const to = state.tracks.findIndex((t) => t.id === action.overId);
			const tracks = moveItem(state.tracks, from, to);
			return tracks === state.tracks ? state : { ...state, tracks };
		}
		case "sort": {
			const tracks =
				action.by === "shuffle"
					? shuffle(state.tracks)
					: [...state.tracks].sort(sorters[action.by]);
			return { ...state, tracks };
		}
		case "update":
			return { ...state, ...action.fields };
		case "setCover":
			return { ...state, cover: action.dataUrl, coverDirty: true };
		case "load": {
			const next = {
				...emptyDraft,
				playlistId: action.playlist.id,
				url: action.playlist.url,
				name: action.playlist.name,
				description: action.playlist.description,
				isPublic: action.playlist.isPublic,
				coverUrl: action.playlist.imageLarge ?? action.playlist.image ?? null,
				tracks: action.tracks,
			};
			return { ...next, savedFingerprint: fingerprint(next) };
		}
		case "saved": {
			const next = {
				...state,
				playlistId: action.id,
				url: action.url ?? state.url,
				coverDirty: action.coverSaved ? false : state.coverDirty,
			};
			// Fingerprint of what was actually sent, in case edits landed mid-save.
			// If the cover uploaded, the saved state has no pending cover.
			const sent = action.coverSaved
				? JSON.stringify([
						...JSON.parse(action.fingerprint).slice(0, -1),
						false,
					])
				: action.fingerprint;
			return { ...next, savedFingerprint: sent };
		}
		case "restore":
			return action.draft;
		case "reset":
			return emptyDraft;
		default:
			return state;
	}
}

function restore() {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
		if (stored && Array.isArray(stored.tracks)) {
			return { ...emptyDraft, ...stored };
		}
	} catch {
		// Corrupt or unavailable storage: start fresh
	}
	return emptyDraft;
}

export function usePlaylistDraft() {
	const [draft, dispatch] = useReducer(draftReducer, undefined, restore);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
		} catch {
			// Storage full or blocked; the draft still works for this session
		}
	}, [draft]);

	const isDirty =
		draft.savedFingerprint === null
			? draft.tracks.length > 0 || draft.name.trim() !== "" || draft.coverDirty
			: fingerprint(draft) !== draft.savedFingerprint;

	return { draft, dispatch, isDirty };
}
