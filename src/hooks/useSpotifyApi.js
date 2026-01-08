import { useCallback } from "react";

export function useSpotifyApi(
	userAccessToken,
	publicAccessToken,
	refreshAccessToken,
	getPublicAccessToken,
) {
	const makeAuthenticatedRequest = useCallback(
		async (url, method, data) => {
			const currentAccessToken = userAccessToken || publicAccessToken;

			const headers = (token) => ({
				"Content-Type": "application/json",
				...(token && { Authorization: `Bearer ${token}` }),
			});

			const performFetch = async (token) => {
				return await fetch(`https://api.spotify.com/v1/${url}`, {
					method: method,
					headers: headers(token),
					body: data ? JSON.stringify(data) : undefined,
				});
			};

			try {
				let response = await performFetch(currentAccessToken);

				if (response.status === 401 || response.status === 403) {
					if (userAccessToken) {
						const newAccessToken = await refreshAccessToken();
						if (newAccessToken) {
							response = await performFetch(newAccessToken);
						} else {
							throw new Error("User session expired. Please log in again.");
						}
					} else if (publicAccessToken) {
						const newPublicToken = await getPublicAccessToken();
						if (newPublicToken) {
							response = await performFetch(newPublicToken);
						} else {
							throw new Error("Failed to acquire new public token.");
						}
					}
				}

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(
						`HTTP error! status: ${response.status} - ${errorText}`,
					);
				}
				const text = await response.text();
				return text ? JSON.parse(text) : null;
			} catch (error) {
				console.error("Error in makeAuthenticatedRequest:", error);
				throw error;
			}
		},
		[
			userAccessToken,
			publicAccessToken,
			refreshAccessToken,
			getPublicAccessToken,
		],
	);

	return { makeAuthenticatedRequest };
}
