import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Kicks off "Sign in with Google" — admin accounts only (see the callback
// route, which refuses to log in any email that isn't already a registered
// admin). Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — see .env.example.
export async function GET(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Google sign-in n'est pas configuré (GOOGLE_CLIENT_ID manquant)." },
      { status: 501 }
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(url.toString());
}
