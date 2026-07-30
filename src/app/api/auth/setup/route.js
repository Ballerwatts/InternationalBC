import { NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";
import { hashPassword, createSessionCookie } from "@/lib/auth";

// One-time bootstrap: only works while no admin password has been set yet.
export const dynamic = "force-dynamic";

export async function POST(request) {
  const settings = getAllSettings();
  if (settings.admin_password_hash) {
    return NextResponse.json({ error: "already_configured" }, { status: 409 });
  }

  const { password } = await request.json();
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }

  const hash = await hashPassword(password);
  setSetting("admin_password_hash", hash);
  await createSessionCookie();

  return NextResponse.json({ ok: true });
}
