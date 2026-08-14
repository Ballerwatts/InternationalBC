import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const userCount = query("SELECT id FROM users LIMIT 1");

  return NextResponse.json({
    authenticated: !!session,
    role: session?.role || null,
    name: session?.name || null,
    team_id: session?.team_id ?? null,
    needsSetup: userCount.length === 0,
  });
}
