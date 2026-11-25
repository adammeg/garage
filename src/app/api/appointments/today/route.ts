import { garageLocalTime } from "@/lib/appointment-times";
import { getSessionUser } from "@/lib/auth";
import type { DailyBooking, DailySchedule } from "@/lib/daily-schedule";
import { getDatabase } from "@/lib/mongodb";
import { vehicleStatus } from "@/lib/vehicle-status";

type BookedVehicle = {
  plate: string; make?: string; model?: string; status?: string; bookingOnly?: boolean;
  appointmentSlots: string[]; appointmentReasons?: Record<string, string>;
};

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  if (!await getSessionUser()) {
    return Response.json({ error: "Veuillez vous connecter à l’atelier." }, { status: 401, headers });
  }

  const date = garageLocalTime().slice(0, 10);
  const start = date + "T00:00";
  const end = date + "T23:59";
  const vehicles = (await getDatabase()).collection<BookedVehicle>("vehicles");
  const bookedVehicles = await vehicles.find(
    { appointmentSlots: { $elemMatch: { $gte: start, $lte: end } } },
    { projection: { _id: 0, plate: 1, make: 1, model: 1, status: 1, bookingOnly: 1, appointmentSlots: 1, appointmentReasons: 1 } },
  ).toArray();

  const bookings: DailyBooking[] = [];
  for (const vehicle of bookedVehicles) {
    for (const slot of vehicle.appointmentSlots) {
      if (slot < start || slot > end) continue;
      bookings.push({
        slot, plate: vehicle.plate, model: vehicle.bookingOnly ? "Véhicule à enregistrer" : [vehicle.make, vehicle.model].filter(Boolean).join(" "),
        status: vehicle.bookingOnly ? null : vehicleStatus(vehicle.status), reason: vehicle.appointmentReasons?.[slot] ?? null,
      });
    }
  }
  bookings.sort((a, b) => a.slot.localeCompare(b.slot));
  return Response.json({ date, bookings } satisfies DailySchedule, { headers });
}
