import { ListMusic, Search } from "lucide-react";
import styles from "@/styles/modules/MobileTabs.module.css";

const TABS = [
	{ id: "search", label: "Search", icon: Search },
	{ id: "playlist", label: "Playlist", icon: ListMusic },
];

/** Bottom navigation that switches columns on small screens. */
function MobileTabs({ active, onChange, count, isDirty }) {
	return (
		<nav className={styles.tabs} aria-label="Sections">
			{TABS.map(({ id, label, icon: Icon }) => (
				<button
					key={id}
					type="button"
					className={styles.tab}
					aria-current={active === id ? "page" : undefined}
					onClick={() => {
						onChange(id);
						window.scrollTo({ top: 0 });
					}}
				>
					<span className={styles.iconWrap}>
						<Icon size={20} aria-hidden="true" />
						{id === "playlist" && count > 0 && (
							<span className={styles.badge} data-dirty={isDirty || undefined}>
								{count > 99 ? "99+" : count}
							</span>
						)}
					</span>
					{label}
				</button>
			))}
		</nav>
	);
}

export default MobileTabs;
