import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ensurePlateIndex, normalizePlate, vehicleFromDocument } from "@/lib/garage";
import { MongoServerError } from "mongodb";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try { await requireSession(); } catch { return NextResponse.json({ error: "Non authentifié." }, { status: 401 }); }
  const database = await getDatabase();
  const vehicles = await database.collection("vehicles").find({ bookingOnly: { $ne: true } }).sort({ arrived: -1 }).toArray();
  return NextResponse.json({ vehicles: vehicles.map((vehicle) => vehicleFromDocument(vehicle)) });
}

export async function POST(request: Request) {
  try { await requireSession(); } catch { return NextResponse.json({ error: "Non authentifié." }, { status: 401 }); }
  const body = await request.json();
  const plate = normalizePlate(String(body.plate || ""));
  if (!plate || !body.make || !body.model || !Number.isFinite(Number(body.mileage)) || !Number.isFinite(Number(body.nextOil))) {
    return NextResponse.json({ error: "Veuillez renseigner tous les champs obligatoires du véhicule." }, { status: 400 });
  }
  const database = await getDatabase();
  const vehicles = database.collection("vehicles");
  await ensurePlateIndex(vehicles);
  const vehicle = { plate, plateKey: plate.replace(/\s/g, ""), make: String(body.make).trim(), model: String(body.model).trim(), year: Number(body.year), owner: String(body.owner).trim(), phone: String(body.phone || "").trim(), mileage: Number(body.mileage), nextOil: Number(body.nextOil), status: "active", arrived: new Date().toISOString().slice(0, 10), history: [] };
  // A first-time visitor's bookings stay on the same document at check-in.
  const guest = { plateKey: vehicle.plateKey, bookingOnly: true };
  const checkIn = { $set: vehicle, $unset: { bookingOnly: "" as const } };
  try {
    const result = await vehicles.findOneAndUpdate(guest, checkIn, { upsert: true, returnDocument: "after" });
    return NextResponse.json({ vehicle: vehicleFromDocument(result!) }, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000 && error.keyPattern?.plateKey) {
      const justBooked = await vehicles.findOneAndUpdate(guest, checkIn, { returnDocument: "after" });
      if (justBooked) return NextResponse.json({ vehicle: vehicleFromDocument(justBooked) }, { status: 201 });
      return NextResponse.json({ error: "Un véhicule avec cette immatriculation existe déjà." }, { status: 409 });
    }
    throw error;
  }
}
