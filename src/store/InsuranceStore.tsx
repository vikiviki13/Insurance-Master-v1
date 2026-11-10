import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Db, Result } from "@/types/insurance";
import * as api from "@/services/insuranceService";
import { useToast } from "@/components/ui/Toast";

interface StoreValue {
  db: Db | null;
  loading: boolean;
  /**
   * Runs a service call that returns the updated Db (or {db}), refreshes state, toasts the result
   * and returns a Result so forms can show an inline error and keep the modal open.
   */
  run: <T extends Db | { db: Db }>(fn: () => Promise<T>, successMessage?: string) => Promise<Result<T>>;
  reset: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

export function InsuranceStoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [db, setDb] = useState<Db | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.fetchDb().then((d) => {
      if (alive) {
        setDb(d);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const run = useCallback<StoreValue["run"]>(
    async (fn, successMessage) => {
      try {
        const res = await fn();
        setDb("db" in res ? res.db : res);
        if (successMessage) toast.success(successMessage);
        return { ok: true, data: res };
      } catch (e) {
        const error = e instanceof Error ? e.message : "Something went wrong";
        toast.error(error);
        return { ok: false, error };
      }
    },
    [toast],
  );

  const reset = useCallback(async () => {
    const d = await api.resetDemoData();
    setDb(d);
    toast.success("Demo data restored");
  }, [toast]);

  const value = useMemo(() => ({ db, loading, run, reset }), [db, loading, run, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInsurance() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useInsurance must be used inside InsuranceStoreProvider");
  return c;
}

/** Convenience for components that render only after data is loaded. */
export function useDb(): Db {
  const { db } = useInsurance();
  if (!db) throw new Error("Database not loaded");
  return db;
}
