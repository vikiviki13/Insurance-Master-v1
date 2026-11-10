import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, NumberInput, TextInput } from "../ui/Field";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { useDb, useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import type { PolicyStructure } from "@/types/insurance";
import { ConfigTable, Toolbar } from "./ConfigTable";

interface Form { name: string; odYears: number | null; tpYears: number | null }
type Errors = Partial<Record<keyof Form | "form", string>>;

/** Policy structures such as 1 + 1 or 3 + 3. New structures can be added at any time. */
export function PolicyStructureSection() {
  const db = useDb();
  const { run } = useInsurance();
  const [editing, setEditing] = useState<PolicyStructure | "new" | null>(null);
  const [form, setForm] = useState<Form>({ name: "", odYears: null, tpYears: null });
  const [errors, setErrors] = useState<Errors>({});
  const [toDelete, setToDelete] = useState<PolicyStructure | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (p: PolicyStructure | "new") => {
    setEditing(p);
    setForm(p === "new" ? { name: "", odYears: 1, tpYears: 1 } : { name: p.name, odYears: p.odYears, tpYears: p.tpYears });
    setErrors({});
  };

  const save = async () => {
    const e: Errors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.odYears || form.odYears < 1 || form.odYears > 10) e.odYears = "Enter 1 to 10 years";
    if (!form.tpYears || form.tpYears < 1 || form.tpYears > 10) e.tpYears = "Enter 1 to 10 years";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await run(() => api.savePolicyStructure({ id: editing === "new" || !editing ? undefined : editing.id, ...form }), "Policy structure saved");
    setBusy(false);
    if (r.ok) setEditing(null);
    else setErrors({ form: r.error });
  };

  return (
    <>
      <Toolbar>
        <p className="text-sm text-subtle">Each structure sets how many years of Own Damage (OD) and Third Party (TP) cover a policy has.</p>
        <Button variant="primary" onClick={() => open("new")}><Plus className="h-4 w-4" />Add New</Button>
      </Toolbar>
      <ConfigTable
        columns={[
          { header: "Policy Structure", cell: (r) => r.name },
          { header: "Own Damage (years)", cell: (r) => r.odYears },
          { header: "Third Party (years)", cell: (r) => r.tpYears },
        ]}
        rows={db.policyStructures}
        rowKey={(r) => r.id}
        onEdit={open}
        onDelete={setToDelete}
      />
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New Policy Structure" : "Edit Policy Structure"} width="max-w-[520px]"
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>Save</Button></>}>
        <div className="flex flex-col gap-4">
          {errors.form && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
          <Field label="Name" required error={errors.name} htmlFor="ps-name">
            <TextInput id="ps-name" value={form.name} invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 1 + 3" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Own Damage duration" required error={errors.odYears}>
              <NumberInput integer suffix="yr" value={form.odYears} invalid={!!errors.odYears} onChange={(v) => setForm({ ...form, odYears: v })} aria-label="Own damage years" />
            </Field>
            <Field label="Third Party duration" required error={errors.tpYears}>
              <NumberInput integer suffix="yr" value={form.tpYears} invalid={!!errors.tpYears} onChange={(v) => setForm({ ...form, tpYears: v })} aria-label="Third party years" />
            </Field>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!toDelete} title="Delete policy structure" busy={busy} message={<>Delete <b>{toDelete?.name}</b>?</>}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { setBusy(true); await run(() => api.deletePolicyStructure(toDelete!.id), "Policy structure deleted"); setBusy(false); setToDelete(null); }} />
    </>
  );
}
