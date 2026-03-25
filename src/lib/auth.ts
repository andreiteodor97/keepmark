import { createHash } from "crypto";
import { nanoid, customAlphabet } from "nanoid";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { prisma } from "./db";
import type { User } from "@prisma/client";

const SESSION_COOKIE = "km_session";
const SESSION_MAX_AGE_DAYS = 30;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

const apiKeyNanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  32
);

/**
 * Create a new session for a user, return the session token.
 */
export async function createSession(userId: string): Promise<string> {
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Look up a session by token. Returns the userId and user if valid, null if expired or not found.
 * Deletes expired sessions encountered during lookup.
 */
export async function getSession(
  token: string
): Promise<{ userId: string; user: User } | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    // Session expired — clean it up
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return { userId: session.userId, user: session.user };
}

/**
 * Delete a session by token.
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

/**
 * SHA-256 hash of an API key.
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Generate a new API key with prefix "km_" + 32 alphanumeric chars.
 * Returns both the raw key (shown to user once) and its SHA-256 hash (stored in DB).
 */
export function generateApiKey(): { key: string; hash: string } {
  const key = `km_${apiKeyNanoid()}`;
  const hash = hashApiKey(key);
  return { key, hash };
}

/**
 * Look up a user by their API key. Hashes the key and matches against stored hash.
 */
export async function getUserFromApiKey(key: string): Promise<User | null> {
  const hash = hashApiKey(key);
  const user = await prisma.user.findUnique({
    where: { apiKeyHash: hash },
  });
  return user;
}

/**
 * Extract the authenticated user from a request.
 * Checks Bearer token (API key) first, then session cookie.
 */
export async function getUserFromRequest(
  req: Request
): Promise<User | null> {
  // 1. Check Authorization header for API key
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7).trim();
    if (apiKey) {
      const user = await getUserFromApiKey(apiKey);
      if (user) return user;
    }
  }

  // 2. Check session cookie
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const sessionToken = parseCookie(cookieHeader, SESSION_COOKIE);
    if (sessionToken) {
      const session = await getSession(sessionToken);
      if (session) return session.user;
    }
  }

  return null;
}

/**
 * Set the session cookie on the response. Call from server actions / route handlers.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60, // in seconds
  });
}

/**
 * Clear the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Get the current session token from cookies (for server components / actions).
 */
export async function getSessionFromCookies(): Promise<{
  userId: string;
  user: User;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSession(token);
}

/**
 * Send a magic link email to the given address.
 * Creates the user if they don't exist yet.
 */
export async function sendMagicLink(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  // Create or get user
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email: normalizedEmail },
    });
  }

  // Create magic link token
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

  await prisma.magicLink.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  // Send email via Resend
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify?token=${token}`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "Keepmark <onboarding@resend.dev>",
    to: normalizedEmail,
    subject: "Sign in to Keepmark",
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111; margin-bottom: 16px;">Sign in to Keepmark</h2>
        <p style="color: #555; line-height: 1.5;">
          Click the button below to sign in. This link expires in 15 minutes.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: #111; color: #fff; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; margin-top: 16px; font-weight: 500;">
          Sign in to Keepmark
        </a>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">
          If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}

/**
 * Verify a magic link token. Returns the userId if valid, null otherwise.
 * Marks the token as used.
 */
export async function verifyMagicLink(
  token: string
): Promise<string | null> {
  const magicLink = await prisma.magicLink.findUnique({
    where: { token },
  });

  if (!magicLink) return null;
  if (magicLink.used) return null;
  if (magicLink.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.magicLink
      .delete({ where: { id: magicLink.id } })
      .catch(() => {});
    return null;
  }

  // Mark as used
  await prisma.magicLink.update({
    where: { id: magicLink.id },
    data: { used: true },
  });

  return magicLink.userId;
}

/**
 * Parse a single cookie value from a cookie header string.
 */
function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${escapeRegExp(name)}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
