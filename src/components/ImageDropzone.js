"use client";

import { useRef, useState } from "react";
import { resizeImageToDataUrl } from "@/lib/image-client";

// A clearly-clickable square upload area (click-to-browse + drag & drop),
// with a preview once an image is set and a visible error message if the
// resize/read step fails — replaces bare <input type="file"> uploaders,
// which are easy to miss and give no feedback when something goes wrong.
export default function ImageDropzone({
  value,
  onChange,
  maxWidth = 1200,
  quality = 0.85,
  keepPng = true,
  size = 128,
  label = "Cliquez ou glissez une image (PNG ou JPEG)",
  shape = "square", // "square" | "circle"
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setError("");
    if (!file.type || !file.type.startsWith("image/")) {
      setError("Ce fichier n'est pas une image. Choisissez un PNG ou un JPEG.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Image trop volumineuse (max 20 Mo). Essayez une version plus légère.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, maxWidth, quality, { keepPng });
      onChange(dataUrl);
    } catch (err) {
      setError("Échec de l'import de l'image. Réessayez avec un autre fichier.");
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{ width: size, height: size }}
        className={`relative flex shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden border-2 border-dashed text-center transition ${
          shape === "circle" ? "rounded-full" : "rounded-xl"
        } ${
          dragOver
            ? "border-ibc-blue bg-ibc-blue/10"
            : "border-black/20 bg-black/[0.02] hover:border-ibc-blue/50 hover:bg-ibc-blue/5"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-[11px] font-semibold uppercase leading-tight text-ibc-ink/50">
            {busy ? "Import…" : label}
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-bold uppercase text-ibc-blue">
            Import…
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="mt-1 flex items-center gap-2">
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] font-bold uppercase text-red-500 hover:underline"
          >
            Retirer l&apos;image
          </button>
        )}
      </div>
      {error && <p className="mt-1 max-w-[200px] text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}
