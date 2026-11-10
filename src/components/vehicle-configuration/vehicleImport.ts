import * as XLSX from "xlsx";
import type { VehicleConfiguration, VehicleFuelType } from "@/types/vehicleConfiguration";
import * as service from "@/services/vehicleConfigurationService";

export const IMPORT_COLUMNS = ["brand", "model", "variant", "category", "fuelType", "transmission", "engineCc", "exShowroomPrice", "status"] as const;
export type ImportRow = { row: number; data?: Omit<VehicleConfiguration, "id" | "createdAt" | "updatedAt">; errors: string[]; duplicate: boolean };
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const key = (v: { brand: string; model: string; variant: string; fuelType: string; transmission: string }) => [v.brand, v.model, v.variant, v.fuelType, v.transmission].map(normalize).join("|");

export async function parseVehicleFile(file: File): Promise<ImportRow[]> {
  const bytes = await file.arrayBuffer();
  const book = XLSX.read(bytes, { type: "array" });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) throw new Error("The uploaded file has no worksheet.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headers = (matrix[0] ?? []).map((v) => normalize(String(v)));
  const missing = IMPORT_COLUMNS.filter((name) => !headers.includes(name));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);
  const existing = new Set(service.getVehicleConfigurations().map(key));
  const seen = new Set<string>();
  return matrix.slice(1).map((cells, index) => {
    const row: Record<string, string> = {};
    IMPORT_COLUMNS.forEach((field) => { const col = headers.indexOf(field); row[field] = String(cells[col] ?? "").trim(); });
    const errors: string[] = [];
    for (const field of ["brand", "model", "variant", "category", "fuelType", "transmission", "exShowroomPrice", "status"] as const) if (!row[field]) errors.push(`${field} is required`);
    const fuel = row.fuelType.toLowerCase();
    const fuels: VehicleFuelType[] = ["Petrol", "Diesel", "CNG", "LPG", "Electric", "Hybrid"];
    const fuelType = fuels.find((v) => v.toLowerCase() === fuel);
    if (row.fuelType && !fuelType) errors.push("fuelType must be Petrol, Diesel, CNG, LPG, Electric, or Hybrid");
    const transmission = ["Manual", "Automatic"].find((v) => v.toLowerCase() === row.transmission.toLowerCase());
    if (row.transmission && !transmission) errors.push("transmission must be Manual or Automatic");
    const status = ["active", "inactive"].find((v) => v === row.status.toLowerCase());
    if (row.status && !status) errors.push("status must be active or inactive");
    const price = Number(row.exShowroomPrice.replace(/[₹,\s]/g, ""));
    if (row.exShowroomPrice && (!Number.isFinite(price) || price < 0)) errors.push("exShowroomPrice must be a non-negative number");
    const cc = row.engineCc ? Number(row.engineCc) : undefined;
    if (row.engineCc && (!Number.isFinite(cc) || cc! < 0)) errors.push("engineCc must be a non-negative number");
    const candidate: { brand: string; model: string; variant: string; fuelType: VehicleFuelType; transmission: "Manual" | "Automatic" } = { brand: row.brand, model: row.model, variant: row.variant, fuelType: fuelType ?? "Petrol", transmission: (transmission ?? "Manual") as "Manual" | "Automatic" };
    const identity = key(candidate);
    const duplicate = existing.has(identity) || seen.has(identity);
    if (duplicate) seen.add(identity); else if (!errors.length) seen.add(identity);
    return { row: index + 2, errors, duplicate, data: errors.length || duplicate ? undefined : { ...candidate, category: row.category, engineCc: cc, exShowroomPrice: price, status: status as "active" | "inactive" } };
  }).filter((r) => r.data || r.errors.length || r.duplicate);
}

export function downloadVehicleTemplate(format: "csv" | "xlsx") {
  const samples = [
    ["Hyundai", "Creta", "SX (O)", "SUV", "Petrol", "Automatic", 1497, 1750000, "active"],
    ["Tata", "Nexon EV", "Empowered+", "SUV", "Electric", "Automatic", "", 1950000, "active"],
    ["Maruti Suzuki", "Baleno", "Alpha", "Hatchback", "Petrol", "Manual", 1197, 950000, "active"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet([[...IMPORT_COLUMNS], ...samples]);
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Vehicles");
  if (format === "xlsx") XLSX.writeFile(book, "vehicle-import-template.xlsx");
  else {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "vehicle-import-template.csv"; link.click(); URL.revokeObjectURL(url);
  }
}
