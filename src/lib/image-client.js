// Client-side only. Resizes/compresses an uploaded image before it's turned
// into a base64 data URL and stored in the database — keeps player photos
// and the hero/team image from bloating the SQLite file.
//
// PNG uploads (e.g. sponsor logos with transparency) are kept as PNG so the
// transparent background survives; every other format is re-encoded as JPEG
// for smaller storage. Pass keepPng: false to force JPEG regardless.
export function resizeImageToDataUrl(file, maxWidth = 1200, quality = 0.85, opts = {}) {
  const { keepPng = true } = opts;
  const isPng = keepPng && file && file.type === "image/png";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(isPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
