"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  type CalculatorInputKey,
  type CalculatorInputs,
  costComparisonQuery,
  defaultCostInputs,
} from "@/src/components/cost/costComparisonUtils";
import { AppIcon } from "@/src/components/ui/AppIcon";
import {
  type PlannerVehicle,
  vehicleLabel,
} from "@/src/components/trip/VehicleSelector";
import { ROUTES } from "@/src/lib/constants";
import {
  normalizeStoredCars,
  PROFILE_STORAGE_KEY,
  type StoredCar,
  type StoredProfile,
} from "@/src/lib/local-storage";

type VehicleId = "petrol" | "hybrid" | "phev" | "reev" | "ev";

type VehicleCost = {
  id: VehicleId;
  label: string;
  icon: string;
  monthlyCost: number;
  petrolLiters: number;
  electricityUnits: number;
  petrolKm: number;
  electricKm: number;
  costPerKm: number;
  formula: string;
};

type AssumptionField = {
  key: CalculatorInputKey;
  label: string;
  suffix: string;
  icon: string;
  step: number;
  placeholder: string;
  helper: string;
};

const primaryFields: AssumptionField[] = [
  {
    key: "monthlyDistanceKm",
    label: "Monthly distance",
    suffix: "km",
    icon: "route",
    step: 50,
    placeholder: "2000",
    helper: "Total driving in one month.",
  },
  {
    key: "petrolPrice",
    label: "Petrol price",
    suffix: "Rs/L",
    icon: "local_gas_station",
    step: 1,
    placeholder: "300",
    helper: "Current petrol price per liter.",
  },
  {
    key: "electricityPrice",
    label: "Electricity price",
    suffix: "Rs/unit",
    icon: "bolt",
    step: 1,
    placeholder: "65",
    helper: "One unit means one kWh.",
  },
  {
    key: "evRangePerChargeKm",
    label: "Range per full charge",
    suffix: "km",
    icon: "electric_car",
    step: 1,
    placeholder: "300",
    helper: "How far the EV goes on a full charge.",
  },
  {
    key: "unitsPerFullCharge",
    label: "Units per full charge",
    suffix: "units",
    icon: "battery_charging_full",
    step: 0.1,
    placeholder: "45",
    helper: "Battery units used from empty to full.",
  },
];

const fuelFields: AssumptionField[] = [
  {
    key: "petrolAverageKmL",
    label: "Petrol car average",
    suffix: "km/L",
    icon: "directions_car",
    step: 0.1,
    placeholder: "20",
    helper: "Example: 20 km per liter.",
  },
  {
    key: "hybridAverageKmL",
    label: "Hybrid average",
    suffix: "km/L",
    icon: "energy_savings_leaf",
    step: 0.1,
    placeholder: "25",
    helper: "Example: 25 km per liter.",
  },
  {
    key: "phevPetrolAverageKmL",
    label: "PHEV petrol mode",
    suffix: "km/L",
    icon: "power",
    step: 0.1,
    placeholder: "18",
    helper: "When the PHEV uses petrol.",
  },
  {
    key: "reevGeneratorAverageKmL",
    label: "REEV generator average",
    suffix: "km/L",
    icon: "conversion_path",
    step: 0.1,
    placeholder: "20",
    helper: "Petrol use when the generator runs.",
  },
];

const plugInFields: AssumptionField[] = [
  {
    key: "phevElectricShare",
    label: "PHEV electric driving",
    suffix: "%",
    icon: "power",
    step: 1,
    placeholder: "60",
    helper: "Percent of monthly distance driven on battery.",
  },
  {
    key: "reevElectricShare",
    label: "REEV electric driving",
    suffix: "%",
    icon: "conversion_path",
    step: 1,
    placeholder: "80",
    helper: "Percent of monthly distance before generator use.",
  },
];

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function fuelCost(distanceKm: number, petrolPrice: number, averageKmL: number) {
  const liters = averageKmL > 0 ? distanceKm / averageKmL : 0;

  return {
    liters,
    cost: liters * petrolPrice,
  };
}

function electricCost(distanceKm: number, electricityPrice: number, rangePerChargeKm: number, unitsPerFullCharge: number) {
  const fullCharges = rangePerChargeKm > 0 ? distanceKm / rangePerChargeKm : 0;
  const units = fullCharges * unitsPerFullCharge;

  return {
    units,
    cost: units * electricityPrice,
  };
}

function splitDistance(distanceKm: number, electricSharePercent: number) {
  const clampedShare = Math.min(Math.max(electricSharePercent, 0), 100);
  const electricKm = distanceKm * (clampedShare / 100);

  return {
    electricKm,
    petrolKm: distanceKm - electricKm,
  };
}

function selectedVehicleCostId(inputs: CalculatorInputs): VehicleId {
  return inputs.vehicleKind === "PHEV"
    ? "phev"
    : inputs.vehicleKind === "REEV" ? "reev" : "ev";
}

function calculateCosts(inputs: CalculatorInputs): VehicleCost[] {
  const monthlyDistanceKm = toNumber(inputs.monthlyDistanceKm);
  const petrolPrice = toNumber(inputs.petrolPrice);
  const electricityPrice = toNumber(inputs.electricityPrice);
  const evRangePerChargeKm = toNumber(inputs.evRangePerChargeKm);
  const unitsPerFullCharge = toNumber(inputs.unitsPerFullCharge);
  const petrolAverageKmL = toNumber(inputs.petrolAverageKmL);
  const hybridAverageKmL = toNumber(inputs.hybridAverageKmL);
  const phevPetrolAverageKmL = toNumber(inputs.phevPetrolAverageKmL);
  const reevGeneratorAverageKmL = toNumber(inputs.reevGeneratorAverageKmL);
  const phevDistance = splitDistance(monthlyDistanceKm, toNumber(inputs.phevElectricShare));
  const reevDistance = splitDistance(monthlyDistanceKm, toNumber(inputs.reevElectricShare));

  const petrol = fuelCost(monthlyDistanceKm, petrolPrice, petrolAverageKmL);
  const hybrid = fuelCost(monthlyDistanceKm, petrolPrice, hybridAverageKmL);
  const ev = electricCost(monthlyDistanceKm, electricityPrice, evRangePerChargeKm, unitsPerFullCharge);
  const phevElectric = electricCost(
    phevDistance.electricKm,
    electricityPrice,
    evRangePerChargeKm,
    unitsPerFullCharge,
  );
  const phevFuel = fuelCost(phevDistance.petrolKm, petrolPrice, phevPetrolAverageKmL);
  const reevElectric = electricCost(
    reevDistance.electricKm,
    electricityPrice,
    evRangePerChargeKm,
    unitsPerFullCharge,
  );
  const reevFuel = fuelCost(reevDistance.petrolKm, petrolPrice, reevGeneratorAverageKmL);

  const vehicles: Omit<VehicleCost, "costPerKm">[] = [
    {
      id: "petrol",
      label: "Petrol",
      icon: "local_gas_station",
      monthlyCost: petrol.cost,
      petrolLiters: petrol.liters,
      electricityUnits: 0,
      petrolKm: monthlyDistanceKm,
      electricKm: 0,
      formula: "Monthly km / petrol km per liter x petrol Rs per liter",
    },
    {
      id: "hybrid",
      label: "Hybrid",
      icon: "energy_savings_leaf",
      monthlyCost: hybrid.cost,
      petrolLiters: hybrid.liters,
      electricityUnits: 0,
      petrolKm: monthlyDistanceKm,
      electricKm: 0,
      formula: "Monthly km / hybrid km per liter x petrol Rs per liter",
    },
    {
      id: "phev",
      label: "PHEV",
      icon: "power",
      monthlyCost: phevElectric.cost + phevFuel.cost,
      petrolLiters: phevFuel.liters,
      electricityUnits: phevElectric.units,
      petrolKm: phevDistance.petrolKm,
      electricKm: phevDistance.electricKm,
      formula: "Electric km / range per charge x units per charge x electricity Rs/unit + petrol km / PHEV km per liter x petrol Rs/L",
    },
    {
      id: "reev",
      label: "REEV",
      icon: "conversion_path",
      monthlyCost: reevElectric.cost + reevFuel.cost,
      petrolLiters: reevFuel.liters,
      electricityUnits: reevElectric.units,
      petrolKm: reevDistance.petrolKm,
      electricKm: reevDistance.electricKm,
      formula: "Electric km / range per charge x units per charge x electricity Rs/unit + generator km / generator km per liter x petrol Rs/L",
    },
    {
      id: "ev",
      label: "EV",
      icon: "electric_car",
      monthlyCost: ev.cost,
      petrolLiters: 0,
      electricityUnits: ev.units,
      petrolKm: 0,
      electricKm: monthlyDistanceKm,
      formula: "Monthly km / range per full charge x units per full charge x electricity Rs/unit",
    },
  ];

  const selectedId = selectedVehicleCostId(inputs);

  return vehicles.map((vehicle) => ({
    ...vehicle,
    label: vehicle.id === selectedId && inputs.vehicleName ? inputs.vehicleName : vehicle.label,
    costPerKm: monthlyDistanceKm > 0 ? vehicle.monthlyCost / monthlyDistanceKm : 0,
  }));
}

function formatCurrency(value: number) {
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

function formatDecimal(value: number, maximumFractionDigits = 1) {
  return value.toLocaleString("en-PK", {
    maximumFractionDigits,
  });
}

export function CostComparisonCalculator({ initialInputs = defaultCostInputs }: { initialInputs?: CalculatorInputs }) {
  const router = useRouter();
  const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [savedCars, setSavedCars] = useState<StoredCar[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      let profile: StoredProfile = {};

      try {
        profile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "{}") as StoredProfile;
      } catch {
        profile = {};
      }

      const cars = normalizeStoredCars(profile.cars);
      const savedCar = cars[0];
      setSavedCars(cars);

      if (!inputs.vehicleId && savedCar) {
        selectVehicle({
          id: savedCar.id,
          brand: savedCar.make,
          model: savedCar.model,
          variant: savedCar.variant,
          kind: savedCar.kind,
          powertrain: savedCar.powertrain,
          rangeKm: savedCar.rangeKm,
          batteryCapacityKwh: savedCar.batteryCapacityKwh,
        });
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  // Only hydrate the initial saved car once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateInput(key: CalculatorInputKey, value: string) {
    setInputs((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!inputs.vehicleId) {
      setVehicleError("Select your car before comparing costs.");
      return;
    }

    const query = costComparisonQuery(inputs);
    window.history.replaceState(null, "", `${ROUTES.costComparison}?${query}`);
    router.push(`${ROUTES.costComparison}/results?${query}`);
  }

  function selectVehicle(vehicle: PlannerVehicle) {
    const name = vehicleLabel(vehicle);
    const estimatedBatteryKwh = Math.max(1, Math.round((vehicle.rangeKm / 6) * 10) / 10);

    setVehicleError(null);
    setInputs((current) => ({
      ...current,
      vehicleId: vehicle.id,
      vehicleName: name,
      vehicleKind: vehicle.powertrain || (vehicle.kind === "EV" ? "EV" : "PHEV"),
      evRangePerChargeKm: String(vehicle.rangeKm),
      unitsPerFullCharge: String(vehicle.batteryCapacityKwh || estimatedBatteryKwh),
    }));
  }

  return (
    <form className="grid gap-5 text-foreground" onSubmit={handleSubmit}>
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Cost comparison</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-foreground sm:text-4xl">
            Your car vs every type
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Select your car and enter your monthly driving costs. Its range and battery data are filled automatically.
          </p>
        </div>

        <div className="mt-6 max-w-2xl rounded-xl border border-border bg-background p-4">
          <label htmlFor="cost-saved-car" className="text-sm font-semibold text-foreground">Select your car</label>
          <div className="relative mt-2">
            <AppIcon name="directions_car" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            <select
              id="cost-saved-car"
              value={savedCars.some((car) => car.id === inputs.vehicleId) ? inputs.vehicleId : ""}
              onChange={(event) => {
                if (event.target.value === "add-more") {
                  router.push(`${ROUTES.profile}?edit=cars`);
                  return;
                }

                const car = savedCars.find((savedCar) => savedCar.id === event.target.value);

                if (car) {
                  selectVehicle({
                    id: car.id,
                    brand: car.make,
                    model: car.model,
                    variant: car.variant,
                    kind: car.kind,
                    powertrain: car.powertrain,
                    rangeKm: car.rangeKm,
                    batteryCapacityKwh: car.batteryCapacityKwh,
                  });
                }
              }}
              className="min-h-12 w-full appearance-none rounded-xl border border-border bg-surface pl-11 pr-11 text-base text-foreground"
            >
              <option value="">{savedCars.length ? "Choose a saved car" : "No saved cars"}</option>
              {savedCars.map((car) => (
                <option key={car.id} value={car.id}>
                  {[car.make, car.model, car.variant].filter(Boolean).join(" ")}
                </option>
              ))}
              <option value="add-more">+ Add more cars</option>
            </select>
            <AppIcon name="expand_more" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          </div>
          {vehicleError ? <p role="alert" className="mt-2 text-sm text-foreground">{vehicleError}</p> : null}
          {inputs.vehicleId ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted">
              <span className="rounded-full border border-border px-3 py-1">{inputs.vehicleKind}</span>
              <span className="rounded-full border border-border px-3 py-1">{inputs.evRangePerChargeKm} km range</span>
              <span className="rounded-full border border-border px-3 py-1">{inputs.unitsPerFullCharge} kWh battery</span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {primaryFields.slice(0, 3).map((field) => (
            <AssumptionControl
              key={field.key}
              field={field}
              value={inputs[field.key]}
              onChange={(value) => updateInput(field.key, value)}
            />
          ))}
        </div>

        {/* <div className="mt-4 grid gap-3 lg:grid-cols-2">
         */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2 items-start">
          <AssumptionDropdown
            title="Fuel efficiency"
            icon="speed"
            isOpen={openDropdown === "fuel"}
            onToggle={() =>
              setOpenDropdown(openDropdown === "fuel" ? null : "fuel")
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 ">
              {fuelFields.map((field) => (
                <AssumptionControl
                  key={field.key}
                  field={field}
                  value={inputs[field.key]}
                  onChange={(value) => updateInput(field.key, value)}
                  compact
                />
              ))}
            </div>
          </AssumptionDropdown>

          <AssumptionDropdown
            title="Electric assumptions"
            icon="tune"
            isOpen={openDropdown === "vehicle"}
            onToggle={() =>
              setOpenDropdown(openDropdown === "vehicle" ? null : "vehicle")
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {primaryFields.slice(3).map((field) => (
                <AssumptionControl
                  key={field.key}
                  field={field}
                  value={inputs[field.key]}
                  onChange={(value) => updateInput(field.key, value)}
                  compact
                />
              ))}
              {plugInFields.map((field) => (
                <AssumptionControl
                  key={field.key}
                  field={field}
                  value={inputs[field.key]}
                  onChange={(value) => updateInput(field.key, value)}
                  compact
                />
              ))}
            </div>
          </AssumptionDropdown>
        </div>

        <div className="mt-6 flex justify-end ">
          <button
            type="submit"
            className="cursor-pointer inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-secondary transition hover:bg-primary-hover sm:w-auto"
          >
            Compare costs
            <AppIcon name="arrow_forward" className="h-[1.2rem] w-[1.2rem]" />
          </button>
        </div>
      </section>
    </form>
  );
}

export function CostComparisonResults({ inputs }: { inputs: CalculatorInputs }) {
  const costs = useMemo(() => calculateCosts(inputs), [inputs]);
  const highestCost = Math.max(...costs.map((cost) => cost.monthlyCost), 1);
  const cheapest = costs.reduce((best, cost) => (cost.monthlyCost < best.monthlyCost ? cost : best), costs[0]);
  const petrolCost = costs.find((cost) => cost.id === "petrol")?.monthlyCost || 0;
  const selectedCost = costs.find((cost) => cost.id === selectedVehicleCostId(inputs));
  const savingsVsPetrol = Math.max(0, petrolCost - (selectedCost?.monthlyCost || 0));
  const query = costComparisonQuery(inputs);

  return (
    <div className="mx-auto grid max-w-5xl gap-4 text-foreground">
      <div className="grid justify-items-start gap-3">
        <Link
          href={`${ROUTES.costComparison}?${query}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-transparent px-0 py-2 text-sm font-semibold text-foreground transition hover:text-primary"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
            <path d="M19 12H5m0 0 6-6m-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </Link>
        <div>
          <p className="text-sm font-semibold text-primary">Cost comparison</p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Monthly running costs</h1>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold text-primary">Summary</p>
          <div className="mt-4 grid gap-3">
            <ResultMetric label="Your car" value={inputs.vehicleName || selectedCost?.label || cheapest.label} />
            <ResultMetric
              label={savingsVsPetrol > 0 ? "Monthly saving" : "Cheapest option"}
              value={savingsVsPetrol > 0 ? `${formatCurrency(savingsVsPetrol)} vs petrol` : cheapest.label}
            />
            <ResultMetric label="Monthly distance" value={`${formatDecimal(toNumber(inputs.monthlyDistanceKm), 0)} km`} />
          </div>
          <details className="mt-4 rounded-lg border border-border bg-background p-3">
            <summary className="cursor-pointer text-sm font-bold text-foreground">
              Formula used
            </summary>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
              <p>Fuel cost = monthly petrol km / km per liter x petrol price.</p>
              <p>Electric cost = electric km / range per charge x units per full charge x electricity price.</p>
              <p>PHEV and REEV use the electric-driving percentage to split monthly distance.</p>
            </div>
          </details>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="grid grid-cols-[1fr_8rem] gap-3 border-b border-border bg-background px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted sm:grid-cols-[1fr_9rem_8rem]">
            <span>Vehicle</span>
            <span className="text-right">Monthly cost</span>
            <span className="hidden text-right sm:block">Per km</span>
          </div>
          <div className="divide-y divide-border">
            {costs.map((cost) => (
              <details key={cost.id} className="group">
                <summary className="grid cursor-pointer grid-cols-[1fr_8rem] gap-3 px-4 py-4 transition hover:bg-background sm:grid-cols-[1fr_9rem_8rem]">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-primary">
                      <AppIcon name={cost.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-foreground">{cost.label}</span>
                      <span className="block text-xs text-muted">
                        {cost.electricKm > 0 ? `${formatDecimal(cost.electricKm, 0)} electric km` : "Petrol only"}
                        {cost.petrolKm > 0 ? ` / ${formatDecimal(cost.petrolKm, 0)} petrol km` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="self-center text-right text-lg font-bold text-foreground">
                    {formatCurrency(cost.monthlyCost)}
                  </span>
                  <span className="hidden self-center text-right text-sm font-semibold text-muted sm:block">
                    Rs {formatDecimal(cost.costPerKm, 1)}
                  </span>
                </summary>
                <div className="px-4 pb-4">
                  <div className="h-2 overflow-hidden rounded-full bg-surface-strong">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, (cost.monthlyCost / highestCost) * 100)}%` }}
                    />
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <CostDetail label="Petrol used" value={`${formatDecimal(cost.petrolLiters, 1)} L`} />
                    <CostDetail label="Electricity used" value={`${formatDecimal(cost.electricityUnits, 1)} units`} />
                    <CostDetail label="Formula" value={cost.formula} />
                  </dl>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AssumptionDropdown({
  title,
  icon,
  children,
  isOpen,
  onToggle,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border bg-background transition-all duration-200 ${isOpen
          ? "border-border shadow-sm"
          : "border-border"
        }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-3 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-surface text-primary">
            <AppIcon name={icon} className="h-[1.1rem] w-[1.1rem]" />
          </span>

          <span className="text-sm font-bold text-foreground">
            {title}
          </span>
        </div>

        <AppIcon
          name="expand_more"
          className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ${isOpen
            ? "grid-rows-[1fr] border-t border-border"
            : "grid-rows-[0fr]"
          }`}
      >
        <div className="overflow-hidden">
          <div className="p-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function AssumptionControl({
  field,
  value,
  onChange,
  compact = false,
}: {
  field: AssumptionField;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <label className={`grid gap-2 rounded-xl border border-border bg-background p-3 ${compact ? "" : "lg:min-h-36"}`}>
      <span className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-primary" aria-hidden="true">
          <AppIcon name={field.icon} className="h-[1.1rem] w-[1.1rem]" />
        </span>
        <span className="min-w-0 text-sm font-bold leading-5 text-foreground">{field.label}</span>
      </span>
      <span className="text-xs leading-5 text-muted">{field.helper}</span>
      <span className="mt-auto flex min-h-12 overflow-hidden rounded-full border border-border bg-surface">
        <input
          type="number"
          step={field.step}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-4 text-base font-bold text-foreground placeholder:text-muted/45"
        />
        <span className="grid shrink-0 place-items-center border-l border-border bg-surface-strong px-3 text-xs font-bold text-muted">
          {field.suffix}
        </span>
      </span>
    </label>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-foreground">{value}</p>
    </div>
  );
}

function CostDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-background px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-bold leading-5 text-foreground">{value}</dd>
    </div>
  );
}
