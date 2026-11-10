import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Field, TextInput } from "../ui/Field";
import { Select } from "../ui/Select";
import { Card } from "../ui/misc";
import { useDb, useInsurance } from "@/store/InsuranceStore";
import * as api from "@/services/insuranceService";
import { addOnLinesFor, draftFromMaster, draftToInput, emptyDraft, validateDraft, type MasterDraft } from "./draft";
import { PremiumSections } from "./PremiumSections";
import { useToast } from "../ui/Toast";

interface Props {
  /** undefined = create */
  masterId?: string;
  /** draft carried back from Check Configuration so edits are not lost */
  initialDraft?: MasterDraft;
  onBack: () => void;
  onCheck: (draft: MasterDraft) => void;
}

export function InsuranceForm({ masterId, initialDraft, onBack, onCheck }: Props) {
  const db = useDb();
  const { run } = useInsurance();
  const toast = useToast();
  const [draft, setDraft] = useState<MasterDraft>(() => {
    if (initialDraft) return initialDraft;
    const m = masterId ? db.masters.find((x) => x.id === masterId) : undefined;
    return m ? draftFromMaster(db, m) : emptyDraft(db);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(!!initialDraft);

  // warn before a refresh/close would lose edits
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const patch = (p: Partial<MasterDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
    setErrors((e) => {
      const n = { ...e };
      Object.keys(p).forEach((k) => delete n[k]);
      if (p.addOns) Object.keys(n).filter((k) => k.startsWith("addon:")).forEach((k) => delete n[k]);
      return n;
    });
  };

  const validate = () => {
    const e = validateDraft(db, draft, { identity: true, currentId: masterId });
    setErrors(e);
    if (Object.keys(e).length) toast.error("Please fix the highlighted fields");
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    const r = await run(() => api.saveMaster(draftToInput(draft), masterId), masterId ? "Insurance master updated" : "Insurance master created");
    setBusy(false);
    if (r.ok) {
      setDirty(false);
      onBack();
    }
  };

  const cancel = () => {
    if (dirty && !window.confirm("Discard your changes?")) return;
    setDirty(false);
    onBack();
  };

  return (
    <>
      <button onClick={cancel} className="mb-3 flex items-center gap-2 text-[17px] font-semibold text-ink hover:text-brand">
        <ArrowLeft className="h-5 w-5" /> Insurance Master
      </button>
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-ink">Insurance Master</h2>
        <div className="mb-6 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-3">
          <Field label="Insurance Name" required error={errors.name} htmlFor="im-name">
            <TextInput id="im-name" value={draft.name} invalid={!!errors.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Comprehensive 1+1" />
          </Field>
          <Field label="Vehicle Type" required error={errors.vehicleTypeId}>
            <Select value={draft.vehicleTypeId} invalid={!!errors.vehicleTypeId}
              onChange={(v) => patch({ vehicleTypeId: v, addOns: addOnLinesFor(db, v) })} options={db.vehicleTypes.map((v) => ({ value: v.id, label: v.name }))} placeholder="Select vehicle type" />
          </Field>
        </div>

        <PremiumSections draft={draft} onChange={patch} errors={errors} addOnDefs={db.addOns} policies={db.policyStructures} breakdown={null} odPercentage={null} cngLpgVehicle={null} />

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button onClick={cancel} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          <Button onClick={() => validate() && onCheck(draft)} disabled={busy}>Check Configuration</Button>
        </div>
      </Card>
    </>
  );
}
