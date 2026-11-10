import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, NumberInput, TextArea, TextInput } from "../ui/Field";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { useDb, useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import type { AddOn } from "@/types/insurance";
import { checkPercent } from "@/lib/validation";
import { ConfigTable, Toolbar } from "./ConfigTable";

interface Form { vehicleTypeId: string; name: string; abbreviation: string; percentage: number | null; description: string }
type Errors = Partial<Record<keyof Form | "form", string>>;
const blank = (vt = ""): Form => ({ vehicleTypeId: vt, name: "", abbreviation: "", percentage: null, description: "" });

export function AddOnConfiguration() {
  const db = useDb();
  const { run } = useInsurance();
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<AddOn | "new" | null>(null);
  const [form, setForm] = useState<Form>(blank());
  const [errors, setErrors] = useState<Errors>({});
  const [toDelete, setToDelete] = useState<AddOn | null>(null);
  const [busy, setBusy] = useState(false);

  const vtName = (id: string) => db.vehicleTypes.find((v) => v.id === id)?.name ?? "—";
  const rows = filter ? db.addOns.filter((a) => a.vehicleTypeId === filter) : db.addOns;

  const open = (a: AddOn | "new") => {
    setEditing(a);
    setForm(a === "new" ? blank(filter) : { vehicleTypeId: a.vehicleTypeId, name: a.name, abbreviation: a.abbreviation, percentage: a.percentage, description: a.description });
    setErrors({});
  };

  const save = async () => {
    const e: Errors = {};
    if (!form.vehicleTypeId) e.vehicleTypeId = "Vehicle type is required";
    if (!form.name.trim()) e.name = "Add-on name is required";
    if (!form.abbreviation.trim()) e.abbreviation = "Abbreviation is required";
    const p = checkPercent("Percentage", form.percentage);
    if (p) e.percentage = p;
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await run(() => api.saveAddOn({ id: editing === "new" || !editing ? undefined : editing.id, ...form }), "Add-on saved");
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
      <ConfigTable
        columns={[
          { header: "Add-on Name", cell: (r) => r.name },
          { header: "Abbreviation", cell: (r) => <span className="font-medium">{r.abbreviation}</span> },
          { header: "Vehicle Type", cell: (r) => vtName(r.vehicleTypeId) },
          { header: "Percentage", cell: (r) => `${r.percentage}%` },
          { header: "Description", cell: (r) => r.description },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        onEdit={open}
        onDelete={setToDelete}
      />
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New Add-On" : "Edit Add-On"} width="max-w-[560px]"
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>Save</Button></>}>
        <div className="flex flex-col gap-4">
          {errors.form && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
          <Field label="Vehicle Type" required error={errors.vehicleTypeId}>
            <Select value={form.vehicleTypeId} invalid={!!errors.vehicleTypeId} onChange={(v) => setForm({ ...form, vehicleTypeId: v })} options={db.vehicleTypes.map((v) => ({ value: v.id, label: v.name }))} placeholder="Select vehicle type" />
          </Field>
          <Field label="Add-on Name" required error={errors.name} htmlFor="ao-name">
            <TextInput id="ao-name" value={form.name} invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Abbreviation" required error={errors.abbreviation} htmlFor="ao-abbr">
              <TextInput id="ao-abbr" maxLength={6} value={form.abbreviation} invalid={!!errors.abbreviation} onChange={(e) => setForm({ ...form, abbreviation: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Percentage (% of IDV)" required error={errors.percentage}>
              <NumberInput suffix="%" value={form.percentage} invalid={!!errors.percentage} onChange={(v) => setForm({ ...form, percentage: v })} aria-label="Percentage" />
            </Field>
          </div>
          <Field label="Description" required error={errors.description} htmlFor="ao-desc">
            <TextArea id="ao-desc" value={form.description} invalid={!!errors.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
      </Modal>
      <ConfirmDialog open={!!toDelete} title="Delete add-on" busy={busy} message={<>Delete <b>{toDelete?.name}</b>? It will also be removed from insurance masters that use it.</>}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { setBusy(true); await run(() => api.deleteAddOn(toDelete!.id), "Add-on deleted"); setBusy(false); setToDelete(null); }} />
    </>
  );
}
