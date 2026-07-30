import { get } from "@/lib/db";
import { buildIcsForOne } from "@/lib/ics";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const practice = get("SELECT * FROM practices WHERE id = ?", [params.id]);
  if (!practice) {
    return new Response("Not found", { status: 404 });
  }

  const ics = buildIcsForOne(practice);

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="mbc-${practice.id}.ics"`,
    },
  });
}
