import type { VehicleStatus } from "./vehicle-status";

export type DailyBooking = {
  slot: string;
  plate: string;
  model: string;
  status: VehicleStatus | null;
  reason: string | null;
};

export type DailySchedule = { date: string; bookings: DailyBooking[] };
