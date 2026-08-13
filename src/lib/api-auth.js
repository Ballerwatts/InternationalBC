import { NextResponse } from "next/server";
import { isAdmin, isAuthenticated, isStaff } from "@/lib/auth";

/** Returns null if the request is authenticated as (super-)admin, otherwise a 401 response to return immediately. */
export async function requireAdmin() {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/** Returns null if the request is authenticated as admin OR coach, otherwise a 401 response. */
export async function requireStaff() {
  const ok = await isStaff();
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/** Returns null if the request is authenticated as ANY user (admin, coach, or player), otherwise a 401 response. */
export async function requireUser() {
  const ok = await isAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
