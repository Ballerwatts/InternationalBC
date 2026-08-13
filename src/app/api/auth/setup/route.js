import { NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { hashPassword, createSessionCookie } from "@/lib/auth";

// One-time bootstrap: only works while there are no users at all yet.
// Creates the first account, always as 'admin'.
export const dynamic = "force-dynamic";

export async function POST(request) {
  const existing = query("SELECT id FROM users LIMIT 1");
  if (existing.length > 0) {
    return NextResponse.json({ error: "already_configured" }, { status: 409 });
  }

  const { name, email, password } = await request.json();
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanName) {
    return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });
  }
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return NextResponse.json({ error: "Une adresse e-mail valide est requise." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }

  const hash = await hashPassword(password);
  const { lastInsertRowid } = run(
    "INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, 'admin', 1)",
    [cleanName, cleanEmail, hash]
  );

  const user = { id: lastInsertRowid, role: "admin", name: cleanName };
  await createSessionCookie(user);

  return NextResponse.json({ ok: true, role: "admin" });
}
