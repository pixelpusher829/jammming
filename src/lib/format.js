export function formatDuration(ms) {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = String(totalSeconds % 60).padStart(2, "0");
	return `${minutes}:${seconds}`;
}

export function formatTotalDuration(ms) {
	const totalMinutes = Math.round(ms / 60000);
	if (totalMinutes < 60) return `${totalMinutes} min`;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}
