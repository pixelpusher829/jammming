import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ReactCompilerConfig = {
	target: "19",
};

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [
			react({
				babel: {
					plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
				},
			}),
		],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		server: {
			host: "127.0.0.1",
			port: 5173,
		},
		test: {
			globals: true,
			environment: "jsdom",
			setupFiles: "./src/test/setup.js",
			env: env, // Pass loaded env to Vitest
		},
	};
});
