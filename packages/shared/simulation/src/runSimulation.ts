import { TrackUtils } from "./TrackUtils.ts";
import { createCarsStats, GameSimulator, RaceResult } from "./GameSimulator.ts";
import { RNG } from "./RNG.ts";
import type {PlayerConfig } from "./types.ts";

export type RunSimulationResult = {
  results: RaceResult[];
  surface: "DIRT" | "ICE" | "ASPHALT";
};

export function runSimulation(
  playerConfig: PlayerConfig,
  seed: number,
): RunSimulationResult {
  const rng = new RNG(seed);
  const trackConfig = TrackUtils.generateTrackConfig(rng);
  const trackPoints = TrackUtils.generateRandomTrackPoints(rng);
  const simulator = new GameSimulator(
    trackPoints,
    3,
    trackConfig,
    undefined,
    rng,
    "SHARED",
    false,
  );
  // console.log("=== SHARED SIMULATION INITIAL CONDITIONS ===");
  // console.log("Seed:", seed);
  // console.log("Track Config:", JSON.stringify(trackConfig, null, 2));
  // console.log("Track Points Count:", trackPoints.length);
  const cars = createCarsStats(playerConfig, rng);
  simulator.start(cars);
  // const carsData = cars.map(c => ({
  //   id: c.id,
  //   isPlayer: c.isPlayer,
  //   stats: c.stats,
  //   startProgress: c.startProgress,
  //   itemSequence: c.itemSequence,
  // }));
  // console.log("Cars:", JSON.stringify(carsData, null, 2));
  const results = simulator.run(cars);
  const surface = trackConfig.condition.toUpperCase() as "DIRT" | "ICE" | "ASPHALT";
  return { results: results.results, surface };
}
