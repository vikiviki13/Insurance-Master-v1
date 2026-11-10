import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

const variants: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-brand to-brand-dark text-white hover:brightness-110 shadow-xs",
  outline: "bg-white text-ink border border-line hover:bg-zinc-50 shadow-xs",
  ghost: "text-muted hover:bg-zinc-100",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-xs",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "outline", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "h-9 px-4 text-sm" : "h-8 px-3 text-xs",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "danger" }>(
  function IconButton({ className, tone = "default", type = "button", ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          tone === "danger" ? "text-red-500 hover:bg-red-50" : "text-muted",
          className,
        )}
        {...rest}
      />
    );
  },
);
