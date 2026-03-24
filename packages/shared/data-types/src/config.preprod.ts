import { contractAddressesEvmMain } from "@kart-legends/evm-contracts";
import { readMidnightContract } from "@paimaexample/midnight-contracts/read-contract";
import * as midnightDataContract from "@kart-legends/midnight-contract-midnight-data/contract";

import {
  ConfigBuilder,
  ConfigNetworkType,
  ConfigSyncProtocolType,
} from "@paimaexample/config";
import { arbitrumSepolia } from "viem/chains";
import { midnightNetworkConfig } from "@paimaexample/midnight-contracts/midnight-env";

import * as builtin from "@paimaexample/sm/builtin";
import path from "node:path";

const MIDNIGHT_INDEXER = midnightNetworkConfig.indexer;
const MIDNIGHT_INDEXER_WS = midnightNetworkConfig.indexerWS;
const MIDNIGHT_NODE_URL = midnightNetworkConfig.node;
if (midnightNetworkConfig.id !== 'preprod') {
  throw new Error("Invalid midnight network id");
}

const baseDir = path.join(import.meta.dirname ?? '', '..', '..', '..', 'contracts', 'midnight-contracts');

/**
 * Let check if the db.
 * If empty then the db is not initialized, and use the current time for the NTP sync.
 * If not, we recreate the original state configuration.
 */

const mainSyncProtocolName = "mainNtp";
let launchStartTime: number | undefined;
let arbSepoliaTip: number = 230666729;
const EVM_RPC_URL = Deno.env.get("ARBITRUM_SEPOLIA_RPC") as string;
if (!EVM_RPC_URL) {
  throw new Error("ARBITRUM_SEPOLIA_RPC is not set");
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
      .addViemNetwork({
        ...arbitrumSepolia,
        rpcUrls: {
          default: {
            http: [EVM_RPC_URL],
          },
        },
        name: "evmMain",
      })
      .addNetwork({
        name: "midnight",
        type: ConfigNetworkType.MIDNIGHT,
        genesisHash:
          "0x0000000000000000000000000000000000000000000000000000000000000001",
        networkId: midnightNetworkConfig.id,
        nodeUrl: midnightNetworkConfig.node,
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
        (networks) => networks.evmMain,
        (network, deployments) => ({
          name: "mainEvmRPC",
          type: ConfigSyncProtocolType.EVM_RPC_PARALLEL,
          chainUri: network.rpcUrls.default.http[0],
          startBlockHeight: arbSepoliaTip,
          pollingInterval: 1000, // poll quickly to react fast
          stepSize: 9,
          confirmationDepth: 0,
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
        (syncProtocols) => syncProtocols.mainEvmRPC,
        (network, deployments, syncProtocol) => ({
          name: "primitive_effectstreaml2",
          type: builtin.PrimitiveTypeEVMPaimaL2,
          startBlockHeight: 0,
          contractAddress:
            contractAddressesEvmMain().chain421614[
              "effectstreaml2Module#effectstreaml2"
            ],
          stateMachinePrefix: `event_evm_effectstreaml2`,
        })
      )
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
          networkId: 0,
        })
      )
  )
  .build();
