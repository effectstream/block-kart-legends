import { PaimaEngineConfig } from "@paimaexample/wallets";
import { hardhat } from "viem/chains";

// TODO We need to set this from env variables
export const ENV = {
  L2_CONTRACT_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`,
  BATCHER_URL: "http://localhost:3334",
  API_URL: "http://localhost:9999",
}

const syncProtocolName = "mainEvmRPC";
const appName = "";
const useBatching = true;
const chain = hardhat as any;

// Configuration
export const EngineConfig = new PaimaEngineConfig(
  appName,                 // app name
  syncProtocolName,        // sync protocol name
  ENV.L2_CONTRACT_ADDRESS, // L2 contract address
  chain,                   // l2 chain
  undefined,               // use default abi
  ENV.BATCHER_URL,         // batcher url
  useBatching              // use batching
);
