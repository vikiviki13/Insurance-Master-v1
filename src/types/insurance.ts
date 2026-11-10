/**
 * Domain types for the Insurance Master module.
 *
 * Mapping to the Figma design:
 *  - Rate Matrix tab        -> RateMatrixEntry (one row per vehicle type + CC slab)
 *  - Vehicles tab           -> VehicleType
 *  - Zone tab               -> Zone (a zone groups branches)
 *  - CC Slab tab            -> CcSlab
 *  - Vehicle Model Age tab  -> VehicleAgeRange
 *  - Add-on Config          -> AddOn
 *  - Insurance Master cards -> InsuranceMaster (the OD / TP / add-on rules)
 */
export type ID = string;

export interface VehicleType {
  id: ID;
  name: string;
}

export interface Branch {
  id: ID;
  name: string;
}

export interface Zone {
  id: ID;
  name: string;
  vehicleTypeId: ID;
  branchIds: ID[];
  description?: string;
}

export interface CcSlab {
  id: ID;
  vehicleTypeId: ID;
  name: string;
  minCc: number;
  /** null = open ended ("above") */
  maxCc: number | null;
}

export interface VehicleAgeRange {
  id: ID;
  label: string;
  /** inclusive, in whole years */
  minAge: number;
  /** inclusive, null = open ended */
  maxAge: number | null;
}

export interface AddOn {
  id: ID;
  vehicleTypeId: ID;
  name: string;
  abbreviation: string;
  /** default rate, % of IDV */
  percentage: number;
  description: string;
}

/** e.g. "1 + 1" = 1 year Own Damage + 1 year Third Party. Extendable from the UI. */
export interface PolicyStructure {
  id: ID;
  name: string;
  odYears: number;
  tpYears: number;
}

/** Key used for an OD rate cell: `${zoneId}:${ageRangeId}` */
export type RateKey = string;
export const rateKey = (zoneId: ID, ageRangeId: ID): RateKey => `${zoneId}:${ageRangeId}`;

/**
 * One generated/edited row of the Rate Matrix.
 * OD rates are stored per (zone x vehicle age range) cell, as % of IDV.
 * TP / PA values are annual amounts in INR.
 */
export interface RateMatrixEntry {
  id: ID;
  vehicleTypeId: ID;
  ccSlabId: ID;
  odRates: Record<RateKey, number>;
  tpPremium: number;
  ownerPa: number;
  driverPa: number;
  /** per passenger seat, per year */
  seatersPaPerHead: number;
}

export interface AddOnLine {
  addOnId: ID;
  selected: boolean;
  /** % of IDV, editable per master */
  ratePercentage: number;
}

export interface InsuranceMaster {
  id: ID;
  name: string;
  insuranceCompany: string;
  vehicleTypeId: ID;
  status: "active" | "inactive";
  policyStructureId: ID;

  // On-damage
  idvPercentage: number;
  cngLpgEnabled: boolean;
  cngLpgLoadingPercentage: number;
  discountPercentage: number;

  // Third-party
  tpGstPercentage: number;
  lpgKitTpPremium: number;
  ownerPaApplicable: boolean;

  // Add-ons
  addOns: AddOnLine[];
  addOnGstPercentage: number;

  createdAt: string;
  updatedAt: string;
}

export type InsuranceMasterInput = Omit<InsuranceMaster, "id" | "createdAt" | "updatedAt">;

export type FuelType = "Petrol" | "Diesel" | "CNG" | "LPG";

/** Read-only vehicle catalogue (in production this is "Data from Sales"). */
export interface CatalogVehicle {
  id: ID;
  vehicleTypeId: ID;
  model: string;
  variant: string;
  fuelTypes: FuelType[];
  engineCc: number;
  seatingCapacity: number;
  exShowroomPrice: number;
  colors: string[];
}

export interface Db {
  version: number;
  vehicleTypes: VehicleType[];
  branches: Branch[];
  zones: Zone[];
  ccSlabs: CcSlab[];
  ageRanges: VehicleAgeRange[];
  addOns: AddOn[];
  policyStructures: PolicyStructure[];
  rateMatrix: RateMatrixEntry[];
  masters: InsuranceMaster[];
  vehicleCatalog: CatalogVehicle[];
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
