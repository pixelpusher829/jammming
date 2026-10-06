import { AlertCircle, ArrowLeft, Loader2, Search } from "lucide-react";
import { useState } from "react";
import defaultAlbumArt from "@/assets/placeholder.webp";
import TrackSkeleton from "@/components/TrackSkeleton";
import { useEditablePlaylists } from "@/hooks/useSpotifyQueries";
import panel from "@/styles/modules/Panel.module.css";
import styles from "@/styles/modules/PlaylistPicker.module.css";

function PlaylistPicker({ onPick, onCancel, loadingId, loadError }) {
	const [filter, setFilter] = useState("");
	const {
		data: playlists,
		error,
		isPending,
		refetch,
	} = useEditablePlaylists({ enabled: true });

	const needle = filter.trim().toLowerCase();
	const visible = (playlists ?? []).filter((p) =>
		p.name.toLowerCase().includes(needle),
	);

	let body;
	if (isPending) {
		body = <TrackSkeleton count={6} />;
	} else if (error) {
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
	} else if (playlists.length === 0) {
		body = (
			<div className={panel.emptyState}>
				<p>You don’t have any playlists you can edit yet.</p>
			</div>
		);
	} else {
		body = (
			<>
				{playlists.length > 6 && (
					<div className={styles.filter}>
						<Search size={16} aria-hidden="true" />
						<input
							type="search"
							value={filter}
							onChange={(e) => setFilter(e.target.value)}
							placeholder="Filter your playlists"
							aria-label="Filter your playlists"
						/>
					</div>
				)}
				{visible.length === 0 ? (
					<div className={panel.emptyState}>
						<p>No playlists match “{filter}”.</p>
					</div>
				) : (
					<ul className={styles.list}>
						{visible.map((playlist) => (
							<li key={playlist.id}>
								<button
									type="button"
									className={styles.item}
									onClick={() => onPick(playlist)}
									disabled={Boolean(loadingId)}
								>
									<img
										src={playlist.image || defaultAlbumArt}
										alt=""
										width="48"
										height="48"
										loading="lazy"
									/>
									<span className={styles.details}>
										<span className={styles.name}>{playlist.name}</span>
										<span className={panel.meta}>
											{playlist.total} {playlist.total === 1 ? "song" : "songs"}{" "}
											· {playlist.isPublic ? "Public" : "Private"}
										</span>
									</span>
									{loadingId === playlist.id && (
										<Loader2
											size={18}
											className={panel.spin}
											aria-label="Loading"
										/>
									)}
								</button>
							</li>
						))}
					</ul>
				)}
			</>
		);
	}

	return (
		<section
			className={`${panel.panel} ${styles.picker}`}
			aria-labelledby="picker-heading"
		>
			<div className={panel.panelHeader}>
				<h2 id="picker-heading">Your playlists</h2>
				<button type="button" className={panel.textButton} onClick={onCancel}>
					<ArrowLeft size={16} aria-hidden="true" />
					Back
				</button>
			</div>
			{loadError && (
				<p className={styles.loadError} role="alert">
					<AlertCircle size={16} aria-hidden="true" />
					{loadError.message}
				</p>
			)}
			{body}
		</section>
	);
}

export default PlaylistPicker;
