import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ReactCompilerConfig = {
	target: "19",
};

// Hop-by-hop headers that can't be forwarded into a fetch Request
const SKIPPED_HEADERS = new Set([
	"connection",
	"content-length",
	"keep-alive",
	"transfer-encoding",
	"upgrade",
]);

/**
 * Serves the Vercel functions in /api from the Vite dev server, so
 * `vite` alone runs the whole app (including Spotify sign-in) locally.
 * In production these files are deployed as Vercel Edge Functions.
 */
function localApi(env) {
	return {
		name: "jammming-local-api",
		apply: "serve",
		configureServer(server) {
			Object.assign(process.env, env);

			server.middlewares.use(async (req, res, next) => {
				const url = new URL(req.url, `http://${req.headers.host}`);
				const match = url.pathname.match(/^\/api\/([a-z-]+)\/?$/);
				if (!match) return next();

				let handler;
				try {
					handler = (await server.ssrLoadModule(`/api/${match[1]}.js`)).default;
				} catch {
					return next();
				}

				try {
					const headers = new Headers();
					for (const [key, value] of Object.entries(req.headers)) {
						if (!SKIPPED_HEADERS.has(key) && typeof value === "string") {
							headers.set(key, value);
						}
					}
					const chunks = [];
					for await (const chunk of req) chunks.push(chunk);
					const hasBody = !["GET", "HEAD"].includes(req.method);

					const response = await handler(
						new Request(url, {
							method: req.method,
							headers,
							body: hasBody ? Buffer.concat(chunks) : undefined,
						}),
					);

					res.statusCode = response.status;
					response.headers.forEach((value, key) => {
						if (key !== "set-cookie") res.setHeader(key, value);
					});
					const cookies = response.headers.getSetCookie();
					if (cookies.length) res.setHeader("set-cookie", cookies);
					res.end(Buffer.from(await response.arrayBuffer()));
				} catch (error) {
					server.config.logger.error(`[api] ${error.stack ?? error}`);
					res.statusCode = 500;
					res.end(JSON.stringify({ error: "Local API error" }));
				}
			});
		},
	};
}

export default defineConfig(({ mode }) => {
	// Load all env vars (not just VITE_) so the local API can see the secrets
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [
			react({
				babel: {
					plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
				},
			}),
			localApi(env),
		],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		server: {
			// Must match the redirect URI registered with Spotify
			host: "127.0.0.1",
			port: 3000,
			strictPort: true,
		},
		test: {
			globals: true,
			environment: "jsdom",
			setupFiles: "./src/test/setup.js",
			env: env, // Pass loaded env to Vitest
		},
	};
});
