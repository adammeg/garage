import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { idFilter, vehicleFromDocument } from "@/lib/garage";
import { requireSession } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filter = idFilter(id);
  if (!filter) return NextResponse.json({ error: "Véhicule introuvable." }, { status: 404 });
  const vehicle = await (await getDatabase()).collection("vehicles").findOne(filter);
  if (!vehicle) return NextResponse.json({ error: "Véhicule introuvable." }, { status: 404 });
  return NextResponse.json({ vehicle: vehicleFromDocument(vehicle) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireSession(); } catch { return NextResponse.json({ error: "Non authentifié." }, { status: 401 }); }
  const { id } = await params;
  const filter = idFilter(id);
  if (!filter) return NextResponse.json({ error: "Véhicule introuvable." }, { status: 404 });
  const body = await request.json();
  const mileage = Number(body.mileage);
  if (!body.kind || !Number.isFinite(mileage)) return NextResponse.json({ error: "Les informations de l’intervention sont incomplètes." }, { status: 400 });
  const database = await getDatabase();
  const existing = await database.collection("vehicles").findOne(filter);
  if (!existing) return NextResponse.json({ error: "Véhicule introuvable." }, { status: 404 });
  const service = { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), kind: String(body.kind), mileage, notes: String(body.notes || "").trim(), mechanic: user.role === "mechanic" ? user.name : String(body.mechanic || "Mécanicien").trim() };
  const nextOil = service.kind === "Oil & filter change" ? mileage + 10000 : Number(existing.nextOil);
  const update = { $set: { mileage, nextOil, status: body.ready ? "Ready" : "In service", updatedAt: new Date() }, $push: { history: { $each: [service], $position: 0 } } };
  await database.collection("vehicles").updateOne(filter, update as never);
  const vehicle = await database.collection("vehicles").findOne(filter);
  return NextResponse.json({ vehicle: vehicleFromDocument(vehicle!) });
}
