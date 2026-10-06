import { useAuth } from "@/context/AuthContext";
import styles from "@/styles/modules/Discover.module.css";

const SUGGESTIONS = [
	"Daft Punk",
	"Lo-fi beats",
	"90s hip hop",
	"Taylor Swift",
	"Indie summer",
	"Workout",
	"Jazz classics",
	"Tame Impala",
];

/** Shown before the first search. */
function Discover({ onSuggestion }) {
	const { isAuthenticated } = useAuth();

	return (
		<div className={styles.discover}>
			<h2 className={styles.title}>Start a playlist</h2>
			<p className={styles.lede}>
				{isAuthenticated
					? "Search for songs above, or open one of your playlists to edit it."
					: "Search for songs above. You can sign in later to save to Spotify."}
			</p>
			<ul className={styles.suggestions} aria-label="Suggested searches">
				{SUGGESTIONS.map((term) => (
					<li key={term}>
						<button
							type="button"
							className={styles.chip}
							onClick={() => onSuggestion(term)}
						>
							{term}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

export default Discover;
