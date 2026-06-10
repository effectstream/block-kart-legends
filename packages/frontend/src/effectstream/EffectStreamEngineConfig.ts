import { EffectstreamConfig } from "@effectstream/wallets";
import { hardhat, arbitrum, arbitrumSepolia } from "viem/chains";

const chains: Record<string, any> = {
  hardhat,
  arbitrum,
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
const useBatching = true;

export const EngineConfig = new EffectstreamConfig(
  undefined,
  syncProtocolName,
  ENV.L2_CONTRACT_ADDRESS,
  chain,
  undefined,
  ENV.BATCHER_URL,
  useBatching
);
