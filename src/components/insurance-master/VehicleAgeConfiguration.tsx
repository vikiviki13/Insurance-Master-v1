import { AlertTriangle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Field, NumberInput, TextInput } from "../ui/Field";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { useDb, useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import type { VehicleAgeRange } from "@/types/insurance";
import { checkRange, describeRange, findGaps, findOverlap } from "@/lib/validation";
import { ConfigTable, Toolbar } from "./ConfigTable";

interface Form { label: string; minAge: number | null; maxAge: number | null }
type Errors = Partial<Record<keyof Form | "form", string>>;

export function VehicleAgeConfiguration() {
  const db = useDb();
  const { run } = useInsurance();
  const [editing, setEditing] = useState<VehicleAgeRange | "new" | null>(null);
  const [form, setForm] = useState<Form>({ label: "", minAge: null, maxAge: null });
  const [errors, setErrors] = useState<Errors>({});
  const [toDelete, setToDelete] = useState<VehicleAgeRange | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => db.ageRanges.slice().sort((a, b) => a.minAge - b.minAge), [db.ageRanges]);
  const gaps = useMemo(() => findGaps(rows.map((r) => ({ min: r.minAge, max: r.maxAge }))), [rows]);

  const open = (r: VehicleAgeRange | "new") => {
    setEditing(r);
    setForm(r === "new" ? { label: "", minAge: null, maxAge: null } : { label: r.label, minAge: r.minAge, maxAge: r.maxAge });
    setErrors({});
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.label.trim()) e.label = "Label is required";
    const r = checkRange(form.minAge, form.maxAge, "Year");
    if (r) e[form.minAge == null || r.startsWith("From") ? "minAge" : "maxAge"] = r;
    if (!r) {
      const others = db.ageRanges.filter((a) => editing === "new" || a.id !== (editing as VehicleAgeRange | null)?.id);
      const clash = findOverlap(others, { min: form.minAge as number, max: form.maxAge }, (a) => ({ min: a.minAge, max: a.maxAge }));
      if (clash) e.minAge = `Overlaps with "${clash.label}" (${describeRange({ min: clash.minAge, max: clash.maxAge }, " yr")})`;
    }
    return e;
  };

  const save = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await run(() => api.saveAgeRange({ id: editing === "new" || !editing ? undefined : editing.id, ...form }), "Vehicle age range saved");
    setBusy(false);
    if (r.ok) setEditing(null);
    else setErrors({ form: r.error });
  };

  return (
    <>
      <Toolbar>
        <p className="text-sm text-subtle">Ranges are in whole years and inclusive (e.g. 0 – 5 and 6 – 10).</p>
        <Button variant="primary" onClick={() => open("new")}><Plus className="h-4 w-4" />Add New</Button>
      </Toolbar>
      {gaps.length > 0 && (
        <p className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" /> No range covers {gaps.map((g) => describeRange(g, " yr")).join(", ")} – vehicles of that age will have no rate.
        </p>
      )}
      <ConfigTable
        columns={[
          { header: "Label", cell: (r) => r.label },
          { header: "From Year", cell: (r) => r.minAge },
          { header: "To Year", cell: (r) => r.maxAge ?? "No limit" },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        onEdit={open}
        onDelete={setToDelete}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New Vehicle Age" : "Edit Vehicle Age"} width="max-w-[560px]"
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>Save</Button></>}>
        <div className="flex flex-col gap-4">
          {errors.form && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
          <Field label="Label" required error={errors.label} htmlFor="age-label">
            <TextInput id="age-label" value={form.label} invalid={!!errors.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. 5-10 Years" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From Year" required error={errors.minAge}>
              <NumberInput integer suffix="yr" value={form.minAge} invalid={!!errors.minAge} onChange={(v) => setForm({ ...form, minAge: v })} aria-label="From Year" />
            </Field>
            <Field label="To Year" error={errors.maxAge} hint="Leave empty for “no upper limit”.">
              <NumberInput integer suffix="yr" value={form.maxAge} invalid={!!errors.maxAge} onChange={(v) => setForm({ ...form, maxAge: v })} aria-label="To Year" />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Delete vehicle age range" busy={busy}
        message={<>Delete <b>{toDelete?.label}</b>? Its column will also be removed from the Rate Matrix.</>}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { setBusy(true); await run(() => api.deleteAgeRange(toDelete!.id), "Vehicle age range deleted"); setBusy(false); setToDelete(null); }} />
    </>
  );
}
