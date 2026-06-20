// Client-side image compression. Resizes to a max edge and re-encodes to WebP.
// Skips GIFs (animation would be lost) and tiny files.
export async function compressImage(
  file: File,
  opts: { maxEdge?: number; quality?: number; mime?: string } = {},
): Promise<File> {
  const { maxEdge = 1600, quality = 0.82, mime = "image/webp" } = opts;
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;
  if (file.size < 80 * 1024) return file; // already small

  try {
    const bitmap = await createImageBitmap(file).catch(async () => {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = url;
        });
        return img as unknown as ImageBitmap;
      } finally {
        URL.revokeObjectURL(url);
      }
    });

    const w = (bitmap as any).width as number;
    const h = (bitmap as any).height as number;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const targetW = Math.round(w * scale);
    const targetH = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap as any, 0, 0, targetW, targetH);

    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, mime, quality));
    if (!blob || blob.size >= file.size) return file;
    const ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  }
}
