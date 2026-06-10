import {
  deployMidnightContract,
} from "@effectstream/midnight-contracts/deploy";
import type { DeployConfig } from "@effectstream/midnight-contracts/types";

import {
  midnight_data,
  witnesses as midnightDataWitnesses,
} from "./contract-midnight-data/src/index.original.ts";
import { midnightNetworkConfig } from "@effectstream/midnight-contracts/midnight-env";

const configs: DeployConfig[] = [
  {
    contractName: "contract-midnight-data",
    contractFileName: "contract-midnight-data.json",
    contractClass: midnight_data.Contract,
    witnesses: midnightDataWitnesses,
    privateStateId: "midnightDataState",
    initialPrivateState: {},
    deployArgs: [],
    privateStateStoreName: "midnight-data-private-state",
    extractWalletAddress: true, // Extract wallet address and replace last arg with initialOwner
  },
];

const network = { ...midnightNetworkConfig };
let seed: { seed: string; mnemonic: string };
if (midnightNetworkConfig.id === 'mainnet') {
   const node = process.env.MIDNIGHT_NODE_URL as string;
   if (!node) {
    throw new Error("MIDNIGHT_NODE_URL is not set");
   }
   network.node = node;
   seed = { seed: process.env.MIDNIGHT_WALLET_SEED as string, mnemonic: process.env.MIDNIGHT_WALLET_MNEMONIC as string };
   if (!seed.seed) {
    throw new Error("MIDNIGHT_WALLET_SEED is not set");
   }
} else {
   seed = { seed: midnightNetworkConfig.walletSeed, mnemonic: '' };
}

const start = async () => {
  for (const config of configs) {
    await deployMidnightContract(config, network, seed);
  }
};

start()
  .then(() => {
    console.log("Deployment successful");
    process.exit(0);
  })
  .catch((e: unknown) => {
    console.error("Unhandled error:", e);
    process.exit(1);
  });
