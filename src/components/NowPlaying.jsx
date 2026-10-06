import { X } from "lucide-react";
import styles from "@/styles/modules/NowPlaying.module.css";

/**
 * Docked preview player using Spotify's official embed. Visitors hear a 30s
 * preview, or the full track if they're signed in to Spotify in this browser.
 */
function NowPlaying({ track, onClose }) {
	if (!track) return null;

	return (
		<section className={styles.player} aria-label={`Preview: ${track.name}`}>
			<iframe
				key={track.id}
				title={`Spotify player: ${track.name}`}
				src={`https://open.spotify.com/embed/track/${track.id}?utm_source=jammming&theme=0`}
				className={styles.frame}
				allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
				loading="lazy"
			/>
			<button
				type="button"
				className={styles.close}
				onClick={onClose}
				aria-label="Close player"
			>
				<X size={18} aria-hidden="true" />
			</button>
		</section>
	);
}

export default NowPlaying;
