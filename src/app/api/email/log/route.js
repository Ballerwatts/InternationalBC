import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

// The delivery log. Recipient addresses live here, so this route is gated
// on the marketing area and never reachable from a public page.
export async function GET(request) {
  const denied = await requireArea("marketing");
  if (denied) return denied;

  const url = new URL(request.url);
  const where = [];
  const params = [];

  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("q");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (category) (where.push("category = ?"), params.push(category));
  if (status) (where.push("status = ?"), params.push(status));
  if (search) (where.push("(to_email LIKE ? OR subject LIKE ?)"), params.push(`%${search}%`, `%${search}%`));
  if (from) (where.push("created_at >= ?"), params.push(from));
  if (to) (where.push("created_at <= ?"), params.push(`${to} 23:59:59`));

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(Number(url.searchParams.get("limit") || 200), 1000);

  return NextResponse.json({
    rows: query(`SELECT * FROM email_log ${clause} ORDER BY created_at DESC, id DESC LIMIT ?`, [...params, limit]),
    counts: query(`SELECT status, COUNT(*) AS n FROM email_log ${clause} GROUP BY status`, params).reduce(
      (acc, r) => ({ ...acc, [r.status]: r.n }),
      {}
    ),
    total: query(`SELECT COUNT(*) AS n FROM email_log ${clause}`, params)[0].n,
  });
}
