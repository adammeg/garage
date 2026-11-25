import { bookingAvailability, reserveAppointment } from "@/lib/booking";

export function GET(request: Request) {
  return bookingAvailability(request);
}

export function POST(request: Request) {
  return reserveAppointment(request);
}
