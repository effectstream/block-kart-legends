import type { OrchestratorConfig } from "@effectstream/orchestrator/config";

export default {
  processes: [
    {
      name: "sync",
      description: "Block Kart Legends sync node (preprod)",
      args: ["run", "packages/client/node/src/main.preprod.ts"],
      waitToExit: false,
      type: "system-dependency",
      env: {
        EFFECTSTREAM_ENV: "preprod",
        NODE_ENV: "development",
      },
    },
  ],
} satisfies OrchestratorConfig;
