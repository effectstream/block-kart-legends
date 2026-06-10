import type { OrchestratorConfig } from "@effectstream/orchestrator/config";

export default {
  processes: [
    {
      name: "sync",
      description: "Block Kart Legends sync node (mainnet)",
      args: ["run", "packages/client/node/src/main.mainnet.ts"],
      waitToExit: false,
      type: "system-dependency",
      env: {
        EFFECTSTREAM_ENV: "mainnet",
        NODE_ENV: "production",
      },
    },
    {
      name: "batcher",
      description: "Transaction batcher (mainnet)",
      args: ["run", "--filter", "@kart-legends/batcher", "start"],
      waitToExit: false,
      type: "system-dependency",
      link: "http://localhost:3334",
      stopProcessAtPort: [3334],
      env: { EFFECTSTREAM_ENV: "mainnet" },
    },
  ],
} satisfies OrchestratorConfig;
