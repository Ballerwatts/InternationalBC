import { query } from "@/lib/db";
import { buildIcsFeed } from "@/lib/ics";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = todayISO();
  const practices = query(
    "SELECT * FROM practices WHERE practice_date >= ? ORDER BY practice_date ASC",
    [today]
  );

  const ics = practices.length
    ? buildIcsFeed(practices)
    : "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//IBC Geneve//FR\r\nEND:VCALENDAR\r\n";

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="international-bc-geneve.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
