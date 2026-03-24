import { PaimaL2DefaultAdapter } from "@paimaexample/batcher";
import { contractAddressesEvmMain } from "@kart-legends/evm-contracts";
import { getEnv } from "@paimaexample/utils"; 
import * as chains from "viem/chains";
import type { Chain } from "viem";

const isMainnet = getEnv("EFFECTSTREAM_ENV") === "mainnet";
const isPreprod = getEnv("EFFECTSTREAM_ENV") === "preprod";
const isUndeployed = getEnv("EFFECTSTREAM_ENV") === "dev";

let chainNameId: keyof typeof contractAddressesEvmMain;
if (isMainnet) {
  chainNameId = "chain42161" as keyof typeof contractAddressesEvmMain;
} else if (isPreprod) {
  chainNameId = "chain421614" as keyof typeof contractAddressesEvmMain;
} else if (isUndeployed) {
  chainNameId = "chain31337" as keyof typeof contractAddressesEvmMain;
} else {
  throw new Error("Invalid effectstream environment");
}

// Config values mirroring ./packages/client/node/scripts/start.ts
const paimaL2Address = contractAddressesEvmMain()[chainNameId]["effectstreaml2Module#effectstreaml2"] as `0x${string}`;
if (!paimaL2Address) {
  throw new Error("EffectstreamL2 address not found");
}

const paimaSyncProtocolName = "mainEvmRPC";

const batcherPrivateKey = getEnv("BATCHER_EVM_SECRET_KEY") as `0x${string}`;
if (!batcherPrivateKey) {
  throw new Error("Batcher private key not found");
}

// Defaults consistent with E2E usage
const paimaL2Fee = 0n; // old batcher defaulted to 0 for local dev

let chain: Chain;
if (isPreprod) {
  if (!getEnv("ARBITRUM_SEPOLIA_RPC_URL")) {
    throw new Error("ARBITRUM_SEPOLIA_RPC_URL is not set");
  }
  chain = chains.arbitrumSepolia;
  chain.rpcUrls = {
    default: {
      http: [getEnv("ARBITRUM_SEPOLIA_RPC_URL")!],
    },
  };
} else if (isUndeployed) {
  chain = chains.hardhat;
} else if (isMainnet) {
  if (!getEnv("ARBITRUM_ONE_RPC_URL")) {
    throw new Error("ARBITRUM_ONE_RPC_URL is not set");
  }
  chain = chains.arbitrum;
  chain.rpcUrls = {
    default: {
      http: [getEnv("ARBITRUM_ONE_RPC_URL")!],
    },
  };
} else {
  throw new Error("Invalid effectstream environment");
}

// PaimaL2 EVM adapter
export const effectstreaml2Adapter = new PaimaL2DefaultAdapter(
  paimaL2Address,
  batcherPrivateKey,
  paimaL2Fee,
  paimaSyncProtocolName,
  chain,
);
