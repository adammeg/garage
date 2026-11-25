import { bookingAvailability, reserveAppointment } from "@/lib/booking";

type Context = RouteContext<"/api/vehicles/[id]/appointments">;

export async function GET(request: Request, context: Context) {
  return bookingAvailability(request, (await context.params).id);
}

export async function POST(request: Request, context: Context) {
  return reserveAppointment(request, (await context.params).id);
}
