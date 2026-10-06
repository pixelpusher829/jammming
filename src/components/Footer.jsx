import styles from "@/styles/modules/Footer.module.css";

function Footer() {
	return (
		<footer className={styles.footer}>
			<p>
				Music data and artwork from{" "}
				<a
					href="https://open.spotify.com"
					target="_blank"
					rel="noopener noreferrer"
				>
					Spotify
				</a>
				. Jammming is not affiliated with Spotify.
			</p>
		</footer>
	);
}

export default Footer;
