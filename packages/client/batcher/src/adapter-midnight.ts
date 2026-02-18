import { DefaultBatcherInput, MidnightAdapter } from "@paimaexample/batcher";
import { readMidnightContract } from "@paimaexample/midnight-contracts/read-contract";
import * as midnightDataContractInfo from "@kart-legends/midnight-contract-midnight-data";
import { ENV } from "@paimaexample/utils/node-env";
import * as midnightDataContract from "@kart-legends/midnight-contract-midnight-data/contract";
import { CryptoManager } from "@paimaexample/crypto";
import path from "node:path";

const isTestnet = ENV.EFFECTSTREAM_ENV === "testnet";
const baseDir = path.join(import.meta.dirname ?? '', '..', '..', '..', 'shared', 'contracts', 'midnight-contracts');

const {
  contractInfo: contractInfo0,
  contractAddress: contractAddress0,
  zkConfigPath: zkConfigPath0,
} = readMidnightContract("contract-midnight-data", { contractFileName: "contract-midnight-data.json", baseDir });
/** MIDNIGHT-READ-CONTRACT-BLOCK  */

const GENESIS_MINT_WALLET_SEED =
  "0000000000000000000000000000000000000000000000000000000000000001";
const indexer = "http://localhost:8088/api/v3/graphql";
const indexerWS = "ws://localhost:8088/api/v3/graphql/ws";
const node = "http://localhost:9944";
const proofServer = "http://localhost:6300";
const networkID =  isTestnet ? 'undeployed' : 'undeployed'; // NetworkId.Undeployed,
const syncProtocolName = "parallelMidnight";

/** MIDNIGHT-READ-CONTRACT-BLOCK */
const midnightAdapterConfig0 = {
  indexer,
  indexerWS,
  node,
  proofServer,
  zkConfigPath: zkConfigPath0,
  privateStateStoreName: "private-state-midnightDataContract", // Local LevelDB store
  privateStateId: "midnightDataContractPrivateState", // On-chain contract ID (must match deploy.ts)
  walletNetworkId: networkID,
  contractJoinTimeoutSeconds: 300, // Increase timeout to 5 minutes for private state sync
  walletFundingTimeoutSeconds: 300, // Increase wallet funding timeout to 5 minutes

};

class EVMMidnightAdapter extends MidnightAdapter<typeof midnightDataContract.Contract> {
  // @ts-ignore next line mismatch super type
  override async verifySignature(input: DefaultBatcherInput): Promise<boolean> {
    const {target, address, addressType, timestamp, signature} = input;
    const cryptoManager = CryptoManager.getCryptoManager(addressType);
    const signerAddress = input.address;
    const message = `${target}:${address}:${addressType}:${timestamp}`;
    const isValid = await cryptoManager.verifySignature(signerAddress, message, signature!);
    return isValid && super.verifySignature(input);
  }
}

export const midnightAdapter_midnight_data = new EVMMidnightAdapter(
  contractAddress0,
  GENESIS_MINT_WALLET_SEED,
  midnightAdapterConfig0,
  midnightDataContract.Contract,
  midnightDataContractInfo.witnesses,
  contractInfo0,
  // networkID,
  syncProtocolName
);


export const midnightAdapters: Record<string, MidnightAdapter<typeof midnightDataContract.Contract>> = {
  // @ts-ignore next line mismatch super type
  "midnight-data": midnightAdapter_midnight_data,
};
