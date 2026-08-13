import { NextResponse } from "next/server";
import { query, get, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const users = query(`
    SELECT u.id, u.name, u.email, u.role, u.active, u.player_id, u.created_at,
           p.first_name, p.last_name
    FROM users u
    LEFT JOIN players p ON p.id = u.player_id
    ORDER BY u.role DESC, u.name ASC
  `);
  return NextResponse.json(users);
}

export async function POST(request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { name, email, password, role, player_id } = await request.json();
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanRole = role === "admin" ? "admin" : "player";

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

  const already = get("SELECT id FROM users WHERE email = ?", [cleanEmail]);
  if (already) {
    return NextResponse.json({ error: "Un compte existe déjà avec cette adresse e-mail." }, { status: 409 });
  }

  const hash = await hashPassword(password);
  const { lastInsertRowid } = run(
    "INSERT INTO users (name, email, password_hash, role, player_id, active) VALUES (?, ?, ?, ?, ?, 1)",
    [cleanName, cleanEmail, hash, cleanRole, player_id || null]
  );

  return NextResponse.json({ ok: true, id: lastInsertRowid });
}
