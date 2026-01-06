import type { HardhatUserConfig } from "hardhat/config";
import {
  createHardhatConfig,
  createNodeTasks,
  initTelemetry,
} from "@paimaexample/evm-contracts";
import {
  JsonRpcServerImplementation,
} from "@paimaexample/evm-hardhat/json-rpc-server";
import fs from "node:fs";
import waitOn from "wait-on";
import {
  ComponentNames,
  log,
  SeverityNumber,
} from "@paimaexample/log";

const __dirname: any = import.meta.dirname;

// Initialize telemetry
initTelemetry("@paimaexample/log", "./deno.json");

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
    arbitrumSepolia: {
      type: "http",
      chainId: 421614,
      url: "https://arb-sepolia.g.alchemy.com/v2/API-KEY", // Replace with your RPC URL
      accounts: ["0000000000000000000000000000000000000000000000000000000000000000"], // Private key with funds to deploy contracts.
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
