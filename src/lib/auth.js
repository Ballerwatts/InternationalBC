import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "ibc_session";
const ALG = "HS256";

function getSecret() {
  const secret = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

// user = { id, role, name } — role is 'admin' or 'player'.
export async function createSessionCookie(user) {
  const token = await new SignJWT({ sub: user.id, role: user.role, name: user.name })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload; // { sub, role, name }
  } catch {
    return null;
  }
}

/** Any logged-in user — admin or player. */
export async function isAuthenticated() {
  return !!(await getSession());
}

/** Admin-only areas (hero, announcements, players, budget, schedule). */
export async function isAdmin() {
  const session = await getSession();
  return !!session && session.role === "admin";
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
