import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const uid = (prefix = "id") =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const formatINR = (n: number | null | undefined): string =>
  n == null || Number.isNaN(n) ? "—" : `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const formatPct = (n: number | null | undefined, digits = 3): string =>
  n == null || Number.isNaN(n) ? "—" : `${parseFloat(n.toFixed(digits))}%`;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
