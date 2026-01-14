import {
  deployMidnightContract,
  type DeployConfig,
} from "@paimaexample/midnight-contracts/deploy-ledger6";
import { midnightNetworkConfig } from "@paimaexample/midnight-contracts/midnight-env";

import {
  midnight_data,
  witnesses as midnightDataWitnesses,
} from "./midnight-data/src/index.original.ts";

const isTestnet = Deno.env.get("EFFECTSTREAM_ENV") === "testnet";

const configs: DeployConfig[] = [
  {
    contractName: "midnight-data",
    contractFileName: isTestnet ? "contract-midnight-data.preview.json" : "contract-midnight-data.undeployed.json",
    contractClass: midnight_data.Contract,
    witnesses: midnightDataWitnesses,
    privateStateId: "midnightDataState",
    initialPrivateState: {},
    deployArgs: [],
    privateStateStoreName: "midnight-data-private-state",
    extractWalletAddress: true, // Extract wallet address and replace last arg with initialOwner
  },
];

const start = async () => {
  for (const config of configs) {
    await deployMidnightContract(config, midnightNetworkConfig);
  }
};

start()
  .then(() => {
    console.log("Deployment successful");
    Deno.exit(0);
  })
  .catch((e: unknown) => {
    console.error("Unhandled error:", e);
    Deno.exit(1);
  });
