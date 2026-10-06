import "@testing-library/jest-dom/vitest";
import path from "node:path";
import { cleanup } from "@testing-library/react";
import dotenv from "dotenv";
import { afterEach, vi } from "vitest";
import { __resetAuthState } from "@/lib/auth";

// Load environment variables from .env.development.local when present
dotenv.config({
	path: path.resolve(process.cwd(), ".env.development.local"),
	quiet: true,
});

Object.assign(import.meta.env, {
	VITE_SPOTIFY_CLIENT_ID:
		process.env.VITE_SPOTIFY_CLIENT_ID || "mock_client_id",
	VITE_SPOTIFY_REDIRECT_URI:
		process.env.VITE_SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000",
});

// Node's experimental global localStorage shadows jsdom's and is undefined
// without --localstorage-file, so provide simple in-memory storages
class MemoryStorage {
	#store = new Map();
	get length() {
		return this.#store.size;
	}
	key(i) {
		return [...this.#store.keys()][i] ?? null;
	}
	getItem(key) {
		return this.#store.has(key) ? this.#store.get(key) : null;
	}
	setItem(key, value) {
		this.#store.set(key, String(value));
	}
	removeItem(key) {
		this.#store.delete(key);
	}
	clear() {
		this.#store.clear();
	}
}

for (const name of ["localStorage", "sessionStorage"]) {
	const storage = new MemoryStorage();
	Object.defineProperty(window, name, { value: storage, configurable: true });
	Object.defineProperty(globalThis, name, {
		value: storage,
		configurable: true,
	});
}

// jsdom lacks matchMedia (used by the toast library)
Object.defineProperty(window, "matchMedia", {
	configurable: true,
	value: (query) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener() {},
		removeEventListener() {},
		addListener() {},
		removeListener() {},
		dispatchEvent: () => false,
	}),
});

// Deterministic PKCE primitives
Object.defineProperty(window, "crypto", {
	value: {
		getRandomValues: (arr) => arr.map((_, i) => i),
		subtle: {
			digest: async () => new Uint8Array(32).buffer,
		},
	},
});

afterEach(() => {
	cleanup();
	localStorage.clear();
	sessionStorage.clear();
	__resetAuthState();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	window.history.replaceState({}, "", "/");
});
