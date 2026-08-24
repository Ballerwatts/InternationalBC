"use client";

import { useEffect, useRef } from "react";

/**
 * Renders hand-picked Instagram posts using Instagram's own embed script.
 *
 * How it works: each post is a <blockquote class="instagram-media"> carrying
 * the permalink; instagram.com/embed.js finds those blockquotes and swaps
 * each one for the real card. No API key, no token refresh, nothing
 * server-side. The blockquote itself is a readable fallback link, so if a
 * visitor blocks third-party scripts they still get a working link rather
 * than an empty hole.
 */
export default function InstagramGallery({ posts, title }) {
  const loaded = useRef(false);

  useEffect(() => {
    if (!posts?.length) return;

    function process() {
      // Re-running process() is what turns newly-rendered blockquotes into
      // cards — it is safe to call more than once.
      if (window.instgrm?.Embeds?.process) window.instgrm.Embeds.process();
    }

    if (window.instgrm) {
      process();
      return;
    }
    if (loaded.current) return;
    loaded.current = true;

    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = process;
    document.body.appendChild(script);
  }, [posts]);

  if (!posts?.length) return null;

  return (
    <section className="border-t border-black/5 bg-ibc-ink/[0.02] py-14">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center font-display text-2xl font-bold uppercase text-ibc-blue">
          {title || "Follow us on Instagram"}
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <div key={post.id} className="flex flex-col items-center">
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={post.post_url}
                data-instgrm-version="14"
                style={{
                  background: "#FFF",
                  border: 0,
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,.12)",
                  margin: 0,
                  maxWidth: "100%",
                  minWidth: "260px",
                  padding: 0,
                  width: "100%",
                }}
              >
                <a href={post.post_url} target="_blank" rel="noreferrer" className="block p-4 text-sm text-ibc-blue">
                  Voir la publication sur Instagram
                </a>
              </blockquote>
              {post.caption && (
                <p className="mt-2 text-center text-sm text-ibc-ink/70">{post.caption}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
