import type { VehicleConfiguration } from "@/types/vehicleConfiguration";

const KEY = "vehicle-configurations-v1";
const read = (): VehicleConfiguration[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as VehicleConfiguration[]; }
  catch { return []; }
};
const write = (items: VehicleConfiguration[]) => localStorage.setItem(KEY, JSON.stringify(items));
const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
export const getVehicleConfigurations = () => read();
export const getVehicleById = (id: string) => read().find((vehicle) => vehicle.id === id);
export const getVehicleExShowroomPrice = (id: string) => getVehicleById(id)?.exShowroomPrice;
export const searchVehicleConfigurations = (query: string) => {
  const q = norm(query);
  return read().filter((v) => !q || [v.brand, v.model, v.variant].some((part) => norm(part).includes(q)));
};
export function saveVehicleConfiguration(input: Omit<VehicleConfiguration, "id" | "createdAt" | "updatedAt">, id?: string) {
  const items = read();
  const duplicate = items.find((v) => v.id !== id && [v.brand, v.model, v.variant, v.fuelType, v.transmission].map(norm).join("|") === [input.brand, input.model, input.variant, input.fuelType, input.transmission].map(norm).join("|"));
  if (duplicate) throw new Error("This vehicle configuration already exists.");
  if (!input.brand.trim() || !input.model.trim() || !input.variant.trim() || !input.category.trim()) throw new Error("Complete all required vehicle details.");
  if (!Number.isFinite(input.exShowroomPrice) || input.exShowroomPrice < 0) throw new Error("Enter a valid non-negative Ex-Showroom Price.");
  const now = new Date().toISOString();
  const existing = id ? items.find((v) => v.id === id) : undefined;
  const saved: VehicleConfiguration = { ...input, brand: input.brand.trim(), model: input.model.trim(), variant: input.variant.trim(), category: input.category.trim(), id: id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now };
  write(existing ? items.map((v) => v.id === id ? saved : v) : [saved, ...items]);
  return saved;
}
export function deleteVehicleConfiguration(id: string) { write(read().filter((v) => v.id !== id)); }

export function importVehicleConfigurations(inputs: Omit<VehicleConfiguration, "id" | "createdAt" | "updatedAt">[]) {
  const current = read();
  const now = new Date().toISOString();
  const imported = inputs.map((input) => ({ ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }));
  write([...imported, ...current]);
  return imported;
}
