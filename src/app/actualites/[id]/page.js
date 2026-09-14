import Link from "next/link";
import { notFound } from "next/navigation";
import { get } from "@/lib/db";
import NewsBlocks from "@/components/NewsBlocks";
import VideoEmbed from "@/components/VideoEmbed";
import PhotoZoom from "@/components/PhotoZoom";
import { pageMetadata, snippet } from "@/lib/seo";

export const dynamic = "force-dynamic";

function load(id) {
  return get("SELECT * FROM announcements WHERE id = ? AND published = 1", [Number(id)]);
}

export async function generateMetadata({ params }) {
  const item = load(params.id);
  if (!item) return { robots: { index: false } };
  return pageMetadata({
    title: item.title,
    description: snippet(item.body) || undefined,
    path: `/actualites/${item.id}/`,
    image: /^\//.test(item.image_data_url || "") ? item.image_data_url : undefined,
    type: "article",
  });
}

export default function NewsItemPage({ params }) {
  const item = load(params.id);
  if (!item) notFound();

  let blocks = [];
  try {
    blocks = JSON.parse(item.blocks_json || "[]");
  } catch {
    blocks = [];
  }

  let images = [];
  try {
    images = JSON.parse(item.images_json || "[]");
  } catch {
    images = [];
  }
  // The lead image is stored separately and shown first, then any extras.
  const gallery = [item.image_data_url, ...images].filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <Link
        href="/"
        className="text-xs font-bold uppercase tracking-wide text-ibc-blue hover:underline"
      >
        ← Back to the club
      </Link>

      <h1 className="mt-3 font-display text-3xl font-extrabold uppercase text-ibc-blue sm:text-4xl">
        {item.title}
      </h1>
      <p className="mt-1 text-xs uppercase tracking-wide text-ibc-ink/45">
        {String(item.created_at || "").slice(0, 10)}
      </p>

      {item.video_url && (
        <div className="mt-6">
          <VideoEmbed url={item.video_url} title={item.title} />
        </div>
      )}

      {gallery.length > 0 && (
        <div
          className={`mt-6 grid gap-3 ${gallery.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}
        >
          {gallery.map((src, i) => (
            <PhotoZoom key={i} src={src} alt="" className="w-full rounded-xl object-cover" />
          ))}
        </div>
      )}

      {item.body && (
        <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-ibc-ink/80">
          {item.body}
        </div>
      )}

      {/* Everything the newsletter said, not just its headline. */}
      <NewsBlocks blocks={blocks} />
    </article>
  );
}
