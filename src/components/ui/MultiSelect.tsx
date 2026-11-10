import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Option } from "./Select";

interface Props {
  values: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  placeholder?: string;
  invalid?: boolean;
  /** options that are shown but cannot be picked, with a reason */
  disabledOptions?: Record<string, string>;
}

export function MultiSelect({ values, onChange, options, placeholder = "Select", invalid, disabledOptions = {} }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex min-h-9 w-full items-center gap-2 rounded-md border bg-white px-2 py-1 text-left text-sm shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20",
          invalid ? "border-red-400" : "border-line",
        )}
      >
        <span className="flex flex-1 flex-wrap gap-1">
          {values.length === 0 && <span className="px-1 text-zinc-400">{placeholder}</span>}
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
              {options.find((o) => o.value === v)?.label ?? v}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(v);
                }}
              />
            </span>
          ))}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-subtle" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-line bg-white p-1 shadow-lg" role="listbox">
          <div className="flex items-center gap-2 border-b border-line px-2 pb-1">
            <Search className="h-4 w-4 text-subtle" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-8 flex-1 text-sm outline-none" />
          </div>
          <div className="max-h-52 overflow-auto pt-1">
            {filtered.length === 0 && <p className="px-2 py-3 text-center text-xs text-subtle">No results</p>}
            {filtered.map((o) => {
              const blocked = disabledOptions[o.value];
              const checked = values.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  disabled={!!blocked && !checked}
                  title={blocked}
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded border", checked ? "border-brand bg-brand text-white" : "border-zinc-300")}>
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1">{o.label}</span>
                  {blocked && !checked && <span className="text-[11px] text-subtle">{blocked}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
