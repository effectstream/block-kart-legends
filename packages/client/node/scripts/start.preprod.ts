// start.preprod.ts — Preprod/staging environment (Midnight testnet + Arbitrum Sepolia)
// - Launches Midnight only (no local EVM node — uses remote Arbitrum Sepolia RPC)
// - Batcher depends on Midnight contract only
// - Uses EFFECTSTREAM_ENV=preprod → loads .env.preprod
import { OrchestratorConfig, start } from "@paimaexample/orchestrator";
import { ComponentNames } from "@paimaexample/log";
import { Value } from "@sinclair/typebox/value";

const customProcesses = [
  /** BATCHER-BLOCK */
  {
    name: "batcher",
    args: ["task", "-f", "@kart-legends/batcher", "start"],
    waitToExit: false,
    type: "system-dependency",
    link: "http://localhost:3334",
    stopProcessAtPort: [3334],
    dependsOn: [
    ],
  },
  /** BATCHER-BLOCK */
];

const config = Value.Parse(OrchestratorConfig, {
  // Launch system processes
  packageName: "jsr:@paimaexample",
  processes: {
    [ComponentNames.TMUX]: false,
    [ComponentNames.TUI]: false,
    [ComponentNames.EFFECTSTREAM_PGLITE]: false,
    [ComponentNames.COLLECTOR]: false,
  },

  // Launch my processes
  processesToLaunch: [
    ...customProcesses,
  ],
});

if (Deno.env.get("EFFECTSTREAM_STDOUT")) {
  config.logs = "stdout";
  config.processes[ComponentNames.TMUX] = false;
  config.processes[ComponentNames.TUI] = false;
  config.processes[ComponentNames.COLLECTOR] = false;
}

await start(config);
