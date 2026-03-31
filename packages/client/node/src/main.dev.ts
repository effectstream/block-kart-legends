// main.dev.ts — Local development runtime
// - config-dev: hardhat EVM + local Midnight (networkId: undeployed)
// NOTE: validate-env must be first import — runs before config modules that crash on missing vars
import "./validate-env.dev.ts";
// NOTE: onchain-runtime import is a workaround to preload the wasm module.
import "@midnight-ntwrk/onchain-runtime";

import { init, start } from "@paimaexample/runtime";
import { main, suspend } from "effection";
import { config } from "@kart-legends/data-types/config-dev";
import {
  type SyncProtocolWithNetwork,
  toSyncProtocolWithNetwork,
  withEffectstreamStaticConfig,
} from "@paimaexample/config";
import { migrationTable } from "@kart-legends/database";
import { gameStateTransitions } from "./state-machine.ts";
import { apiRouter } from "./api.ts";
import { grammar } from "@kart-legends/data-types/grammar";

main(function* () {
  yield* init();
  console.log("Starting Paima Engine Node");

  yield* withEffectstreamStaticConfig(config, function* () {
    yield* start({
      appName: "safe-solver",
      appVersion: "0.3.126",
      syncInfo: toSyncProtocolWithNetwork(config),
      gameStateTransitions,
      migrations: migrationTable,
      apiRouter,
      grammar,
      userDefinedPrimitives: {},
    });
  });

  yield* suspend();
});
