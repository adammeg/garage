import { MongoServerError } from "mongodb";
import { appointmentSlots, garageLocalTime, isBookingDate, isGarageClosed, MAX_APPOINTMENT_REASON_LENGTH } from "@/lib/appointment-times";
import { ensurePlateIndex, idFilter, normalizePlate } from "@/lib/garage";
import { getDatabase } from "@/lib/mongodb";

type VehicleSchedule = { plate?: string; plateKey?: string; bookingOnly?: boolean; appointmentSlots?: string[]; appointmentReasons?: Record<string, string> };

function missingVehicle() {
  return Response.json({ error: "Véhicule introuvable." }, { status: 404 });
}

export async function bookingAvailability(request: Request, id?: string) {
  const filter = id === undefined ? null : idFilter(id);
  if (id !== undefined && !filter) return missingVehicle();
  const date = new URL(request.url).searchParams.get("date");
  const now = garageLocalTime();
  if (!isBookingDate(date) || date < now.slice(0, 10)) {
    return Response.json({ error: "Choisissez la date du jour ou une date ultérieure." }, { status: 400 });
  }

  const vehicles = (await getDatabase()).collection<VehicleSchedule>("vehicles");
  const vehicle = filter ? await vehicles.findOne(filter, { projection: { appointmentSlots: 1, appointmentReasons: 1 } }) : null;
  if (filter && !vehicle) return missingVehicle();

  const slots = appointmentSlots(date).filter(slot => slot > now);
  const reservations = await vehicles.find({ appointmentSlots: { $in: slots } }, {
    projection: { _id: 0, appointmentSlots: { $setIntersection: ["$appointmentSlots", slots] } },
  }).toArray();
  const booked = new Set(reservations.flatMap(row => row.appointmentSlots ?? []));
  const upcoming = (vehicle?.appointmentSlots ?? []).filter(slot => slot >= now).sort();
  return Response.json({
    available: slots.filter(slot => !booked.has(slot)),
    upcoming,
    reasons: Object.fromEntries(upcoming.map(slot => [slot, vehicle?.appointmentReasons?.[slot] ?? null])),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function reserveAppointment(request: Request, id?: string) {
  const body = await request.json().catch(() => null);
  const plate = typeof body?.plate === "string" ? normalizePlate(body.plate) : "";
  const manual = id === undefined;
  if (manual && (!/[\p{L}\p{N}]/u.test(plate) || plate.length > 80)) {
    return Response.json({ error: "Indiquez une immatriculation valide." }, { status: 400 });
  }
  const plateKey = plate.replace(/\s/g, "");
  const filter = manual ? { plateKey } : idFilter(id);
  if (!filter) return missingVehicle();
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
  if (manual) {
    await ensurePlateIndex(vehicles);
    // Older imported records may have the displayed plate but no normalized key.
    if (!await vehicles.findOne({ plateKey }, { projection: { _id: 1 } })) {
      await vehicles.updateOne({
        plateKey: { $exists: false },
        $expr: { $eq: [
          { $replaceAll: { input: { $toUpper: "$plate" }, find: " ", replacement: "" } },
          { $literal: plateKey },
        ] },
      }, { $set: { plateKey } });
    }
  }
  const unbooked = { ...filter, appointmentSlots: { $ne: slot } };
  const update = {
    $addToSet: { appointmentSlots: slot },
    $set: { [`appointmentReasons.${slot}`]: reason },
    ...(manual ? { $setOnInsert: { plate, bookingOnly: true } } : {}),
  };
  try {
    const result = await vehicles.updateOne(
      unbooked, update, { upsert: manual },
    );
    if (result.modifiedCount || result.upsertedCount) return Response.json({ slot }, { status: 201 });
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
    // Simultaneous first bookings for one registration can race to insert its record.
    if (manual && error.keyPattern?.plateKey) {
      try {
        const retry = await vehicles.updateOne(unbooked, update);
        if (retry.modifiedCount) return Response.json({ slot }, { status: 201 });
      } catch (retryError) {
        if (!(retryError instanceof MongoServerError) || retryError.code !== 11000) throw retryError;
      }
    }
  }
  const vehicle = await vehicles.findOne(filter, { projection: { [`appointmentReasons.${slot}`]: 1 } });
  if (!manual && !vehicle) return missingVehicle();
  if (vehicle?.appointmentReasons?.[slot] === reason) return Response.json({ slot });
  return Response.json({ error: "Ce créneau est déjà réservé. Choisissez un autre horaire." }, { status: 409 });
}
