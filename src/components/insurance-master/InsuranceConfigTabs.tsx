import { useState } from "react";
import { PillTabs } from "../Layout";
import { AddOnConfiguration } from "./AddOnConfiguration";
import { CcConfiguration } from "./CcConfiguration";
import { PolicyStructureSection } from "./PolicyStructureSection";
import { PremiumConfigurationTable } from "./PremiumConfigurationTable";
import { VehicleAgeConfiguration } from "./VehicleAgeConfiguration";
import { VehicleTypeConfiguration } from "./VehicleTypeConfiguration";
import { ZoneConfiguration } from "./ZoneConfiguration";
import { BranchConfiguration } from "./BranchConfiguration";

type Sub = "matrix" | "vehicles" | "branch" | "zone" | "cc" | "age" | "policy";
const SUBS: { id: Sub; label: string }[] = [
  { id: "matrix", label: "Rate Matrix" },
  { id: "vehicles", label: "Vehicles" },
  { id: "branch", label: "Branch" },
  { id: "zone", label: "Zone" },
  { id: "cc", label: "CC Slab" },
  { id: "age", label: "Vehicle Model Age" },
  { id: "policy", label: "Policy Structure" },
];

/** "Insurance Config" tab: Rate Matrix + the masters that feed it. */
export function InsuranceConfigTabs() {
  const [sub, setSub] = useState<Sub>("matrix");
  return (
    <div className="pt-4">
      <div className="mb-4"><PillTabs tabs={SUBS} value={sub} onChange={setSub} /></div>
      {sub === "matrix" && <PremiumConfigurationTable />}
      {sub === "vehicles" && <VehicleTypeConfiguration />}
      {sub === "branch" && <BranchConfiguration />}
      {sub === "zone" && <ZoneConfiguration />}
      {sub === "cc" && <CcConfiguration />}
      {sub === "age" && <VehicleAgeConfiguration />}
      {sub === "policy" && <PolicyStructureSection />}
    </div>
  );
}

export { AddOnConfiguration };
