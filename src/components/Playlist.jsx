import Track from "@/components/Track";
import { usePlaylist } from "@/hooks/usePlaylist";
import styles from "@/styles/modules/Playlist.module.css";

function Playlist({ togglePlaylist }) {
	const {
		playlistInfo,
		setPlaylistInfo,
		playlistButtonText,
		isActiveEffect,
		fadeKey,
		showSuccess,
		handleSaveToSpotify,
		handleButtonEffect,
		tracks,
	} = usePlaylist();

	const tracksInPlaylist = tracks.filter((track) => track.isInPlaylist);
	const hasTracksInPlaylist = tracksInPlaylist && tracksInPlaylist.length > 0;

	return (
		<div>
			<form className={styles.playlist} onSubmit={handleSaveToSpotify}>
				<input
					type="text"
					onChange={(e) =>
						setPlaylistInfo({
							...playlistInfo,
							name: e.target.value,
						})
					}
					value={playlistInfo.name}
					placeholder="Enter Playlist Name"
				/>

				{hasTracksInPlaylist ? (
					<>
						{tracksInPlaylist.map((track) => (
							<Track
								key={track.id}
								track={track}
								isInPlaylist={track.isInPlaylist}
								togglePlaylist={togglePlaylist}
							/>
						))}
						<div className={styles.actionContainer}>
							<button
								onClick={handleButtonEffect}
								className={`${styles.saveButton} ${
									isActiveEffect ? styles.buttonEffect : ""
								}`}
								type="submit"
							>
								{playlistButtonText}
							</button>
							{playlistInfo.url && (
								<a
									href={playlistInfo.url}
									target="_blank"
									rel="noopener noreferrer"
									className={styles.viewLink}
								>
									View on Spotify
								</a>
							)}
						</div>
						{showSuccess && (
							<p
								key={fadeKey}
								className={`${styles.success} ${styles.fadeOut}`}
							>
								Playlist saved!
							</p>
						)}
					</>
				) : (
					<p>No tracks in the playlist</p>
				)}
			</form>
		</div>
	);
}

export default Playlist;
