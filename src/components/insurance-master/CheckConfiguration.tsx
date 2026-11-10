import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Affix, Field } from "../ui/Field";
import { Select } from "../ui/Select";
import { Card } from "../ui/misc";
import { useDb } from "@/store/InsuranceStore";
import { addOnInputsFromDefs, calculateTotalPremium, isCngLpg, policyYears, resolveRates, vehicleAge } from "@/services/calculationService";
import type { FuelType } from "@/types/insurance";
import { validateDraft, type MasterDraft } from "./draft";
import { PremiumSections } from "./PremiumSections";
import { CalculationSummary, type SummaryData } from "./CalculationSummary";

const YEARS_BACK = 20;

/**
 * "Check Config": pick a vehicle, the zone/age/CC rates are pulled from the Rate Matrix and the
 * whole premium is recalculated live as any percentage changes. Nothing is persisted here.
 */
export function CheckConfiguration({ initial, onBack }: { initial: MasterDraft; onBack: () => void }) {
  const db = useDb();
  const [cfg, setCfg] = useState<MasterDraft>(initial);
  const [model, setModel] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [year, setYear] = useState("");
  const [fuel, setFuel] = useState<FuelType | "">("");
  const [color, setColor] = useState("");
  const [branchId, setBranchId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [preview, setPreview] = useState(false);

  const vt = db.vehicleTypes.find((v) => v.id === cfg.vehicleTypeId);
  const catalog = useMemo(() => db.vehicleCatalog.filter((c) => c.vehicleTypeId === cfg.vehicleTypeId), [db.vehicleCatalog, cfg.vehicleTypeId]);
  const models = useMemo(() => [...new Set(catalog.map((c) => c.model))], [catalog]);
  const variants = catalog.filter((c) => c.model === model);
  const vehicle = catalog.find((c) => c.id === vehicleId);
  const zones = db.zones.filter((z) => z.vehicleTypeId === cfg.vehicleTypeId);
  const thisYear = new Date().getFullYear();
  const age = year ? vehicleAge(Number(year)) : null;
  const branchHasNoZone = !!branchId && !zones.some((z) => z.branchIds.includes(branchId));

  const onModel = (m: string) => { setModel(m); setVehicleId(""); setFuel(""); setColor(""); };
  const onVariant = (id: string) => {
    setVehicleId(id);
    const v = catalog.find((c) => c.id === id);
    setFuel(v && v.fuelTypes.length === 1 ? v.fuelTypes[0] : "");
    setColor("");
  };
  const onBranch = (id: string) => {
    setBranchId(id);
    setZoneId(zones.find((z) => z.branchIds.includes(id))?.id ?? ""); // zone follows the branch
  };

  const resolved = useMemo(
    () => (vehicle && age != null ? resolveRates(db, { vehicleTypeId: cfg.vehicleTypeId, cc: vehicle.engineCc, zoneId: zoneId || null, age }) : null),
    [db, vehicle, age, zoneId, cfg.vehicleTypeId],
  );
  const policy = db.policyStructures.find((p) => p.id === cfg.policyStructureId);
  const errors = useMemo(() => validateDraft(db, cfg, { identity: false }), [db, cfg]);
  const hasErrors = Object.keys(errors).length > 0;

  const breakdown = useMemo(() => {
    if (!vehicle || !resolved?.entry || resolved.odPercentage == null || hasErrors) return null;
    const { odYears, tpYears } = policyYears(policy);
    return calculateTotalPremium({
      exShowroomPrice: vehicle.exShowroomPrice, idvPercentage: cfg.idvPercentage ?? 0, odPercentage: resolved.odPercentage, odYears, tpYears,
      vehicleFuel: fuel || null, cngLpgEnabled: cfg.cngLpgEnabled, cngLpgLoadingPercentage: cfg.cngLpgLoadingPercentage ?? 0, discountPercentage: cfg.discountPercentage ?? 0,
      tpRate: resolved.entry.tpPremium, ownerPaRate: resolved.entry.ownerPa, ownerPaApplicable: cfg.ownerPaApplicable, driverPaRate: resolved.entry.driverPa,
      seatersPaPerHead: resolved.entry.seatersPaPerHead, seatingCapacity: vehicle.seatingCapacity, lpgKitTpPremium: cfg.lpgKitTpPremium ?? 0, tpGstPercentage: cfg.tpGstPercentage ?? 0,
      addOns: addOnInputsFromDefs(cfg.addOns.map((l) => ({ ...l, ratePercentage: l.ratePercentage ?? 0 })), db.addOns), addOnGstPercentage: cfg.addOnGstPercentage ?? 0,
    });
  }, [vehicle, resolved, hasErrors, cfg, fuel, policy, db.addOns]);

  const vehicleErrors = {
    model: !model && "Model is required", variant: !vehicleId && "Variant is required", year: !year && "Year is required",
    fuel: !fuel && "Fuel type is required", color: !color && "Color is required", branch: !branchId && "Branch is required",
    zone: !zoneId && "Zone is required",
  };
  const vErr = (k: keyof typeof vehicleErrors) => (showErrors && vehicleErrors[k] ? (vehicleErrors[k] as string) : null);

  const summary: SummaryData | null =
    breakdown && vehicle && resolved && resolved.odPercentage != null && age != null
      ? {
          vehicle: { category: vt?.name ?? "", model: vehicle.model, variant: vehicle.variant, engineCc: vehicle.engineCc, zone: resolved.zone?.name ?? "", age, fuel: fuel || "—", seating: vehicle.seatingCapacity },
          b: breakdown, exShowroom: vehicle.exShowroomPrice, idvPct: cfg.idvPercentage ?? 0, odPct: resolved.odPercentage, loadingPct: cfg.cngLpgLoadingPercentage ?? 0,
          discountPct: cfg.discountPercentage ?? 0, policyName: policy?.name ?? "", tpGstPct: cfg.tpGstPercentage ?? 0, addOnGstPct: cfg.addOnGstPercentage ?? 0, masterName: cfg.name || "Untitled",
        }
      : null;

  const tryPreview = () => {
    setShowErrors(true);
    if (Object.values(vehicleErrors).some(Boolean) || !summary) return;
    setPreview(true);
  };

  return (
    <>
      <button onClick={onBack} className="mb-3 flex items-center gap-2 text-[17px] font-semibold text-ink hover:text-brand"><ArrowLeft className="h-5 w-5" /> Insurance Configuration</button>
      <Card className="p-6">
        <h2 className="mb-1 text-base font-semibold text-ink">{cfg.name || "Insurance Master"}</h2>
        <p className="mb-5 text-sm text-subtle">Try the configuration on a vehicle. Changes here are for checking only and are not saved.</p>

        <h3 className="mb-3 text-base font-semibold text-ink">Vehicle Details</h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
          <Field label="Vehicle Category" required><Select value={cfg.vehicleTypeId} disabled onChange={() => undefined} options={db.vehicleTypes.map((v) => ({ value: v.id, label: v.name }))} /></Field>
          <Field label="Model" required error={vErr("model")}><Select value={model} invalid={!!vErr("model")} onChange={onModel} options={models.map((m) => ({ value: m, label: m }))} placeholder={models.length ? "Select model" : "No vehicles for this type"} /></Field>
          <Field label="Variant" required error={vErr("variant")}><Select value={vehicleId} disabled={!model} invalid={!!vErr("variant")} onChange={onVariant} options={variants.map((v) => ({ value: v.id, label: v.variant }))} placeholder="Select variant" /></Field>
          <Field label="Year" required error={vErr("year")}><Select value={year} invalid={!!vErr("year")} onChange={setYear} options={Array.from({ length: YEARS_BACK + 1 }, (_, i) => String(thisYear - i)).map((y) => ({ value: y, label: y }))} placeholder="Manufacturing year" /></Field>
          <Field label="Fuel Type" required error={vErr("fuel")}><Select value={fuel} disabled={!vehicle} invalid={!!vErr("fuel")} onChange={(v) => setFuel(v as FuelType | "")} options={(vehicle?.fuelTypes ?? []).map((f) => ({ value: f, label: f }))} placeholder="Select fuel" /></Field>
          <Field label="Color" required error={vErr("color")}><Select value={color} disabled={!vehicle} invalid={!!vErr("color")} onChange={setColor} options={(vehicle?.colors ?? []).map((c) => ({ value: c, label: c }))} placeholder="Select color" /></Field>
          <Field label="Branch" required error={vErr("branch") ?? (branchHasNoZone ? "This branch is not part of any zone for this vehicle type" : null)}>
            <Select value={branchId} invalid={!!vErr("branch") || branchHasNoZone} onChange={onBranch} options={db.branches.map((b) => ({ value: b.id, label: b.name }))} placeholder="Select branch" />
          </Field>
          <Field label="Zone" required error={vErr("zone")} hint="Selected automatically from the branch">
            <Select value={zoneId} invalid={!!vErr("zone")} onChange={setZoneId} options={zones.map((z) => ({ value: z.id, label: z.name }))} placeholder="Select zone" />
          </Field>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-100 px-5 py-4 text-sm md:grid-cols-4" aria-label="Vehicle data from sales">
          {[["Engine CC", vehicle ? `${vehicle.engineCc} CC` : "—"], ["Zone", resolved?.zone?.name ?? db.zones.find((z) => z.id === zoneId)?.name ?? "—"], ["Vehicle Age", age == null ? "—" : String(age)], ["Seating Capacity", vehicle ? String(vehicle.seatingCapacity) : "—"]].map(([k, v]) => (
            <div key={k} className="flex gap-2"><dt className="font-medium text-brand">{k}</dt><dd className="font-semibold text-ink">: {v}</dd></div>
          ))}
        </dl>
        <div className="mt-3 max-w-md">
          <Field label="EX-Showroom Price" hint="Data from Sales"><Affix prefix="₹" disabled><input disabled readOnly aria-label="Ex-showroom price" value={vehicle ? vehicle.exShowroomPrice.toLocaleString("en-IN") : ""} placeholder="Select a vehicle" className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-zinc-500 outline-none placeholder:text-zinc-400" /></Affix></Field>
        </div>

        {resolved && resolved.problems.length > 0 && zoneId && (
          <div role="alert" className="mt-4 flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div><p className="font-medium">Premium cannot be calculated yet</p><ul className="list-disc pl-4">{resolved.problems.map((p) => <li key={p}>{p}</li>)}</ul></div>
          </div>
        )}

        <div className="mt-8">
          <PremiumSections draft={cfg} onChange={(p) => setCfg((d) => ({ ...d, ...p }))} errors={errors} addOnDefs={db.addOns} policies={db.policyStructures}
            breakdown={breakdown} odPercentage={resolved?.odPercentage ?? null} cngLpgVehicle={fuel ? isCngLpg(fuel) : null} />
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button onClick={onBack}>Cancel</Button>
          <Button variant="primary" onClick={tryPreview}>Preview</Button>
        </div>
      </Card>
      <CalculationSummary open={preview} onClose={() => setPreview(false)} data={summary} />
    </>
  );
}
