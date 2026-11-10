import { AlertTriangle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Field, NumberInput, TextInput } from "../ui/Field";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { useDb, useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import type { CcSlab } from "@/types/insurance";
import { checkRange, describeRange, findGaps, findOverlap } from "@/lib/validation";
import { ConfigTable, Toolbar } from "./ConfigTable";

interface Form { vehicleTypeId: string; name: string; minCc: number | null; maxCc: number | null }
type Errors = Partial<Record<keyof Form | "form", string>>;

export function CcConfiguration() {
  const db = useDb();
  const { run } = useInsurance();
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<CcSlab | "new" | null>(null);
  const [form, setForm] = useState<Form>({ vehicleTypeId: "", name: "", minCc: null, maxCc: null });
  const [errors, setErrors] = useState<Errors>({});
  const [toDelete, setToDelete] = useState<CcSlab | null>(null);
  const [busy, setBusy] = useState(false);

  const vtName = (id: string) => db.vehicleTypes.find((v) => v.id === id)?.name ?? "—";
  const rows = (filter ? db.ccSlabs.filter((s) => s.vehicleTypeId === filter) : db.ccSlabs).slice().sort((a, b) => a.vehicleTypeId.localeCompare(b.vehicleTypeId) || a.minCc - b.minCc);

  // coverage gaps are only a warning (an engine size in a gap would have no rate)
  const gaps = useMemo(() => {
    if (!filter) return [];
    return findGaps(db.ccSlabs.filter((s) => s.vehicleTypeId === filter).map((s) => ({ min: s.minCc, max: s.maxCc })));
  }, [db.ccSlabs, filter]);

  const open = (s: CcSlab | "new") => {
    setEditing(s);
    setForm(s === "new" ? { vehicleTypeId: filter, name: "", minCc: null, maxCc: null } : { vehicleTypeId: s.vehicleTypeId, name: s.name, minCc: s.minCc, maxCc: s.maxCc });
    setErrors({});
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.vehicleTypeId) e.vehicleTypeId = "Vehicle type is required";
    if (!form.name.trim()) e.name = "Slab name is required";
    const r = checkRange(form.minCc, form.maxCc, "CC");
    if (r) e[form.minCc == null || r.startsWith("From") ? "minCc" : "maxCc"] = r;
    if (!r && form.vehicleTypeId) {
      const others = db.ccSlabs.filter((s) => s.vehicleTypeId === form.vehicleTypeId && (editing === "new" || s.id !== (editing as CcSlab | null)?.id));
      const clash = findOverlap(others, { min: form.minCc as number, max: form.maxCc }, (s) => ({ min: s.minCc, max: s.maxCc }));
      if (clash) e.minCc = `Overlaps with "${clash.name}" (${describeRange({ min: clash.minCc, max: clash.maxCc }, " CC")})`;
    }
    return e;
  };

  const save = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await run(() => api.saveCcSlab({ id: editing === "new" || !editing ? undefined : editing.id, ...form }), "CC slab saved");
    setBusy(false);
    if (r.ok) setEditing(null);
    else setErrors({ form: r.error });
  };

  return (
    <>
      <Toolbar>
        <div className="w-56"><Select aria-label="Filter by vehicle type" value={filter} onChange={setFilter} placeholder="All vehicle types" options={db.vehicleTypes.map((v) => ({ value: v.id, label: v.name }))} /></div>
        <Button variant="primary" onClick={() => open("new")}><Plus className="h-4 w-4" />Add New</Button>
      </Toolbar>
      {gaps.length > 0 && (
        <p className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" /> No slab covers {gaps.map((g) => describeRange(g, " CC")).join(", ")} – vehicles in that range will have no rate.
        </p>
      )}
      <ConfigTable
        columns={[
          { header: "Slab Name", cell: (r) => r.name },
          { header: "Vehicle Type", cell: (r) => vtName(r.vehicleTypeId) },
          { header: "From CC", cell: (r) => r.minCc },
          { header: "To CC", cell: (r) => r.maxCc ?? "No limit" },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        onEdit={open}
        onDelete={setToDelete}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New CC Slab" : "Edit CC Slab"} width="max-w-[560px]"
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>Save</Button></>}>
        <div className="flex flex-col gap-4">
          {errors.form && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
          <Field label="Vehicle Type" required error={errors.vehicleTypeId}>
            <Select value={form.vehicleTypeId} invalid={!!errors.vehicleTypeId} onChange={(v) => setForm({ ...form, vehicleTypeId: v })} options={db.vehicleTypes.map((v) => ({ value: v.id, label: v.name }))} placeholder="Select vehicle type" />
          </Field>
          <Field label="Slab Name" required error={errors.name} htmlFor="cc-name">
            <TextInput id="cc-name" value={form.name} invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 1000 to 1500 CC" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From CC" required error={errors.minCc}>
              <NumberInput integer suffix="CC" value={form.minCc} invalid={!!errors.minCc} onChange={(v) => setForm({ ...form, minCc: v })} aria-label="From CC" />
            </Field>
            <Field label="To CC" error={errors.maxCc} hint="Leave empty for “no upper limit”.">
              <NumberInput integer suffix="CC" value={form.maxCc} invalid={!!errors.maxCc} onChange={(v) => setForm({ ...form, maxCc: v })} aria-label="To CC" />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Delete CC slab" busy={busy}
        message={<>Delete <b>{toDelete?.name}</b>? Its row will also be removed from the Rate Matrix.</>}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { setBusy(true); await run(() => api.deleteCcSlab(toDelete!.id), "CC slab deleted"); setBusy(false); setToDelete(null); }} />
    </>
  );
}
