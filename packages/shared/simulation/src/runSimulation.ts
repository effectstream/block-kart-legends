import { TrackUtils } from "./TrackUtils.ts";
import { createCarsStats, GameSimulator, RaceResult } from "./GameSimulator.ts";
import { RNG } from "./RNG.ts";
import { PlayerConfig } from "./types.ts";

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
  );
  const cars = createCarsStats(playerConfig, rng);
  simulator.start(cars);
  const results = simulator.run(cars);
  return results.results;
}

if (Deno.env.get("DRY_RUN") === "true") {
  const playerConifg: PlayerConfig = {
    stats: {
      max_velocity: 5,
      accel_curve: 5,
      mass: 5,
      turn_radius: 5,
      grip_factor: 5,
      boost_efficiency: 5,
    },
    items: [
      {
        slotIndex: 0,
        itemType: "Mushroom",
      },
    ],
  };
  const seed = new Date().getTime();
  const raceResults = runSimulation(playerConifg, seed);
  console.log(raceResults);
}
