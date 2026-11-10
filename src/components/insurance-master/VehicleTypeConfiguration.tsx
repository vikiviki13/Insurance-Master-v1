import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Field, TextInput } from "../ui/Field";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { useDb, useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import type { VehicleType } from "@/types/insurance";
import { ConfigTable, Toolbar } from "./ConfigTable";

export function VehicleTypeConfiguration() {
  const db = useDb();
  const { run } = useInsurance();
  const [editing, setEditing] = useState<VehicleType | "new" | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<VehicleType | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (v: VehicleType | "new") => {
    setEditing(v);
    setName(v === "new" ? "" : v.name);
    setError(null);
  };

  const save = async () => {
    if (!name.trim()) return setError("Vehicle type is required");
    setBusy(true);
    const r = await run(() => api.saveVehicleType({ id: editing === "new" || !editing ? undefined : editing.id, name }), "Vehicle type saved");
    setBusy(false);
    if (r.ok) setEditing(null);
    else setError(r.error);
  };

  return (
    <>
      <ConfigTable
        columns={[{ header: "Vehicle Type", cell: (r) => r.name }]}
        rows={db.vehicleTypes}
        rowKey={(r) => r.id}
        onEdit={open}
        onDelete={setToDelete}
      />
      <Toolbar><Button onClick={() => open("new")}><Plus className="h-4 w-4" />Add New</Button></Toolbar>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New Vehicle Type" : "Edit Vehicle Type"}
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>Save</Button></>}>
        <Field label="Vehicle Type" required error={error} htmlFor="vt-name">
          <TextInput id="vt-name" autoFocus value={name} invalid={!!error} onChange={(e) => { setName(e.target.value); setError(null); }} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="e.g. Three Wheeler" />
        </Field>
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Delete vehicle type" busy={busy} message={<>Delete <b>{toDelete?.name}</b>? This cannot be undone.</>}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          setBusy(true);
          await run(() => api.deleteVehicleType(toDelete!.id), "Vehicle type deleted");
          setBusy(false);
          setToDelete(null);
        }} />
    </>
  );
}
