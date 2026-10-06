import {
	AlertCircle,
	Check,
	ListPlus,
	Loader2,
	Plus,
	SearchX,
} from "lucide-react";
import Discover from "@/components/Discover";
import Track from "@/components/Track";
import TrackSkeleton from "@/components/TrackSkeleton";
import { useTrackSearch } from "@/hooks/useSpotifyQueries";
import discoverStyles from "@/styles/modules/Discover.module.css";
import panel from "@/styles/modules/Panel.module.css";
import styles from "@/styles/modules/SearchResults.module.css";

const numberFormat = new Intl.NumberFormat();

function SearchResults({
	term,
	draftIds,
	playingId,
	onPlay,
	onAdd,
	onAddAll,
	onRemove,
	onSuggestion,
}) {
	const query = term.trim();
	const {
		data,
		error,
		isPending,
		isFetching,
		isFetchingNextPage,
		isPlaceholderData,
		hasNextPage,
		fetchNextPage,
		refetch,
	} = useTrackSearch(query);

	if (!query) {
		return (
			<section
				className={`${panel.panel} ${discoverStyles.panel}`}
				aria-label="Discover"
			>
				<Discover onSuggestion={onSuggestion} />
			</section>
		);
	}

	// Pages can overlap when Spotify's ranking shifts between requests
	const seen = new Set();
	const tracks = (data?.pages ?? [])
		.flatMap((page) => page.tracks)
		.filter((t) => (seen.has(t.id) ? false : seen.add(t.id)));
	const total = data?.pages[0]?.total ?? 0;
	const allAdded = tracks.length > 0 && tracks.every((t) => draftIds.has(t.id));

	let body;
	if (isPending) {
		body = <TrackSkeleton count={8} />;
	} else if (error && tracks.length === 0) {
		body = (
			<div className={panel.emptyState} role="alert">
				<AlertCircle size={36} aria-hidden="true" />
				<p>{error.message}</p>
				<button
					type="button"
					className={panel.secondaryButton}
					onClick={() => refetch()}
				>
					Try again
				</button>
			</div>
		);
	} else if (tracks.length === 0) {
		body = (
			<div className={panel.emptyState}>
				<SearchX size={36} aria-hidden="true" />
				<p>
					No songs match “{query}”. Check the spelling or try another search.
				</p>
			</div>
		);
	} else {
		body = (
			<>
				<ul
					className={`${panel.trackList} ${isPlaceholderData ? styles.stale : ""}`}
					aria-busy={isFetching}
				>
					{tracks.map((track) => {
						const added = draftIds.has(track.id);
						return (
							<Track
								key={track.id}
								track={track}
								onPlay={onPlay}
								isPlaying={playingId === track.id}
								actions={
									<button
										type="button"
										className={`${panel.iconButton} ${added ? styles.added : ""}`}
										onClick={() => (added ? onRemove(track.id) : onAdd(track))}
										aria-pressed={added}
										aria-label={
											added
												? `Remove ${track.name} from playlist`
												: `Add ${track.name} to playlist`
										}
										title={added ? "Remove from playlist" : "Add to playlist"}
									>
										{added ? (
											<Check size={18} aria-hidden="true" />
										) : (
											<Plus size={18} aria-hidden="true" />
										)}
									</button>
								}
							/>
						);
					})}
				</ul>
				{hasNextPage && (
					<button
						type="button"
						className={`${panel.secondaryButton} ${styles.loadMore}`}
						onClick={() => fetchNextPage()}
						disabled={isFetchingNextPage}
					>
						{isFetchingNextPage ? (
							<>
								<Loader2 size={16} className={panel.spin} aria-hidden="true" />
								Loading…
							</>
						) : (
							"Load more"
						)}
					</button>
				)}
			</>
		);
	}

	return (
		<section className={panel.panel} aria-labelledby="results-heading">
			<div className={panel.panelHeader}>
				<div>
					<h2 id="results-heading">Results</h2>
					{!isPending && tracks.length > 0 && (
						<p className={panel.meta} aria-live="polite">
							{numberFormat.format(total)} songs for “{query}”
						</p>
					)}
				</div>
				{tracks.length > 0 && (
					<button
						type="button"
						className={panel.textButton}
						onClick={() => onAddAll(tracks)}
						disabled={allAdded}
					>
						<ListPlus size={16} aria-hidden="true" />
						Add all
					</button>
				)}
			</div>
			{body}
		</section>
	);
}

export default SearchResults;
