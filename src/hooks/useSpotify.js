import { useSpotifyApi } from "@/hooks/useSpotifyApi";
import { useSpotifyLogin } from "@/hooks/useSpotifyLogin";
import { useSpotifyProfile } from "@/hooks/useSpotifyProfile";
import { useSpotifyTokens } from "@/hooks/useSpotifyTokens";

export function useSpotify() {
	const {
		userAccessToken,
		publicAccessToken,
		refreshAccessToken,
		getPublicAccessToken,
	} = useSpotifyTokens();

	const { spotifyLogin } = useSpotifyLogin();

	const { makeAuthenticatedRequest } = useSpotifyApi(
		userAccessToken,
		publicAccessToken,
		refreshAccessToken,
		getPublicAccessToken,
	);

	const { userProfileId } = useSpotifyProfile(
		makeAuthenticatedRequest,
		userAccessToken,
	);

	return {
		userAccessToken,
		userProfileId,
		spotifyLogin,
		makeAuthenticatedRequest,
	};
}
