import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseChargingStops,
  chooseRemainingStopsAfter,
  reachableChargingOptions,
} from "./trip-range.ts";

function candidate(id, progressKm) {
  return {
    station: { id },
    progressKm,
    corridorKm: 1,
  };
}

test("does not plan a distant first charging stop when current charge is 5 percent", () => {
  assert.throws(
    () => chooseChargingStops(
      [candidate("charger-270", 270)],
      500,
      380,
      5,
      8,
    ),
    /charge before leaving|current battery/i,
  );
});

test("limits the first stop using current charge minus the arrival reserve", () => {
  const stops = chooseChargingStops(
    [candidate("charger-15", 15), candidate("charger-250", 250), candidate("charger-330", 330)],
    500,
    380,
    20,
    8,
  );

  assert.equal(stops[0]?.station.id, "charger-15");
});

test("shows every charger reachable from the current point, including earlier stops", () => {
  const options = reachableChargingOptions(
    [candidate("charger-100", 100), candidate("charger-200", 200), candidate("charger-270", 270)],
    0,
    247,
    [],
  );

  assert.deepEqual(options.map((option) => option.station.id), ["charger-100", "charger-200"]);
});

test("replans all remaining stops after the driver chooses an earlier charger", () => {
  const remainingStops = chooseRemainingStopsAfter(
    [
      candidate("charger-100", 100),
      candidate("charger-200", 200),
      candidate("charger-400", 400),
      candidate("charger-700", 700),
    ],
    800,
    100,
    380,
    7,
    ["charger-100"],
  );

  assert.deepEqual(remainingStops.map((stop) => stop.station.id), ["charger-400", "charger-700"]);
});
