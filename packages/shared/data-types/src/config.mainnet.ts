import { contractAddressesEvmMain } from "@kart-legends/evm-contracts";
import { readMidnightContract } from "@effectstream/midnight-contracts/read-contract";
import * as midnightDataContract from "@kart-legends/midnight-contract-midnight-data/contract";

import {
  ConfigBuilder,
  ConfigNetworkType,
  ConfigSyncProtocolType,
} from "@effectstream/config";
import { arbitrum } from "viem/chains";
import { midnightNetworkConfig } from "@effectstream/midnight-contracts/midnight-env";

import * as builtin from "@effectstream/sm/builtin";
import path from "node:path";

const baseDir = path.join(import.meta.dirname ?? '', '..', '..', 'contracts', 'midnight-contracts');

const mainSyncProtocolName = "mainNtp";
let launchStartTime: number | undefined;
const EVM_RPC_URL = process.env.ARBITRUM_ONE_RPC as string;
if (!EVM_RPC_URL) {
  throw new Error("ARBITRUM_ONE_RPC is not set");
}

const MIDNIGHT_INDEXER = midnightNetworkConfig.indexer;
const MIDNIGHT_INDEXER_WS = midnightNetworkConfig.indexerWS;
const MIDNIGHT_NODE_URL = midnightNetworkConfig.node;
if (midnightNetworkConfig.id !== 'mainnet') {
  throw new Error("Invalid midnight network id");
}

export const config = new ConfigBuilder()
  .setNamespace((builder) => builder.setSecurityNamespace("evm-midnight-node"))
  .buildNetworks((builder) =>
    builder
      .addNetwork({
        name: "ntp",
        type: ConfigNetworkType.NTP,
        startTime: launchStartTime ?? new Date().getTime(),
        blockTimeMS: 1000,
      })
      .addViemNetwork({
        ...arbitrum,
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
          pollingInterval: 1000,
        })
      )
      .addParallel(
        (networks) => networks.evmMain,
        (network, deployments) => ({
          name: "mainEvmRPC",
          type: ConfigSyncProtocolType.EVM_RPC_PARALLEL,
          chainUri: network.rpcUrls.default.http[0],
          startBlockHeight: 447477615,
          pollingInterval: 1000,
          stepSize: 30,
          confirmationDepth: 0,
        })
      )
      .addParallel(
        (networks) => networks.midnight,
        (network, deployments) => ({
          name: "parallelMidnight",
          type: ConfigSyncProtocolType.MIDNIGHT_PARALLEL,
          startBlockHeight: 172708,
          pollingInterval: 6000,
          indexer: MIDNIGHT_INDEXER,
          indexerWs: MIDNIGHT_INDEXER_WS,
          delayMs: 60000,
          stepSize: 2,	  
        })
      )
  )
  .buildPrimitives((builder) =>
    builder
      .addPrimitive(
        (syncProtocols) => syncProtocols.mainEvmRPC,
        (network, deployments, syncProtocol) => ({
          name: "primitive_effectstreaml2",
          type: builtin.PrimitiveTypeEVMEffectstreamL2,
          startBlockHeight: 0,
          contractAddress:
            contractAddressesEvmMain().chain42161[
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
              baseDir,
	            networkId: 'mainnet',
            }
          ).contractAddress,
          stateMachinePrefix: "event_midnight",
          contract: { ledger: midnightDataContract.ledger },
          networkId: midnightNetworkConfig.id,
        })
      )
  )
  .build();
