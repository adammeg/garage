import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { hashPassword, requireSession } from "@/lib/auth";

export async function GET() {
  try { await requireSession(); } catch { return NextResponse.json({ error: "Non authentifié." }, { status: 401 }); }
  const mechanics = await (await getDatabase()).collection("mechanics").find({}, { projection: { password: 0 } }).sort({ name: 1 }).toArray();
  return NextResponse.json({ mechanics: mechanics.map((mechanic) => ({ id: String(mechanic._id), name: mechanic.name, email: mechanic.email, specialty: mechanic.specialty })) });
}

export async function POST(request: Request) {
  try { await requireSession(["admin"]); } catch { return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 }); }
  const body = await request.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const specialty = String(body.specialty || "").trim();
  const password = String(body.password || "");
  if (!name || !email || !specialty || password.length < 8) return NextResponse.json({ error: "Renseignez les informations et un mot de passe d’au moins 8 caractères." }, { status: 400 });
  const database = await getDatabase();
  if (await database.collection("mechanics").findOne({ email })) return NextResponse.json({ error: "Un mécanicien utilise déjà cette adresse e-mail." }, { status: 409 });
  const result = await database.collection("mechanics").insertOne({ name, email, specialty, passwordHash: await hashPassword(password), role: "mechanic", active: true, createdAt: new Date() });
  return NextResponse.json({ mechanic: { id: String(result.insertedId), name, email, specialty } }, { status: 201 });
}
