export type VehicleFuelType = "Petrol" | "Diesel" | "CNG" | "LPG" | "Electric" | "Hybrid";
export interface VehicleConfiguration {
  id: string;
  brand: string;
  model: string;
  variant: string;
  category: string;
  fuelType: VehicleFuelType;
  transmission: "Manual" | "Automatic";
  engineCc?: number;
  exShowroomPrice: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
