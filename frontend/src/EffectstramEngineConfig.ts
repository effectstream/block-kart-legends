import { PaimaEngineConfig } from "@paimaexample/wallets";
import { hardhat } from "viem/chains";

// Configuration
export const EngineConfig = new PaimaEngineConfig(
  "", // no app name
  "mainEvmRPC", // sync protocol name
  "0x5FbDB2315678afecb367f032d93F642f64180aa3", // L2 contract address
  hardhat as any, // l2 chain
  undefined, // use default abi
  "http://localhost:3334", // batcher url
  true // use batching
);
