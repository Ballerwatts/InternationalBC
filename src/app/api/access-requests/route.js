import { NextResponse } from "next/server";
import { query, get, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Public — anyone can ask for an account from /login. Nothing is created
// until a super-admin approves it from /admin/users.
export async function POST(request) {
  const { name, email, phone, message } = await request.json();
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanName || !cleanEmail || !cleanEmail.includes("@")) {
    return NextResponse.json({ error: "Nom et adresse e-mail valides requis." }, { status: 400 });
  }

  const existingUser = get("SELECT id FROM users WHERE email = ?", [cleanEmail]);
  if (existingUser) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cette adresse e-mail — connectez-vous directement." },
      { status: 409 }
    );
  }

  const existingPending = get(
    "SELECT id FROM access_requests WHERE email = ? AND status = 'pending'",
    [cleanEmail]
  );
  if (existingPending) {
    return NextResponse.json({ ok: true, note: "Votre demande est déjà en attente d'approbation." });
  }

  run(
    "INSERT INTO access_requests (name, email, phone, message, origin, status) VALUES (?, ?, ?, ?, 'request', 'pending')",
    [cleanName, cleanEmail, phone || null, message || null]
  );

  return NextResponse.json({ ok: true });
}

// Admin-only — the pending queue, shown on /admin/users.
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json(
    query("SELECT * FROM access_requests WHERE status = 'pending' ORDER BY created_at ASC")
  );
}
