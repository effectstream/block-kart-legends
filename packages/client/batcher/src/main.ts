import { main, suspend } from "effection";
import { createNewBatcher, MidnightAdapter } from "@paimaexample/batcher";
import { config, storage } from "./config.ts";
import * as midnightAdapters from "./adapter-midnight.ts";
import { effectstreaml2Adapter } from "./adapter-effectstreaml2.ts";

const batcher = createNewBatcher(config, storage);
const batchIntervalMs = 100;

batcher
  .addBlockchainAdapter("effectstreaml2", effectstreaml2Adapter, {
    criteriaType: "time",
    timeWindowMs: batchIntervalMs,
  })
  .setDefaultTarget("effectstreaml2");

for (const [contract, adapter] of Object.entries(midnightAdapters)) {
  if (adapter instanceof MidnightAdapter) {
    batcher.addBlockchainAdapter(contract, adapter, {
      criteriaType: "size",
      maxBatchSize: 1,
    });
  }
}

// E2E-specific startup banner via state transition
batcher
  .addStateTransition("startup", ({ publicConfig }) => {
    const banner =
      `🧪 E2E Batcher startup - polling every ${publicConfig.pollingIntervalMs} ms\n` +
      `      | 📍 Default Target: ${publicConfig.defaultTarget}\n` +
      `      | ⛓️ Blockchain Adapter Targets: ${publicConfig.adapterTargets.join(
        ", "
      )}\n` +
      `      | 📦 Batching Criteria: ${Object.entries(
        publicConfig.criteriaTypes
      )
        .map(([target, type]) => `${target}=${type}`)
        .join(", ")}\n` +
      `      | 📋 Press Ctrl+C to stop gracefully`;
    console.log(banner);
  })
  .addStateTransition("http:start", ({ port }) => {
    const publicConfig = batcher.getPublicConfig();
    const httpInfo =
      `🌐 HTTP Server started for E2E\n` +
      `      | URL: http://localhost:${port}\n` +
      `      | Confirmation: ${publicConfig.confirmationLevel}\n` +
      `      | Events Enabled: ${publicConfig.enableEventSystem}\n` +
      `      | Polling: ${publicConfig.pollingIntervalMs} ms`;
    console.log(httpInfo);
  });

main(function* () {
  console.log("🚀 Starting Batcher...");
  try {
    // Run the batcher with Effection structured concurrency
    yield* batcher.runBatcher();
  } catch (error) {
    console.error("❌ Batcher error:", error);
    // Trigger graceful shutdown on error
    yield* batcher.gracefulShutdownOp();
  }
  // Keep the main operation alive
  yield* suspend();
});
