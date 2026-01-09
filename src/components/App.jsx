import "@/styles/App.css";
import Playlist from "@/components/Playlist";
import SearchBar from "@/components/SearchBar";
import SearchResults from "@/components/SearchResults";
import SignInBanner from "@/components/SignInBanner";
import { SpotifyProvider, useSpotifyContext } from "@/context/SpotifyContext";

function AppContent() {
	const {
		userAccessToken,
		spotifyLogin,
		handleSearch,
		tracks,
		togglePlaylist,
	} = useSpotifyContext();

	return (
		<>
			<header>
				<h1>
					Ja<span>mmm</span>ing
				</h1>
			</header>
			{!userAccessToken && <SignInBanner spotifyLogin={spotifyLogin} />}
			<main>
				<SearchBar handleSearch={handleSearch} />
				<div className="contents">
					<SearchResults togglePlaylist={togglePlaylist} tracks={tracks} />
					<Playlist togglePlaylist={togglePlaylist} />
				</div>
			</main>
		</>
	);
}

function App() {
	return (
		<SpotifyProvider>
			<AppContent />
		</SpotifyProvider>
	);
}

export default App;
