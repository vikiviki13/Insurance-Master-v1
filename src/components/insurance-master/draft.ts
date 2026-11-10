import type { Db, InsuranceMaster, InsuranceMasterInput } from "@/types/insurance";
import { checkAmount, checkPercent, normalize } from "@/lib/validation";

type N = number | null;

/** Form state for an insurance master: numeric fields are nullable while the user is typing. */
export interface MasterDraft {
  name: string;
  insuranceCompany: string;
  vehicleTypeId: string;
  status: "active" | "inactive";
  policyStructureId: string;
  idvPercentage: N;
  cngLpgEnabled: boolean;
  cngLpgLoadingPercentage: N;
  discountPercentage: N;
  tpGstPercentage: N;
  lpgKitTpPremium: N;
  ownerPaApplicable: boolean;
  addOns: { addOnId: string; selected: boolean; ratePercentage: N }[];
  addOnGstPercentage: N;
}

export const addOnLinesFor = (db: Db, vehicleTypeId: string, existing: MasterDraft["addOns"] = []): MasterDraft["addOns"] =>
  db.addOns
    .filter((a) => a.vehicleTypeId === vehicleTypeId)
    .map((a) => existing.find((l) => l.addOnId === a.id) ?? { addOnId: a.id, selected: true, ratePercentage: a.percentage });

export function emptyDraft(db: Db): MasterDraft {
  const vt = db.vehicleTypes.find((v) => v.id === "vt_4w")?.id ?? db.vehicleTypes[0]?.id ?? "";
  return {
    name: "", insuranceCompany: "", vehicleTypeId: vt, status: "active",
    policyStructureId: db.policyStructures[0]?.id ?? "",
    idvPercentage: 95, cngLpgEnabled: true, cngLpgLoadingPercentage: 5, discountPercentage: 0,
    tpGstPercentage: 5, lpgKitTpPremium: 0, ownerPaApplicable: true,
    addOns: addOnLinesFor(db, vt), addOnGstPercentage: 18,
  };
}

export function draftFromMaster(db: Db, m: InsuranceMaster): MasterDraft {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = m;
  return { ...rest, addOns: addOnLinesFor(db, m.vehicleTypeId, m.addOns) };
}

/** Only call after validateDraft() returned no errors. */
export function draftToInput(d: MasterDraft): InsuranceMasterInput {
  return {
    ...d,
    idvPercentage: d.idvPercentage ?? 0,
    cngLpgLoadingPercentage: d.cngLpgEnabled ? d.cngLpgLoadingPercentage ?? 0 : 0,
    discountPercentage: d.discountPercentage ?? 0,
    tpGstPercentage: d.tpGstPercentage ?? 0,
    lpgKitTpPremium: d.lpgKitTpPremium ?? 0,
    addOnGstPercentage: d.addOnGstPercentage ?? 0,
    addOns: d.addOns.map((l) => ({ ...l, ratePercentage: l.ratePercentage ?? 0 })),
  };
}

/** Field-level validation. `identity` covers name / company (not needed for the what-if Check Config page). */
export function validateDraft(db: Db, d: MasterDraft, opts: { identity: boolean; currentId?: string }): Record<string, string> {
  const e: Record<string, string> = {};
  const put = (k: string, msg: string | null) => msg && (e[k] = msg);
  if (opts.identity) {
    if (!d.name.trim()) e.name = "Insurance name is required";
    else if (db.masters.some((m) => m.id !== opts.currentId && normalize(m.name) === normalize(d.name))) e.name = "An insurance master with this name already exists";
    if (!d.vehicleTypeId) e.vehicleTypeId = "Vehicle type is required";
  }
  if (!d.policyStructureId) e.policyStructureId = "Policy duration is required";
  put("idvPercentage", checkPercent("IDV percentage", d.idvPercentage));
  if (d.cngLpgEnabled) put("cngLpgLoadingPercentage", checkPercent("Loading percentage", d.cngLpgLoadingPercentage));
  put("discountPercentage", checkPercent("Discount", d.discountPercentage));
  put("tpGstPercentage", checkPercent("GST percentage", d.tpGstPercentage));
  put("lpgKitTpPremium", checkAmount("LPG kit TP premium", d.lpgKitTpPremium, false));
  put("addOnGstPercentage", checkPercent("Add-on GST", d.addOnGstPercentage));
  d.addOns.filter((l) => l.selected).forEach((l) => put(`addon:${l.addOnId}`, checkPercent("Rate", l.ratePercentage)));
  return e;
}
