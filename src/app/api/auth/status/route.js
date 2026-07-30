import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAllSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = getAllSettings();
  return NextResponse.json({
    authenticated: await isAdmin(),
    needsSetup: !settings.admin_password_hash,
  });
}
