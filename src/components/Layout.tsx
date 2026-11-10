import { ChevronRight, Home, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

function SideNav({ tabs, value, onChange }: { tabs: { id: string; label: string; icon: LucideIcon }[]; value: string; onChange: (id: string) => void }) {
  return <aside className="no-print fixed inset-y-0 left-0 z-20 flex w-[240px] flex-col bg-white py-4 shadow-nav"><div className="px-4 pb-5 text-xl font-semibold text-ink">Vine Studios</div><nav className="space-y-1 px-3" aria-label="Primary">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onChange(id)} aria-current={value === id ? "page" : undefined} className={cn("flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium", value === id ? "bg-brand text-white" : "text-zinc-600 hover:bg-zinc-100")}><Icon className="h-[18px] w-[18px]" />{label}</button>)}</nav></aside>;
}

export function Breadcrumb({ trail = [] }: { trail?: string[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
      <Home className="h-[18px] w-[18px] text-ink" />
      <ChevronRight className="h-4 w-4 text-ink" />
      {trail.map((t, i) => (
        <span key={`${i}-${t}`} className="flex items-center gap-2">
          <span className={i === trail.length - 1 ? "font-medium text-ink" : ""}>{t}</span>
          {i < trail.length - 1 && <ChevronRight className="h-4 w-4" />}
        </span>
      ))}
    </nav>
  );
}

export function AppShell({ children, tabs, value, onChange }: { children: ReactNode; tabs: { id: string; label: string; icon: LucideIcon }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="min-h-full">
      <SideNav tabs={tabs} value={value} onChange={onChange} />
      <div className="ml-[240px] flex min-h-screen flex-col">
        <main className="flex-1 px-6 pb-10 pt-4">{children}</main>
      </div>
    </div>
  );
}

export interface TabDef<T extends string> { id: T; label: string }

/** Top-level page tabs: white bar with a bottom border (matches "Insurance Master / Insurance Config / ..."). */
export function PageTabs<T extends string>({ tabs, value, onChange }: { tabs: TabDef<T>[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="no-print flex gap-8 rounded-t-md border-b border-line bg-white px-5">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn("-mb-px h-[50px] border-b-2 text-sm font-medium transition", value === t.id ? "border-brand text-brand" : "border-transparent text-[#475467] hover:text-ink")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Secondary pill tabs (Rate Matrix | Vehicles | Zone ...). */
export function PillTabs<T extends string>({ tabs, value, onChange }: { tabs: TabDef<T>[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="inline-flex gap-1 rounded-lg bg-zinc-100 p-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", value === t.id ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
