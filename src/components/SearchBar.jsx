import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import styles from "@/styles/modules/SearchBar.module.css";

function isTypingTarget(el) {
	return (
		el instanceof HTMLInputElement ||
		el instanceof HTMLTextAreaElement ||
		Boolean(el?.isContentEditable)
	);
}

/** Controlled search box. Press "/" anywhere to jump to it, Esc to clear. */
function SearchBar({ value, onChange, onSubmit }) {
	const inputRef = useRef(null);

	useEffect(() => {
		function onKeyDown(e) {
			if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
			if (isTypingTarget(document.activeElement)) return;
			e.preventDefault();
			inputRef.current?.focus();
			inputRef.current?.select();
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	function handleSubmit(e) {
		e.preventDefault();
		onSubmit(value);
	}

	function handleClear() {
		onSubmit("");
		inputRef.current?.focus();
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: <search> is unsupported before Safari 17
		<form className={styles.searchbar} onSubmit={handleSubmit} role="search">
			<label htmlFor="search" className="visually-hidden">
				Search Spotify for songs
			</label>
			<Search className={styles.icon} size={18} aria-hidden="true" />
			<input
				ref={inputRef}
				id="search"
				type="search"
				autoComplete="off"
				spellCheck="false"
				enterKeyHint="search"
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Escape" && value) handleClear();
				}}
				placeholder="Search songs, artists or albums"
				value={value}
			/>
			{value ? (
				<button
					type="button"
					className={styles.clear}
					onClick={handleClear}
					aria-label="Clear search"
				>
					<X size={16} aria-hidden="true" />
				</button>
			) : (
				<kbd className={styles.shortcut} title="Press / to search">
					/
				</kbd>
			)}
		</form>
	);
}

export default SearchBar;
