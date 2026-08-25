"use client";

import { useEffect, useState } from "react";

/**
 * A thumbnail that opens full-size over the page when clicked, with a
 * pinch/scroll zoom step. Used for the gym photos, where the point is being
 * able to actually recognise the entrance — a 120px thumbnail cannot do that.
 */
export default function PhotoZoom({ src, alt = "", caption, className = "" }) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setZoomed(false);
        }}
        className={`group relative block overflow-hidden rounded-lg border border-black/10 ${className}`}
        aria-label={alt || "Open photo"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-28 w-full object-cover transition group-hover:opacity-90" />
        {caption && (
          <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {caption}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-2 text-sm font-bold uppercase text-ibc-ink hover:bg-white"
          >
            ×
          </button>
          <div className="max-h-full max-w-5xl overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              onClick={() => setZoomed((z) => !z)}
              className={`cursor-zoom-in rounded-lg ${
                zoomed ? "max-w-none cursor-zoom-out" : "max-h-[85vh] w-auto"
              }`}
              style={zoomed ? { width: "200%" } : undefined}
            />
          </div>
          {caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
              {caption} — click the photo to zoom
            </p>
          )}
        </div>
      )}
    </>
  );
}
