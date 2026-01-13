import { DefaultBatcherInput, MidnightAdapter } from "@paimaexample/batcher";
import { readMidnightContract } from "@paimaexample/midnight-contracts/read-contract";
import * as midnightDataContractInfo from "@kart-legends/midnight-contract-midnight-data";
import { ENV } from "@paimaexample/utils/node-env";
import * as midnightDataContract from "@kart-legends/midnight-contract-midnight-data/contract";
import { CryptoManager } from "@paimaexample/crypto";
import { midnightNetworkConfig } from "@paimaexample/midnight-contracts/midnight-env";

const isTestnet = ENV.EFFECTSTREAM_ENV === "testnet";

const midnightContractData = readMidnightContract(
  "midnight-data",
  { networkId: midnightNetworkConfig.id }
);

const {
  contractInfo: contractInfo0,
  contractAddress: contractAddress0,
  zkConfigPath: zkConfigPath0,
} = midnightContractData;

const syncProtocolName = "parallelMidnight";

const midnightAdapterConfig0 = {
  indexer: midnightNetworkConfig.indexer,
  indexerWS: midnightNetworkConfig.indexerWS,
  node: midnightNetworkConfig.node,
  proofServer: midnightNetworkConfig.proofServer,
  zkConfigPath: zkConfigPath0,
  privateStateStoreName: "private-state-midnightDataContract", // Local LevelDB store
  privateStateId: "midnightDataState", // On-chain contract ID (must match deploy.ts)
  walletNetworkId: midnightNetworkConfig.id,
  contractJoinTimeoutSeconds: 300, // Increase timeout to 5 minutes for private state sync
  walletFundingTimeoutSeconds: 300, // Increase wallet funding timeout to 5 minutes
};

class EVMMidnightAdapter extends MidnightAdapter {
  // @ts-ignore next line mismatch super type
  override async verifySignature(input: DefaultBatcherInput): Promise<boolean> {
    const { target, address, addressType, timestamp, signature } = input;
    const cryptoManager = CryptoManager.getCryptoManager(addressType);
    const signerAddress = input.address;
    const message = `${target}:${address}:${addressType}:${timestamp}`;
    const isValid = await cryptoManager.verifySignature(signerAddress, message, signature!);
    return isValid && super.verifySignature(input);
  }
}

export const midnightAdapter_midnight_data = new EVMMidnightAdapter(
  contractAddress0,
  midnightNetworkConfig.walletSeed!,
  midnightAdapterConfig0,
  new midnightDataContract.Contract(midnightDataContractInfo.witnesses),
  midnightDataContractInfo.witnesses,
  contractInfo0,
  syncProtocolName
);


export const midnightAdapters: Record<string, MidnightAdapter> = {
  // @ts-ignore next line mismatch super type
  "midnight-data": midnightAdapter_midnight_data,
};
