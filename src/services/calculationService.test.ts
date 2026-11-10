import { describe, expect, it } from "vitest";
import {
  calculateAddOns, calculateBasePremium, calculateCngLpgLoading, calculateIdv, calculateTotalPremium, calculateTpGst,
  findAgeRange, findCcSlab, resolveRates, type PremiumInputs,
} from "./calculationService";
import { buildSeed } from "@/data/seed";
import { checkRange, findGaps, findOverlap } from "@/lib/validation";

const base: PremiumInputs = {
  exShowroomPrice: 899900, idvPercentage: 95, odPercentage: 3.191, odYears: 1, tpYears: 1,
  vehicleFuel: "Petrol", cngLpgEnabled: true, cngLpgLoadingPercentage: 5, discountPercentage: 20,
  tpRate: 3416, ownerPaRate: 330, ownerPaApplicable: true, driverPaRate: 50, seatersPaPerHead: 50, seatingCapacity: 5,
  lpgKitTpPremium: 60, tpGstPercentage: 5,
  addOns: [{ addOnId: "a", name: "ZD", selected: true, ratePercentage: 0.4 }, { addOnId: "b", name: "KP", selected: false, ratePercentage: 0.05 }],
  addOnGstPercentage: 18,
};

describe("OD", () => {
  it("IDV = ex-showroom x IDV%", () => expect(calculateIdv(899900, 95)).toBe(854905));
  it("OD premium = OD% x IDV", () => expect(calculateBasePremium(854905, 3.191)).toBe(27280.02));
  it("multiplies by OD years", () => expect(calculateBasePremium(100000, 3, 3)).toBe(9000));
  it("CNG/LPG loading is a % of the applicable premium, zero when not applicable", () => {
    expect(calculateCngLpgLoading(27280.02, 5, true)).toBe(1364);
    expect(calculateCngLpgLoading(27280.02, 5, false)).toBe(0);
  });
});

describe("TP GST", () => {
  it("keeps GST separate and adds it on top", () => expect(calculateTpGst(10640, 5)).toEqual({ gstAmount: 532, totalIncludingGst: 11172 }));
  it("0% GST leaves the total unchanged", () => expect(calculateTpGst(1000, 0).totalIncludingGst).toBe(1000));
});

describe("add-ons", () => {
  it("only selected add-ons count; GST on subtotal", () => {
    const r = calculateAddOns(854905, base.addOns, 18);
    expect(r.subtotal).toBe(3419.62);
    expect(r.gstAmount).toBe(615.53);
    expect(r.total).toBe(4035.15);
  });
});

describe("total premium", () => {
  const b = calculateTotalPremium(base);
  it("OD: no loading for a petrol car, discount on OD", () => {
    expect(b.cngLpgApplicable).toBe(false);
    expect(b.cngLpgLoadingAmount).toBe(0);
    expect(b.discountAmount).toBe(5456);
    expect(b.totalOd).toBe(21824.02);
  });
  it("TP: kit excluded for petrol; seaters per passenger seat", () => {
    expect(b.lpgKitAmount).toBe(0);
    expect(b.seatersAmount).toBe(200);
    expect(b.tpSubtotal).toBe(3416 + 330 + 50 + 200);
    expect(b.tpGstAmount).toBe(199.8);
  });
  it("final = OD + TP + add-ons", () => expect(b.finalPremium).toBeCloseTo(b.totalOd + b.totalTp + b.totalAddOn, 2));
  it("CNG vehicle gets loading and LPG kit", () => {
    const c = calculateTotalPremium({ ...base, vehicleFuel: "CNG" });
    expect(c.cngLpgLoadingAmount).toBe(1364);
    expect(c.lpgKitAmount).toBe(60);
    expect(c.totalOd).toBeCloseTo((c.odPremium + 1364) * 0.8, 1);
  });
  it("disabled loading is ignored even for CNG", () => expect(calculateTotalPremium({ ...base, vehicleFuel: "CNG", cngLpgEnabled: false }).cngLpgLoadingAmount).toBe(0));
  it("3+3 policy scales OD and TP by years", () => {
    const t = calculateTotalPremium({ ...base, odYears: 3, tpYears: 3 });
    expect(t.odPremium).toBeCloseTo(b.odPremium * 3, 1);
    expect(t.tpAmount).toBe(3416 * 3);
  });
  it("additional charges are included", () => expect(calculateTotalPremium({ ...base, additionalCharges: [{ label: "Fee", amount: 100 }] }).finalPremium).toBeCloseTo(b.finalPremium + 100, 2));
});

describe("rate lookup on the seed data", () => {
  const db = buildSeed();
  it("matches CC slabs and age ranges at the boundaries", () => {
    expect(findCcSlab(db.ccSlabs, "vt_4w", 1000)?.id).toBe("cc_4w_1");
    expect(findCcSlab(db.ccSlabs, "vt_4w", 1001)?.id).toBe("cc_4w_2");
    expect(findCcSlab(db.ccSlabs, "vt_4w", 5000)?.id).toBe("cc_4w_3");
    expect(findAgeRange(db.ageRanges, 5)?.id).toBe("age_1");
    expect(findAgeRange(db.ageRanges, 6)?.id).toBe("age_2");
    expect(findAgeRange(db.ageRanges, 30)?.id).toBe("age_3");
  });
  it("resolves the generated matrix row", () => {
    const r = resolveRates(db, { vehicleTypeId: "vt_4w", cc: 1197, zoneId: "z_4w_a", age: 1 });
    expect(r.problems).toEqual([]);
    expect(r.odPercentage).toBe(3.191);
    expect(r.entry?.tpPremium).toBe(3416);
  });
  it("reports why it cannot resolve", () => {
    expect(resolveRates(db, { vehicleTypeId: "vt_4w", cc: 1197, zoneId: null, age: 1 }).problems).toContain("Zone is not selected");
  });
  it("seed matrix covers every zone x age cell for every slab", () => {
    for (const row of db.rateMatrix) {
      const zones = db.zones.filter((z) => z.vehicleTypeId === row.vehicleTypeId);
      expect(Object.keys(row.odRates).length).toBe(zones.length * db.ageRanges.length);
    }
  });
});

describe("range validation", () => {
  it("min cannot exceed max", () => expect(checkRange(10, 5, "CC")).toMatch(/cannot be greater/));
  it("open ended is allowed", () => expect(checkRange(1501, null, "CC")).toBeNull());
  it("detects overlaps incl. open-ended", () => {
    const items = [{ min: 0, max: 1000 }, { min: 1001, max: null }];
    expect(findOverlap(items, { min: 900, max: 1100 }, (x) => x)).toBeTruthy();
    expect(findOverlap(items.slice(0, 1), { min: 1001, max: 1500 }, (x) => x)).toBeUndefined();
    expect(findOverlap(items, { min: 5000, max: null }, (x) => x)).toBeTruthy();
  });
  it("finds gaps", () => expect(findGaps([{ min: 0, max: 1000 }, { min: 1100, max: 1500 }])).toEqual([{ min: 1001, max: 1099 }]));
});
