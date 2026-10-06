import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MobileTabs from "@/components/MobileTabs";
import NowPlaying from "@/components/NowPlaying";
import PlaylistEditor from "@/components/PlaylistEditor";
import SearchResults from "@/components/SearchResults";
import SignInBanner from "@/components/SignInBanner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePlaylistDraft } from "@/hooks/usePlaylistDraft";
import styles from "@/styles/modules/App.module.css";

const SEARCH_DEBOUNCE_MS = 350;

function App() {
	const [input, setInput] = useState("");
	const debounced = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);
	const [searchTerm, setSearchTerm] = useState("");
	const [mobileTab, setMobileTab] = useState("search");
	const [nowPlaying, setNowPlaying] = useState(null);
	const { draft, dispatch, isDirty } = usePlaylistDraft();
	const draftIds = new Set(draft.tracks.map((t) => t.id));

	useEffect(() => {
		setSearchTerm(debounced);
	}, [debounced]);

	function runSearch(term) {
		setInput(term);
		setSearchTerm(term);
		setMobileTab("search");
	}

	function removeTrack(id) {
		const index = draft.tracks.findIndex((t) => t.id === id);
		if (index < 0) return;
		const track = draft.tracks[index];
		dispatch({ type: "remove", id });
		toast(`Removed “${track.name}”`, {
			id: `remove-${id}`,
			action: {
				label: "Undo",
				onClick: () => dispatch({ type: "insert", track, index }),
			},
		});
	}

	function addAll(tracks) {
		const fresh = tracks.filter((t) => !draftIds.has(t.id));
		if (fresh.length === 0) return;
		dispatch({ type: "addMany", tracks: fresh });
		toast.success(
			`Added ${fresh.length} ${fresh.length === 1 ? "song" : "songs"}`,
			{
				action: {
					label: "Undo",
					onClick: () => {
						for (const t of fresh) dispatch({ type: "remove", id: t.id });
					},
				},
			},
		);
	}

	function togglePlay(track) {
		setNowPlaying((current) => (current?.id === track.id ? null : track));
	}

	return (
		<div
			className={styles.app}
			data-tab={mobileTab}
			data-playing={nowPlaying ? "" : undefined}
		>
			<a href="#search" className={styles.skipLink}>
				Skip to search
			</a>
			<Header
				searchValue={input}
				onSearchChange={setInput}
				onSearchSubmit={runSearch}
			/>
			<SignInBanner />
			<main className={styles.main}>
				<div className={styles.resultsColumn}>
					<SearchResults
						term={searchTerm}
						draftIds={draftIds}
						playingId={nowPlaying?.id}
						onPlay={togglePlay}
						onAdd={(track) => dispatch({ type: "add", track })}
						onAddAll={addAll}
						onRemove={removeTrack}
						onSuggestion={runSearch}
					/>
				</div>
				<div className={styles.playlistColumn}>
					<PlaylistEditor
						draft={draft}
						dispatch={dispatch}
						isDirty={isDirty}
						playingId={nowPlaying?.id}
						onPlay={togglePlay}
						onRemove={removeTrack}
					/>
				</div>
			</main>
			<Footer />
			<NowPlaying track={nowPlaying} onClose={() => setNowPlaying(null)} />
			<MobileTabs
				active={mobileTab}
				onChange={setMobileTab}
				count={draft.tracks.length}
				isDirty={isDirty}
			/>
			<Toaster
				theme="dark"
				position="bottom-center"
				offset={{ bottom: nowPlaying ? 120 : 24 }}
				mobileOffset={{ bottom: nowPlaying ? 176 : 88 }}
				toastOptions={{ className: styles.toast }}
			/>
		</div>
	);
}

export default App;
