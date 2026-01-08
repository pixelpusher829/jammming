import "@testing-library/jest-dom";
import { vi } from "vitest";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.development.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.development.local") });

// Polyfill import.meta.env
const VITE_SPOTIFY_CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID || "mock_client_id";
const VITE_SPOTIFY_REDIRECT_URI = process.env.VITE_SPOTIFY_REDIRECT_URI || "http://localhost:5173";

if (typeof import.meta.env === 'undefined') {
    Object.defineProperty(import.meta, 'env', {
        value: {
            VITE_SPOTIFY_CLIENT_ID,
            VITE_SPOTIFY_REDIRECT_URI,
            BASE_URL: '/',
            MODE: 'test',
            DEV: true,
            PROD: false,
        },
        writable: true,
    });
} else {
    // If it exists, merge our env vars into it
    Object.assign(import.meta.env, {
         VITE_SPOTIFY_CLIENT_ID,
         VITE_SPOTIFY_REDIRECT_URI,
    });
}

// Also verify if it loaded
if (!process.env.VITE_SPOTIFY_CLIENT_ID) {
    console.warn("WARNING: VITE_SPOTIFY_CLIENT_ID is missing in tests. Did 'vercel env pull' run?");
}

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mocking window.crypto for the PKCE stuff
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: (arr) => arr.map(() => Math.floor(Math.random() * 256)),
    subtle: {
      digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer),
    },
  },
});
