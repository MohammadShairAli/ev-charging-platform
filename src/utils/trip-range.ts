export const ARRIVAL_RESERVE_PERCENT = 15;

type RangeCandidate = {
  station: { id: string };
  progressKm: number;
  corridorKm: number;
};

export function reachableChargingOptions<T extends RangeCandidate>(
  candidates: T[],
  currentProgressKm: number,
  drivingBudgetKm: number,
  excludedStationIds: string[],
) {
  const excluded = new Set(excludedStationIds);

  return candidates
    .filter((candidate) => (
      !excluded.has(candidate.station.id) &&
      candidate.progressKm > currentProgressKm + 3 &&
      candidate.progressKm <= currentProgressKm + drivingBudgetKm
    ))
    .sort((first, second) => (
      first.progressKm - second.progressKm || first.corridorKm - second.corridorKm
    ));
}

export function chooseChargingStops<T extends RangeCandidate>(
  candidates: T[],
  totalDistanceKm: number,
  carRangeKm: number,
  currentChargePercent: number,
  maxChargingStops: number,
) {
  const fullChargeDrivingBudgetKm = carRangeKm * ((100 - ARRIVAL_RESERVE_PERCENT) / 100);
  const stops: T[] = [];
  let currentProgressKm = 0;
  let drivingBudgetKm = carRangeKm * (Math.max(0, currentChargePercent - ARRIVAL_RESERVE_PERCENT) / 100);

  while (totalDistanceKm - currentProgressKm > drivingBudgetKm) {
    const reachable = candidates
      .filter((candidate) => (
        candidate.progressKm > currentProgressKm + 5 &&
        candidate.progressKm <= currentProgressKm + drivingBudgetKm &&
        !stops.some((stop) => stop.station.id === candidate.station.id)
      ))
      .sort((first, second) => (
        second.progressKm - first.progressKm || first.corridorKm - second.corridorKm
      ));
    const nextStop = reachable[0];

    if (!nextStop) {
      if (currentProgressKm === 0) {
        const safeRangeKm = Math.max(0, Math.round(drivingBudgetKm));
        throw new Error(
          `Your current battery is ${currentChargePercent}%, which provides about ${safeRangeKm} km before the ${ARRIVAL_RESERVE_PERCENT}% safety reserve. Charge before leaving or choose a closer destination.`,
        );
      }

      throw new Error(
        `No charging station was found that keeps at least ${ARRIVAL_RESERVE_PERCENT}% battery on every leg. Try a larger range or a different route.`,
      );
    }

    stops.push(nextStop);
    currentProgressKm = nextStop.progressKm;
    drivingBudgetKm = fullChargeDrivingBudgetKm;

    if (stops.length >= maxChargingStops && totalDistanceKm - currentProgressKm > drivingBudgetKm) {
      throw new Error("This trip needs more charging stops than the planner currently supports.");
    }
  }

  return stops;
}

export function chooseRemainingStopsAfter<T extends RangeCandidate>(
  candidates: T[],
  totalDistanceKm: number,
  chosenProgressKm: number,
  carRangeKm: number,
  maxChargingStops: number,
  excludedStationIds: string[],
) {
  const excluded = new Set(excludedStationIds);
  const relativeCandidates = candidates
    .filter((candidate) => (
      !excluded.has(candidate.station.id) &&
      candidate.progressKm > chosenProgressKm + 5
    ))
    .map((candidate) => ({
      station: candidate.station,
      progressKm: candidate.progressKm - chosenProgressKm,
      corridorKm: candidate.corridorKm,
      original: candidate,
    }));
  const remainingDistanceKm = Math.max(0, totalDistanceKm - chosenProgressKm);

  return chooseChargingStops(
    relativeCandidates,
    remainingDistanceKm,
    carRangeKm,
    100,
    maxChargingStops,
  ).map((candidate) => candidate.original);
}
