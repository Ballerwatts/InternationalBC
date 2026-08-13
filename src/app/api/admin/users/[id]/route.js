import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const existing = get("SELECT id FROM users WHERE id = ?", [params.id]);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await request.json();
  const updates = [];
  const values = [];

  if (typeof body.name === "string" && body.name.trim()) {
    updates.push("name = ?");
    values.push(body.name.trim());
  }
  if (typeof body.role === "string" && ["admin", "player"].includes(body.role)) {
    updates.push("role = ?");
    values.push(body.role);
  }
  if (typeof body.active === "boolean") {
    updates.push("active = ?");
    values.push(body.active ? 1 : 0);
  }
  if ("player_id" in body) {
    updates.push("player_id = ?");
    values.push(body.player_id || null);
  }
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 }
      );
    }
    updates.push("password_hash = ?");
    values.push(await hashPassword(body.password));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
  }

  values.push(params.id);
  run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await getSession();
  if (String(session.sub) === String(params.id)) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 400 }
    );
  }

  run("DELETE FROM users WHERE id = ?", [params.id]);
  return NextResponse.json({ ok: true });
}
