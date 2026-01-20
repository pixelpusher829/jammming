import { ExternalLink } from "lucide-react";
import styles from "@/styles/modules/Track.module.css";

function Track({ track, isInPlaylist, togglePlaylist }) {
	const { name, artists, album, id, external_urls } = track;

	const albumArt = album?.images?.[2]?.url || album?.images?.[1]?.url || "";
	const spotifyUrl = external_urls?.spotify;

	return (
		<div className={styles.track}>
			<div className={styles.trackContent}>
				<div className={styles.imageContainer}>
					<img src={albumArt} alt={album.name} className={styles.albumArt} />
					{spotifyUrl && (
						<a
							href={spotifyUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={styles.spotifyLink}
							title="Open in Spotify"
						>
							<span className={styles.spotifyIcon}>
								<ExternalLink strokeWidth={2} size={30}/>
							</span>
						</a>
					)}
				</div>
				<div className={styles.trackInfo}>
					<h3>{name}</h3>
					<p>
						{artists.map((artist) => artist.name).join(", ")} | {album.name}
					</p>
				</div>
			</div>
			<button
				className={styles.toggleButton}
				type="button"
				onClick={() => togglePlaylist(id)}
			>
				{isInPlaylist ? "-" : "+"}
			</button>
		</div>
	);
}

export default Track;
