// Login/session helpers: hashing passwords and issuing secure cookie sessions.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const COOKIE_NAME = "hfm_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Create a signed token and store it in an http-only cookie (safe from JS theft).
// `tokenVersion` is embedded so "log out everywhere" can invalidate old tokens.
export async function createSession(user: SessionUser, tokenVersion = 0) {
  const token = jwt.sign({ ...user, v: tokenVersion }, JWT_SECRET, { expiresIn: "30d" });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Read the current logged-in user from the cookie, or null if signed out.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionUser & { v?: number };
    // Confirm the user still exists, isn't suspended, and the token wasn't revoked.
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.suspended) return null;
    if ((payload.v ?? 0) !== user.tokenVersion) return null; // "logged out everywhere" since this token was issued
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

// Throws if not logged in (use inside protected API routes).
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireSeller(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "SELLER" && user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
