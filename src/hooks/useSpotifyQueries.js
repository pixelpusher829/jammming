import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
	getCurrentUser,
	getEditablePlaylists,
	getPlaylistTracks,
	savePlaylist,
	searchTracks,
} from "@/lib/spotify";

// Everything user-scoped lives under ["me"] so sign-out can drop it in one go
export const queryKeys = {
	search: (term) => ["search", term],
	me: ["me"],
	playlists: ["me", "playlists"],
	playlistTracks: (id) => ["me", "playlist", id],
};

export function useTrackSearch(term) {
	const query = term.trim();
	return useInfiniteQuery({
		queryKey: queryKeys.search(query),
		queryFn: ({ pageParam, signal }) =>
			searchTracks(query, { offset: pageParam, signal }),
		initialPageParam: 0,
		getNextPageParam: (lastPage) => lastPage.nextOffset,
		enabled: query.length > 0,
		placeholderData: keepPreviousData,
	});
}

export function useCurrentUser() {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: queryKeys.me,
		queryFn: getCurrentUser,
		enabled: isAuthenticated,
		staleTime: Number.POSITIVE_INFINITY,
	});
}

export function useEditablePlaylists({ enabled }) {
	const { data: user } = useCurrentUser();
	return useQuery({
		queryKey: queryKeys.playlists,
		queryFn: () => getEditablePlaylists(user.id),
		enabled: enabled && Boolean(user?.id),
		staleTime: 30 * 1000,
	});
}

export function usePlaylistTracksLoader() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (playlistId) =>
			queryClient.fetchQuery({
				queryKey: queryKeys.playlistTracks(playlistId),
				queryFn: () => getPlaylistTracks(playlistId),
				staleTime: 0,
			}),
	});
}

export function useSavePlaylist() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: savePlaylist,
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.playlists });
			queryClient.removeQueries({
				queryKey: queryKeys.playlistTracks(result.id),
			});
		},
	});
}
