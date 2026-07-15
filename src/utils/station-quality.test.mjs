import assert from "node:assert/strict";
import test from "node:test";
import { isStationInPakistan } from "./station-quality.ts";

test("accepts a station whose address explicitly identifies Pakistan", () => {
  assert.equal(isStationInPakistan({ address: "Lahore, Punjab, Pakistan", latitude: null, longitude: null }), true);
});

test("rejects a station whose address explicitly identifies India", () => {
  assert.equal(isStationInPakistan({ address: "Amritsar, Punjab, India", latitude: 31.63, longitude: 74.87 }), false);
});

test("accepts a station with a shortened address and coordinates inside Pakistan", () => {
  assert.equal(isStationInPakistan({ address: "Gulberg, Lahore", latitude: 31.52, longitude: 74.35 }), true);
});
