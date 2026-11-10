/**
 * Data-access layer for the Insurance Master module.
 *
 * Today this persists to localStorage. Every public function is async and returns plain data,
 * so replacing it with real HTTP calls only means rewriting this file (the UI never touches storage).
 * Business-rule validation (duplicates, overlaps, ranges) lives here so it is enforced for any caller.
 */
import { buildSeed, DB_VERSION } from "@/data/seed";
import type {
  AddOn, Branch, CcSlab, Db, ID, InsuranceMaster, InsuranceMasterInput, PolicyStructure, RateMatrixEntry,
  VehicleAgeRange, VehicleType, Zone,
} from "@/types/insurance";
import { uid, sleep } from "@/lib/utils";
import {
  checkAmount, checkPercent, checkRange, describeRange, findOverlap, normalize, ValidationError,
} from "@/lib/validation";

const STORAGE_KEY = "insurance-master-db-v1";
const LATENCY_MS = 220; // simulated network latency so loading states are visible

// ------------------------------------------------------------------ storage
export function loadDb(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Db;
      if (parsed?.version === DB_VERSION) return parsed;
    }
  } catch {
    /* corrupted storage -> fall through and reseed */
  }
  const seed = buildSeed();
  saveDb(seed);
  return seed;
}

function saveDb(db: Db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    throw new Error("Could not save data – browser storage is full or unavailable.");
  }
}

async function mutate(fn: (db: Db) => void): Promise<Db> {
  await sleep(LATENCY_MS);
  const db = structuredClone(loadDb());
  fn(db);
  saveDb(db);
  return db;
}

const fail = (msg: string): never => {
  throw new ValidationError(msg);
};
const need = (cond: unknown, msg: string) => {
  if (!cond) fail(msg);
};

// ------------------------------------------------------------------ queries
export async function fetchDb(): Promise<Db> {
  await sleep(LATENCY_MS);
  return loadDb();
}

export async function resetDemoData(): Promise<Db> {
  await sleep(LATENCY_MS);
  const seed = buildSeed();
  saveDb(seed);
  return seed;
}

// ------------------------------------------------------------------ vehicle types
export async function saveVehicleType(input: { id?: ID; name: string }): Promise<Db> {
  return mutate((db) => {
    const name = input.name.trim();
    need(name, "Vehicle type name is required");
    need(!db.vehicleTypes.some((v) => v.id !== input.id && normalize(v.name) === normalize(name)), `Vehicle type "${name}" already exists`);
    if (input.id) {
      const v = db.vehicleTypes.find((x) => x.id === input.id);
      need(v, "Vehicle type not found");
      (v as VehicleType).name = name;
    } else db.vehicleTypes.push({ id: uid("vt"), name });
  });
}

export async function deleteVehicleType(id: ID): Promise<Db> {
  return mutate((db) => {
    const used =
      db.zones.some((z) => z.vehicleTypeId === id) || db.ccSlabs.some((s) => s.vehicleTypeId === id) ||
      db.addOns.some((a) => a.vehicleTypeId === id) || db.masters.some((m) => m.vehicleTypeId === id);
    need(!used, "This vehicle type is in use by zones, CC slabs, add-ons or insurance masters. Remove those first.");
    db.vehicleTypes = db.vehicleTypes.filter((v) => v.id !== id);
    db.rateMatrix = db.rateMatrix.filter((r) => r.vehicleTypeId !== id);
  });
}

// ------------------------------------------------------------------ zones
export async function saveBranch(input: { id?: ID; name: string }): Promise<Db> {
  return mutate((db) => {
    const name = input.name.trim();
    need(name, "Branch name is required");
    need(!db.branches.some((b) => b.id !== input.id && normalize(b.name) === normalize(name)), `Branch "${name}" already exists`);
    if (input.id) {
      const branch = db.branches.find((b) => b.id === input.id);
      need(branch, "Branch not found");
      (branch as Branch).name = name;
    } else db.branches.push({ id: uid("br"), name });
  });
}

export async function deleteBranch(id: ID): Promise<Db> {
  return mutate((db) => {
    need(!db.zones.some((z) => z.branchIds.includes(id)), "This branch is assigned to a zone. Remove it from the zone first.");
    db.branches = db.branches.filter((b) => b.id !== id);
  });
}

// ------------------------------------------------------------------ zones
export interface ZoneInput { id?: ID; name: string; vehicleTypeId: ID; branchIds: ID[]; description?: string }
export async function saveZone(input: ZoneInput): Promise<Db> {
  return mutate((db) => {
    const name = input.name.trim();
    need(name, "Zone name is required");
    need(input.vehicleTypeId, "Vehicle type is required");
    need(input.branchIds.length > 0, "Select at least one applicable branch");
    const siblings = db.zones.filter((z) => z.vehicleTypeId === input.vehicleTypeId && z.id !== input.id);
    need(!siblings.some((z) => normalize(z.name) === normalize(name)), `Zone "${name}" already exists for this vehicle type`);
    for (const bid of input.branchIds) {
      const clash = siblings.find((z) => z.branchIds.includes(bid));
      if (clash) fail(`Branch "${db.branches.find((b) => b.id === bid)?.name}" is already part of ${clash.name}`);
    }
    if (input.id) {
      const z = db.zones.find((x) => x.id === input.id);
      need(z, "Zone not found");
      Object.assign(z as Zone, { name, vehicleTypeId: input.vehicleTypeId, branchIds: input.branchIds, description: input.description });
    } else db.zones.push({ id: uid("z"), name, vehicleTypeId: input.vehicleTypeId, branchIds: input.branchIds, description: input.description });
  });
}

export async function deleteZone(id: ID): Promise<Db> {
  return mutate((db) => {
    db.zones = db.zones.filter((z) => z.id !== id);
    // cascade: drop the zone's columns from every generated row
    db.rateMatrix.forEach((r) => Object.keys(r.odRates).forEach((k) => k.startsWith(`${id}:`) && delete r.odRates[k]));
  });
}

// ------------------------------------------------------------------ CC slabs
export interface CcSlabInput { id?: ID; vehicleTypeId: ID; name: string; minCc: number | null; maxCc: number | null }
export async function saveCcSlab(input: CcSlabInput): Promise<Db> {
  return mutate((db) => {
    const name = input.name.trim();
    need(input.vehicleTypeId, "Vehicle type is required");
    need(name, "Slab name is required");
    const rangeErr = checkRange(input.minCc, input.maxCc, "CC");
    if (rangeErr) fail(rangeErr);
    const range = { min: input.minCc as number, max: input.maxCc };
    const siblings = db.ccSlabs.filter((s) => s.vehicleTypeId === input.vehicleTypeId && s.id !== input.id);
    need(!siblings.some((s) => normalize(s.name) === normalize(name)), `CC slab "${name}" already exists for this vehicle type`);
    const clash = findOverlap(siblings, range, (s) => ({ min: s.minCc, max: s.maxCc }));
    if (clash) fail(`CC range overlaps with "${clash.name}" (${describeRange({ min: clash.minCc, max: clash.maxCc }, " CC")})`);
    if (input.id) {
      const s = db.ccSlabs.find((x) => x.id === input.id);
      need(s, "CC slab not found");
      Object.assign(s as CcSlab, { name, vehicleTypeId: input.vehicleTypeId, minCc: range.min, maxCc: range.max });
    } else db.ccSlabs.push({ id: uid("cc"), vehicleTypeId: input.vehicleTypeId, name, minCc: range.min, maxCc: range.max });
  });
}

export async function deleteCcSlab(id: ID): Promise<Db> {
  return mutate((db) => {
    db.ccSlabs = db.ccSlabs.filter((s) => s.id !== id);
    db.rateMatrix = db.rateMatrix.filter((r) => r.ccSlabId !== id);
  });
}

// ------------------------------------------------------------------ vehicle age ranges
export interface AgeRangeInput { id?: ID; label: string; minAge: number | null; maxAge: number | null }
export async function saveAgeRange(input: AgeRangeInput): Promise<Db> {
  return mutate((db) => {
    const label = input.label.trim();
    need(label, "Label is required");
    const rangeErr = checkRange(input.minAge, input.maxAge, "Year");
    if (rangeErr) fail(rangeErr);
    need(Number.isInteger(input.minAge) && (input.maxAge == null || Number.isInteger(input.maxAge)), "Years must be whole numbers");
    const range = { min: input.minAge as number, max: input.maxAge };
    const siblings = db.ageRanges.filter((a) => a.id !== input.id);
    need(!siblings.some((a) => normalize(a.label) === normalize(label)), `Label "${label}" already exists`);
    const clash = findOverlap(siblings, range, (a) => ({ min: a.minAge, max: a.maxAge }));
    if (clash) fail(`Year range overlaps with "${clash.label}" (${describeRange({ min: clash.minAge, max: clash.maxAge }, " yr")})`);
    if (input.id) {
      const a = db.ageRanges.find((x) => x.id === input.id);
      need(a, "Vehicle age range not found");
      Object.assign(a as VehicleAgeRange, { label, minAge: range.min, maxAge: range.max });
    } else db.ageRanges.push({ id: uid("age"), label, minAge: range.min, maxAge: range.max });
  });
}

export async function deleteAgeRange(id: ID): Promise<Db> {
  return mutate((db) => {
    db.ageRanges = db.ageRanges.filter((a) => a.id !== id);
    db.rateMatrix.forEach((r) => Object.keys(r.odRates).forEach((k) => k.endsWith(`:${id}`) && delete r.odRates[k]));
  });
}

// ------------------------------------------------------------------ add-ons
export interface AddOnInputT { id?: ID; vehicleTypeId: ID; name: string; abbreviation: string; percentage: number | null; description: string }
export async function saveAddOn(input: AddOnInputT): Promise<Db> {
  return mutate((db) => {
    const name = input.name.trim();
    const abbreviation = input.abbreviation.trim().toUpperCase();
    need(input.vehicleTypeId, "Vehicle type is required");
    need(name, "Add-on name is required");
    need(abbreviation, "Abbreviation is required");
    const pctErr = checkPercent("Percentage", input.percentage);
    if (pctErr) fail(pctErr);
    need(input.description.trim(), "Description is required");
    const siblings = db.addOns.filter((a) => a.vehicleTypeId === input.vehicleTypeId && a.id !== input.id);
    need(!siblings.some((a) => normalize(a.name) === normalize(name)), `Add-on "${name}" already exists for this vehicle type`);
    need(!siblings.some((a) => a.abbreviation === abbreviation), `Abbreviation "${abbreviation}" is already used`);
    const data = { vehicleTypeId: input.vehicleTypeId, name, abbreviation, percentage: input.percentage as number, description: input.description.trim() };
    if (input.id) {
      const a = db.addOns.find((x) => x.id === input.id);
      need(a, "Add-on not found");
      Object.assign(a as AddOn, data);
    } else db.addOns.push({ id: uid("ao"), ...data });
  });
}

export async function deleteAddOn(id: ID): Promise<Db> {
  return mutate((db) => {
    db.addOns = db.addOns.filter((a) => a.id !== id);
    db.masters.forEach((m) => (m.addOns = m.addOns.filter((l) => l.addOnId !== id)));
  });
}

// ------------------------------------------------------------------ policy structures
export interface PolicyStructureInput { id?: ID; name: string; odYears: number | null; tpYears: number | null }
export async function savePolicyStructure(input: PolicyStructureInput): Promise<Db> {
  return mutate((db) => {
    const name = input.name.trim();
    need(name, "Name is required");
    for (const [label, v] of [["Own damage years", input.odYears], ["Third party years", input.tpYears]] as const) {
      need(v != null && Number.isInteger(v) && v >= 1 && v <= 10, `${label} must be a whole number between 1 and 10`);
    }
    need(!db.policyStructures.some((p) => p.id !== input.id && normalize(p.name) === normalize(name)), `Policy structure "${name}" already exists`);
    const data = { name, odYears: input.odYears as number, tpYears: input.tpYears as number };
    if (input.id) {
      const p = db.policyStructures.find((x) => x.id === input.id);
      need(p, "Policy structure not found");
      Object.assign(p as PolicyStructure, data);
    } else db.policyStructures.push({ id: uid("ps"), ...data });
  });
}

export async function deletePolicyStructure(id: ID): Promise<Db> {
  return mutate((db) => {
    need(!db.masters.some((m) => m.policyStructureId === id), "This policy structure is used by an insurance master");
    db.policyStructures = db.policyStructures.filter((p) => p.id !== id);
  });
}

// ------------------------------------------------------------------ rate matrix
export interface RateEntryInput extends Omit<RateMatrixEntry, "id"> { id?: ID }

export async function saveRateEntry(input: RateEntryInput): Promise<Db> {
  return mutate((db) => {
    need(input.vehicleTypeId, "Vehicle type is required");
    need(input.ccSlabId, "CC slab is required");
    need(db.ccSlabs.some((s) => s.id === input.ccSlabId && s.vehicleTypeId === input.vehicleTypeId), "CC slab does not belong to this vehicle type");
    need(!db.rateMatrix.some((r) => r.id !== input.id && r.ccSlabId === input.ccSlabId), "A rate row already exists for this CC slab – edit it instead");
    for (const [k, v] of Object.entries(input.odRates)) {
      const e = checkPercent("OD rate", v);
      if (e) fail(`${e} (${k.split(":")[0]})`);
    }
    for (const [label, v] of [["TP", input.tpPremium], ["Owner PA", input.ownerPa], ["Driver PA", input.driverPa], ["Seaters PA", input.seatersPaPerHead]] as const) {
      const e = checkAmount(label, v);
      if (e) fail(e);
    }
    const data = {
      vehicleTypeId: input.vehicleTypeId, ccSlabId: input.ccSlabId, odRates: input.odRates,
      tpPremium: input.tpPremium, ownerPa: input.ownerPa, driverPa: input.driverPa, seatersPaPerHead: input.seatersPaPerHead,
    };
    if (input.id) {
      const r = db.rateMatrix.find((x) => x.id === input.id);
      need(r, "Rate row not found");
      Object.assign(r as RateMatrixEntry, data);
    } else db.rateMatrix.push({ id: uid("rm"), ...data });
  });
}

export async function deleteRateEntry(id: ID): Promise<Db> {
  return mutate((db) => {
    db.rateMatrix = db.rateMatrix.filter((r) => r.id !== id);
  });
}

/**
 * "Generate matrix": makes the stored rows match the current zones x CC slabs x vehicle ages.
 * Missing rows are created (rates 0), stale cells (deleted zones/ages) are dropped, existing values are kept.
 */
export async function syncRateMatrix(vehicleTypeId: ID): Promise<{ db: Db; created: number; cellsAdded: number }> {
  let created = 0;
  let cellsAdded = 0;
  const db = await mutate((d) => {
    const zones = d.zones.filter((z) => z.vehicleTypeId === vehicleTypeId);
    const slabs = d.ccSlabs.filter((s) => s.vehicleTypeId === vehicleTypeId);
    for (const slab of slabs) {
      let row = d.rateMatrix.find((r) => r.ccSlabId === slab.id);
      if (!row) {
        row = { id: uid("rm"), vehicleTypeId, ccSlabId: slab.id, odRates: {}, tpPremium: 0, ownerPa: 0, driverPa: 0, seatersPaPerHead: 0 };
        d.rateMatrix.push(row);
        created++;
      }
      const valid = new Set<string>();
      for (const z of zones) for (const a of d.ageRanges) {
        const k = `${z.id}:${a.id}`;
        valid.add(k);
        if (row.odRates[k] == null) { row.odRates[k] = 0; cellsAdded++; }
      }
      Object.keys(row.odRates).forEach((k) => !valid.has(k) && delete row!.odRates[k]);
    }
  });
  return { db, created, cellsAdded };
}

// ------------------------------------------------------------------ insurance masters
function validateMaster(db: Db, input: InsuranceMasterInput, id?: ID) {
  need(input.name.trim(), "Insurance name is required");
  need(db.vehicleTypes.some((v) => v.id === input.vehicleTypeId), "Vehicle type is required");
  need(db.policyStructures.some((p) => p.id === input.policyStructureId), "Policy duration is required");
  need(!db.masters.some((m) => m.id !== id && normalize(m.name) === normalize(input.name)), `An insurance master named "${input.name.trim()}" already exists`);
  const checks = [
    checkPercent("IDV percentage", input.idvPercentage),
    checkPercent("CNG/LPG loading", input.cngLpgEnabled ? input.cngLpgLoadingPercentage : 0),
    checkPercent("Discount", input.discountPercentage),
    checkPercent("TP GST percentage", input.tpGstPercentage),
    checkPercent("Add-on GST percentage", input.addOnGstPercentage),
    checkAmount("LPG kit TP premium", input.lpgKitTpPremium),
    ...input.addOns.filter((l) => l.selected).map((l) => checkPercent(`Rate for ${db.addOns.find((a) => a.id === l.addOnId)?.name ?? "add-on"}`, l.ratePercentage)),
  ];
  const err = checks.find(Boolean);
  if (err) fail(err);
}

export async function saveMaster(input: InsuranceMasterInput, id?: ID): Promise<{ db: Db; id: ID }> {
  let savedId = id ?? "";
  const db = await mutate((d) => {
    validateMaster(d, input, id);
    const now = new Date().toISOString();
    const clean = { ...input, name: input.name.trim(), insuranceCompany: input.insuranceCompany.trim() };
    if (id) {
      const m = d.masters.find((x) => x.id === id);
      need(m, "Insurance master not found");
      Object.assign(m as InsuranceMaster, clean, { updatedAt: now });
    } else {
      savedId = uid("im");
      d.masters.unshift({ id: savedId, ...clean, createdAt: now, updatedAt: now });
    }
  });
  return { db, id: savedId };
}

export async function deleteMaster(id: ID): Promise<Db> {
  return mutate((d) => {
    d.masters = d.masters.filter((m) => m.id !== id);
  });
}

export async function setMasterStatus(id: ID, status: InsuranceMaster["status"]): Promise<Db> {
  return mutate((d) => {
    const m = d.masters.find((x) => x.id === id);
    need(m, "Insurance master not found");
    (m as InsuranceMaster).status = status;
    (m as InsuranceMaster).updatedAt = new Date().toISOString();
  });
}
