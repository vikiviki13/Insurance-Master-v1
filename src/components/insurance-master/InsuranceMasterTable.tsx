import { Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, IconButton } from "../ui/Button";
import { ConfirmDialog } from "../ui/Modal";
import { Switch } from "../ui/Switch";
import { Badge, Card, EmptyState, Pagination, Spinner } from "../ui/misc";
import { useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import type { InsuranceMaster } from "@/types/insurance";

const PAGE_SIZE = 5;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

interface Props {
  onNew: () => void;
  onView: (id: string) => void;
}

/** Insurance Master list – one card per master, as in the design. */
export function InsuranceMasterTable({ onNew, onView }: Props) {
  const { db, loading, run, reset } = useInsurance();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<InsuranceMaster | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    if (!db) return [];
    const needle = q.trim().toLowerCase();
    const list = db.masters.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!needle) return list;
    return list.filter((m) => {
      const vt = db.vehicleTypes.find((v) => v.id === m.vehicleTypeId)?.name ?? "";
      const ps = db.policyStructures.find((p) => p.id === m.policyStructureId)?.name ?? "";
      const zones = db.zones.filter((z) => z.vehicleTypeId === m.vehicleTypeId).map((z) => z.name).join(" ");
      return [m.name, m.insuranceCompany, vt, ps, zones, m.status].join(" ").toLowerCase().includes(needle);
    });
  }, [db, q]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <label className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input aria-label="Search insurance masters" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by name, company, vehicle type, zone or policy"
            className="h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </label>
        <div className="flex gap-2">
          <Button onClick={() => { void reset(); setPage(1); }}><RotateCcw className="h-4 w-4" />Reset Demo Data</Button>
          <Button variant="primary" onClick={onNew}><Plus className="h-4 w-4" />New Insurance Master</Button>
        </div>
      </div>

      {loading || !db ? (
        <Card><Spinner label="Loading insurance masters…" /></Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState title={q ? "No matching insurance masters" : "No insurance masters yet"} message={q ? "Try a different search term." : "Create your first insurance master to start configuring premiums."}
            action={!q && <Button variant="primary" onClick={onNew}><Plus className="h-4 w-4" />New Insurance Master</Button>} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((m) => {
            const vt = db.vehicleTypes.find((v) => v.id === m.vehicleTypeId)?.name;
            const ps = db.policyStructures.find((p) => p.id === m.policyStructureId)?.name;
            return (
              <li key={m.id}>
                <Card className="flex flex-wrap items-center gap-4 px-6 py-5">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[17px] font-semibold text-ink">{m.name}</h3>
                    <p className="mt-1 text-sm text-muted">Created on : {fmtDate(m.createdAt)}</p>
                    <p className="mt-1 text-xs text-subtle">{[m.insuranceCompany, vt, ps && `Policy ${ps}`].filter(Boolean).join("  ·  ")}</p>
                  </div>
                  <Badge tone={m.status === "active" ? "green" : "gray"}>{m.status === "active" ? "Active" : "Inactive"}</Badge>
                  <Switch checked={m.status === "active"} label={`Toggle ${m.name} status`}
                    onChange={(v) => run(() => api.setMasterStatus(m.id, v ? "active" : "inactive"), v ? "Insurance master activated" : "Insurance master deactivated")} />
                  <Button onClick={() => onView(m.id)}>View</Button>
                  <IconButton aria-label={`Delete ${m.name}`} tone="danger" onClick={() => setToDelete(m)}><Trash2 className="h-[18px] w-[18px]" /></IconButton>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={current} pageCount={pageCount} onPage={setPage} />

      <ConfirmDialog open={!!toDelete} title="Delete insurance master" busy={busy} message={<>Delete <b>{toDelete?.name}</b>? This cannot be undone.</>}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { setBusy(true); await run(() => api.deleteMaster(toDelete!.id), "Insurance master deleted"); setBusy(false); setToDelete(null); }} />
    </>
  );
}
