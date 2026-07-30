import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/db";
import { verifyPassword, createSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { password } = await request.json();
  const settings = getAllSettings();

  if (!settings.admin_password_hash) {
    return NextResponse.json({ error: "not_configured" }, { status: 409 });
  }

  const ok = await verifyPassword(password || "", settings.admin_password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  await createSessionCookie();
  return NextResponse.json({ ok: true });
}
