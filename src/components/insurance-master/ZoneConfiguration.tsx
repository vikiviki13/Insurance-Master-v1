import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Field, TextInput } from "../ui/Field";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { MultiSelect } from "../ui/MultiSelect";
import { Select } from "../ui/Select";
import { Badge } from "../ui/misc";
import { useDb, useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import type { Zone } from "@/types/insurance";
import { ConfigTable, Toolbar } from "./ConfigTable";

interface Form { name: string; vehicleTypeId: string; branchIds: string[] }
const empty = (vt = ""): Form => ({ name: "", vehicleTypeId: vt, branchIds: [] });

export function ZoneConfiguration() {
  const db = useDb();
  const { run } = useInsurance();
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Zone | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty());
  const [errors, setErrors] = useState<Partial<Record<keyof Form | "form", string>>>({});
  const [toDelete, setToDelete] = useState<Zone | null>(null);
  const [busy, setBusy] = useState(false);

  const vtName = (id: string) => db.vehicleTypes.find((v) => v.id === id)?.name ?? "—";
  const rows = filter ? db.zones.filter((z) => z.vehicleTypeId === filter) : db.zones;
  const branchName = (id: string) => db.branches.find((b) => b.id === id)?.name ?? id;

  // branches already used by another zone of the same vehicle type cannot be picked again
  const disabledOptions = useMemo(() => {
    const m: Record<string, string> = {};
    db.zones
      .filter((z) => z.vehicleTypeId === form.vehicleTypeId && (editing === "new" || z.id !== (editing as Zone | null)?.id))
      .forEach((z) => z.branchIds.forEach((b) => (m[b] = z.name)));
    return m;
  }, [db.zones, form.vehicleTypeId, editing]);

  const open = (z: Zone | "new") => {
    setEditing(z);
    setForm(z === "new" ? empty(filter) : { name: z.name, vehicleTypeId: z.vehicleTypeId, branchIds: z.branchIds });
    setErrors({});
  };

  const save = async () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Zone name is required";
    if (!form.vehicleTypeId) e.vehicleTypeId = "Vehicle type is required";
    if (form.branchIds.length === 0) e.branchIds = "Select at least one branch";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await run(() => api.saveZone({ id: editing === "new" || !editing ? undefined : editing.id, ...form }), "Zone saved");
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
          { header: "Zone Name", cell: (r) => r.name },
          { header: "Vehicle Type", cell: (r) => vtName(r.vehicleTypeId) },
          {
            header: "Branches",
            cell: (r) => (
              <div className="flex flex-wrap items-center gap-1.5">
                {r.branchIds.slice(0, 3).map((b, i) => <Badge key={b} tone={i === 0 ? "gray" : "blue"}>{branchName(b)}</Badge>)}
                {r.branchIds.length > 3 && <Badge tone="gray">+{r.branchIds.length - 3}</Badge>}
              </div>
            ),
          },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        onEdit={open}
        onDelete={setToDelete}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New Zone" : "Edit Zone"} width="max-w-[520px]"
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>Save</Button></>}>
        <div className="flex flex-col gap-4">
          {errors.form && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
          <Field label="Zone Name" required error={errors.name} htmlFor="zone-name">
            <TextInput id="zone-name" value={form.name} invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Zone C" />
          </Field>
          <Field label="Vehicle Type" required error={errors.vehicleTypeId}>
            <Select value={form.vehicleTypeId} invalid={!!errors.vehicleTypeId} onChange={(v) => setForm({ ...form, vehicleTypeId: v, branchIds: [] })} options={db.vehicleTypes.map((v) => ({ value: v.id, label: v.name }))} placeholder="Select vehicle type" />
          </Field>
          <Field label="Applicable Branches" required error={errors.branchIds} hint="A branch can belong to only one zone per vehicle type.">
            <MultiSelect values={form.branchIds} invalid={!!errors.branchIds} onChange={(v) => setForm({ ...form, branchIds: v })} options={db.branches.map((b) => ({ value: b.id, label: b.name }))} disabledOptions={disabledOptions} placeholder={form.vehicleTypeId ? "Select branches" : "Select a vehicle type first"} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Delete zone" busy={busy}
        message={<>Delete <b>{toDelete?.name}</b> ({toDelete && vtName(toDelete.vehicleTypeId)})? Its columns will also be removed from the Rate Matrix.</>}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { setBusy(true); await run(() => api.deleteZone(toDelete!.id), "Zone deleted"); setBusy(false); setToDelete(null); }} />
    </>
  );
}
