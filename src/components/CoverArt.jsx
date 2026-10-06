import { ImagePlus, ListMusic } from "lucide-react";
import { useRef } from "react";
import styles from "@/styles/modules/CoverArt.module.css";

/**
 * Playlist cover: a custom upload, the existing Spotify cover, or a mosaic
 * built from the first four distinct album covers (like Spotify does).
 */
function CoverArt({ cover, coverUrl, tracks, onFile }) {
	const inputRef = useRef(null);

	const mosaic = [];
	for (const track of tracks) {
		const src = track.imageLarge ?? track.image;
		if (src && !mosaic.includes(src)) mosaic.push(src);
		if (mosaic.length === 4) break;
	}

	let art;
	if (cover || coverUrl) {
		art = <img src={cover ?? coverUrl} alt="" className={styles.single} />;
	} else if (mosaic.length >= 4) {
		art = (
			<div className={styles.mosaic}>
				{mosaic.map((src) => (
					<img key={src} src={src} alt="" />
				))}
			</div>
		);
	} else if (mosaic.length > 0) {
		art = <img src={mosaic[0]} alt="" className={styles.single} />;
	} else {
		art = (
			<div className={styles.placeholder}>
				<ListMusic size={36} aria-hidden="true" />
			</div>
		);
	}

	return (
		<div className={styles.cover}>
			{art}
			<button
				type="button"
				className={styles.change}
				onClick={() => inputRef.current?.click()}
				aria-label="Choose a cover image"
				title="Choose a cover image"
			>
				<ImagePlus size={22} aria-hidden="true" />
				<span>Cover</span>
			</button>
			<input
				ref={inputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				className="visually-hidden"
				tabIndex={-1}
				onChange={(e) => {
					const file = e.target.files?.[0];
					e.target.value = "";
					if (file) onFile(file);
				}}
			/>
		</div>
	);
}

export default CoverArt;
