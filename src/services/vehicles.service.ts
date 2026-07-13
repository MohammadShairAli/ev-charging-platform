import { readFile } from "node:fs/promises";
import path from "node:path";
import type { VehicleRecord } from "@/src/components/vehicle/VehicleDatabase";

export type VehicleCategory = "All" | "EV" | "PHEV" | "REEV" | "HEV";
export type VehicleSort = "name" | "range-desc" | "range-asc" | "battery-desc" | "battery-asc";

type CsvRow = Record<string, string>;

type VehiclePageInput = {
  q?: string;
  category?: VehicleCategory;
  sort?: VehicleSort;
  page?: number;
  pageSize?: number;
};

export type VehiclePageResult = {
  vehicles: VehicleRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  suggestions: string[];
  stats: {
    total: number;
    brands: number;
    ev: number;
    phev: number;
    reev: number;
    hev: number;
  };
};

const DEFAULT_PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 24;

export async function getVehiclePage(input: VehiclePageInput = {}): Promise<VehiclePageResult> {
  const vehicles = await loadVehicles();
  const category = input.category || "All";
  const sort = input.sort || "name";
  const query = input.q?.trim().toLowerCase() || "";
  const pageSize = clampNumber(input.pageSize || DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const filtered = vehicles.filter((vehicle) => {
    const categoryMatches = category === "All" || vehicle.category === category;
    const queryMatches = !query || searchableValues(vehicle).some((value) => value.toLowerCase().includes(query));

    return categoryMatches && queryMatches;
  });
  const sorted = sortVehicles(filtered, sort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = clampNumber(input.page || 1, 1, totalPages);
  const start = (page - 1) * pageSize;
  const stats = {
    total: vehicles.length,
    brands: new Set(vehicles.map((vehicle) => vehicle.brand)).size,
    ev: vehicles.filter((vehicle) => vehicle.category === "EV").length,
    phev: vehicles.filter((vehicle) => vehicle.category === "PHEV").length,
    reev: vehicles.filter((vehicle) => vehicle.category === "REEV").length,
    hev: vehicles.filter((vehicle) => vehicle.category === "HEV").length,
  };

  return {
    vehicles: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    pageSize,
    totalPages,
    suggestions: buildSuggestions(vehicles, query, category),
    stats,
  };
}

async function loadVehicles() {
  const [evRows, plugInHybridRows, hybridRows] = await Promise.all([
    readCsv("ev.csv"),
    readCsv("phev_and_reev.csv"),
    readCsv("hev.csv"),
  ]);

  return [
    ...evRows.map((row, index) => toEvVehicle(row, index)),
    ...plugInHybridRows.map((row, index) => toPlugInHybridVehicle(row, index)),
    ...hybridRows.map((row, index) => toHevVehicle(row, index)),
  ];
}

async function readCsv(fileName: string) {
  const filePath = path.join(process.cwd(), "public", "Car_data", fileName);
  const file = await readFile(filePath, "utf8");
  const [headerLine, ...lines] = file.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(headerLine);

  return lines.map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += char;
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function vehicleImage(row: CsvRow) {
  return row.Image || row.Cloudinary_Image || "/icon.png";
}

function fallbackVehicleImage(row: CsvRow) {
  return row.Cloudinary_Image || "/icon.png";
}

function toEvVehicle(row: CsvRow, index: number): VehicleRecord {
  return {
    id: `ev-${index}-${row.Brand}-${row.Model}-${row.Variant}`,
    category: "EV",
    brand: row.Brand,
    model: row.Model,
    variant: row.Variant,
    image: vehicleImage(row),
    fallbackImage: fallbackVehicleImage(row),
    rangeKm: parseNumber(row.Range),
    batteryKwh: parseNumber(row["Battery Capacity"]),
    specs: [
      { label: "Range", value: row.Range },
      { label: "Battery", value: row["Battery Capacity"] },
      { label: "Motor", value: row["Motor Power"] },
      { label: "Charging", value: row["Charging Time"] },
      { label: "Battery type", value: row["Battery Type"] },
      { label: "Max speed", value: row["Max Speed"] },
    ],
  };
}

function toPlugInHybridVehicle(row: CsvRow, index: number): VehicleRecord {
  const category = row["Engine Type"] === "REEV" ? "REEV" : "PHEV";

  return {
    id: `hybrid-${index}-${row.Brand}-${row.Model}-${row.Variant}`,
    category,
    brand: row.Brand,
    model: row.Model,
    variant: row.Variant,
    image: vehicleImage(row),
    fallbackImage: fallbackVehicleImage(row),
    rangeKm: parseNumber(row["Pure Electric Range"]),
    batteryKwh: null,
    specs: [
      { label: "EV range", value: row["Pure Electric Range"] },
      { label: "Combined", value: row["Combined Mileage"] },
      { label: "Power", value: row["Horse Power"] },
      { label: "Torque", value: row.Torque },
      { label: "Engine", value: row["Engine Type"] },
      { label: "Fuel tank", value: row["Fuel Tank Capacity"] },
      { label: "Max speed", value: row["Max Speed"] },
    ],
  };
}

function toHevVehicle(row: CsvRow, index: number): VehicleRecord {
  return {
    id: `hev-${index}-${row.Brand}-${row.Model}-${row.Variant}`,
    category: "HEV",
    brand: row.Brand,
    model: row.Model,
    variant: row.Variant,
    image: vehicleImage(row),
    fallbackImage: fallbackVehicleImage(row),
    rangeKm: null,
    batteryKwh: null,
    specs: [
      { label: "City mileage", value: row["Mileage City"] },
      { label: "Highway", value: row["Mileage Highway"] },
      { label: "Power", value: row["Horse Power"] },
      { label: "Torque", value: row.Torque },
      { label: "Engine", value: row["Engine Type"] },
      { label: "Displacement", value: row.Displacement },
      { label: "Fuel tank", value: row["Fuel Tank Capacity"] },
      { label: "Max speed", value: row["Max Speed"] },
    ],
  };
}

function sortVehicles(vehicles: VehicleRecord[], sort: VehicleSort) {
  return [...vehicles].sort((first, second) => {
    if (sort === "range-desc") {
      return compareNumeric(first.rangeKm, second.rangeKm, "desc") || compareName(first, second);
    }

    if (sort === "range-asc") {
      return compareNumeric(first.rangeKm, second.rangeKm, "asc") || compareName(first, second);
    }

    if (sort === "battery-desc") {
      return compareNumeric(first.batteryKwh, second.batteryKwh, "desc") || compareName(first, second);
    }

    if (sort === "battery-asc") {
      return compareNumeric(first.batteryKwh, second.batteryKwh, "asc") || compareName(first, second);
    }

    return compareName(first, second);
  });
}

function compareNumeric(first: number | null, second: number | null, direction: "asc" | "desc") {
  if (first === null && second === null) {
    return 0;
  }

  if (first === null) {
    return 1;
  }

  if (second === null) {
    return -1;
  }

  const result = direction === "asc" ? first - second : second - first;

  return Number.isFinite(result) ? result : 0;
}

function compareName(first: VehicleRecord, second: VehicleRecord) {
  return `${first.brand} ${first.model} ${first.variant}`.localeCompare(`${second.brand} ${second.model} ${second.variant}`);
}

function searchableValues(vehicle: VehicleRecord) {
  return [
    vehicle.brand,
    vehicle.model,
    `${vehicle.brand} ${vehicle.model}`,
    `${vehicle.brand} ${vehicle.model} ${vehicle.variant}`,
    vehicle.variant,
  ];
}

function buildSuggestions(vehicles: VehicleRecord[], query: string, category: VehicleCategory) {
  if (!query) {
    return [];
  }

  const candidates = vehicles
    .filter((vehicle) => category === "All" || vehicle.category === category)
    .flatMap((vehicle) => [
      vehicle.brand,
      `${vehicle.brand} ${vehicle.model}`,
      `${vehicle.brand} ${vehicle.model} ${vehicle.variant}`,
    ]);

  return Array.from(new Set(candidates))
    .filter((value) => value.toLowerCase().includes(query))
    .slice(0, 8);
}

function parseNumber(value: string) {
  const match = value.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.floor(value), min), max);
}
