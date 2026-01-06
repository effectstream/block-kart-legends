import { TrackUtils } from "./TrackUtils.ts";
import { createCarsStats, GameSimulator, RaceResult } from "./GameSimulator.ts";
import { RNG } from "./RNG.ts";
import type {PlayerConfig } from "./types.ts";

export function runSimulation(
  playerConfig: PlayerConfig,
  seed: number,
): RaceResult[] {
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
  // console.log("Shared simulation completed. Total time:", results.results[results.results.length - 1]?.time, "ms");
  // console.log("Shared simulation update calls:", simulator.updateCallCount);
  // console.log("Shared simulation results:", JSON.stringify(results.results, null, 2));
  // console.log("Shared simulation step snapshots:", simulator.stepSnapshots.length);
  // console.log("=== END SHARED SIMULATION INITIAL CONDITIONS ===");
  return results.results;
}
