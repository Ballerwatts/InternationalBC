import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { createSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Only lets someone in if their Google account's email matches an existing
// admin account — this does NOT create new accounts. Admin accounts are
// still created the same way as always (direct creation, or an approved
// access request); Google just becomes an alternate way to log into one
// that already exists, once its email is linked.
export async function GET(request) {
  const origin = new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam || !code) {
    return NextResponse.redirect(`${origin}/login?google_error=1`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/login?google_error=not_configured`);
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error(`token exchange failed: ${await tokenRes.text()}`);
    const tokens = await tokenRes.json();

    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userinfoRes.ok) throw new Error("userinfo fetch failed");
    const profile = await userinfoRes.json(); // { sub, email, email_verified, name, ... }

    const email = (profile.email || "").toLowerCase();
    if (!profile.email_verified || !email) {
      return NextResponse.redirect(`${origin}/login?google_error=unverified`);
    }

    const user = get(
      "SELECT id, name, role, team_id, active FROM users WHERE email = ? AND role = 'admin'",
      [email]
    );
    if (!user || !user.active) {
      return NextResponse.redirect(`${origin}/login?google_error=no_admin_account`);
    }

    run("UPDATE users SET google_id = ? WHERE id = ?", [profile.sub, user.id]);
    await createSessionCookie({ id: user.id, role: user.role, name: user.name, team_id: user.team_id });

    return NextResponse.redirect(`${origin}/admin`);
  } catch {
    return NextResponse.redirect(`${origin}/login?google_error=1`);
  }
}
