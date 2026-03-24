import { PaimaEngineConfig } from "@paimaexample/wallets";
import { hardhat, arbitrumSepolia } from "viem/chains";

const chains: Record<string, any> = {
  hardhat,
  arbitrumSepolia,
};

export const ENV = {
  L2_CONTRACT_ADDRESS: (import.meta.env.VITE_L2_CONTRACT_ADDRESS) as `0x${string}`,
  BATCHER_URL: import.meta.env.VITE_BATCHER_URL,
  API_URL: import.meta.env.VITE_API_URL,
}

const chainName = import.meta.env.VITE_CHAIN;
const chain = chains[chainName];

const syncProtocolName = "mainEvmRPC";
const appName = "";
const useBatching = true;

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
