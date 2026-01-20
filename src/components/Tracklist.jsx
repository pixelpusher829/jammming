import Track from "@/components/Track";

function Tracklist({ tracks, togglePlaylist }) {
	const resultsList = tracks.filter((track) => !track.isInPlaylist);
	return (
		<div>
			{resultsList.map((track) => (
				<Track
					key={track.id}
					track={track}
					isInPlaylist={track.isInPlaylist}
					togglePlaylist={togglePlaylist}
				/>
			))}
		</div>
	);
}

export default Tracklist;
