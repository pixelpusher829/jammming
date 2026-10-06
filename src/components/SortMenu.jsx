import {
	ArrowDownAZ,
	ArrowUpDown,
	Clock,
	Shuffle,
	UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import panel from "@/styles/modules/Panel.module.css";
import styles from "@/styles/modules/SortMenu.module.css";

export const SORT_OPTIONS = [
	{ id: "shuffle", label: "Shuffle", icon: Shuffle },
	{ id: "title", label: "Title (A–Z)", icon: ArrowDownAZ },
	{ id: "artist", label: "Artist (A–Z)", icon: UserRound },
	{ id: "duration", label: "Shortest first", icon: Clock },
];

function SortMenu({ onSelect, disabled }) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);

	useEffect(() => {
		if (!open) return;
		function onPointerDown(e) {
			if (!rootRef.current?.contains(e.target)) setOpen(false);
		}
		function onKeyDown(e) {
			if (e.key === "Escape") {
				setOpen(false);
				buttonRef.current?.focus();
			}
		}
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		rootRef.current?.querySelector("[role=menuitem]")?.focus();
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	function handleMenuKeys(e) {
		if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
		e.preventDefault();
		const items = [...rootRef.current.querySelectorAll("[role=menuitem]")];
		const i = items.indexOf(document.activeElement);
		const next = e.key === "ArrowDown" ? i + 1 : i - 1;
		items.at(next % items.length)?.focus();
	}

	return (
		<div className={styles.root} ref={rootRef}>
			<button
				ref={buttonRef}
				type="button"
				className={panel.textButton}
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				disabled={disabled}
			>
				<ArrowUpDown size={16} aria-hidden="true" />
				Sort
			</button>
			{open && (
				<div
					className={styles.menu}
					role="menu"
					aria-label="Sort playlist"
					tabIndex={-1}
					onKeyDown={handleMenuKeys}
				>
					{SORT_OPTIONS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							role="menuitem"
							className={styles.item}
							onClick={() => {
								setOpen(false);
								onSelect(id);
							}}
						>
							<Icon size={16} aria-hidden="true" />
							{label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export default SortMenu;
