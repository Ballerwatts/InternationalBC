import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function randomPassword() {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-4);
}

// Approve or reject a pending access request (invitation/signup). Approving
// creates the real login (a `users` row) with a freshly generated
// temporary password, and — if SMTP is configured — emails the credentials
// to the requester. This is the "super-admin accepts the request" step.
export async function POST(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const reqRow = get("SELECT * FROM access_requests WHERE id = ?", [params.id]);
  if (!reqRow) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  if (reqRow.status !== "pending") {
    return NextResponse.json({ error: "cette demande a déjà été traitée" }, { status: 400 });
  }

  const { action } = await request.json();

  if (action === "reject") {
    run("UPDATE access_requests SET status = 'rejected', decided_at = datetime('now') WHERE id = ?", [
      params.id,
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action !== "approve") {
    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  }

  const already = get("SELECT id FROM users WHERE email = ?", [reqRow.email]);
  if (already) {
    run("UPDATE access_requests SET status = 'approved', decided_at = datetime('now') WHERE id = ?", [
      params.id,
    ]);
    return NextResponse.json({ ok: true, note: "Un compte existait déjà pour cette adresse." });
  }

  const tempPassword = randomPassword();
  const hash = await hashPassword(tempPassword);
  const { lastInsertRowid } = run(
    "INSERT INTO users (name, email, password_hash, role, player_id, active) VALUES (?, ?, ?, ?, ?, 1)",
    [reqRow.name, reqRow.email, hash, reqRow.role || "player", reqRow.player_id || null]
  );

  run("UPDATE access_requests SET status = 'approved', decided_at = datetime('now') WHERE id = ?", [
    params.id,
  ]);

  let emailed = false;
  try {
    await sendEmail({
      to: reqRow.email,
      subject: "Votre accès à l'espace équipe — International Basketball Club Genève",
      html: `<p>Bonjour ${reqRow.name},</p>
             <p>Votre demande d'accès a été approuvée. Voici vos identifiants :</p>
             <p><strong>E-mail :</strong> ${reqRow.email}<br/>
             <strong>Mot de passe temporaire :</strong> ${tempPassword}</p>
             <p>Connectez-vous sur le site du club (page « Connexion équipe ») pour accéder à
             l'espace équipe.</p>`,
      text: `Identifiants : ${reqRow.email} / ${tempPassword}`,
    });
    emailed = true;
  } catch {
    emailed = false;
  }

  // Always returned so the admin can share credentials manually if SMTP
  // isn't configured yet (dev mode / not set up).
  return NextResponse.json({ ok: true, id: lastInsertRowid, tempPassword, emailed });
}
