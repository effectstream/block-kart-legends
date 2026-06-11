import type { HardhatUserConfig } from "hardhat/config";
import {
  createHardhatConfig,
  createNodeTasks,
  initTelemetry,
} from "@effectstream/evm-hardhat/hardhat-config-builder";
import {
  JsonRpcServerImplementation,
} from "@effectstream/evm-hardhat/json-rpc-server";
import fs from "node:fs";
import waitOn from "wait-on";
import {
  ComponentNames,
  log,
  SeverityNumber,
} from "@effectstream/log";

const __dirname: any = import.meta.dirname;

// Initialize telemetry
initTelemetry("@effectstream/log", "./package.json");

// Create node tasks
const nodeTasks = createNodeTasks({
  JsonRpcServer: {} as unknown as never, // Type placeholder, not used
  JsonRpcServerImplementation,
  ComponentNames,
  log,
  SeverityNumber,
  waitOn,
  fs,
});

const evmMainPort = 8545;
const evmMainChainId = 31337;
const evmMainInterval = 1000;

// Deploy credentials are read from the environment so no secrets live in source.
// Falls back to harmless placeholders for dev/compile-only runs.
const ZERO_KEY =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const withHexPrefix = (k?: string) =>
  !k ? undefined : k.startsWith("0x") ? k : `0x${k}`;
const deployKey =
  withHexPrefix(
    process.env.DEPLOYER_PRIVATE_KEY ?? process.env.BATCHER_EVM_SECRET_KEY,
  ) ?? ZERO_KEY;
const arbitrumUrl =
  process.env.ARBITRUM_ONE_FULL ??
  process.env.ARBITRUM_ONE_RPC_URL ??
  "https://arb-mainnet.g.alchemy.com/v2/API-KEY";
const arbitrumSepoliaUrl =
  process.env.ARBITRUM_SEPOLIA_RPC_URL ??
  "https://arb-sepolia.g.alchemy.com/v2/API-KEY";

// Create unified config with default networks
const config: HardhatUserConfig = createHardhatConfig({
  sourcesDir: `${__dirname}/src/contracts`,
  artifactsDir: `${__dirname}/build/artifacts/hardhat`,
  cacheDir: `${__dirname}/build/cache/hardhat`,
  tasks: nodeTasks,
  solidityVersion: "0.8.30",
  networks: {
    // This is needed to set once, to deploy contracts in testnet:
    // deno task -f @kart-legends/evm-contracts deploy:testnet
    // deno task -f @kart-legends/evm-contracts build:mod
    // Deploy: set ARBITRUM_SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY (or
    // BATCHER_EVM_SECRET_KEY) in the env, then `bun run deploy:testnet`.
    arbitrumSepolia: {
      type: "http",
      chainId: 421614,
      url: arbitrumSepoliaUrl,
      accounts: [deployKey],
    },
    // Deploy: set ARBITRUM_ONE_FULL + DEPLOYER_PRIVATE_KEY (or
    // BATCHER_EVM_SECRET_KEY) in the env, then `bun run deploy:mainnet`.
    arbitrum: {
      type: 'http',
      chainId: 42161,
      url: arbitrumUrl,
      accounts: [deployKey],
    },

    // These are development networks.
    evmMain: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: evmMainChainId,
      mining: {
        auto: true,
        interval: evmMainInterval, // Arbitrum (250ms)
      },
      allowBlocksWithSameTimestamp: true,
    },
    // This is a helper network to allow to hardhat/ignition to connect to the network.
    evmMainHttp: {
      type: "http",
      chainType: "l1",
      url: `http://0.0.0.0:${evmMainPort}`,
    },
  }
});

export default config;
