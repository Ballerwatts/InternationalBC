import { NextResponse } from "next/server";
import { destroySessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroySessionCookie();
  return NextResponse.json({ ok: true });
}
