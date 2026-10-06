import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { AuthProvider } from "@/context/AuthContext";

export function jsonResponse(data, status = 200) {
	return new Response(data === null ? null : JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * Stubs global fetch with a router keyed by "METHOD path", where path is the
 * Spotify API path (without the /v1/ prefix) or a local /api route. Query
 * strings are ignored unless the key includes one. Handlers receive the parsed
 * JSON body and return a Response (or plain data, wrapped as 200 JSON).
 */
export function mockFetch(routes) {
	const calls = [];
	const fn = vi.fn(async (input, init = {}) => {
		const url = new URL(input, "http://localhost");
		const method = init.method ?? "GET";
		const apiPath = url.pathname.replace(/^\/v1\//, "");
		let body = init.body;
		try {
			body = body ? JSON.parse(body) : undefined;
		} catch {
			// Non-JSON payloads (e.g. base64 cover images) are kept as text
		}
		calls.push({ method, path: apiPath, search: url.search, body });

		const key = [
			`${method} ${apiPath}${url.search}`,
			`${method} ${apiPath}`,
		].find((k) => k in routes);
		const handler = routes[key];
		if (!key) {
			return jsonResponse(
				{ error: { message: `Unmocked ${method} ${apiPath}` } },
				500,
			);
		}
		const result =
			typeof handler === "function" ? await handler(body, url) : handler;
		return result instanceof Response ? result : jsonResponse(result);
	});
	vi.stubGlobal("fetch", fn);
	return { fetch: fn, calls };
}

export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
			mutations: { retry: false },
		},
	});
}

export function renderWithProviders(
	ui,
	{ queryClient = createTestQueryClient() } = {},
) {
	return {
		queryClient,
		...render(
			<QueryClientProvider client={queryClient}>
				<AuthProvider>{ui}</AuthProvider>
			</QueryClientProvider>,
		),
	};
}

export function rawTrack(id, overrides = {}) {
	return {
		id,
		uri: `spotify:track:${id}`,
		type: "track",
		name: `Song ${id}`,
		artists: [{ name: `Artist ${id}` }],
		album: { name: `Album ${id}`, images: [] },
		duration_ms: 180000,
		explicit: false,
		external_urls: { spotify: `https://open.spotify.com/track/${id}` },
		...overrides,
	};
}

export function searchPage(ids, { total = ids.length, next = null } = {}) {
	return { tracks: { items: ids.map((id) => rawTrack(id)), total, next } };
}
