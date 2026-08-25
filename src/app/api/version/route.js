import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

// Public on purpose — no secrets here, and being able to check the running
// version without logging in is the entire point.
export async function GET() {
  return NextResponse.json(APP_VERSION);
}
