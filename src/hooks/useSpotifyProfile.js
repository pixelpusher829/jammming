import { useCallback, useEffect, useState } from "react";

export function useSpotifyProfile(makeAuthenticatedRequest, userAccessToken) {
	const [userProfileId, setUserProfileId] = useState(null);

	const getUserProfileId = useCallback(async () => {
		try {
			const response = await makeAuthenticatedRequest("me", "GET", null);
			if (response?.id) {
				setUserProfileId(response.id);
			}
		} catch (error) {
			console.error("Error fetching user profile ID:", error);
		}
	}, [makeAuthenticatedRequest]);

	useEffect(() => {
		if (userAccessToken && !userProfileId) {
			getUserProfileId();
		} else if (!userAccessToken) {
			setUserProfileId(null);
		}
	}, [userAccessToken, userProfileId, getUserProfileId]);

	return { userProfileId };
}
