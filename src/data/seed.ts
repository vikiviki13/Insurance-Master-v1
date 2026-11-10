import type { Db } from "@/types/insurance";

export const DB_VERSION = 1;

/** Starts with empty configuration and business data; users add their own records. */
export function buildSeed(): Db {
  return {
    version: DB_VERSION,
    vehicleTypes: [],
    branches: [],
    zones: [],
    ccSlabs: [],
    ageRanges: [],
    addOns: [],
    policyStructures: [],
    rateMatrix: [],
    masters: [],
    vehicleCatalog: [],
  };
}
