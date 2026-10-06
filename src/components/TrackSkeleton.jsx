import panel from "@/styles/modules/Panel.module.css";
import styles from "@/styles/modules/Track.module.css";

function TrackSkeleton({ count }) {
	return (
		<ul className={panel.trackList} aria-hidden="true">
			{Array.from({ length: count }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
				<li key={i} className={`${styles.track} ${styles.skeleton}`}>
					<div className={styles.imageContainer} />
					<div className={styles.trackInfo}>
						<span className={styles.skeletonLine} />
						<span className={styles.skeletonLineShort} />
					</div>
				</li>
			))}
		</ul>
	);
}

export default TrackSkeleton;
