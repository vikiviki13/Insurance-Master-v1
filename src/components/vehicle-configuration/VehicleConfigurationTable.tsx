import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Search, Trash2, CarFront, FileSpreadsheet } from "lucide-react";
import type { VehicleConfiguration } from "@/types/vehicleConfiguration";
import * as service from "@/services/vehicleConfigurationService";
import { Button, IconButton } from "../ui/Button";
import { ConfirmDialog } from "../ui/Modal";
import { Badge, EmptyState } from "../ui/misc";
import { Select } from "../ui/Select";
import { useToast } from "../ui/Toast";
import { VehicleConfigurationForm } from "./VehicleConfigurationForm";
import { VehicleImportDialog } from "./VehicleImportDialog";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export function VehicleConfigurationTable() {
  const [rows, setRows] = useState(service.getVehicleConfigurations);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [fuel, setFuel] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<VehicleConfiguration | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleting, setDeleting] = useState<VehicleConfiguration>();
  const [menu, setMenu] = useState<string>();
  const toast = useToast();
  const brands = useMemo(() => [...new Set(rows.map((v) => v.brand))].sort(), [rows]);
  const filtered = rows.filter((v) => (!query || [v.brand, v.model, v.variant].some((x) => x.toLowerCase().includes(query.toLowerCase()))) && (!brand || v.brand === brand) && (!fuel || v.fuelType === fuel) && (!status || v.status === status));
  const reload = () => { setRows(service.getVehicleConfigurations()); setFormOpen(false); setEditing(undefined); };
  const remove = () => { if (!deleting) return; try { service.deleteVehicleConfiguration(deleting.id); setRows(service.getVehicleConfigurations()); toast.success("Vehicle configuration deleted"); } catch { toast.error("Unable to delete vehicle configuration"); } setDeleting(undefined); };
  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold text-ink">Vehicle Configuration</h1><p className="mt-1 text-sm text-muted">Configure vehicles and their Ex-Showroom Prices.</p></div><div className="flex gap-2"><Button onClick={() => setImportOpen(true)}><FileSpreadsheet className="h-4 w-4"/>Import Vehicles</Button><Button variant="primary" onClick={() => { setEditing(undefined); setFormOpen(true); }}><Plus className="h-4 w-4" />Add Vehicle</Button></div></header>
    <div className="flex flex-wrap gap-2"><label className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"/><input aria-label="Search brand, model or variant" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brand, model or variant" className="h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-brand" /></label><div className="w-40"><Select aria-label="Filter by brand" value={brand} onChange={setBrand} placeholder="All brands" options={brands.map((v) => ({ value: v, label: v }))} /></div><div className="w-36"><Select aria-label="Filter by fuel" value={fuel} onChange={setFuel} placeholder="All fuel types" options={["Petrol", "Diesel", "CNG", "LPG", "Electric", "Hybrid"].map((v) => ({ value: v, label: v }))} /></div><div className="w-32"><Select aria-label="Filter by status" value={status} onChange={setStatus} placeholder="All statuses" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} /></div></div>
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-zinc-50 text-xs text-muted"><tr>{["Vehicle", "Model", "Variant", "Fuel Type", "Engine CC", "Ex-Showroom Price", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{filtered.map((v) => <tr key={v.id} className="border-t border-line hover:bg-zinc-50/60"><td className="px-4 py-3 font-medium text-ink">{v.brand} {v.model}</td><td className="px-4 py-3">{v.model}</td><td className="px-4 py-3">{v.variant}</td><td className="px-4 py-3">{v.fuelType}</td><td className="px-4 py-3">{v.engineCc?.toLocaleString("en-IN") ?? "—"}</td><td className="px-4 py-3 font-medium">{inr.format(v.exShowroomPrice)}</td><td className="px-4 py-3"><Badge tone={v.status === "active" ? "green" : "gray"}>{v.status === "active" ? "Active" : "Inactive"}</Badge></td><td className="relative px-4 py-3"><IconButton aria-label={`Actions for ${v.brand} ${v.model}`} onClick={() => setMenu(menu === v.id ? undefined : v.id)}><MoreHorizontal className="h-5 w-5" /></IconButton>{menu === v.id && <div className="absolute right-3 top-10 z-10 w-36 rounded-md border border-line bg-white p-1 shadow-lg"><button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-zinc-50" onClick={() => { setEditing(v); setFormOpen(true); setMenu(undefined); }}><Pencil className="h-4 w-4"/>Edit</button><button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-600 hover:bg-red-50" onClick={() => { setDeleting(v); setMenu(undefined); }}><Trash2 className="h-4 w-4"/>Delete</button></div>}</td></tr>)}</tbody></table></div>{filtered.length === 0 && <EmptyState title={rows.length ? "No matching vehicles" : "No vehicles configured"} message={rows.length ? "Adjust the search or filters and try again." : "Add a vehicle to start managing your vehicle configuration and prices."} action={!rows.length && <Button variant="primary" onClick={() => { setEditing(undefined); setFormOpen(true); }}><CarFront className="h-4 w-4"/>Add Vehicle</Button>} />}</div>
    <VehicleConfigurationForm open={formOpen} vehicle={editing} onClose={() => { setFormOpen(false); setEditing(undefined); }} onSaved={reload} />
    <VehicleImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={() => setRows(service.getVehicleConfigurations())} />
    <ConfirmDialog open={!!deleting} title="Delete vehicle configuration" message={<>Delete <b>{deleting?.brand} {deleting?.model} {deleting?.variant}</b>? This cannot be undone.</>} onCancel={() => setDeleting(undefined)} onConfirm={remove} />
  </div>;
}
