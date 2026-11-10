/**
 * Premium calculation engine. Pure functions only – no React, no storage.
 *
 * Formulas (taken from the annotations in the Figma "Check Config" frame):
 *   IDV Amount            = Ex-Showroom Price x IDV %
 *   OD Premium Amount     = OD % x IDV Amount                      (x OD years)
 *   CNG/LPG Loading       = Loading % x OD Premium Amount          (only when the vehicle runs on CNG/LPG)
 *   Discount Amount       = Discount % x (OD Premium + Loading)
 *   Total OD              = (OD Premium + Loading) - Discount
 *   TP subtotal           = TP + Owner PA + Paid-driver PA + Seaters PA + LPG-kit TP   (annual rates x TP years)
 *   TP GST Amount         = TP subtotal x TP GST % / 100
 *   Total TP              = TP subtotal + TP GST Amount
 *   Add-on premium (each) = IDV Amount x rate %
 *   Total Add-on          = Add-on subtotal + Add-on subtotal x Add-on GST %
 *   FINAL                 = Total OD + Total TP + Total Add-on + other charges
 *
 * All money values are rounded to 2 decimals at every step so the summary adds up exactly.
 */
import type { AddOn, CcSlab, Db, FuelType, PolicyStructure, RateMatrixEntry, VehicleAgeRange, Zone } from "@/types/insurance";
import { rateKey } from "@/types/insurance";

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
export const percentOf = (amount: number, pct: number): number => round2((amount * pct) / 100);

// ---------------------------------------------------------------- OD
export const calculateIdv = (exShowroomPrice: number, idvPercentage: number): number =>
  percentOf(exShowroomPrice, idvPercentage);

/** Base (own damage) premium = OD % of IDV, for the number of OD years in the policy. */
export const calculateBasePremium = (idvAmount: number, odPercentage: number, odYears = 1): number =>
  round2(percentOf(idvAmount, odPercentage) * odYears);

/** CNG/LPG loading is a % of the OD premium; zero when disabled or when the vehicle is not CNG/LPG. */
export const calculateCngLpgLoading = (
  applicablePremium: number,
  loadingPercentage: number,
  applicable: boolean,
): number => (applicable ? percentOf(applicablePremium, loadingPercentage) : 0);

export const calculateDiscount = (applicablePremium: number, discountPercentage: number): number =>
  percentOf(applicablePremium, discountPercentage);

// ---------------------------------------------------------------- TP
/** GST is kept separate from the base TP premium. */
export const calculateTpGst = (
  tpSubtotal: number,
  gstPercentage: number,
): { gstAmount: number; totalIncludingGst: number } => {
  const gstAmount = percentOf(tpSubtotal, gstPercentage);
  return { gstAmount, totalIncludingGst: round2(tpSubtotal + gstAmount) };
};

// ---------------------------------------------------------------- Add-ons
export interface AddOnInput {
  addOnId: string;
  name: string;
  selected: boolean;
  ratePercentage: number;
}
export interface AddOnResult extends AddOnInput {
  premium: number;
}

export const calculateAddOns = (idvAmount: number, lines: AddOnInput[], gstPercentage: number) => {
  const results: AddOnResult[] = lines.map((l) => ({
    ...l,
    premium: l.selected ? percentOf(idvAmount, l.ratePercentage) : 0,
  }));
  const subtotal = round2(results.reduce((s, r) => s + r.premium, 0));
  const gstAmount = percentOf(subtotal, gstPercentage);
  return { lines: results, subtotal, gstAmount, total: round2(subtotal + gstAmount) };
};

// ---------------------------------------------------------------- Total
export interface PremiumInputs {
  exShowroomPrice: number;
  idvPercentage: number;
  odPercentage: number;
  odYears: number;
  tpYears: number;

  vehicleFuel: FuelType | null;
  cngLpgEnabled: boolean;
  cngLpgLoadingPercentage: number;
  discountPercentage: number;

  tpRate: number;
  ownerPaRate: number;
  ownerPaApplicable: boolean;
  driverPaRate: number;
  seatersPaPerHead: number;
  seatingCapacity: number;
  lpgKitTpPremium: number;
  tpGstPercentage: number;

  addOns: AddOnInput[];
  addOnGstPercentage: number;
  /** "Other configured charges" */
  additionalCharges?: { label: string; amount: number }[];
}

export interface PremiumBreakdown {
  idvAmount: number;
  odPremium: number;
  cngLpgApplicable: boolean;
  cngLpgLoadingAmount: number;
  discountAmount: number;
  totalOd: number;

  tpAmount: number;
  ownerPaAmount: number;
  driverPaAmount: number;
  seatersAmount: number;
  lpgKitAmount: number;
  lpgKitApplicable: boolean;
  tpSubtotal: number;
  tpGstAmount: number;
  totalTp: number;

  addOnLines: AddOnResult[];
  addOnSubtotal: number;
  addOnGstAmount: number;
  totalAddOn: number;

  additionalChargesTotal: number;
  finalPremium: number;
}

export const isCngLpg = (fuel: FuelType | null) => fuel === "CNG" || fuel === "LPG";

export function calculateTotalPremium(i: PremiumInputs): PremiumBreakdown {
  // On-damage
  const idvAmount = calculateIdv(i.exShowroomPrice, i.idvPercentage);
  const odPremium = calculateBasePremium(idvAmount, i.odPercentage, i.odYears);
  const cngLpgApplicable = i.cngLpgEnabled && isCngLpg(i.vehicleFuel);
  const cngLpgLoadingAmount = calculateCngLpgLoading(odPremium, i.cngLpgLoadingPercentage, cngLpgApplicable);
  const preDiscount = round2(odPremium + cngLpgLoadingAmount);
  const discountAmount = calculateDiscount(preDiscount, i.discountPercentage);
  const totalOd = round2(preDiscount - discountAmount);

  // Third party (annual rates x TP years; seaters are per passenger seat, driver seat excluded)
  const passengers = Math.max(i.seatingCapacity - 1, 0);
  const tpAmount = round2(i.tpRate * i.tpYears);
  const ownerPaAmount = i.ownerPaApplicable ? round2(i.ownerPaRate * i.tpYears) : 0;
  const driverPaAmount = round2(i.driverPaRate * i.tpYears);
  const seatersAmount = round2(i.seatersPaPerHead * passengers * i.tpYears);
  const lpgKitApplicable = isCngLpg(i.vehicleFuel);
  const lpgKitAmount = lpgKitApplicable ? round2(i.lpgKitTpPremium) : 0;
  const tpSubtotal = round2(tpAmount + ownerPaAmount + driverPaAmount + seatersAmount + lpgKitAmount);
  const { gstAmount: tpGstAmount, totalIncludingGst: totalTp } = calculateTpGst(tpSubtotal, i.tpGstPercentage);

  // Add-ons
  const addOn = calculateAddOns(idvAmount, i.addOns, i.addOnGstPercentage);

  const additionalChargesTotal = round2((i.additionalCharges ?? []).reduce((s, c) => s + c.amount, 0));
  const finalPremium = round2(totalOd + totalTp + addOn.total + additionalChargesTotal);

  return {
    idvAmount, odPremium, cngLpgApplicable, cngLpgLoadingAmount, discountAmount, totalOd,
    tpAmount, ownerPaAmount, driverPaAmount, seatersAmount, lpgKitAmount, lpgKitApplicable,
    tpSubtotal, tpGstAmount, totalTp,
    addOnLines: addOn.lines, addOnSubtotal: addOn.subtotal, addOnGstAmount: addOn.gstAmount, totalAddOn: addOn.total,
    additionalChargesTotal, finalPremium,
  };
}

// ---------------------------------------------------------------- Rate lookup
export const findCcSlab = (slabs: CcSlab[], vehicleTypeId: string, cc: number): CcSlab | undefined =>
  slabs.find((s) => s.vehicleTypeId === vehicleTypeId && cc >= s.minCc && (s.maxCc == null || cc <= s.maxCc));

export const findAgeRange = (ranges: VehicleAgeRange[], age: number): VehicleAgeRange | undefined =>
  ranges.find((r) => age >= r.minAge && (r.maxAge == null || age <= r.maxAge));

export const vehicleAge = (manufactureYear: number, now = new Date()): number =>
  Math.max(now.getFullYear() - manufactureYear, 0);

export interface ResolvedRates {
  ccSlab?: CcSlab;
  ageRange?: VehicleAgeRange;
  zone?: Zone;
  entry?: RateMatrixEntry;
  odPercentage: number | null;
  /** Human-readable reasons why rates could not be resolved. */
  problems: string[];
}

/** Looks up the generated rate-matrix row for a vehicle (type + CC + zone + age). */
export function resolveRates(
  db: Pick<Db, "ccSlabs" | "ageRanges" | "zones" | "rateMatrix">,
  q: { vehicleTypeId: string; cc: number; zoneId: string | null; age: number },
): ResolvedRates {
  const problems: string[] = [];
  const ccSlab = findCcSlab(db.ccSlabs, q.vehicleTypeId, q.cc);
  if (!ccSlab) problems.push(`No CC slab covers ${q.cc} CC`);
  const ageRange = findAgeRange(db.ageRanges, q.age);
  if (!ageRange) problems.push(`No vehicle age range covers ${q.age} year(s)`);
  const zone = q.zoneId ? db.zones.find((z) => z.id === q.zoneId) : undefined;
  if (!zone) problems.push("Zone is not selected");
  const entry = ccSlab ? db.rateMatrix.find((r) => r.vehicleTypeId === q.vehicleTypeId && r.ccSlabId === ccSlab.id) : undefined;
  if (ccSlab && !entry) problems.push(`No rate matrix row configured for "${ccSlab.name}"`);
  let odPercentage: number | null = null;
  if (entry && zone && ageRange) {
    const v = entry.odRates[rateKey(zone.id, ageRange.id)];
    if (v == null) problems.push(`No OD rate set for ${zone.name} / ${ageRange.label}`);
    else odPercentage = v;
  }
  return { ccSlab, ageRange, zone, entry, odPercentage, problems };
}

export const policyYears = (p: PolicyStructure | undefined) => ({ odYears: p?.odYears ?? 1, tpYears: p?.tpYears ?? 1 });

export const addOnInputsFromDefs = (
  lines: { addOnId: string; selected: boolean; ratePercentage: number }[],
  defs: AddOn[],
): AddOnInput[] =>
  lines.flatMap((l) => {
    const d = defs.find((a) => a.id === l.addOnId);
    return d ? [{ addOnId: l.addOnId, name: d.name, selected: l.selected, ratePercentage: l.ratePercentage }] : [];
  });
