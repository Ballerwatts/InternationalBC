import { get } from "@/lib/db";
import { decodeDataUrl, photoVersion } from "@/lib/media";

export const dynamic = "force-dynamic";

// GET /media/sponsors/3.png — a sponsor's logo as a real, cacheable image.
export async function GET(request, { params }) {
  const id = Number(String(params.file || "").replace(/\.[a-z]+$/i, ""));
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });

  const row = get("SELECT logo_data_url FROM sponsors WHERE id = ?", [id]);
  const decoded = decodeDataUrl(row?.logo_data_url);
  if (!decoded) return new Response("Not found", { status: 404 });

  const etag = `"${photoVersion(row.logo_data_url)}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  return new Response(decoded.bytes, {
    headers: {
      "Content-Type": decoded.contentType,
      "Content-Length": String(decoded.bytes.length),
      ETag: etag,
      "Cache-Control": new URL(request.url).searchParams.get("v")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=300, must-revalidate",
    },
  });
}
