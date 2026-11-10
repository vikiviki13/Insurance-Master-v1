import { useState } from "react";
import { AppShell, Breadcrumb } from "./components/Layout";
import { Shield, Settings2, Puzzle, CarFront } from "lucide-react";
import { ToastProvider } from "./components/ui/Toast";
import { Spinner } from "./components/ui/misc";
import { InsuranceStoreProvider, useInsurance } from "./store/InsuranceStore";
import { InsuranceMasterTable } from "./components/insurance-master/InsuranceMasterTable";
import { InsuranceForm } from "./components/insurance-master/InsuranceForm";
import { CheckConfiguration } from "./components/insurance-master/CheckConfiguration";
import { AddOnConfiguration, InsuranceConfigTabs } from "./components/insurance-master/InsuranceConfigTabs";
import type { MasterDraft } from "./components/insurance-master/draft";
import { VehicleConfigurationTable } from "./components/vehicle-configuration/VehicleConfigurationTable";

type Tab = "master" | "config" | "addon" | "vehicle";
type MasterView =
  | { name: "list" }
  | { name: "form"; id?: string; draft?: MasterDraft }
  | { name: "check"; id?: string; draft: MasterDraft };

const TABS = [
  { id: "master" as Tab, label: "Insurance Master", icon: Shield },
  { id: "config" as Tab, label: "Insurance Config", icon: Settings2 },
  { id: "addon" as Tab, label: "Add-on Config", icon: Puzzle },
  { id: "vehicle" as Tab, label: "Vehicle Configuration", icon: CarFront },
];

function Page() {
  const { db, loading } = useInsurance();
  const [tab, setTab] = useState<Tab>("master");
  const [view, setView] = useState<MasterView>({ name: "list" });

  const changeTab = (t: Tab) => {
    setTab(t);
    setView({ name: "list" });
  };

  const currentTab = TABS.find((item) => item.id === tab)?.label ?? "Insurance Config";
  const trail = [currentTab, ...(tab === "master" && view.name !== "list" ? [view.name === "form" ? "Insurance Master" : "Check Configuration"] : [])];
  return (
    <AppShell tabs={TABS} value={tab} onChange={(id) => changeTab(id as Tab)}>
      <Breadcrumb trail={trail} />
      {tab !== "vehicle" && <h1 className="mb-4 mt-4 text-2xl font-semibold text-ink">{currentTab}</h1>}

      {loading || !db ? (
        <Spinner label="Loading…" />
      ) : (
        <>
          {tab === "master" && view.name === "list" && <InsuranceMasterTable onNew={() => setView({ name: "form" })} onView={(id) => setView({ name: "form", id })} />}
          {tab === "master" && view.name === "form" && (
            <InsuranceForm key={view.id ?? "new"} masterId={view.id} initialDraft={view.draft} onBack={() => setView({ name: "list" })} onCheck={(draft) => setView({ name: "check", id: view.id, draft })} />
          )}
          {tab === "master" && view.name === "check" && <CheckConfiguration initial={view.draft} onBack={() => setView({ name: "form", id: view.id, draft: view.draft })} />}
          {tab === "config" && <InsuranceConfigTabs />}
          {tab === "addon" && <div className="pt-4"><AddOnConfiguration /></div>}
          {tab === "vehicle" && <VehicleConfigurationTable />}
        </>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <InsuranceStoreProvider>
        <Page />
      </InsuranceStoreProvider>
    </ToastProvider>
  );
}
