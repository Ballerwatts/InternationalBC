import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

/** Returns null if the request is authenticated as admin, otherwise a 401 response to return immediately. */
export async function requireAdmin() {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
