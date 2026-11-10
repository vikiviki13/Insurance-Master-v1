import { useEffect, useState } from "react";
import type { VehicleConfiguration, VehicleFuelType } from "@/types/vehicleConfiguration";
import { Button } from "../ui/Button";
import { Field, NumberInput, TextInput } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { useToast } from "../ui/Toast";
import * as service from "@/services/vehicleConfigurationService";

const fuels: VehicleFuelType[] = ["Petrol", "Diesel", "CNG", "LPG", "Electric", "Hybrid"];
type Draft = Omit<VehicleConfiguration, "id" | "createdAt" | "updatedAt">;
const blank: Draft = { brand: "", model: "", variant: "", category: "", fuelType: "Petrol", transmission: "Manual", engineCc: undefined, exShowroomPrice: 0, status: "active" };

export function VehicleConfigurationForm({ open, vehicle, onClose, onSaved }: { open: boolean; vehicle?: VehicleConfiguration; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState("");
  useEffect(() => { setDraft(vehicle ? { ...vehicle } : blank); setError(""); }, [vehicle, open]);
  const patch = (value: Partial<Draft>) => setDraft((d) => ({ ...d, ...value }));
  const save = () => {
    try { service.saveVehicleConfiguration(draft, vehicle?.id); toast.success(vehicle ? "Vehicle configuration updated" : "Vehicle configuration saved"); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save vehicle configuration"); }
  };
  return <Modal open={open} onClose={onClose} title={vehicle ? "Edit Vehicle Configuration" : "Add Vehicle Configuration"} width="max-w-[760px]" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save Vehicle</Button></>}>
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <section><h3 className="mb-3 text-sm font-semibold text-ink">Vehicle Information</h3><div className="grid gap-4 md:grid-cols-2">
        <Field label="Brand / Manufacturer" required><TextInput value={draft.brand} onChange={(e) => patch({ brand: e.target.value })} placeholder="e.g. Hyundai" /></Field>
        <Field label="Vehicle Model" required><TextInput value={draft.model} onChange={(e) => patch({ model: e.target.value })} placeholder="e.g. Creta" /></Field>
        <Field label="Variant" required><TextInput value={draft.variant} onChange={(e) => patch({ variant: e.target.value })} placeholder="e.g. SX (O)" /></Field>
        <Field label="Vehicle Category" required><TextInput value={draft.category} onChange={(e) => patch({ category: e.target.value })} placeholder="e.g. SUV" /></Field>
      </div><p className="mt-3 text-sm text-muted">Vehicle name preview: <span className="font-medium text-ink">{[draft.brand, draft.model, draft.variant].filter(Boolean).join(" ") || "—"}</span></p></section>
      <section><h3 className="mb-3 text-sm font-semibold text-ink">Vehicle Specifications</h3><div className="grid gap-4 md:grid-cols-3">
        <Field label="Fuel Type" required><Select value={draft.fuelType} onChange={(v) => patch({ fuelType: v as VehicleFuelType })} options={fuels.map((v) => ({ value: v, label: v }))} /></Field>
        <Field label="Transmission" required><Select value={draft.transmission} onChange={(v) => patch({ transmission: v as Draft["transmission"] })} options={["Manual", "Automatic"].map((v) => ({ value: v, label: v }))} /></Field>
        <Field label="Engine Capacity" hint="CC"><NumberInput value={draft.engineCc ?? null} onChange={(v) => patch({ engineCc: v ?? undefined })} integer placeholder="e.g. 1497" suffix="CC" /></Field>
      </div></section>
      <section><h3 className="mb-3 text-sm font-semibold text-ink">Pricing Information</h3><div className="grid gap-4 md:grid-cols-2">
        <Field label="Ex-Showroom Price" required hint="Amount in Indian Rupees"><NumberInput value={draft.exShowroomPrice} onChange={(v) => patch({ exShowroomPrice: v ?? 0 })} integer prefix="₹" placeholder="0" /></Field>
        <Field label="Status" required><Select value={draft.status} onChange={(v) => patch({ status: v as Draft["status"] })} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} /></Field>
      </div></section>
    </div>
  </Modal>;
}
