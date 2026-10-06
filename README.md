# Jammming

Build Spotify playlists fast. Search the Spotify catalogue, line up tracks, and save the result straight to your Spotify account, or open one of your existing playlists and edit it.

## Features

- **Search without signing in.** Results appear as you type, with "Load more" paging, cached results and clear error states. Press `/` anywhere to jump to the search box.
- **Previews.** Play any track in Spotify's embedded player without leaving the page.
- **Playlist editor.** Drag to reorder (mouse, touch or keyboard), sort by title, artist or length, shuffle, and add a whole page of results at once.
- **Undo.** Removing a song, starting a new playlist, opening another one or sorting can all be undone from the notification.
- **Covers.** Playlists get a mosaic cover from their album art, or you can upload your own image (cropped and compressed to Spotify's limits).
- **Save and update on Spotify.** The first save creates the playlist, later saves update it in place, and a playlist deleted on Spotify is recreated.
- **Edit existing playlists.** Open any playlist you own or collaborate on, change it and save it back.
- **Drafts survive reloads.** Work in progress is kept in the browser, including across the Spotify sign-in redirect, and unsaved changes are flagged.
- **Responsive and accessible.** A two-column layout on desktop and tabbed navigation on phones. Keyboard and screen-reader friendly, and it respects reduced-motion settings.

## Tech

- React 19 with the React Compiler, built with Vite
- TanStack Query for data fetching, caching, retries and mutations
- dnd-kit for accessible drag-and-drop, Sonner for notifications
- Vercel Edge Functions (`/api`) for the Spotify token exchange
- Vitest and Testing Library for tests, Biome for linting and formatting

### Auth and security

- Authorization Code flow with PKCE and an OAuth `state` check.
- The refresh token lives only in an `HttpOnly; Secure; SameSite=Strict` cookie scoped to `/api`. Access tokens are kept in memory and never written to storage.
- Signed-out visitors search with an app-level client-credentials token issued by `/api/public-auth`.
- `vercel.json` sets a Content Security Policy, HSTS and the other standard security headers.

## Getting started

### 1. Create a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app with the **Web API** enabled.
2. Add redirect URIs for every environment, for example `http://127.0.0.1:3000` and `https://your-domain.com`. Spotify no longer accepts `localhost`, so use `127.0.0.1`.
3. Copy the Client ID and Client Secret.

> **Spotify access limits:** apps in Development Mode can only be used by Spotify accounts you add under *User Management* (currently up to 5 for new apps), and the app owner needs Spotify Premium. Opening the app to the public requires an approved extended-quota application with Spotify. See [Spotify's quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

### 2. Configure the environment

```bash
bun run env:pull          # pulls the variables from your linked Vercel project
# or: cp .env.example .env.development.local and fill in the values
```

### 3. Run it

```bash
bun install
bun run dev               # http://127.0.0.1:3000, including sign-in
```

`dev` runs Vite, and a small Vite plugin ([vite.config.js](vite.config.js)) serves the `/api` functions locally, so sign-in works without the Vercel CLI. Use `127.0.0.1:3000` rather than `localhost`, because it has to match the redirect URI registered with Spotify.

## Scripts

| Script | What it does |
| --- | --- |
| `dev` | App and API on http://127.0.0.1:3000 |
| `dev:vercel` | The same, through `vercel dev` (closest to production) |
| `env:pull` | Download environment variables from Vercel into `.env.development.local` |
| `build` | Production build to `dist/` |
| `test` / `test:run` | Vitest in watch mode / a single run |
| `lint` / `lint:fix` | Biome check / check and apply fixes |
| `check` | Lint, test and build: run before deploying |
| `deploy` | `vercel --prod` |

## Deploying to Vercel

1. Import the repo into Vercel (it detects the Vite framework automatically).
2. Set the five environment variables from `.env.example`, using your production URL for both redirect URIs.
3. Add the same production URL as a redirect URI in the Spotify dashboard.
4. Deploy.

## Project structure

```
api/                  Edge functions: token exchange, public token, logout
src/
  components/         UI components
  context/            Auth state (sign-in status, login and logout)
  hooks/              TanStack Query hooks and the playlist draft reducer
  lib/                Spotify API client, token manager, formatting helpers
  styles/             Global tokens and CSS modules
  test/               Unit and integration tests
```
