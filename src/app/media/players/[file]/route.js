import { get } from "@/lib/db";
import { decodeDataUrl, photoVersion } from "@/lib/media";

export const dynamic = "force-dynamic";

// GET /media/players/12.jpg — a member's photo as a real image.
export async function GET(request, { params }) {
  const id = Number(String(params.file || "").replace(/\.[a-z]+$/i, ""));
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });

  // Only active members — a deactivated member's photo is not published.
  const row = get("SELECT photo_data_url FROM players WHERE id = ? AND active = 1", [id]);
  const decoded = decodeDataUrl(row?.photo_data_url);
  if (!decoded) return new Response("Not found", { status: 404 });

  const etag = `"${photoVersion(row.photo_data_url)}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(decoded.bytes, {
    headers: {
      "Content-Type": decoded.contentType,
      "Content-Length": String(decoded.bytes.length),
      ETag: etag,
      // Versioned URLs (?v=) never change content, so a long cache is safe;
      // without ?v= the ETag still revalidates cheaply.
      "Cache-Control": new URL(request.url).searchParams.get("v")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=300, must-revalidate",
    },
  });
}
