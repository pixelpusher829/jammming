import { getAccessToken } from "@/lib/auth";

const API_BASE = "https://api.spotify.com/v1";

// Spotify caps search pages at 10 results (Feb 2026 dev-mode change)
export const SEARCH_PAGE_SIZE = 10;
// Search offset can't exceed 1000
const SEARCH_MAX_OFFSET = 1000;
// Playlist item writes accept at most 100 URIs per request
const ITEMS_CHUNK_SIZE = 100;

export class SpotifyError extends Error {
	constructor(message, status, retryAfter) {
		super(message);
		this.name = "SpotifyError";
		this.status = status;
		this.retryAfter = retryAfter;
	}
}

function friendlyMessage(status, apiMessage) {
	if (status === 401)
		return "Your Spotify session expired. Please sign in again.";
	if (status === 403)
		return "Spotify denied this request. Your account may not have access to this app yet.";
	if (status === 404) return "That item no longer exists on Spotify.";
	if (status === 429)
		return "Spotify is rate-limiting requests. Try again in a moment.";
	if (status >= 500)
		return "Spotify is having trouble right now. Try again shortly.";
	return apiMessage || "Something went wrong talking to Spotify.";
}

export async function spotifyFetch(
	path,
	{ method = "GET", body, rawBody, contentType, signal } = {},
) {
	// `rawBody` sends a pre-encoded payload (e.g. base64 image) as-is
	const payload = rawBody ?? (body ? JSON.stringify(body) : undefined);
	const type = contentType ?? (body ? "application/json" : undefined);
	const send = async (token) =>
		fetch(`${API_BASE}/${path}`, {
			method,
			signal,
			headers: {
				Authorization: `Bearer ${token}`,
				...(type && { "Content-Type": type }),
			},
			body: payload,
		});

	let response = await send(await getAccessToken());
	if (response.status === 401) {
		response = await send(await getAccessToken({ forceRefresh: true }));
	}

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		const retryAfter =
			Number(response.headers?.get?.("Retry-After")) || undefined;
		throw new SpotifyError(
			friendlyMessage(response.status, payload?.error?.message),
			response.status,
			retryAfter,
		);
	}

	const text = await response.text();
	return text ? JSON.parse(text) : null;
}

// Playlist objects were renamed `tracks` -> `items` in Feb 2026; accept both
function playlistTotal(playlist) {
	return playlist.items?.total ?? playlist.tracks?.total ?? 0;
}

function toTrack(raw) {
	return {
		id: raw.id,
		uri: raw.uri,
		name: raw.name,
		artists: (raw.artists ?? []).map((a) => a.name),
		album: raw.album?.name ?? "",
		image:
			raw.album?.images?.at(-1)?.url ?? raw.album?.images?.[0]?.url ?? null,
		imageLarge: raw.album?.images?.[0]?.url ?? null,
		durationMs: raw.duration_ms ?? 0,
		explicit: Boolean(raw.explicit),
		url: raw.external_urls?.spotify ?? null,
	};
}

export async function searchTracks(query, { offset = 0, signal } = {}) {
	const params = new URLSearchParams({
		q: query,
		type: "track",
		limit: String(SEARCH_PAGE_SIZE),
		offset: String(offset),
	});
	const data = await spotifyFetch(`search?${params}`, { signal });
	const page = data?.tracks ?? { items: [], total: 0 };
	const nextOffset = offset + SEARCH_PAGE_SIZE;
	return {
		tracks: page.items.filter(Boolean).map(toTrack),
		total: page.total ?? 0,
		nextOffset:
			page.next && nextOffset < Math.min(page.total, SEARCH_MAX_OFFSET)
				? nextOffset
				: undefined,
	};
}

export async function getCurrentUser() {
	const me = await spotifyFetch("me");
	return {
		id: me.id,
		name: me.display_name || me.id,
		image: me.images?.[0]?.url ?? null,
		url: me.external_urls?.spotify ?? null,
	};
}

/** Playlists the current user owns or collaborates on (editable ones only). */
export async function getEditablePlaylists(userId) {
	const playlists = [];
	let path = "me/playlists?limit=50";
	while (path) {
		const page = await spotifyFetch(path);
		for (const p of page.items ?? []) {
			if (!p) continue;
			if (p.owner?.id !== userId && !p.collaborative) continue;
			playlists.push({
				id: p.id,
				name: p.name,
				description: p.description ?? "",
				isPublic: Boolean(p.public),
				image: p.images?.at(-1)?.url ?? p.images?.[0]?.url ?? null,
				imageLarge: p.images?.[0]?.url ?? null,
				total: playlistTotal(p),
				url: p.external_urls?.spotify ?? null,
			});
		}
		path = page.next ? page.next.replace(`${API_BASE}/`, "") : null;
	}
	return playlists;
}

/**
 * Loads a playlist's full track list. Local files and podcast episodes can't
 * be re-saved through the Web API, so they're counted and reported separately.
 */
export async function getPlaylistTracks(playlistId) {
	const tracks = [];
	let skipped = 0;
	let path = `playlists/${playlistId}/items?limit=50`;
	while (path) {
		const page = await spotifyFetch(path);
		for (const entry of page.items ?? []) {
			const raw = entry.item ?? entry.track;
			if (!raw || raw.type !== "track" || entry.is_local || !raw.id) {
				skipped += 1;
				continue;
			}
			tracks.push(toTrack(raw));
		}
		path = page.next ? page.next.replace(`${API_BASE}/`, "") : null;
	}
	return { tracks, skipped };
}

function chunk(list, size) {
	const chunks = [];
	for (let i = 0; i < list.length; i += size) {
		chunks.push(list.slice(i, i + size));
	}
	return chunks;
}

async function replacePlaylistItems(playlistId, uris) {
	const [first = [], ...rest] = chunk(uris, ITEMS_CHUNK_SIZE);
	await spotifyFetch(`playlists/${playlistId}/items`, {
		method: "PUT",
		body: { uris: first },
	});
	for (const batch of rest) {
		await spotifyFetch(`playlists/${playlistId}/items`, {
			method: "POST",
			body: { uris: batch },
		});
	}
}

/** Uploads a JPEG data URL (<= 256 KB of base64) as the playlist cover. */
export async function uploadPlaylistCover(playlistId, dataUrl) {
	await spotifyFetch(`playlists/${playlistId}/images`, {
		method: "PUT",
		rawBody: dataUrl.replace(/^data:image\/jpeg;base64,/, ""),
		contentType: "image/jpeg",
	});
}

/**
 * Creates or updates a playlist so it matches the draft exactly.
 * If the draft points at a playlist that was deleted on Spotify, a fresh one
 * is created instead.
 */
export async function savePlaylist({
	playlistId,
	name,
	description,
	isPublic,
	tracks,
	cover,
	coverDirty,
}) {
	const details = {
		name: name.trim() || "New Jammming playlist",
		public: isPublic,
		...(description.trim() && { description: description.trim() }),
	};
	const uris = tracks.map((t) => t.uri);

	let result = null;
	if (playlistId) {
		try {
			await spotifyFetch(`playlists/${playlistId}`, {
				method: "PUT",
				body: details,
			});
			await replacePlaylistItems(playlistId, uris);
			result = { id: playlistId, created: false };
		} catch (error) {
			if (error.status !== 404) throw error;
		}
	}

	if (!result) {
		const created = await spotifyFetch("me/playlists", {
			method: "POST",
			body: details,
		});
		await replacePlaylistItems(created.id, uris);
		result = {
			id: created.id,
			url: created.external_urls?.spotify ?? null,
			created: true,
		};
	}

	// The playlist itself is saved at this point; a cover failure (e.g. a
	// session granted before the upload scope existed) is reported, not thrown
	if (cover && coverDirty) {
		try {
			await uploadPlaylistCover(result.id, cover);
			result.coverSaved = true;
		} catch (error) {
			result.coverError =
				error.status === 401 || error.status === 403
					? "Sign out and back in to allow cover uploads."
					: "The playlist saved, but the cover image couldn't be uploaded.";
		}
	}

	return result;
}
