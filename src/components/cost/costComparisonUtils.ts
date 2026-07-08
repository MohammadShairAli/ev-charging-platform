export type CalculatorInputKey =
  | "monthlyDistanceKm"
  | "petrolPrice"
  | "electricityPrice"
  | "evRangePerChargeKm"
  | "unitsPerFullCharge"
  | "petrolAverageKmL"
  | "hybridAverageKmL"
  | "phevPetrolAverageKmL"
  | "reevGeneratorAverageKmL"
  | "phevElectricShare"
  | "reevElectricShare";

export type CalculatorInputs = Record<CalculatorInputKey, string>;

export const defaultCostInputs: CalculatorInputs = {
  monthlyDistanceKm: "2000",
  petrolPrice: "300",
  electricityPrice: "65",
  evRangePerChargeKm: "300",
  unitsPerFullCharge: "45",
  petrolAverageKmL: "20",
  hybridAverageKmL: "25",
  phevPetrolAverageKmL: "18",
  reevGeneratorAverageKmL: "20",
  phevElectricShare: "60",
  reevElectricShare: "80",
};

const inputKeys = Object.keys(defaultCostInputs) as CalculatorInputKey[];

export function parseCostInputs(searchParams?: Record<string, string | string[] | undefined>): CalculatorInputs {
  return inputKeys.reduce<CalculatorInputs>((inputs, key) => {
    const value = searchParams?.[key];
    const normalizedValue = Array.isArray(value) ? value[0] : value;

    inputs[key] = normalizedValue && normalizedValue.trim() ? normalizedValue : defaultCostInputs[key];
    return inputs;
  }, { ...defaultCostInputs });
}

export function costComparisonQuery(inputs: CalculatorInputs) {
  const params = new URLSearchParams();

  inputKeys.forEach((key) => {
    params.set(key, inputs[key]);
  });

  return params.toString();
}
