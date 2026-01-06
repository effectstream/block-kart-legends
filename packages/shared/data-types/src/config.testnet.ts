import { contractAddressesEvmMain } from "@kart-legends/evm-contracts";
import { readMidnightContract } from "@paimaexample/midnight-contracts/read-contract";
import * as midnightDataContract from "@kart-legends/midnight-contract-midnight-data/contract";

import {
  ConfigBuilder,
  ConfigNetworkType,
  ConfigSyncProtocolType,
} from "@paimaexample/config";
import { arbitrumSepolia } from "viem/chains";
import { getConnection } from "@paimaexample/db";

import * as builtin from "@paimaexample/sm/builtin";

/**
 * Let check if the db.
 * If empty then the db is not initialized, and use the current time for the NTP sync.
 * If not, we recreate the original state configuration.
 */

const mainSyncProtocolName = "mainNtp";
let launchStartTime: number | undefined;
let arbSepoliaTip: number = 230666729;

 // IMPORTANT: For testing purposes. Setting it to true, will 
 // use a new tip on each restart, making the db inconsistent.
const USE_TESTING_TIP = true;
const EVM_RPC_URL = Deno ? Deno.env.get("ARBITRUM_SEPOLIA_RPC") as string : "";

const dbConn = getConnection();
try {
  if (Deno && USE_TESTING_TIP) {
    /* Get the latest block number from the Arbitrum Sepolia chain */
    const response = await fetch(EVM_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber', // Standard RPC method to get the latest block number
        params: []
      }),
    });
    const data = await response.json();
    arbSepoliaTip = parseInt(data.result, 16);
  }

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
