import {
	AlertCircle,
	ExternalLink,
	FilePlus2,
	FolderOpen,
	Globe,
	ListMusic,
	Loader2,
	Lock,
	LogIn,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import CoverArt from "@/components/CoverArt";
import PlaylistPicker from "@/components/PlaylistPicker";
import SortableTrackList from "@/components/SortableTrackList";
import SortMenu, { SORT_OPTIONS } from "@/components/SortMenu";
import { useAuth } from "@/context/AuthContext";
import { fingerprint } from "@/hooks/usePlaylistDraft";
import {
	usePlaylistTracksLoader,
	useSavePlaylist,
} from "@/hooks/useSpotifyQueries";
import { formatTotalDuration } from "@/lib/format";
import { toCoverDataUrl } from "@/lib/image";
import panel from "@/styles/modules/Panel.module.css";
import styles from "@/styles/modules/PlaylistEditor.module.css";

function PlaylistEditor({
	draft,
	dispatch,
	isDirty,
	playingId,
	onPlay,
	onRemove,
}) {
	const { isAuthenticated, login } = useAuth();
	const save = useSavePlaylist();
	const loader = usePlaylistTracksLoader();
	const [view, setView] = useState("edit");
	const ids = { name: useId(), description: useId() };

	const { tracks, playlistId } = draft;
	const totalMs = tracks.reduce((sum, t) => sum + t.durationMs, 0);
	const isEmptyDraft = !playlistId && !isDirty;

	function undoable(message, snapshot, options = {}) {
		toast(message, {
			...options,
			action: {
				label: "Undo",
				onClick: () => dispatch({ type: "restore", draft: snapshot }),
			},
		});
	}

	function update(fields) {
		save.reset();
		dispatch({ type: "update", fields });
	}

	function handleNew() {
		const snapshot = draft;
		dispatch({ type: "reset" });
		save.reset();
		if (isDirty) undoable("Started a new playlist", snapshot);
	}

	function handleSort(by) {
		const snapshot = draft;
		dispatch({ type: "sort", by });
		const label = SORT_OPTIONS.find((o) => o.id === by)?.label;
		undoable(by === "shuffle" ? "Shuffled" : `Sorted by ${label}`, snapshot);
	}

	async function handleCoverFile(file) {
		try {
			dispatch({ type: "setCover", dataUrl: await toCoverDataUrl(file) });
			toast.success("Cover added. It’ll upload when you save.");
		} catch (error) {
			toast.error(error.message);
		}
	}

	function handlePick(playlist) {
		const snapshot = draft;
		const hadChanges = isDirty;
		loader.mutate(playlist.id, {
			onSuccess: ({ tracks: loaded, skipped }) => {
				dispatch({ type: "load", playlist, tracks: loaded });
				setView("edit");
				save.reset();
				const note =
					skipped > 0
						? `${skipped} local file${skipped === 1 ? "" : "s"} or episode${skipped === 1 ? "" : "s"} can’t be edited here and will be removed if you save.`
						: undefined;
				if (hadChanges) {
					undoable(`Opened “${playlist.name}”`, snapshot, {
						description: note,
					});
				} else if (note) {
					toast.info(note, { duration: 8000 });
				}
			},
		});
	}

	function handleSubmit(e) {
		e.preventDefault();
		if (!isAuthenticated) {
			login();
			return;
		}
		const sent = fingerprint(draft);
		save.mutate(draft, {
			onSuccess: (result) => {
				dispatch({
					type: "saved",
					id: result.id,
					url: result.url,
					fingerprint: sent,
					coverSaved: Boolean(result.coverSaved),
				});
				const url = result.url ?? draft.url;
				toast.success(
					result.created ? "Playlist created on Spotify." : "Playlist updated.",
					url
						? {
								action: {
									label: "View",
									onClick: () => window.open(url, "_blank", "noopener"),
								},
							}
						: undefined,
				);
				if (result.coverError) toast.warning(result.coverError);
			},
		});
	}

	if (view === "pick") {
		return (
			<PlaylistPicker
				onPick={handlePick}
				onCancel={() => {
					loader.reset();
					setView("edit");
				}}
				loadingId={loader.isPending ? loader.variables : null}
				loadError={loader.error}
			/>
		);
	}

	const canSave = !save.isPending && (playlistId ? isDirty : tracks.length > 0);

	let saveLabel = "Save to Spotify";
	if (save.isPending) saveLabel = "Saving…";
	else if (playlistId) saveLabel = isDirty ? "Save changes" : "Saved";

	return (
		<section
			className={`${panel.panel} ${styles.editor}`}
			aria-labelledby="playlist-heading"
		>
			<div className={panel.panelHeader}>
				<h2 id="playlist-heading">
					{playlistId ? "Editing playlist" : "New playlist"}
				</h2>
				<div className={styles.toolbar}>
					{isAuthenticated && (
						<button
							type="button"
							className={panel.textButton}
							onClick={() => setView("pick")}
						>
							<FolderOpen size={16} aria-hidden="true" />
							Open
						</button>
					)}
					<SortMenu onSelect={handleSort} disabled={tracks.length < 2} />
					<button
						type="button"
						className={panel.textButton}
						onClick={handleNew}
						disabled={isEmptyDraft}
					>
						<FilePlus2 size={16} aria-hidden="true" />
						New
					</button>
				</div>
			</div>

			<form className={styles.form} onSubmit={handleSubmit}>
				<div className={styles.details}>
					<CoverArt
						cover={draft.cover}
						coverUrl={draft.coverUrl}
						tracks={tracks}
						onFile={handleCoverFile}
					/>
					<div className={styles.fields}>
						<label htmlFor={ids.name} className="visually-hidden">
							Playlist name
						</label>
						<input
							id={ids.name}
							className={styles.nameInput}
							type="text"
							maxLength={100}
							value={draft.name}
							onChange={(e) => update({ name: e.target.value })}
							placeholder="Name your playlist"
						/>
						<label htmlFor={ids.description} className="visually-hidden">
							Description (optional)
						</label>
						<textarea
							id={ids.description}
							className={styles.descriptionInput}
							rows={2}
							maxLength={300}
							value={draft.description}
							onChange={(e) => update({ description: e.target.value })}
							placeholder="Add an optional description"
						/>
					</div>
				</div>

				<div className={styles.metaRow}>
					<fieldset className={styles.visibility}>
						<legend className="visually-hidden">Visibility</legend>
						<label>
							<input
								type="radio"
								name="visibility"
								checked={!draft.isPublic}
								onChange={() => update({ isPublic: false })}
							/>
							<Lock size={14} aria-hidden="true" />
							Private
						</label>
						<label>
							<input
								type="radio"
								name="visibility"
								checked={draft.isPublic}
								onChange={() => update({ isPublic: true })}
							/>
							<Globe size={14} aria-hidden="true" />
							Public
						</label>
					</fieldset>
					<p className={panel.meta}>
						{tracks.length} {tracks.length === 1 ? "song" : "songs"}
						{tracks.length > 0 && ` · ${formatTotalDuration(totalMs)}`}
					</p>
				</div>

				<div className={styles.list}>
					{tracks.length === 0 ? (
						<div className={panel.emptyState}>
							<ListMusic size={36} aria-hidden="true" />
							<p>
								Nothing here yet. Tap <strong>+</strong> on a search result to
								add it.
							</p>
						</div>
					) : (
						<SortableTrackList
							tracks={tracks}
							dispatch={dispatch}
							playingId={playingId}
							onPlay={onPlay}
							onRemove={onRemove}
						/>
					)}
				</div>

				<div className={styles.footer}>
					<div aria-live="polite" className={styles.status}>
						{save.isError ? (
							<p className={styles.error} role="alert">
								<AlertCircle size={16} aria-hidden="true" />
								{save.error.message}
							</p>
						) : (
							isDirty &&
							playlistId && <p className={styles.unsaved}>Unsaved changes</p>
						)}
					</div>
					<div className={styles.actions}>
						{draft.url && (
							<a
								href={draft.url}
								target="_blank"
								rel="noopener noreferrer"
								className={panel.secondaryButton}
							>
								<ExternalLink size={14} aria-hidden="true" />
								Open in Spotify
							</a>
						)}
						{isAuthenticated ? (
							<button
								type="submit"
								className={panel.primaryButton}
								disabled={!canSave}
							>
								{save.isPending && (
									<Loader2
										size={16}
										className={panel.spin}
										aria-hidden="true"
									/>
								)}
								{saveLabel}
							</button>
						) : (
							<button type="submit" className={panel.spotifyButton}>
								<LogIn size={16} aria-hidden="true" />
								Sign in to save
							</button>
						)}
					</div>
				</div>
			</form>
		</section>
	);
}

export default PlaylistEditor;
