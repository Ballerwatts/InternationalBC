import { NextResponse } from "next/server";
import { query, get, run } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireArea("marketing");
  if (denied) return denied;
  return NextResponse.json(query("SELECT * FROM site_pages ORDER BY path"));
}

// Edit one content page. The path is the page's public URL and is not
// editable here — changing it would break the address Google has indexed.
export async function PUT(request) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const { path, title, description, body } = await request.json();
  if (!get("SELECT path FROM site_pages WHERE path = ?", [path])) {
    return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  }
  if (!String(title || "").trim()) {
    return NextResponse.json({ error: "Le titre est requis." }, { status: 400 });
  }
  run(
    "UPDATE site_pages SET title = ?, description = ?, body = ?, updated_at = datetime('now') WHERE path = ?",
    [String(title).trim(), String(description || "").trim() || null, String(body || ""), path]
  );
  return NextResponse.json({ ok: true, page: get("SELECT * FROM site_pages WHERE path = ?", [path]) });
}
