import { LogIn, LogOut } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { useAuth } from "@/context/AuthContext";
import { useCurrentUser } from "@/hooks/useSpotifyQueries";
import styles from "@/styles/modules/Header.module.css";

function Header({ searchValue, onSearchChange, onSearchSubmit }) {
	const { status, isAuthenticated, login, logout } = useAuth();
	const { data: user } = useCurrentUser();

	return (
		<header className={styles.header}>
			<div className={styles.inner}>
				<a href="/" className={styles.brand} aria-label="Jammming home">
					<img src="/jamming.svg" alt="" width="32" height="32" />
					<span className={styles.wordmark}>
						Ja<span className={styles.accent}>mmm</span>ing
					</span>
				</a>

				<div className={styles.search}>
					<SearchBar
						value={searchValue}
						onChange={onSearchChange}
						onSubmit={onSearchSubmit}
					/>
				</div>

				<div className={styles.account}>
					{isAuthenticated && user && (
						<a
							href={user.url ?? undefined}
							target="_blank"
							rel="noopener noreferrer"
							className={styles.user}
							title={`${user.name} on Spotify`}
						>
							{user.image ? (
								<img src={user.image} alt="" className={styles.avatar} />
							) : (
								<span className={styles.avatarFallback} aria-hidden="true">
									{user.name.charAt(0).toUpperCase()}
								</span>
							)}
							<span className={styles.userName}>{user.name}</span>
						</a>
					)}
					{isAuthenticated ? (
						<button
							type="button"
							className={styles.iconButton}
							onClick={logout}
							aria-label="Sign out"
							title="Sign out"
						>
							<LogOut size={18} aria-hidden="true" />
						</button>
					) : (
						<button
							type="button"
							className={styles.signIn}
							onClick={login}
							disabled={status === "loading"}
							aria-label="Sign in with Spotify"
						>
							<LogIn size={16} aria-hidden="true" />
							<span>
								Sign in<span className={styles.signInLong}> with Spotify</span>
							</span>
						</button>
					)}
				</div>
			</div>
		</header>
	);
}

export default Header;
