import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Field, NumberInput } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { useDb, useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import { rateKey, type RateMatrixEntry } from "@/types/insurance";
import { checkAmount, checkPercent } from "@/lib/validation";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicleTypeId: string;
  /** existing row to edit; null = add new */
  entry: RateMatrixEntry | null;
}

type Num = number | null;
interface Form {
  vehicleTypeId: string;
  ccSlabId: string;
  odRates: Record<string, Num>;
  tp: Num; ownerPa: Num; driverPa: Num; seaters: Num;
}

/**
 * "Edit Rate Matrix" popup. The zone / age inputs are generated from the zones and
 * vehicle-age ranges configured for the selected vehicle type – nothing is hardcoded.
 */
export function ConfigurationModal({ open, onClose, vehicleTypeId, entry }: Props) {
  const db = useDb();
  const { run } = useInsurance();
  const [form, setForm] = useState<Form>({ vehicleTypeId, ccSlabId: "", odRates: {}, tp: null, ownerPa: null, driverPa: null, seaters: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      entry
        ? { vehicleTypeId: entry.vehicleTypeId, ccSlabId: entry.ccSlabId, odRates: { ...entry.odRates }, tp: entry.tpPremium, ownerPa: entry.ownerPa, driverPa: entry.driverPa, seaters: entry.seatersPaPerHead }
        : { vehicleTypeId, ccSlabId: "", odRates: {}, tp: null, ownerPa: null, driverPa: null, seaters: null },
    );
  }, [open, entry, vehicleTypeId]);

  const zones = useMemo(() => db.zones.filter((z) => z.vehicleTypeId === form.vehicleTypeId), [db.zones, form.vehicleTypeId]);
  const ages = useMemo(() => db.ageRanges.slice().sort((a, b) => a.minAge - b.minAge), [db.ageRanges]);
  const slabOptions = useMemo(() => {
    const used = new Set(db.rateMatrix.filter((r) => r.id !== entry?.id).map((r) => r.ccSlabId));
    return db.ccSlabs
      .filter((s) => s.vehicleTypeId === form.vehicleTypeId && !used.has(s.id))
      .sort((a, b) => a.minCc - b.minCc)
      .map((s) => ({ value: s.id, label: s.name }));
  }, [db.ccSlabs, db.rateMatrix, form.vehicleTypeId, entry]);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!form.vehicleTypeId) e.vehicleTypeId = "Vehicle type is required";
    if (!form.ccSlabId) e.ccSlabId = "CC slab is required";
    for (const z of zones) for (const a of ages) {
      const k = rateKey(z.id, a.id);
      const msg = checkPercent("Rate", form.odRates[k]);
      if (msg) e[k] = msg;
    }
    for (const [key, label, v] of [["tp", "TP", form.tp], ["ownerPa", "Owner PA", form.ownerPa], ["driverPa", "Driver PA", form.driverPa], ["seaters", "Seaters PA", form.seaters]] as const) {
      const msg = checkAmount(label, v);
      if (msg) e[key] = msg;
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    const odRates: Record<string, number> = {};
    for (const z of zones) for (const a of ages) odRates[rateKey(z.id, a.id)] = form.odRates[rateKey(z.id, a.id)] as number;
    setBusy(true);
    const r = await run(
      () => api.saveRateEntry({ id: entry?.id, vehicleTypeId: form.vehicleTypeId, ccSlabId: form.ccSlabId, odRates, tpPremium: form.tp as number, ownerPa: form.ownerPa as number, driverPa: form.driverPa as number, seatersPaPerHead: form.seaters as number }),
      "Rate matrix saved",
    );
    setBusy(false);
    if (r.ok) onClose();
    else setErrors({ form: r.error });
  };

  const setRate = (k: string, v: Num) => setForm((f) => ({ ...f, odRates: { ...f.odRates, [k]: v } }));

  return (
    <Modal open={open} onClose={onClose} title={entry ? "Edit Rate Matrix" : "New Rate Matrix Row"} width="max-w-[720px]"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>Save</Button></>}>
      <div className="flex flex-col gap-4">
        {errors.form && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vehicle Type" required error={errors.vehicleTypeId}>
            <Select value={form.vehicleTypeId} disabled={!!entry} onChange={(v) => setForm({ ...form, vehicleTypeId: v, ccSlabId: "", odRates: {} })} options={db.vehicleTypes.map((v) => ({ value: v.id, label: v.name }))} />
          </Field>
          <Field label="CC Slab" required error={errors.ccSlabId} hint={!entry && form.vehicleTypeId && slabOptions.length === 0 ? "All CC slabs already have a row. Add a CC slab first." : undefined}>
            <Select value={form.ccSlabId} disabled={!!entry} invalid={!!errors.ccSlabId} onChange={(v) => setForm({ ...form, ccSlabId: v })}
              options={entry ? db.ccSlabs.filter((s) => s.id === entry.ccSlabId).map((s) => ({ value: s.id, label: s.name })) : slabOptions} placeholder="Select CC slab" />
          </Field>
        </div>

        {zones.length === 0 && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">No zones are configured for this vehicle type. Add zones in the Zone tab to enter OD rates.</p>}
        {zones.map((z) => (
          <fieldset key={z.id} className="rounded-lg border border-line p-3">
            <legend className="px-1 text-xs font-semibold text-ink">{z.name} <span className="font-normal text-subtle">% of IDV</span></legend>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(ages.length, 1)}, minmax(0, 1fr))` }}>
              {ages.map((a) => {
                const k = rateKey(z.id, a.id);
                return (
                  <Field key={k} label={a.label} required error={errors[k]}>
                    <NumberInput suffix="%" value={form.odRates[k] ?? null} invalid={!!errors[k]} onChange={(v) => setRate(k, v)} aria-label={`${z.name} ${a.label}`} />
                  </Field>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="TP (₹)" required error={errors.tp}><NumberInput prefix="₹" value={form.tp} invalid={!!errors.tp} onChange={(v) => setForm({ ...form, tp: v })} aria-label="TP" /></Field>
          <Field label="Owner PA (₹)" required error={errors.ownerPa}><NumberInput prefix="₹" value={form.ownerPa} invalid={!!errors.ownerPa} onChange={(v) => setForm({ ...form, ownerPa: v })} aria-label="Owner PA" /></Field>
          <Field label="Driver PA (₹)" required error={errors.driverPa}><NumberInput prefix="₹" value={form.driverPa} invalid={!!errors.driverPa} onChange={(v) => setForm({ ...form, driverPa: v })} aria-label="Driver PA" /></Field>
          <Field label="Seaters PA (₹ / seat)" required error={errors.seaters}><NumberInput prefix="₹" value={form.seaters} invalid={!!errors.seaters} onChange={(v) => setForm({ ...form, seaters: v })} aria-label="Seaters PA" /></Field>
        </div>
        <p className="text-xs text-subtle">TP and PA amounts are annual; they are multiplied by the policy's third-party years when a premium is calculated.</p>
      </div>
    </Modal>
  );
}
