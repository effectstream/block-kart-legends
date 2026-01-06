import { PaimaL2DefaultAdapter } from "@paimaexample/batcher";
import { contractAddressesEvmMain } from "@kart-legends/evm-contracts";
import { ENV } from "@paimaexample/utils/node-env";
import * as chains from "viem/chains";
import type { Chain } from "viem";

const isTestnet = ENV.EFFECTSTREAM_ENV === "testnet";
const chainNameId = isTestnet ? "chain421614" : "chain31337";

// Config values mirroring ./packages/client/node/scripts/start.ts
const paimaL2Address = contractAddressesEvmMain()[chainNameId]["effectstreaml2Module#effectstreaml2"] as `0x${string}`;
if (!paimaL2Address) {
  throw new Error("EffectstreamL2 address not found");
}

const paimaSyncProtocolName = "mainEvmRPC";

const batcherPrivateKey = ENV.getString("BATCHER_EVM_SECRET_KEY") as `0x${string}`;
if (!batcherPrivateKey) {
  throw new Error("Batcher private key not found");
}

// Defaults consistent with E2E usage
const paimaL2Fee = 0n; // old batcher defaulted to 0 for local dev

let chain: Chain;
if (isTestnet) {
  chain = chains.arbitrumSepolia;
  chain.rpcUrls = {
    default: {
      http: [ENV.getString("ARBITRUM_SEPOLIA_RPC")],
    },
  };
} else {
  chain = chains.hardhat;
}

// PaimaL2 EVM adapter
export const effectstreaml2Adapter = new PaimaL2DefaultAdapter(
  paimaL2Address,
  batcherPrivateKey,
  paimaL2Fee,
  paimaSyncProtocolName,
  chain,
);
