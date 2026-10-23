import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { idFilter, normalizePlate, vehicleFromDocument } from "@/lib/garage";
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
  const database = await getDatabase();

  if (body.action === "update") {
    const plate = normalizePlate(String(body.plate || ""));
    const mileage = Number(body.mileage);
    const nextOil = Number(body.nextOil);
    const year = Number(body.year);
    const allowedStatuses = ["Waiting", "In service", "Ready"];
    if (!plate || !body.make || !body.model || !body.owner || !Number.isFinite(year) || !Number.isFinite(mileage) || !Number.isFinite(nextOil) || !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Veuillez renseigner les informations valides du véhicule." }, { status: 400 });
    }

    const duplicate = await database.collection("vehicles").findOne({ plateKey: plate.replace(/\s/g, ""), _id: { $ne: filter._id } });
    if (duplicate) return NextResponse.json({ error: "Un autre véhicule utilise déjà cette immatriculation." }, { status: 409 });

    const result = await database.collection("vehicles").findOneAndUpdate(
      filter,
      { $set: { plate, plateKey: plate.replace(/\s/g, ""), make: String(body.make).trim(), model: String(body.model).trim(), year, owner: String(body.owner).trim(), phone: String(body.phone || "").trim(), mileage, nextOil, status: body.status, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) return NextResponse.json({ error: "Véhicule introuvable." }, { status: 404 });
    return NextResponse.json({ vehicle: vehicleFromDocument(result) });
  }

  const mileage = Number(body.mileage);
  if (!body.kind || !Number.isFinite(mileage)) return NextResponse.json({ error: "Les informations de l’intervention sont incomplètes." }, { status: 400 });

  const existing = await database.collection("vehicles").findOne(filter);
  if (!existing) return NextResponse.json({ error: "Véhicule introuvable." }, { status: 404 });

  const service = { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), kind: String(body.kind), mileage, notes: String(body.notes || "").trim(), mechanic: user.role === "mechanic" ? user.name : String(body.mechanic || "Mécanicien").trim() };
  const nextOil = service.kind === "Oil & filter change" ? mileage + 10000 : Number(existing.nextOil);
  const update = { $set: { mileage, nextOil, status: body.ready ? "Ready" : "In service", updatedAt: new Date() }, $push: { history: { $each: [service], $position: 0 } } };
  await database.collection("vehicles").updateOne(filter, update as never);
  const vehicle = await database.collection("vehicles").findOne(filter);
  return NextResponse.json({ vehicle: vehicleFromDocument(vehicle!) });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); } catch { return NextResponse.json({ error: "Non authentifié." }, { status: 401 }); }
  const { id } = await params;
  const filter = idFilter(id);
  if (!filter) return NextResponse.json({ error: "Véhicule introuvable." }, { status: 404 });
  const result = await (await getDatabase()).collection("vehicles").deleteOne(filter);
  if (!result.deletedCount) return NextResponse.json({ error: "Véhicule introuvable." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
