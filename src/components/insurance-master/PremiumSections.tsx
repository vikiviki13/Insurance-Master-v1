import type { ReactNode } from "react";
import { Affix, Field, NumberInput } from "../ui/Field";
import { Select } from "../ui/Select";
import { Checkbox, Switch } from "../ui/Switch";
import { cn, formatINR, formatPct } from "@/lib/utils";
import type { AddOn, PolicyStructure } from "@/types/insurance";
import type { PremiumBreakdown } from "@/services/calculationService";
import type { MasterDraft } from "./draft";

interface Props {
  draft: MasterDraft;
  onChange: (patch: Partial<MasterDraft>) => void;
  errors: Record<string, string>;
  addOnDefs: AddOn[];
  policies: PolicyStructure[];
  /** null on the master form (no vehicle yet) -> computed fields show "Calculates automatically" */
  breakdown: PremiumBreakdown | null;
  odPercentage: number | null;
  /** vehicle fuel is CNG/LPG; null when no vehicle is selected */
  cngLpgVehicle: boolean | null;
}

/** A disabled, computed field. */
function Auto({ value, placeholder = "Calculates automatically", prefix = "₹", suffix }: { value: string | null; placeholder?: string; prefix?: string; suffix?: string }) {
  return (
    <Affix prefix={value != null && prefix} suffix={suffix} disabled>
      <input disabled readOnly value={value ?? ""} placeholder={placeholder} aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-zinc-500 outline-none placeholder:text-zinc-400" />
    </Affix>
  );
}

const money = (v: number | undefined | null) => (v == null ? null : v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

const grid = "grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2";

export function PremiumSections({ draft, onChange, errors, addOnDefs, policies, breakdown: b, odPercentage, cngLpgVehicle }: Props) {
  const policy = policies.find((p) => p.id === draft.policyStructureId);
  const loadingActive = draft.cngLpgEnabled && (cngLpgVehicle ?? true);
  const setLine = (id: string, patch: Partial<MasterDraft["addOns"][number]>) =>
    onChange({ addOns: draft.addOns.map((l) => (l.addOnId === id ? { ...l, ...patch } : l)) });

  return (
    <div className="flex flex-col gap-7">
      {/* ------------------------------------------------ On-damage */}
      <Section title="On-Damage Premium (OD)">
        <div className={grid}>
          <Field label="IDV Percentage" required error={errors.idvPercentage} htmlFor="idv-pct">
            <NumberInput id="idv-pct" suffix="%" value={draft.idvPercentage} invalid={!!errors.idvPercentage} onChange={(v) => onChange({ idvPercentage: v })} />
          </Field>
          <Field label="IDV Amount"><Auto value={money(b?.idvAmount)} /></Field>

          <Field label="OD Percentage" hint={!b ? "Taken from the Rate Matrix for the vehicle's zone, CC and age" : undefined}>
            <Auto value={odPercentage == null ? null : String(parseFloat(odPercentage.toFixed(3)))} suffix="%" prefix="" placeholder="From Rate Matrix" />
          </Field>
          <Field label="OD Premium Amount"><Auto value={money(b?.odPremium)} /></Field>

          <Field label="Basic Loading for CNG/LPG (%)" error={errors.cngLpgLoadingPercentage}
            action={<span className="flex items-center gap-2 text-xs text-muted">{draft.cngLpgEnabled ? "Enabled" : "Disabled"}<Switch checked={draft.cngLpgEnabled} onChange={(v) => onChange({ cngLpgEnabled: v })} label="Enable CNG/LPG loading" /></span>}>
            <NumberInput suffix="%" value={draft.cngLpgLoadingPercentage} disabled={!draft.cngLpgEnabled} invalid={!!errors.cngLpgLoadingPercentage} onChange={(v) => onChange({ cngLpgLoadingPercentage: v })} aria-label="CNG/LPG loading percentage" />
          </Field>
          <Field label="Basic Loading for CNG/LPG Amount"
            hint={b && !b.cngLpgApplicable ? (draft.cngLpgEnabled ? "Not applied – the vehicle does not run on CNG/LPG" : "Loading is disabled") : undefined}>
            <Auto value={b ? money(b.cngLpgLoadingAmount) : loadingActive ? null : "0"} />
          </Field>

          <Field label="Discount (%)" error={errors.discountPercentage}>
            <NumberInput suffix="%" value={draft.discountPercentage} invalid={!!errors.discountPercentage} onChange={(v) => onChange({ discountPercentage: v })} aria-label="Discount percentage" />
          </Field>
          <Field label="Discount Amount"><Auto value={money(b?.discountAmount)} /></Field>

          <Field label="Total OD Premium Amount" className="md:col-span-2"><Auto value={money(b?.totalOd)} /></Field>
        </div>
      </Section>

      {/* ------------------------------------------------ Third party */}
      <Section title="Third-Party Premium (TP)">
        <div className={grid}>
          <Field label="Policy duration" required error={errors.policyStructureId}>
            <Select value={draft.policyStructureId} invalid={!!errors.policyStructureId} onChange={(v) => onChange({ policyStructureId: v })}
              options={policies.map((p) => ({ value: p.id, label: `${p.name}  (OD ${p.odYears} yr + TP ${p.tpYears} yr)` }))} placeholder="Select policy structure" />
          </Field>
          <Field label="TP Amount" hint={!b ? `From the Rate Matrix config (TP)${policy ? ` × ${policy.tpYears} yr` : ""}` : undefined}><Auto value={money(b?.tpAmount)} placeholder="From Rate Matrix" /></Field>

          <Field label="LPG TP Kit TP Premium" error={errors.lpgKitTpPremium} hint={cngLpgVehicle === false ? "Applies only to CNG/LPG vehicles" : undefined}>
            <NumberInput prefix="₹" value={draft.lpgKitTpPremium} disabled={cngLpgVehicle === false} invalid={!!errors.lpgKitTpPremium} onChange={(v) => onChange({ lpgKitTpPremium: v })} aria-label="LPG TP kit premium" />
          </Field>
          <Field label="Compulsory PA-15 lacs"
            action={<span className="flex items-center gap-2 text-xs text-muted">Applicable<Checkbox checked={draft.ownerPaApplicable} onChange={(v) => onChange({ ownerPaApplicable: v })} label="Compulsory PA applicable" /></span>}>
            <Auto value={b ? (draft.ownerPaApplicable ? money(b.ownerPaAmount) : "Not Applicable") : null} prefix={draft.ownerPaApplicable ? "₹" : ""} placeholder="From Owner PA (₹) auto fetch" />
          </Field>

          <Field label="Seaters Per Head Amount"><Auto value={money(b?.seatersAmount)} placeholder="From Rate Matrix" /></Field>
          <Field label="PA for Paid Driver"><Auto value={money(b?.driverPaAmount)} placeholder="From Rate Matrix" /></Field>

          <Field label="GST Percentage (%)" required error={errors.tpGstPercentage} hint="GST is calculated separately on the TP subtotal">
            <NumberInput suffix="%" value={draft.tpGstPercentage} invalid={!!errors.tpGstPercentage} onChange={(v) => onChange({ tpGstPercentage: v })} aria-label="TP GST percentage" />
          </Field>
          <Field label="TP Subtotal / GST Amount">
            <div className="grid grid-cols-2 gap-2">
              <Auto value={money(b?.tpSubtotal)} placeholder="Subtotal" />
              <Auto value={money(b?.tpGstAmount)} placeholder="GST" />
            </div>
          </Field>

          <Field label="Total TP Premium Amount (incl. GST)" className="md:col-span-2" hint={b ? `${formatINR(b.tpSubtotal)} + GST ${formatINR(b.tpGstAmount)}` : undefined}>
            <Auto value={money(b?.totalTp)} />
          </Field>
        </div>
      </Section>

      {/* ------------------------------------------------ Add-ons */}
      <Section title="Add on Coverage">
        <Field label="IDV Amount"><Auto value={money(b?.idvAmount)} /></Field>
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F1F1] text-xs font-medium text-ink">
              <tr><th className="w-24 px-5 py-3">Select</th><th className="px-3 py-3">Addon</th><th className="w-48 px-3 py-3">Rate (%)</th><th className="px-3 py-3 text-right md:text-left">Premium Amount</th></tr>
            </thead>
            <tbody>
              {draft.addOns.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-subtle">No add-ons are configured for this vehicle type.</td></tr>}
              {draft.addOns.map((l) => {
                const def = addOnDefs.find((a) => a.id === l.addOnId);
                const line = b?.addOnLines.find((x) => x.addOnId === l.addOnId);
                return (
                  <tr key={l.addOnId} className="h-[58px] border-t border-line">
                    <td className="px-5"><Checkbox checked={l.selected} onChange={(v) => setLine(l.addOnId, { selected: v })} label={`Select ${def?.name}`} /></td>
                    <td className="px-3 text-[15px] font-medium text-ink">{def?.name ?? "—"}</td>
                    <td className="px-3">
                      <div className="w-32"><NumberInput suffix="%" value={l.ratePercentage} disabled={!l.selected} invalid={!!errors[`addon:${l.addOnId}`]} onChange={(v) => setLine(l.addOnId, { ratePercentage: v })} aria-label={`${def?.name} rate`} /></div>
                      {errors[`addon:${l.addOnId}`] && <p role="alert" className="mt-1 text-xs text-red-600">{errors[`addon:${l.addOnId}`]}</p>}
                    </td>
                    <td className={cn("px-3 text-[15px]", !l.selected && "text-zinc-400")}>{b ? (l.selected ? formatINR(line?.premium) : "—") : "Calculates automatically"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
          <Field label="Add-on Subtotal"><Auto value={money(b?.addOnSubtotal)} /></Field>
          <Field label="Add-on GST (%)" required error={errors.addOnGstPercentage}>
            <NumberInput suffix="%" value={draft.addOnGstPercentage} invalid={!!errors.addOnGstPercentage} onChange={(v) => onChange({ addOnGstPercentage: v })} aria-label="Add-on GST percentage" />
          </Field>
          <Field label="Total Add-on Amount"><Auto value={money(b?.totalAddOn)} /></Field>
        </div>
        <Field label="Total Insurance Premium Amount" hint={b && odPercentage != null ? `OD ${formatINR(b.totalOd)} + TP ${formatINR(b.totalTp)} + Add-ons ${formatINR(b.totalAddOn)} (OD rate ${formatPct(odPercentage)})` : undefined}>
          <Auto value={money(b?.finalPremium)} />
        </Field>
      </Section>
    </div>
  );
}
