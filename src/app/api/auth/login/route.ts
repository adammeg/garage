import { NextResponse } from "next/server";
import { createSession, ensureInitialAdmin, sessionCookieName, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  await ensureInitialAdmin();
  const { email, password } = await request.json();
  const user = await (await getDatabase()).collection("mechanics").findOne({ email: String(email || "").trim().toLowerCase() });
  if (!user || !user.active || !(await verifyPassword(String(password || ""), String(user.passwordHash || "")))) return NextResponse.json({ error: "Adresse e-mail ou mot de passe incorrect." }, { status: 401 });
  const session = await createSession(String(user._id));
  const response = NextResponse.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role, specialty: user.specialty } });
  response.cookies.set(sessionCookieName, session.token, { ...sessionCookieOptions, expires: session.expiresAt });
  return response;
}
