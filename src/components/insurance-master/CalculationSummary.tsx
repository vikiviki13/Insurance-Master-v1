import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/misc";
import { formatINR, formatPct } from "@/lib/utils";
import type { PremiumBreakdown } from "@/services/calculationService";

export interface SummaryVehicle {
  category: string; model: string; variant: string; engineCc: number;
  zone: string; age: number; fuel: string; seating: number;
}
export interface SummaryData {
  vehicle: SummaryVehicle;
  b: PremiumBreakdown;
  exShowroom: number; idvPct: number; odPct: number; loadingPct: number; discountPct: number;
  policyName: string; tpGstPct: number; addOnGstPct: number; masterName: string;
}

const Stat = ({ label, value, muted }: { label: string; value: ReactNode; muted?: boolean }) => (
  <div>
    <p className="text-xs text-subtle">{label}</p>
    <p className={muted ? "text-[15px] text-subtle" : "text-[15px] font-semibold text-ink"}>{value}</p>
  </div>
);
const Panel = ({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) => (
  <section className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
    <h3 className="border-b border-line bg-zinc-50 px-5 py-3 text-sm font-semibold text-ink">{title}</h3>
    {children}
    {footer}
  </section>
);
const Total = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-end gap-3 bg-zinc-50 px-5 py-3">
    <span className="text-xs text-subtle">{label}</span>
    <span className="text-lg font-bold text-ink">{value}</span>
  </div>
);

/** CSV export of the summary so it opens in Excel. */
function downloadCsv(d: SummaryData) {
  const { b, vehicle: v } = d;
  const rows: (string | number)[][] = [
    ["Insurance Premium Summary", d.masterName],
    [],
    ["Vehicle", `${v.model} ${v.variant}`], ["Category", v.category], ["Engine CC", v.engineCc], ["Zone", v.zone], ["Vehicle age (yrs)", v.age], ["Fuel", v.fuel], ["Seating", v.seating],
    [],
    ["Ex-showroom price", d.exShowroom], ["IDV %", d.idvPct], ["IDV amount", b.idvAmount], ["OD %", d.odPct], ["OD premium", b.odPremium],
    ["CNG/LPG loading %", d.loadingPct], ["CNG/LPG loading amount", b.cngLpgLoadingAmount], ["Discount %", d.discountPct], ["Discount amount", b.discountAmount], ["Total OD", b.totalOd],
    [],
    ["Policy structure", d.policyName], ["TP amount", b.tpAmount], ["Owner PA", b.ownerPaAmount], ["Paid driver PA", b.driverPaAmount], ["Seaters PA", b.seatersAmount], ["LPG kit TP", b.lpgKitAmount],
    ["TP subtotal", b.tpSubtotal], ["TP GST %", d.tpGstPct], ["TP GST amount", b.tpGstAmount], ["Total TP (incl. GST)", b.totalTp],
    [],
    ...b.addOnLines.filter((l) => l.selected).map((l) => [l.name, `${l.ratePercentage}%`, l.premium]),
    ["Add-on subtotal", b.addOnSubtotal], ["Add-on GST %", d.addOnGstPct], ["Add-on GST amount", b.addOnGstAmount], ["Total add-ons", b.totalAddOn],
    [],
    ["TOTAL INSURANCE PREMIUM", b.finalPremium],
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `insurance-premium-${v.model.replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CalculationSummary({ open, onClose, data }: { open: boolean; onClose: () => void; data: SummaryData | null }) {
  if (!data) return null;
  const { b, vehicle: v } = data;
  const selected = b.addOnLines.filter((l) => l.selected);
  return (
    <Modal open={open} onClose={onClose} title="Insurance Premium Summary" titleExtra={<Badge tone="green">Calculated</Badge>} width="max-w-[680px]"
      footer={<><Button onClick={onClose}>Cancel</Button><Button onClick={() => window.print()}>Print</Button><Button variant="primary" onClick={() => downloadCsv(data)}>Download</Button></>}>
      <div className="flex flex-col gap-4">
        <Panel title="Vehicle Information">
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
            <Stat label="Vehicle Category" value={v.category} /><Stat label="Model" value={v.model} /><Stat label="Variant" value={v.variant} /><Stat label="Engine CC" value={`${v.engineCc} CC`} />
            <Stat label="Zone" value={v.zone} /><Stat label="Vehicle Age" value={`${v.age} Year${v.age === 1 ? "" : "s"}`} /><Stat label="Fuel Type" value={v.fuel} /><Stat label="Seating Capacity" value={v.seating} />
          </div>
        </Panel>

        <Panel title="On-Damage Premium" footer={<Total label="Total On-Damage Premium" value={formatINR(b.totalOd)} />}>
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
            <Stat label="Ex-Showroom Price" value={formatINR(data.exShowroom)} /><Stat label="IDV Percentage" value={formatPct(data.idvPct)} /><Stat label="IDV Amount" value={formatINR(b.idvAmount)} />
            <Stat label="OD Percentage" value={formatPct(data.odPct)} /><Stat label="OD Premium Amount" value={formatINR(b.odPremium)} />
            <Stat label="Basic Loading for CNG/LPG" value={b.cngLpgApplicable ? formatPct(data.loadingPct) : "Not Applicable"} muted={!b.cngLpgApplicable} />
            <Stat label="CNG/LPG Loading Amount" value={formatINR(b.cngLpgLoadingAmount)} /><Stat label="Discount" value={formatPct(data.discountPct)} /><Stat label="Discount Amount" value={formatINR(b.discountAmount)} />
          </div>
        </Panel>

        <Panel title="Third-Party Premium" footer={<Total label="Total Third-Party Premium (incl. GST)" value={formatINR(b.totalTp)} />}>
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
            <Stat label="Policy Duration" value={data.policyName} /><Stat label="TP Amount" value={formatINR(b.tpAmount)} />
            <Stat label="LPG Kit TP Premium" value={b.lpgKitApplicable ? formatINR(b.lpgKitAmount) : "Not Applicable"} muted={!b.lpgKitApplicable} />
            <Stat label="Compulsory PA - 15 Lacs" value={b.ownerPaAmount ? formatINR(b.ownerPaAmount) : "Not Applicable"} muted={!b.ownerPaAmount} />
            <Stat label="Seaters Per Head Amount" value={formatINR(b.seatersAmount)} /><Stat label="PA for Paid Driver" value={formatINR(b.driverPaAmount)} />
            <Stat label="TP Subtotal" value={formatINR(b.tpSubtotal)} /><Stat label="GST Percentage" value={formatPct(data.tpGstPct)} /><Stat label="GST Amount" value={formatINR(b.tpGstAmount)} />
          </div>
        </Panel>

        <Panel title="Add-on Coverage">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3 text-sm"><span className="text-xs text-subtle">IDV Amount</span><b>{formatINR(b.idvAmount)}</b></div>
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase text-subtle"><tr><th className="px-5 py-2">Select</th><th className="py-2">Add-on</th><th className="py-2">Rate (%)</th><th className="px-5 py-2 text-right">Premium Amount</th></tr></thead>
            <tbody>
              {selected.length === 0 && <tr><td colSpan={4} className="px-5 py-6 text-center text-subtle">No add-ons selected</td></tr>}
              {selected.map((l) => (
                <tr key={l.addOnId} className="border-t border-line">
                  <td className="px-5 py-2.5"><Check className="h-4 w-4 text-green-600" /></td><td className="py-2.5 font-semibold">{l.name}</td><td>{formatPct(l.ratePercentage)}</td>
                  <td className="px-5 text-right font-semibold">{formatINR(l.premium)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-3 gap-4 border-t border-line bg-zinc-50 px-5 py-3">
            <Stat label="Add-on Subtotal" value={formatINR(b.addOnSubtotal)} /><Stat label={`Add-on GST (${formatPct(data.addOnGstPct)})`} value={formatINR(b.addOnGstAmount)} /><Stat label="Total Add-on Amount" value={formatINR(b.totalAddOn)} />
          </div>
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#0F2A47] px-7 py-5 text-white">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Total Insurance Premium Amount</p>
            <p className="text-4xl font-bold" data-testid="final-premium">{formatINR(b.finalPremium)}</p>
          </div>
          <div className="flex gap-6 text-xs">
            {[["OD Premium", b.totalOd], ["TP Premium", b.totalTp], ["Add-ons", b.totalAddOn]].map(([l, val]) => (
              <div key={l as string}><p className="text-[10px] uppercase text-white/60">{l}</p><p className="text-sm font-medium">{formatINR(val as number)}</p></div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
