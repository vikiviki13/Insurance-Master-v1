import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconButton } from "../ui/Button";
import { EmptyState } from "../ui/misc";

export interface Column<T> {
  header: string;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

/** The S.NO | ... | Actions table used by every configuration tab in the design. */
export function ConfigTable<T>({ columns, rows, rowKey, onEdit, onDelete, emptyTitle = "Nothing configured yet", emptyMessage = "Use “Add New” to create the first entry." }: Props<T>) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#DADADA] bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="bg-[#F1F1F1] text-xs font-medium text-ink">
              <th className="w-20 px-6 py-3">S.NO</th>
              {columns.map((c) => (
                <th key={c.header} className={cn("px-3 py-3", c.className)}>{c.header}</th>
              ))}
              <th className="w-28 px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={rowKey(r)} className="h-[66px] border-t border-line text-[15px] text-ink hover:bg-zinc-50/60">
                <td className="px-6">{i + 1}</td>
                {columns.map((c) => (
                  <td key={c.header} className={cn("px-3", c.className)}>{c.cell(r, i)}</td>
                ))}
                <td className="px-6">
                  <div className="flex items-center justify-center gap-1">
                    {onEdit && <IconButton aria-label="Edit" onClick={() => onEdit(r)}><Pencil className="h-[18px] w-[18px]" /></IconButton>}
                    {onDelete && <IconButton aria-label="Delete" tone="danger" onClick={() => onDelete(r)}><Trash2 className="h-[18px] w-[18px]" /></IconButton>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <EmptyState title={emptyTitle} message={emptyMessage} />}
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center justify-between gap-3">{children}</div>;
}
