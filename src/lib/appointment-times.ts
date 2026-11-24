const garageClock = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Africa/Tunis",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function garageLocalTime(now = new Date()) {
  return garageClock.format(now).replace(" ", "T");
}

export function isBookingDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function appointmentSlots(date: string) {
  const slots: string[] = [];
  for (let hour = 9; hour < 17; hour++) {
    const prefix = date + "T" + String(hour).padStart(2, "0");
    slots.push(prefix + ":00", prefix + ":30");
  }
  return slots;
}
