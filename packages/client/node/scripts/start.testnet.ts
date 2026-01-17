import { OrchestratorConfig, start } from "@paimaexample/orchestrator";
import { ComponentNames } from "@paimaexample/log";
import { Value } from "@sinclair/typebox/value";
import { ENV } from "@paimaexample/utils/node-env";
import {
  isExternalProofServerConfigured,
  midnightNetworkConfig,
} from "@paimaexample/midnight-contracts/midnight-env";

const logs = ENV.getBoolean("EFFECTSTREAM_STDOUT") ? "stdout" : "development";
const disableStderr = logs !== "stdout";

const shouldLaunchProofServer = !isExternalProofServerConfigured;
const shouldInjectProofServerEnv =
  !Deno.env.get("MIDNIGHT_PROOF_SERVER_URL") &&
  !Deno.env.get("MIDNIGHT_PROOF_SERVER");
const proofServerEnv = shouldInjectProofServerEnv
  ? { MIDNIGHT_PROOF_SERVER_URL: midnightNetworkConfig.proofServer }
  : undefined;

const customProcesses = [
  {
    name: "install-frontend",
    command: "npm",
    cwd: "../../frontend/",
    args: ["install"],
    waitToExit: true,
    type: "system-dependency",
    dependsOn: [],
  },
  {
    name: "serve-frontend",
    command: "npm",
    cwd: "../../frontend",
    args: ["run", "dev"],
    waitToExit: false,
    link: "http://localhost:3000",
    type: "system-dependency",
    dependsOn: ["install-frontend"],
    logs: "none",
  },
  {
    name: "explorer",
    args: ["run", "-A", "--unstable-detect-cjs", "@paimaexample/explorer"],
    waitToExit: false,
    type: "system-dependency",
    link: "http://localhost:10590",
    stopProcessAtPort: [10590],
  },
  {
    name: "batcher",
    args: ["task", "-f", "@kart-legends/batcher", "start"],
    waitToExit: false,
    type: "system-dependency",
    link: "http://localhost:3334",
    stopProcessAtPort: [3334],
    env: {
      EFFECTSTREAM_ENV: "testnet"
    }
  },
];

const config = Value.Parse(OrchestratorConfig, {
  logs,
  packageName: "jsr:@paimaexample",
  processes: {
    [ComponentNames.TMUX]: logs === "development",
    [ComponentNames.TUI]: logs === "development",
    // Launch Dev DB & Collector
    [ComponentNames.EFFECTSTREAM_PGLITE]: true,
    [ComponentNames.COLLECTOR]: true,
  },

  // Launch my processes
  processesToLaunch: [
    ...(shouldLaunchProofServer
      ? [
        {
          name: ComponentNames.MIDNIGHT_PROOF_SERVER,
          args: [
            "task",
            "-f",
            "@kart-legends/midnight-contracts",
            "midnight-proof-server:start",
          ],
          waitToExit: false,
          type: "system-dependency",
          logs: "raw",
          logsStartDisabled: true,
          disableStderr,
          env: proofServerEnv,
        },
        {
          name: ComponentNames.MIDNIGHT_PROOF_SERVER_WAIT,
          args: [
            "task",
            "-f",
            "@kart-legends/midnight-contracts",
            "midnight-proof-server:wait",
          ],
          logs: "raw",
          env: proofServerEnv,
          dependsOn: [ComponentNames.MIDNIGHT_PROOF_SERVER],
        },
      ]
      : []),
    ...customProcesses,
  ],
});

await start(config);
