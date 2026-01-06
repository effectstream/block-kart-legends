import { contractAddressesEvmMain } from "@kart-legends/evm-contracts";
import { readMidnightContract } from "@paimaexample/midnight-contracts/read-contract";
import * as midnightDataContract from "@kart-legends/midnight-contract-midnight-data/contract";

import {
  ConfigBuilder,
  ConfigNetworkType,
  ConfigSyncProtocolType,
} from "@paimaexample/config";
import { hardhat } from "viem/chains";
import { getConnection } from "@paimaexample/db";

import * as builtin from "@paimaexample/sm/builtin";

/**
 * Let check if the db.
 * If empty then the db is not initialized, and use the current time for the NTP sync.
 * If not, we recreate the original state configuration.
 */

const mainSyncProtocolName = "mainNtp";
let launchStartTime: number | undefined;
const dbConn = getConnection();
try {
  // TODO Update to effectstream.sync_protocol_pagination
  const result = await dbConn.query(`
    SELECT * FROM effectstream.sync_protocol_pagination 
    WHERE protocol_name = '${mainSyncProtocolName}' 
    ORDER BY page_number ASC
    LIMIT 1
  `);
  if (!result || !result.rows.length) {
    throw new Error("DB is empty");
  }
  launchStartTime =
    result.rows[0].page.root - result.rows[0].page_number * 1000;
} catch {
  // This is not an error.
  // Do nothing, the DB has not been initialized yet.
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
        ...hardhat,
        name: "evmMain",
      })
      .addNetwork({
        name: "midnight",
        type: ConfigNetworkType.MIDNIGHT,
        genesisHash:
          "0x0000000000000000000000000000000000000000000000000000000000000001",
        networkId: 0,
        nodeUrl: "http://127.0.0.1:9944",
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
          startBlockHeight: 1,
          pollingInterval: 500,
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
          indexer: "http://127.0.0.1:8088/api/v1/graphql",
          indexerWs: "ws://127.0.0.1:8088/api/v1/graphql/ws",
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
            contractAddressesEvmMain().chain31337[
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
            "midnight-data",
            "contract-midnight-data.json"
          ).contractAddress,
          stateMachinePrefix: "event_midnight",
          contract: { ledger: midnightDataContract.ledger },
          networkId: 0,
        })
      )
  )
  .build();
