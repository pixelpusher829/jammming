import { ExternalLink, Pause, Play } from "lucide-react";
import defaultAlbumArt from "@/assets/placeholder.webp";
import { formatDuration } from "@/lib/format";
import styles from "@/styles/modules/Track.module.css";

/**
 * A single track row. Row-specific controls (add, remove, drag handle) are
 * passed in so the same row works in search results and the playlist.
 * `ref`, `style` and `isDragging` come from the sortable wrapper.
 */
function Track({
	track,
	index,
	actions,
	handle,
	onPlay,
	isPlaying = false,
	isDragging = false,
	ref,
	style,
}) {
	const { name, artists, album, image, url, durationMs, explicit } = track;
	const artistLine = artists.join(", ");

	return (
		<li
			ref={ref}
			style={style}
			className={styles.track}
			data-playing={isPlaying || undefined}
			data-dragging={isDragging || undefined}
		>
			{handle}
			{index !== undefined && (
				<span className={styles.index} aria-hidden="true">
					{index + 1}
				</span>
			)}
			<div className={styles.imageContainer}>
				<img
					src={image || defaultAlbumArt}
					alt=""
					className={styles.albumArt}
					loading="lazy"
					width="48"
					height="48"
				/>
				{onPlay && (
					<button
						type="button"
						className={styles.play}
						onClick={() => onPlay(track)}
						aria-label={
							isPlaying ? `Stop preview of ${name}` : `Preview ${name}`
						}
						aria-pressed={isPlaying}
					>
						{isPlaying ? (
							<Pause size={18} fill="currentColor" aria-hidden="true" />
						) : (
							<Play size={18} fill="currentColor" aria-hidden="true" />
						)}
					</button>
				)}
			</div>
			<div className={styles.trackInfo}>
				<h3 title={name}>{name}</h3>
				<p title={`${artistLine} · ${album}`}>
					{explicit && (
						<abbr className={styles.explicit} title="Explicit">
							E
						</abbr>
					)}
					{artistLine}
				</p>
			</div>
			<span className={styles.album} title={album}>
				{album}
			</span>
			<span className={styles.duration}>{formatDuration(durationMs)}</span>
			<div className={styles.actions}>
				{url && (
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className={styles.spotifyLink}
						aria-label={`Open ${name} on Spotify`}
						title="Open in Spotify"
					>
						<ExternalLink size={16} aria-hidden="true" />
					</a>
				)}
				{actions}
			</div>
		</li>
	);
}

export default Track;
