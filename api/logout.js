import { clearRefreshCookies } from "./_cookies.js";

export const config = {
	runtime: "edge",
};

export default function handler(request) {
	if (request.method !== "POST") {
		return new Response(
			JSON.stringify({
				error: "Method Not Allowed",
				message: "This endpoint only supports POST requests.",
			}),
			{ status: 405, headers: { "Content-Type": "application/json" } },
		);
	}

	const headers = new Headers({ "Cache-Control": "no-store" });
	for (const cookie of clearRefreshCookies()) {
		headers.append("Set-Cookie", cookie);
	}
	return new Response(null, { status: 204, headers });
}
