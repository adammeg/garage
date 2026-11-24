export const statusLabels = {
  active: "Actif",
  maintenance: "En maintenance",
  inactive: "Inactif",
} as const;

export type VehicleStatus = keyof typeof statusLabels;

export function isVehicleStatus(value: unknown): value is VehicleStatus {
  return typeof value === "string" && Object.hasOwn(statusLabels, value);
}

export function vehicleStatus(value: unknown): VehicleStatus {
  if (isVehicleStatus(value)) return value;
  return value === "In service" ? "maintenance" : "active";
}
