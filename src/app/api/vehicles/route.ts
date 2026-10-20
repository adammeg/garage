import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { normalizePlate, vehicleFromDocument } from "@/lib/garage";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try { await requireSession(); } catch { return NextResponse.json({ error: "Non authentifié." }, { status: 401 }); }
  const database = await getDatabase();
  const vehicles = await database.collection("vehicles").find({}).sort({ arrived: -1 }).toArray();
  return NextResponse.json({ vehicles: vehicles.map((vehicle) => vehicleFromDocument(vehicle)) });
}

export async function POST(request: Request) {
  try { await requireSession(); } catch { return NextResponse.json({ error: "Non authentifié." }, { status: 401 }); }
  const body = await request.json();
  const plate = normalizePlate(String(body.plate || ""));
  if (!plate || !body.make || !body.model || !body.owner || !Number.isFinite(Number(body.mileage)) || !Number.isFinite(Number(body.nextOil))) {
    return NextResponse.json({ error: "Veuillez renseigner tous les champs obligatoires du véhicule." }, { status: 400 });
  }
  const database = await getDatabase();
  const existing = await database.collection("vehicles").findOne({ plateKey: plate.replace(/\s/g, "") });
  if (existing) return NextResponse.json({ error: "Un véhicule avec cette immatriculation existe déjà." }, { status: 409 });
  const vehicle = { plate, plateKey: plate.replace(/\s/g, ""), make: String(body.make).trim(), model: String(body.model).trim(), year: Number(body.year), owner: String(body.owner).trim(), phone: String(body.phone || "").trim(), mileage: Number(body.mileage), nextOil: Number(body.nextOil), status: "Waiting", arrived: new Date().toISOString().slice(0, 10), history: [] };
  const result = await database.collection("vehicles").insertOne(vehicle);
  return NextResponse.json({ vehicle: vehicleFromDocument({ ...vehicle, _id: result.insertedId }) }, { status: 201 });
}
