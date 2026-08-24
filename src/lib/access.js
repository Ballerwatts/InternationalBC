// Server-side permission lookups for the grouped admin sections.
//
// The granted areas are read from the database on every check rather than
// from the session JWT: a session cookie lasts 30 days, so baking the areas
// into the token would mean a permission you revoke today keeps working for
// a month. This costs one indexed row read per request — worth it.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { get } from "@/lib/db";
import { accountHasAnyArea, accountHasArea, parseAreas } from "@/lib/admin-areas";

/**
 * { id, role, name, team_id, admin_areas, areas[] } for the logged-in user,
 * or null. Returns null for a deactivated account even if the cookie is
 * still valid — deactivating someone should lock them out immediately.
 */
export async function getAccount() {
  const session = await getSession();
  if (!session) return null;
  const row = get(
    "SELECT id, name, email, role, team_id, player_id, admin_areas, active FROM users WHERE id = ?",
    [session.sub]
  );
  if (!row || !row.active) return null;
  return { ...row, areas: parseAreas(row.admin_areas) };
}

/** Super-admin, or someone granted at least one area — i.e. may open /admin. */
export async function canAccessAdmin() {
  return accountHasAnyArea(await getAccount());
}

export async function canAccessArea(area) {
  return accountHasArea(await getAccount(), area);
}

/** True if the account holds ANY of the listed areas (or is super-admin). */
export async function canAccessAnyOf(areas) {
  const account = await getAccount();
  return areas.some((a) => accountHasArea(account, a));
}

/**
 * Route-handler guard. Returns null when allowed, otherwise the 401 to
 * return immediately — same shape as requireAdmin() in api-auth.js.
 *
 *   const denied = await requireArea("finance");
 *   if (denied) return denied;
 */
export async function requireArea(...areas) {
  const ok = await canAccessAnyOf(areas);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
