import { NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";
import { requireArea } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAllSettings());
}

export async function PUT(request) {
  const unauthorized = await requireArea("marketing", "finance");
  if (unauthorized) return unauthorized;

  const body = await request.json();
  // never allow overwriting the password hash through this generic endpoint
  delete body.admin_password_hash;

  for (const [key, value] of Object.entries(body)) {
    setSetting(key, value ?? "");
  }

  return NextResponse.json({ ok: true, settings: getAllSettings() });
}
