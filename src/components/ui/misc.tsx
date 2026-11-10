import { Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, tone = "green", className }: { children: ReactNode; tone?: "green" | "gray" | "blue"; className?: string }) {
  const tones = {
    green: "border-green-200 bg-green-50 text-green-700",
    gray: "border-zinc-200 bg-zinc-50 text-zinc-600",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-subtle" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-brand" />
      {label}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <Inbox className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message && <p className="max-w-sm text-sm text-subtle">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Simple card with the design's border + shadow. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-[#DADADA] bg-white shadow-card", className)}>{children}</div>;
}

export function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-3 text-sm text-muted">
      <button className="rounded-md border border-line bg-white px-3 py-1 hover:bg-zinc-50 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {pageCount}</span>
      <button className="rounded-md border border-line bg-white px-3 py-1 hover:bg-zinc-50 disabled:opacity-40" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}
