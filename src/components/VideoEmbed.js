"use client";

import { useState } from "react";
import { parseVideoUrl } from "@/lib/video";

/**
 * A video link rendered as its first frame, which swaps to the real player
 * when clicked.
 *
 * Loading the thumbnail rather than the iframe up front matters on a page
 * that lists several games: an embedded YouTube player pulls a few hundred
 * KB and its own scripts each, so a season's fixtures would be unusable on
 * a phone. The iframe is only created for the video actually clicked.
 */
export default function VideoEmbed({ url, title = "Video", className = "" }) {
  const [playing, setPlaying] = useState(false);
  const video = parseVideoUrl(url);
  if (!video) return null;

  if (playing) {
    return (
      <div className={`overflow-hidden rounded-xl border-4 border-ibc-accent shadow-md ${className}`}>
        <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={`${video.embedUrl}?autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            style={{ border: 0 }}
          />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play: ${title}`}
      className={`group relative block w-full overflow-hidden rounded-xl border-4 border-ibc-accent shadow-md ${className}`}
    >
      <div className="relative w-full bg-ibc-blue-dark" style={{ aspectRatio: "16 / 9" }}>
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition group-hover:opacity-90"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold uppercase tracking-wide text-white/70">
            {video.provider}
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-2xl text-white transition group-hover:scale-110 group-hover:bg-ibc-blue">
            ▶
          </span>
        </span>
      </div>
    </button>
  );
}
