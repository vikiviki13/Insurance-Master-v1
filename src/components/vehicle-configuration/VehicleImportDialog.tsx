import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import * as service from "@/services/vehicleConfigurationService";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";
import { downloadVehicleTemplate, parseVehicleFile, type ImportRow } from "./vehicleImport";

export function VehicleImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const counts = useMemo(() => ({ total: rows.length, valid: rows.filter((r) => r.data).length, invalid: rows.filter((r) => r.errors.length).length, duplicate: rows.filter((r) => r.duplicate).length }), [rows]);
  const resetAndClose = () => { setRows([]); setFileName(""); setError(""); onClose(); };
  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) { setError("Choose a CSV or XLSX file."); return; }
    setBusy(true); setError(""); setRows([]); setFileName(file.name);
    try { setRows(await parseVehicleFile(file)); } catch (e) { setError(e instanceof Error ? e.message : "Could not read the file."); }
    finally { setBusy(false); }
  };
  const importValid = () => {
    const valid = rows.flatMap((r) => r.data ? [r.data] : []);
    if (!valid.length) return;
    try { service.importVehicleConfigurations(valid); toast.success(`${valid.length} vehicle${valid.length === 1 ? "" : "s"} imported`); onImported(); resetAndClose(); }
    catch { setError("Unable to save imported vehicles. Check browser storage and try again."); }
  };
  return <Modal open={open} onClose={resetAndClose} title="Import Vehicles" width="max-w-[850px]" footer={<><Button onClick={resetAndClose}>Cancel</Button><Button variant="primary" onClick={importValid} disabled={busy || counts.valid === 0}><Upload className="h-4 w-4"/>Import {counts.valid || "Valid"} Vehicles</Button></>}>
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-zinc-50 p-4"><div><p className="text-sm font-medium text-ink">Start with the import template</p><p className="mt-1 text-xs text-muted">Use the provided columns. Required fields are marked in the preview when missing.</p></div><div className="flex gap-2"><Button size="sm" onClick={() => downloadVehicleTemplate("csv")}><Download className="h-4 w-4"/>CSV</Button><Button size="sm" onClick={() => downloadVehicleTemplate("xlsx")}><Download className="h-4 w-4"/>XLSX</Button></div></div>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center hover:border-brand"><FileSpreadsheet className="h-6 w-6 text-brand"/><span className="text-sm font-medium text-ink">{busy ? "Reading file…" : fileName || "Choose a CSV or XLSX file"}</span><span className="text-xs text-muted">First worksheet is used for XLSX</span><input className="sr-only" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => { void chooseFile(e.target.files?.[0]); e.currentTarget.value = ""; }}/></label>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {rows.length > 0 && <><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Total", counts.total], ["Valid", counts.valid], ["Invalid", counts.invalid], ["Duplicates", counts.duplicate]].map(([label, count]) => <div key={label} className="rounded-md border border-line px-3 py-2"><p className="text-xs text-muted">{label}</p><p className="mt-0.5 text-lg font-semibold text-ink">{count}</p></div>)}</div><div className="max-h-64 overflow-auto rounded-lg border border-line"><table className="w-full min-w-[650px] text-left text-xs"><thead className="sticky top-0 bg-zinc-50 text-muted"><tr>{["Row", "Vehicle", "Fuel / Transmission", "Price", "Result"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.row} className="border-t border-line align-top"><td className="px-3 py-2">{r.row}</td><td className="px-3 py-2">{r.data ? `${r.data.brand} ${r.data.model} ${r.data.variant}` : "—"}</td><td className="px-3 py-2">{r.data ? `${r.data.fuelType} / ${r.data.transmission}` : "—"}</td><td className="px-3 py-2">{r.data?.exShowroomPrice.toLocaleString("en-IN") ?? "—"}</td><td className="px-3 py-2">{r.duplicate ? <span className="text-amber-700">Duplicate configuration</span> : r.errors.length ? <span className="text-red-700">{r.errors.join("; ")}</span> : <span className="text-green-700">Ready to import</span>}</td></tr>)}</tbody></table></div></>}
    </div>
  </Modal>;
}
