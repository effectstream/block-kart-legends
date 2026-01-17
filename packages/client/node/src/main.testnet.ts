// NOTE & TODO:
// Importing "@midnight-ntwrk/onchain-runtime" here is a workaround.
// Loading this package in a dependency makes the onchain-runtime wasm
// fail in runtime when trying to parse the state.
// The next line is so that the wasm is loaded and not optimized away.
import "@midnight-ntwrk/onchain-runtime";

import { init, start } from "@paimaexample/runtime";
import { main, suspend } from "effection";
import { config } from "@kart-legends/data-types/config-testnet";
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
  console.log("Starting EffectStream Node (Testnet)");

  yield* withEffectstreamStaticConfig(config, function* () {
    yield* start({
      appName: "block-kart-legends",
      appVersion: "0.3.129",
      syncInfo: toSyncProtocolWithNetwork(config),
      gameStateTransitions,
      migrations: migrationTable,
      apiRouter,
      grammar,
    });
  });

  yield* suspend();
});
