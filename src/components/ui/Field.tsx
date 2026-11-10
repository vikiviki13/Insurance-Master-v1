import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const inputBase =
  "h-9 w-full rounded-md border bg-white px-3 text-sm text-ink shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400";

interface FieldProps {
  label?: ReactNode;
  required?: boolean;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
  htmlFor?: string;
  /** extra content on the label row (e.g. a switch) */
  action?: ReactNode;
  children: ReactNode;
}

export function Field({ label, required, error, hint, className, htmlFor, action, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {(label || action) && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
          {action}
        </div>
      )}
      {children}
      {hint && !error && <p className="text-xs text-subtle">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

interface AffixProps {
  prefix?: ReactNode;
  suffix?: ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function Affix({ prefix, suffix, invalid, disabled, children, className }: AffixProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-full items-center rounded-md border bg-white shadow-xs transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
        invalid ? "border-red-400" : "border-line",
        disabled && "bg-zinc-100",
        className,
      )}
    >
      {prefix && <span className={cn("pl-3 text-sm", disabled ? "text-zinc-400" : "text-subtle")}>{prefix}</span>}
      {children}
      {suffix && <span className={cn("pr-3 text-sm", disabled ? "text-zinc-400" : "text-ink")}>{suffix}</span>}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export function TextInput({ className, invalid, ...rest }: TextInputProps) {
  return <input className={cn(inputBase, invalid ? "border-red-400" : "border-line", className)} {...rest} />;
}

export function TextArea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(inputBase, "h-auto min-h-[88px] resize-y py-2", invalid ? "border-red-400" : "border-line", className)}
      {...rest}
    />
  );
}

interface NumberInputProps {
  value: number | null;
  onChange: (v: number | null) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  integer?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

/** Only accepts valid non-negative numbers; keeps the raw text while typing ("1." etc). */
export function NumberInput({ value, onChange, prefix, suffix, placeholder, disabled, invalid, integer, id, className, ...rest }: NumberInputProps) {
  const autoId = useId();
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => {
    const parsed = text === "" || text === "." ? null : parseFloat(text);
    if (parsed !== value) setText(value == null ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const pattern = integer ? /^\d*$/ : /^\d*\.?\d*$/;
  return (
    <Affix prefix={prefix} suffix={suffix} invalid={invalid} disabled={disabled} className={className}>
      <input
        id={id ?? autoId}
        inputMode={integer ? "numeric" : "decimal"}
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        aria-invalid={invalid || undefined}
        aria-label={rest["aria-label"]}
        onChange={(e) => {
          const t = e.target.value.trim();
          if (!pattern.test(t)) return;
          setText(t);
          onChange(t === "" || t === "." ? null : parseFloat(t));
        }}
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:text-zinc-400"
      />
    </Affix>
  );
}
