import { PaimaEngineConfig } from "@paimaexample/wallets";
import { hardhat } from "viem/chains";

// TODO We need to set this from env variables
export const ENV = {
	
  L2_CONTRACT_ADDRESS:"0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" /* "0x5FbDB2315678afecb367f032d93F642f64180aa3" */ as `0x${string}`,
  BATCHER_URL: "https://batcher-game2.paimastudios.com",
  API_URL: "https://api-game2.paimastudios.com",
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
