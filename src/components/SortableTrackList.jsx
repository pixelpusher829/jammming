import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minus } from "lucide-react";
import Track from "@/components/Track";
import panel from "@/styles/modules/Panel.module.css";
import styles from "@/styles/modules/Track.module.css";

function SortableTrack({ track, index, playingId, onPlay, onRemove }) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: track.id });

	return (
		<Track
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			isDragging={isDragging}
			track={track}
			index={index}
			onPlay={onPlay}
			isPlaying={playingId === track.id}
			handle={
				<button
					type="button"
					ref={setActivatorNodeRef}
					className={styles.handle}
					aria-label={`Reorder ${track.name}`}
					{...attributes}
					{...listeners}
				>
					<GripVertical size={16} aria-hidden="true" />
				</button>
			}
			actions={
				<button
					type="button"
					className={panel.iconButton}
					onClick={() => onRemove(track.id)}
					aria-label={`Remove ${track.name} from playlist`}
					title="Remove from playlist"
				>
					<Minus size={18} aria-hidden="true" />
				</button>
			}
		/>
	);
}

/** Playlist tracks, reorderable by dragging the handle or with the keyboard. */
function SortableTrackList({ tracks, dispatch, playingId, onPlay, onRemove }) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const nameOf = (id) => tracks.find((t) => t.id === id)?.name ?? "track";
	const positionOf = (id) => tracks.findIndex((t) => t.id === id) + 1;

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={({ active, over }) => {
				if (over && active.id !== over.id) {
					dispatch({ type: "reorder", activeId: active.id, overId: over.id });
				}
			}}
			accessibility={{
				screenReaderInstructions: {
					draggable:
						"To reorder, press space or enter, use the arrow keys to move, then press space or enter again to drop. Press escape to cancel.",
				},
				announcements: {
					onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
					onDragOver: ({ active, over }) =>
						over
							? `${nameOf(active.id)} moved to position ${positionOf(over.id)}.`
							: undefined,
					onDragEnd: ({ active, over }) =>
						over
							? `${nameOf(active.id)} dropped at position ${positionOf(over.id)}.`
							: `${nameOf(active.id)} dropped.`,
					onDragCancel: ({ active }) =>
						`Reordering cancelled. ${nameOf(active.id)} returned to its place.`,
				},
			}}
		>
			<SortableContext
				items={tracks.map((t) => t.id)}
				strategy={verticalListSortingStrategy}
			>
				<ol className={panel.trackList}>
					{tracks.map((track, index) => (
						<SortableTrack
							key={track.id}
							track={track}
							index={index}
							playingId={playingId}
							onPlay={onPlay}
							onRemove={onRemove}
						/>
					))}
				</ol>
			</SortableContext>
		</DndContext>
	);
}

export default SortableTrackList;
