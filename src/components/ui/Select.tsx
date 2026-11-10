import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { inputBase } from "./Field";

export interface Option {
  value: string;
  label: string;
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  invalid?: boolean;
}

/** Native select with the design's chevron – fully accessible and keyboard friendly. */
export function Select({ value, onChange, options, placeholder = "Select", invalid, className, disabled, ...rest }: Props) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputBase, "appearance-none pr-9", invalid ? "border-red-400" : "border-line", value === "" && "text-zinc-400")}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className={cn("pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2", disabled ? "text-zinc-300" : "text-subtle")} />
    </div>
  );
}
