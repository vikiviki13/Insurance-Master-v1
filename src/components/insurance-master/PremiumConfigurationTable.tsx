import { AlertTriangle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, IconButton } from "../ui/Button";
import { ConfirmDialog } from "../ui/Modal";
import { Select } from "../ui/Select";
import { EmptyState } from "../ui/misc";
import { useDb, useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import { rateKey, type CcSlab, type RateMatrixEntry } from "@/types/insurance";
import { formatINR } from "@/lib/utils";
import { ConfigurationModal } from "./ConfigurationModal";
import { Toolbar } from "./ConfigTable";

/**
 * Rate Matrix: rows = CC slabs, columns = (zone x vehicle age) OD rates + TP / PA amounts.
 * The grid is *derived* from the configured zones, CC slabs and age ranges – add or remove any of
 * them and the matrix re-shapes itself. "Generate Matrix" persists the missing rows/cells.
 */
export function PremiumConfigurationTable() {
  const db = useDb();
  const { run } = useInsurance();
  const [vtId, setVtId] = useState(db.vehicleTypes.find((v) => v.id === "vt_4w")?.id ?? db.vehicleTypes[0]?.id ?? "");
  const [modal, setModal] = useState<{ entry: RateMatrixEntry | null } | null>(null);
  const [toDelete, setToDelete] = useState<RateMatrixEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const zones = useMemo(() => db.zones.filter((z) => z.vehicleTypeId === vtId), [db.zones, vtId]);
  const ages = useMemo(() => db.ageRanges.slice().sort((a, b) => a.minAge - b.minAge), [db.ageRanges]);
  const slabs = useMemo(() => db.ccSlabs.filter((s) => s.vehicleTypeId === vtId).sort((a, b) => a.minCc - b.minCc), [db.ccSlabs, vtId]);
  const entryFor = (s: CcSlab) => db.rateMatrix.find((r) => r.ccSlabId === s.id);

  const missing = useMemo(() => {
    let rows = 0, cells = 0;
    for (const s of slabs) {
      const e = entryFor(s);
      if (!e) { rows++; continue; }
      for (const z of zones) for (const a of ages) if (e.odRates[rateKey(z.id, a.id)] == null) cells++;
    }
    return { rows, cells };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slabs, zones, ages, db.rateMatrix]);

  const generate = async () => {
    setBusy(true);
    await run(async () => (await api.syncRateMatrix(vtId)).db, "Rate matrix generated for the current zones, CC slabs and vehicle ages");
    setBusy(false);
  };

  const th = "whitespace-nowrap px-4 py-2 text-center text-xs font-medium text-ink";
  const money = (v: number | undefined) => (v == null ? <span className="text-zinc-300">—</span> : formatINR(v).replace("₹ ", "₹"));
  const noColumns = zones.length === 0 || ages.length === 0;

  return (
    <>
      <Toolbar>
        <div className="w-56"><Select aria-label="Vehicle type" value={vtId} onChange={setVtId} placeholder="Vehicle type" options={db.vehicleTypes.map((v) => ({ value: v.id, label: v.name }))} /></div>
        <div className="flex gap-2">
          <Button onClick={generate} disabled={busy || !vtId} title="Create any missing rows / cells for the current zones, CC slabs and vehicle ages">
            <RefreshCw className="h-4 w-4" />Generate Matrix
          </Button>
          <Button variant="primary" onClick={() => setModal({ entry: null })} disabled={!vtId}><Plus className="h-4 w-4" />Add New</Button>
        </div>
      </Toolbar>

      {(missing.rows > 0 || missing.cells > 0) && (
        <p className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {missing.rows > 0 && `${missing.rows} CC slab(s) have no rate row. `}
          {missing.cells > 0 && `${missing.cells} rate cell(s) are not set. `}
          Click “Generate Matrix” to create them, then fill in the rates.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-[#DADADA] bg-white shadow-card">
        {slabs.length === 0 || noColumns ? (
          <EmptyState title="Matrix cannot be generated yet"
            message={slabs.length === 0 ? "Add CC slabs for this vehicle type in the CC Slab tab." : zones.length === 0 ? "Add zones for this vehicle type in the Zone tab." : "Add vehicle age ranges in the Vehicle Model Age tab."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr className="bg-[#F1F1F1]">
                  <th rowSpan={2} className="sticky left-0 z-10 min-w-[170px] bg-[#F1F1F1] px-4 text-left text-xs font-medium text-ink">CC Slab</th>
                  {zones.map((z) => <th key={z.id} colSpan={ages.length} className={`${th} border-l border-white`}>{z.name} <span className="font-normal text-subtle">(% of IDV)</span></th>)}
                  {["TP (₹)", "Owner PA (₹)", "Driver PA (₹)", "Seaters PA (₹/seat)"].map((h) => <th key={h} rowSpan={2} className={`${th} border-l border-white`}>{h}</th>)}
                  <th rowSpan={2} className={`${th} border-l border-white`}>Actions</th>
                </tr>
                <tr className="bg-[#F1F1F1]">
                  {zones.flatMap((z) => ages.map((a) => <th key={rateKey(z.id, a.id)} className={`${th} font-normal`}>{a.label}</th>))}
                </tr>
              </thead>
              <tbody>
                {slabs.map((s) => {
                  const e = entryFor(s);
                  return (
                    <tr key={s.id} className="h-[66px] border-t border-line">
                      <th scope="row" className="sticky left-0 z-10 bg-[#F1F1F1] px-4 text-left text-[15px] font-medium text-ink">{s.name}</th>
                      {zones.flatMap((z) => ages.map((a) => {
                        const v = e?.odRates[rateKey(z.id, a.id)];
                        return <td key={rateKey(z.id, a.id)} className="px-4 text-center">{v == null ? <span className="text-zinc-300">—</span> : `${parseFloat(v.toFixed(3))}`}</td>;
                      }))}
                      <td className="px-4 text-center">{money(e?.tpPremium)}</td>
                      <td className="px-4 text-center">{money(e?.ownerPa)}</td>
                      <td className="px-4 text-center">{money(e?.driverPa)}</td>
                      <td className="px-4 text-center">{money(e?.seatersPaPerHead)}</td>
                      <td className="px-4">
                        <div className="flex justify-center gap-1">
                          <IconButton aria-label={`Edit ${s.name}`} onClick={() => setModal({ entry: e ?? null })} disabled={!e}><Pencil className="h-[18px] w-[18px]" /></IconButton>
                          {e && <IconButton aria-label={`Delete ${s.name}`} tone="danger" onClick={() => setToDelete(e)}><Trash2 className="h-[18px] w-[18px]" /></IconButton>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfigurationModal open={!!modal} onClose={() => setModal(null)} vehicleTypeId={vtId} entry={modal?.entry ?? null} />
      <ConfirmDialog open={!!toDelete} title="Delete rate row" busy={busy}
        message={<>Delete the rate row for <b>{db.ccSlabs.find((s) => s.id === toDelete?.ccSlabId)?.name}</b>? The CC slab itself is kept.</>}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { setBusy(true); await run(() => api.deleteRateEntry(toDelete!.id), "Rate row deleted"); setBusy(false); setToDelete(null); }} />
    </>
  );
}
