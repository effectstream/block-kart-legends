import { readMidnightContract } from "@paimaexample/midnight-contracts/read-contract";
import * as midnightDataContract from "@kart-legends/midnight-contract-midnight-data/contract";

import {
  ConfigBuilder,
  ConfigNetworkType,
  ConfigSyncProtocolType,
} from "@paimaexample/config";

import * as builtin from "@paimaexample/sm/builtin";
import path from "node:path";
import { midnightNetworkConfig } from "@paimaexample/midnight-contracts/midnight-env";

const baseDir = path.join(import.meta.dirname ?? '', '..', '..', '..', 'contracts', 'midnight-contracts');

const mainSyncProtocolName = "mainNtp";
let launchStartTime: number | undefined;

const MIDNIGHT_INDEXER = midnightNetworkConfig.indexer;
const MIDNIGHT_INDEXER_WS = midnightNetworkConfig.indexerWS;
const MIDNIGHT_NODE_URL = midnightNetworkConfig.node;
if (midnightNetworkConfig.id !== 'mainnet') {
  throw new Error("Invalid midnight network id");
}

export const config = new ConfigBuilder()
  .setNamespace((builder) => builder.setSecurityNamespace("[scope]"))
  .buildNetworks((builder) =>
    builder
      .addNetwork({
        name: "ntp",
        type: ConfigNetworkType.NTP,
        startTime: launchStartTime ?? new Date().getTime(),
        blockTimeMS: 1000,
      })
      .addNetwork({
        name: "midnight",
        type: ConfigNetworkType.MIDNIGHT,
        genesisHash:
          "0x0000000000000000000000000000000000000000000000000000000000000001",
        networkId: midnightNetworkConfig.id,
        nodeUrl: MIDNIGHT_NODE_URL,
      })
  )
  .buildDeployments(builder => builder)
  .buildSyncProtocols((builder) =>
    builder
      .addMain(
        (networks) => networks.ntp,
        (network, deployments) => ({
          name: mainSyncProtocolName,
          type: ConfigSyncProtocolType.NTP_MAIN,
          chainUri: "",
          startBlockHeight: 1,
          pollingInterval: 500,
        })
      )
      .addParallel(
        (networks) => networks.midnight,
        (network, deployments) => ({
          name: "parallelMidnight",
          type: ConfigSyncProtocolType.MIDNIGHT_PARALLEL,
          startBlockHeight: 1,
          pollingInterval: 1000,
          indexer: MIDNIGHT_INDEXER,
          indexerWs: MIDNIGHT_INDEXER_WS,
          delayMs: 30000,
        })
      )
  )
  .buildPrimitives((builder) =>
    builder
      .addPrimitive(
        (syncProtocols) => syncProtocols.parallelMidnight,
        (network, deployments, syncProtocol) => ({
          name: "primitive_midnight-data",
          type: builtin.PrimitiveTypeMidnightGeneric,
          startBlockHeight: 1,
          contractAddress: readMidnightContract(
            "contract-midnight-data",
            {
              contractFileName: "contract-midnight-data.json",
              baseDir
            }
          ).contractAddress,
          stateMachinePrefix: "event_midnight",
          contract: { ledger: midnightDataContract.ledger },
          networkId: midnightNetworkConfig.id,
        })
      )
  )
  .build();
