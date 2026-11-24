import { MongoServerError } from "mongodb";
import { appointmentSlots, garageLocalTime, isBookingDate, isGarageClosed, MAX_APPOINTMENT_REASON_LENGTH } from "@/lib/appointment-times";
import { idFilter } from "@/lib/garage";
import { getDatabase } from "@/lib/mongodb";

type Context = RouteContext<"/api/vehicles/[id]/appointments">;
type VehicleSchedule = { appointmentSlots?: string[]; appointmentReasons?: Record<string, string> };

function missingVehicle() {
  return Response.json({ error: "Véhicule introuvable." }, { status: 404 });
}

export async function GET(request: Request, context: Context) {
  const filter = idFilter((await context.params).id);
  if (!filter) return missingVehicle();
  const date = new URL(request.url).searchParams.get("date");
  const now = garageLocalTime();
  if (!isBookingDate(date) || date < now.slice(0, 10)) {
    return Response.json({ error: "Choisissez la date du jour ou une date ultérieure." }, { status: 400 });
  }

  const vehicles = (await getDatabase()).collection<VehicleSchedule>("vehicles");
  const vehicle = await vehicles.findOne(filter, { projection: { appointmentSlots: 1, appointmentReasons: 1 } });
  if (!vehicle) return missingVehicle();

  const slots = appointmentSlots(date).filter(slot => slot > now);
  const reservations = await vehicles.find({ appointmentSlots: { $in: slots } }, {
    projection: { _id: 0, appointmentSlots: { $setIntersection: ["$appointmentSlots", slots] } },
  }).toArray();
  const booked = new Set(reservations.flatMap(row => row.appointmentSlots ?? []));
  const upcoming = (vehicle.appointmentSlots ?? []).filter(slot => slot >= now).sort();
  return Response.json({
    available: slots.filter(slot => !booked.has(slot)),
    upcoming,
    reasons: Object.fromEntries(upcoming.map(slot => [slot, vehicle.appointmentReasons?.[slot] ?? null])),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, context: Context) {
  const filter = idFilter((await context.params).id);
  if (!filter) return missingVehicle();
  const body = await request.json().catch(() => null);
  const slot = body?.slot;
  const date = typeof slot === "string" ? slot.slice(0, 10) : null;
  if (isBookingDate(date) && isGarageClosed(date)) {
    return Response.json({ error: "Le garage est fermé le dimanche." }, { status: 400 });
  }
  if (!isBookingDate(date) || !appointmentSlots(date).includes(slot)) {
    return Response.json({ error: "Choisissez un créneau de 30 minutes entre 9 h et 17 h." }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason || reason.length > MAX_APPOINTMENT_REASON_LENGTH) {
    return Response.json({ error: `Indiquez le motif du rendez-vous (${MAX_APPOINTMENT_REASON_LENGTH} caractères maximum).` }, { status: 400 });
  }

  const vehicles = (await getDatabase()).collection<VehicleSchedule>("vehicles");
  // The unique multikey index reserves each slot garage-wide, including simultaneous requests.
  await vehicles.createIndex({ appointmentSlots: 1 }, { unique: true, sparse: true });
  if (slot <= garageLocalTime()) {
    return Response.json({ error: "Ce créneau est passé. Choisissez un autre horaire." }, { status: 409 });
  }
  try {
    const result = await vehicles.updateOne(
      { ...filter, appointmentSlots: { $ne: slot } },
      { $addToSet: { appointmentSlots: slot }, $set: { [`appointmentReasons.${slot}`]: reason } },
    );
    if (result.modifiedCount) return Response.json({ slot }, { status: 201 });

    const vehicle = await vehicles.findOne(filter, { projection: { [`appointmentReasons.${slot}`]: 1 } });
    if (!vehicle) return missingVehicle();
    if (vehicle.appointmentReasons?.[slot] === reason) return Response.json({ slot });
    return Response.json({ error: "Ce véhicule a déjà rendez-vous à cet horaire." }, { status: 409 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return Response.json({ error: "Ce créneau vient d’être réservé. Choisissez un autre horaire." }, { status: 409 });
    }
    throw error;
  }
}
