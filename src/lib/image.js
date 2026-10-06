// Spotify rejects cover images whose base64 payload exceeds 256 KB
const MAX_BASE64_BYTES = 256 * 1024;
const COVER_SIZE = 640;

function loadImage(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("That file couldn't be read as an image."));
		};
		img.src = url;
	});
}

/**
 * Center-crops an image file to a square JPEG data URL small enough for
 * Spotify's playlist cover endpoint.
 */
export async function toCoverDataUrl(file) {
	if (!file.type.startsWith("image/")) {
		throw new Error("Choose an image file (JPEG, PNG or WebP).");
	}
	const img = await loadImage(file);
	const side = Math.min(img.naturalWidth, img.naturalHeight);
	const size = Math.min(COVER_SIZE, side);

	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	ctx.drawImage(
		img,
		(img.naturalWidth - side) / 2,
		(img.naturalHeight - side) / 2,
		side,
		side,
		0,
		0,
		size,
		size,
	);

	for (let quality = 0.9; quality >= 0.4; quality -= 0.1) {
		const dataUrl = canvas.toDataURL("image/jpeg", quality);
		const base64Length = dataUrl.length - dataUrl.indexOf(",") - 1;
		if (base64Length <= MAX_BASE64_BYTES) return dataUrl;
	}
	throw new Error("That image is too detailed to use as a cover. Try another.");
}
