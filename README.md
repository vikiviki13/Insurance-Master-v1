# Insurance Master

A working implementation of the **Insurance Master** module from the Figma file (`Insurance_Master.fig`):
React + TypeScript + Tailwind CSS + Lucide icons, with shadcn-style UI primitives in `src/components/ui`.
Reference renders of the Figma frames are in `docs/figma-reference/`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm test         # 22 unit tests for the calculation engine & validation
```

Data is stored in `localStorage` (key `insurance-master-db-v1`) and seeded with demo data on first load.
Use **Reset Demo Data** on the Insurance Master tab to restore it.

## What is in the app

| Tab | What it does |
|---|---|
| **Insurance Master** | Card list with search, pagination, loading + empty states, active/inactive toggle, View (edit), delete with confirmation, **New Insurance Master**. |
| Master form | OD / TP / Add-on rules, inline validation, **Save**, **Cancel** (warns about unsaved changes), **Check Configuration**. |
| **Check Configuration** | Pick a vehicle (model, variant, year, fuel, colour, branch → zone). Rates are looked up from the Rate Matrix and the whole premium recalculates live. **Preview** opens the Premium Summary (Print / Download CSV). Nothing is saved here. |
| **Insurance Config → Rate Matrix** | Table generated from *zones × CC slabs × vehicle ages* + TP / Owner PA / Driver PA / Seaters PA. Add/Edit/Delete rows; **Generate Matrix** creates missing rows/cells and drops stale ones. |
| Vehicles · Zone · CC Slab · Vehicle Model Age · Policy Structure | Full CRUD. Zones group branches; CC and age ranges are fully configurable (open-ended "no limit" supported). |
| **Add-on Config** | Add-on name, abbreviation, default %, description. |
| Insurance CRE | Present in the design's navigation but has no screens in the Figma file; shown as a placeholder. |

## Business rules (from the annotations in the Figma "Check Config" frame)

```
IDV Amount        = Ex-Showroom Price × IDV %
OD Premium        = OD % × IDV Amount                   (× OD years)
CNG/LPG Loading   = Loading % × OD Premium              (only when the vehicle's fuel is CNG/LPG and loading is enabled)
Discount          = Discount % × (OD Premium + Loading)
Total OD          = OD Premium + Loading − Discount
TP subtotal       = TP + Owner PA + Paid-driver PA + Seaters PA × (seats − 1) + LPG-kit TP   (annual rates × TP years)
TP GST            = TP subtotal × GST % / 100           (stored/shown separately)
Total TP          = TP subtotal + TP GST
Add-on premium    = IDV Amount × add-on rate %          (selected add-ons only)
Total Add-on      = subtotal + subtotal × Add-on GST %
FINAL PREMIUM     = Total OD + Total TP + Total Add-on (+ other charges)
```

Rate lookup: CC slab (by engine CC) + vehicle age band (by current year − model year) + zone (from the branch)
→ OD % from the matrix cell; TP / PA amounts from the matrix row.

## Architecture

```
src/
  types/insurance.ts              domain types (VehicleType, Zone, CcSlab, VehicleAgeRange, AddOn,
                                  PolicyStructure, RateMatrixEntry, InsuranceMaster ...)
  services/calculationService.ts  pure calculation engine (calculateBasePremium, calculateCngLpgLoading,
                                  calculateTpGst, calculateTotalPremium, resolveRates ...) - no UI, no storage
  services/insuranceService.ts    async data layer over localStorage + business-rule validation
  lib/validation.ts               percent / amount / range / overlap / gap helpers
  store/InsuranceStore.tsx        React context: loads data, runs mutations, toasts results
  data/seed.ts                    demo data (the rate matrix is generated, not hand-typed)
  components/insurance-master/    InsuranceMasterTable, InsuranceForm, PremiumSections, CheckConfiguration,
                                  CalculationSummary, PremiumConfigurationTable, ConfigurationModal,
                                  ZoneConfiguration, CcConfiguration, VehicleAgeConfiguration,
                                  PolicyStructureSection, AddOnConfiguration, VehicleTypeConfiguration
  components/ui/                  Button, Field/NumberInput, Select, MultiSelect, Modal, Switch, Toast ...
```

**Replacing the mock with an API:** every function in `insuranceService.ts` is async and returns plain data.
Rewrite that file to call your backend (keep the signatures) - no component touches storage directly.

## Validation implemented

Required fields · percentages 0-100 · non-negative amounts · numeric-only inputs · From <= To ·
CC ranges and vehicle-age ranges may not overlap (open-ended ranges handled) · coverage-gap warnings ·
duplicate names/abbreviations blocked (masters, zones, slabs, add-ons, policy structures) ·
a branch can belong to only one zone per vehicle type · one rate row per CC slab · deleting a zone / age band / CC slab
cascades to the matrix · a vehicle type or policy structure that is in use cannot be deleted.

## Decisions and deviations from the Figma (please review)

1. **Design placeholders replaced.** The Figma uses template text ("Apple", "Olivia Rhye", "$ 1,000.00 USD", "Lable").
   Real labels were taken from the design's property overrides; currency is INR (the Preview frame uses it).
2. **Fields added that the design lacks but the brief requires:** *Insurance Name*, *Insurance Company* and *Vehicle Type*
   at the top of the master form; a *CNG/LPG enable* switch; a *Compulsory PA applicable* checkbox; a **Policy Structure** tab
   (1 + 1, 1 + 3, 3 + 3 - add more any time); a vehicle-type filter on list tabs (the design shows an unlabeled input there).
3. **Matrix column naming.** The design is inconsistent ("Driver PA" vs "Driver / Owner PA", "Unnamed PA");
   the app uses *TP, Owner PA, Driver PA, Seaters PA (per seat)*.
4. **Sample numbers in the design's Preview frame don't follow its own formulas** (e.g. discount of 1,638 for 60 %).
   The app implements the written formulas.
5. **Assumptions to confirm with the business:** policy years multiply OD and TP annual rates; Seaters PA is charged per passenger
   seat (seats - 1); LPG-kit TP applies only to CNG/LPG vehicles; vehicle ages are whole years with inclusive ranges.
6. The vehicle catalogue (`vehicleCatalog` in the seed) stands in for "Data from Sales".
