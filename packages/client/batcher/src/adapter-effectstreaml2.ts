import { EffectstreamL2DefaultAdapter } from "@effectstream/batcher-sdk";
import { contractAddressesEvmMain } from "@kart-legends/evm-contracts";
import { getEnv } from "@effectstream/utils";
import * as chains from "viem/chains";
import type { Chain } from "viem";

export interface EffectstreamL2Env {
  chainNameId: keyof ReturnType<typeof contractAddressesEvmMain>;
  privateKey: `0x${string}`;
  fee: bigint;
  syncProtocolName: string;
  chain: Chain;
}

function getContractAddress(
  chainNameId: keyof ReturnType<typeof contractAddressesEvmMain>,
): `0x${string}` {
  const address = contractAddressesEvmMain()[chainNameId][
    "effectstreaml2Module#effectstreaml2"
  ] as `0x${string}` | undefined;
  if (!address) {
    throw new Error(`EffectstreamL2 address not found for ${String(chainNameId)}`);
  }
  return address;
}

function resolveEffectstreamL2Env(): EffectstreamL2Env {
  const env = getEnv("EFFECTSTREAM_ENV");
  const isMainnet = env === "mainnet";
  const isPreprod = env === "preprod";
  const isUndeployed = env === "dev";

  let chainNameId: keyof ReturnType<typeof contractAddressesEvmMain>;
  if (isMainnet) {
    chainNameId = "chain42161";
  } else if (isPreprod) {
    chainNameId = "chain421614";
  } else if (isUndeployed) {
    chainNameId = "chain31337";
  } else {
    throw new Error("Invalid effectstream environment");
  }

  const privateKey = getEnv("BATCHER_EVM_SECRET_KEY") as `0x${string}`;
  if (!privateKey) {
    throw new Error("Batcher private key not found");
  }

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
    if (!getEnv("ARBITRUM_ONE_FULL")) {
      throw new Error("ARBITRUM_ONE_FULL is not set");
    }
    chain = chains.arbitrum;
    chain.rpcUrls = {
      default: {
        http: [getEnv("ARBITRUM_ONE_FULL")!],
      },
    };
  } else {
    throw new Error("Invalid effectstream environment");
  }

  return {
    chainNameId,
    privateKey,
    fee: 0n,
    syncProtocolName: "mainEvmRPC",
    chain,
  };
}

export function createEffectstreamL2Adapter(env: EffectstreamL2Env) {
  const contractAddress = getContractAddress(env.chainNameId);
  return new EffectstreamL2DefaultAdapter(
    contractAddress,
    env.privateKey,
    env.fee,
    env.syncProtocolName,
    env.chain,
  );
}

export const effectstreaml2Adapter = createEffectstreamL2Adapter(
  resolveEffectstreamL2Env(),
);
