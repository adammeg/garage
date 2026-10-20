import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const scrypt = promisify(scryptCallback);
const sessionCookie = "atelier_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 14;

export type SessionUser = { id: string; name: string; email: string; role: "admin" | "mechanic"; specialty?: string };

export async function ensureInitialAdmin() {
  const email = process.env.GARAGE_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.GARAGE_ADMIN_PASSWORD;
  if (!email || !password) return;
  const database = await getDatabase();
  await database.collection("mechanics").updateOne(
    { email },
    {
      $set: { passwordHash: await hashPassword(password), role: "admin", specialty: "Administration", active: true, updatedAt: new Date() },
      $setOnInsert: { name: "Administrateur", createdAt: new Date() },
    },
    { upsert: true },
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(Buffer.from(storedHash, "hex"), derived);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  await (await getDatabase()).collection("sessions").insertOne({ userId, tokenHash: tokenHash(token), expiresAt, createdAt: new Date() });
  return { token, expiresAt };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const database = await getDatabase();
  const session = await database.collection("sessions").findOne({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  if (!ObjectId.isValid(String(session.userId))) return null;
  const user = await database.collection("mechanics").findOne({ _id: new ObjectId(String(session.userId)) });
  if (!user || !user.active) return null;
  return { id: String(user._id), name: String(user.name), email: String(user.email), role: user.role === "admin" ? "admin" : "mechanic", specialty: String(user.specialty || "") };
}

export async function requireSession(roles?: SessionUser["role"][]) {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (roles && !roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (token) await (await getDatabase()).collection("sessions").deleteOne({ tokenHash: tokenHash(token) });
  cookieStore.delete(sessionCookie);
}

export const sessionCookieName = sessionCookie;
export const sessionCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
