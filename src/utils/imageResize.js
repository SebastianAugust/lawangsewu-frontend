// Downscale + re-encode a picked image before it is uploaded.
//
// Menu photos are shot on phones and arrive at 3000px / several MB. The API
// only ever renders them at ~40px (list) or 128px (form preview), so shipping
// the original wastes upload time on the tablet's connection and storage on
// the server. Everything here is best-effort: on any failure we hand back the
// original File untouched, so the existing upload path and the server-side
// validation behave exactly as before.

const MAX_WIDTH = 800;
const QUALITY = 0.8;
// Re-encode anything above this even when it is already narrow enough — a
// 700px PNG screenshot can still be multi-megabyte.
const ALWAYS_REENCODE_ABOVE = 512 * 1024;

// PNG has no quality knob, so photos land as JPEG. WEBP keeps its own format
// because it already encodes with a quality parameter.
const OUTPUT_TYPE = {
  "image/png": "image/jpeg",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/webp": "image/webp",
};

// The API validates `mimes:jpg,jpeg,png,webp`, which Laravel checks against the
// extension too — so a converted file has to be renamed to match its new type.
const EXTENSION = { "image/jpeg": "jpg", "image/webp": "webp" };

const withExtension = (name, ext) => {
  const base = String(name || "menu");
  const dot = base.lastIndexOf(".");
  return `${dot > 0 ? base.slice(0, dot) : base}.${ext}`;
};

export async function resizeImageFile(
  file,
  { maxWidth = MAX_WIDTH, quality = QUALITY } = {},
) {
  if (
    !file ||
    typeof createImageBitmap !== "function" ||
    !file.type?.startsWith("image/")
  ) {
    return file;
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Animated / corrupt / unsupported — let the server be the judge.
    return file;
  }

  try {
    const needsResize = bitmap.width > maxWidth;
    if (!needsResize && file.size <= ALWAYS_REENCODE_ABOVE) return file;

    const width = needsResize ? maxWidth : bitmap.width;
    const height = needsResize
      ? Math.max(1, Math.round((bitmap.height * maxWidth) / bitmap.width))
      : bitmap.height;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    const type = OUTPUT_TYPE[file.type] || "image/jpeg";
    // JPEG has no alpha channel; without this, transparent PNG pixels turn
    // black instead of white.
    if (type === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, type, quality),
    );
    // Re-encoding can inflate an already-optimised file; keep whichever is smaller.
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], withExtension(file.name, EXTENSION[type] || "jpg"), {
      type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}
