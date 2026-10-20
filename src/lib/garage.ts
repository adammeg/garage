import { ObjectId } from "mongodb";

export type ServiceRecord = { id: string; date: string; kind: string; mileage: number; notes: string; mechanic: string };
export type VehicleRecord = { id: string; plate: string; make: string; model: string; year: number; owner: string; phone: string; mileage: number; nextOil: number; status: "In service" | "Ready" | "Waiting"; arrived: string; history: ServiceRecord[] };

export function vehicleFromDocument(document: Record<string, unknown>): VehicleRecord {
  return {
    id: String(document._id), plate: String(document.plate), make: String(document.make), model: String(document.model),
    year: Number(document.year), owner: String(document.owner), phone: String(document.phone || ""), mileage: Number(document.mileage),
    nextOil: Number(document.nextOil), status: document.status as VehicleRecord["status"], arrived: String(document.arrived),
    history: Array.isArray(document.history) ? document.history as ServiceRecord[] : [],
  };
}

export function idFilter(id: string) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : null;
}

export function normalizePlate(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}
