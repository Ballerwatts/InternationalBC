import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { verifyPassword, createSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { email, password } = await request.json();
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
  }

  const user = get(
    "SELECT id, name, email, password_hash, role, team_id, active FROM users WHERE email = ?",
    [cleanEmail]
  );

  if (!user || !user.active) {
    return NextResponse.json({ error: "E-mail ou mot de passe incorrect." }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "E-mail ou mot de passe incorrect." }, { status: 401 });
  }

  await createSessionCookie({ id: user.id, role: user.role, name: user.name, team_id: user.team_id });
  return NextResponse.json({ ok: true, role: user.role });
}
