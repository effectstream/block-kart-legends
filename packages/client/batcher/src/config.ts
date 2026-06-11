import {
  FileStorage,
  type BatcherConfig,
  type DefaultBatcherInput,
} from "@effectstream/batcher-sdk";

const batchIntervalMs = 1000;
const port = Number(process.env.BATCHER_PORT ?? "3334");

// Batcher config matching old behavior
export const config: BatcherConfig<DefaultBatcherInput> = {
  pollingIntervalMs: batchIntervalMs,
  enableHttpServer: true,
  // Must match the frontend EngineConfig securityNamespace and the node's
  // setSecurityNamespace(...) in packages/shared/data-types/src/config*.ts.
  namespace: "evm-midnight-node",
  confirmationLevel: "wait-effectstream-processed",
  enableEventSystem: true, // Important for adding state transitions to console logs
  port,
};

export const storage = new FileStorage("./batcher-data");
