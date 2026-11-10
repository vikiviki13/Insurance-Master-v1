import { Plus } from "lucide-react";
import { useState } from "react";
import { useDb, useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import type { Branch } from "@/types/insurance";
import { Button } from "../ui/Button";
import { Field, TextInput } from "../ui/Field";
import { ConfirmDialog, Modal } from "../ui/Modal";
import { ConfigTable, Toolbar } from "./ConfigTable";

export function BranchConfiguration() {
  const db = useDb();
  const { run } = useInsurance();
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Branch | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (branch: Branch | "new") => {
    setEditing(branch);
    setName(branch === "new" ? "" : branch.name);
    setError("");
  };
  const save = async () => {
    if (!name.trim()) { setError("Branch name is required"); return; }
    setBusy(true);
    const result = await run(() => api.saveBranch({ id: editing === "new" || !editing ? undefined : editing.id, name }), "Branch saved");
    setBusy(false);
    if (result.ok) setEditing(null); else setError(result.error);
  };

  return <>
    <Toolbar><span className="text-sm text-muted">Manage branches used in zones</span><Button variant="primary" onClick={() => open("new")}><Plus className="h-4 w-4" />Add Branch</Button></Toolbar>
    <ConfigTable columns={[{ header: "Branch Name", cell: (branch) => branch.name }]} rows={db.branches} rowKey={(branch) => branch.id} onEdit={open} onDelete={setToDelete} />
    <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add Branch" : "Edit Branch"} width="max-w-[460px]" footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>Save</Button></>}>
      <Field label="Branch Name" required error={error} htmlFor="branch-name"><TextInput id="branch-name" value={name} invalid={!!error} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="Enter branch name" /></Field>
    </Modal>
    <ConfirmDialog open={!!toDelete} title="Delete branch" busy={busy} message={<>Delete <b>{toDelete?.name}</b>? Branches assigned to zones must first be removed from those zones.</>} onCancel={() => setToDelete(null)} onConfirm={async () => { setBusy(true); await run(() => api.deleteBranch(toDelete!.id), "Branch deleted"); setBusy(false); setToDelete(null); }} />
  </>;
}
