import { PaimaSTM } from "@paimaexample/sm";
import { grammar } from "@kart-legends/data-types/grammar";
import type { BaseStfInput } from "@paimaexample/sm";
import type { StartConfigGameStateTransitions } from "@paimaexample/runtime";
import { type SyncStateUpdateStream, World } from "@paimaexample/coroutine";
import {
  completeRace,
  createRace,
  getAddressByAddress,
  getGameState,
  incrementGamesLost,
  setAccountName,
} from "@kart-legends/database";
import {
  INewScheduledHeightDataParams,
  newScheduledHeightData,
} from "@paimaexample/db";
import { AddressType, WalletAddress } from "@paimaexample/utils";
import { type PlayerConfig, runSimulation } from "@kart-legends/game-simulation";

const stm = new PaimaSTM<typeof grammar, any>(grammar);

function calculatePrize(numSafes: number, round: number): number {
  const prizes = [0.33, 0.22, 0.16, 0.13, 0.11];
  // Safe indexing: 3 safes -> index 0
  const base = prizes[numSafes - 3] || 0.1;
  const val = base * (1 + (round - 1) * 0.55);
  return Math.floor(val * 100);
}

// const decodeToByteString = (x: { [key: string]: number }): string =>
//   Array(Object.keys(x).length)
//     .fill(0)
//     .map((_, i) => x[i])
//     .join("")
//     .trim();

function* getAccountId(address?: WalletAddress, _?: AddressType) {
  if (!address) {
    console.log(`[getAccountId] No address provided`);
    return null;
  }
  const [addrInfo] = yield* World.resolve(getAddressByAddress, { address });
  if (!addrInfo) {
    console.log(`[getAccount] No address for ${address}`);
    return null;
  }
  if (!addrInfo.account_id) {
    console.log(`[getAccountId] No account for ${address}`);
    return null;
  }

  return addrInfo.account_id;
}

stm.addStateTransition("setName", function* (data) {
  const { name } = data.parsedInput;
  if (!name || name.length < 3) {
    console.log(`[setName] No name provided`);
    return;
  }
  if (name.length > 24) {
    console.log(`[setName] Name too long: ${name}`);
    return;
  }
  const accountId = yield* getAccountId(
    data.signerAddress,
    data.signerAddressType,
  );
  if (accountId === null) return;
  console.log(`🎉 [setName] Account ${accountId} -> ${name}`);
  yield* World.resolve(setAccountName, { account_id: accountId, name });
});

stm.addStateTransition("play", function* (data) {
  const {
    stat1,
    stat2,
    stat3,
    stat4,
    stat5,
    item1,
    item2,
    item3,
    item4,
    item5,
    item6,
    item7,
    item8,
    item9,
    item10,
  } = data.parsedInput;

  const accountId = yield* getAccountId(
    data.signerAddress,
    data.signerAddressType,
  );
  if (accountId === null) return;

  // Check if player is already busy
  const [gameState] = yield* World.resolve(getGameState, {
    account_id: accountId,
  });
  if (gameState && gameState.race_in_progress) {
    console.log(`[play] Account ${accountId} is already busy. Ignoring.`);
    return;
  }

  // Generate random hash for race
  const raceHash =
    Math.floor(data.randomGenerator.next(0, 2147483647)).toString(16) +
    Math.floor(data.randomGenerator.next(0, 2147483647)).toString(16) +
    Math.floor(data.randomGenerator.next(0, 2147483647)).toString(16);

  // Build items array (filter out nulls)
  const items = [
    item1,
    item2,
    item3,
    item4,
    item5,
    item6,
    item7,
    item8,
    item9,
    item10,
  ];
  const raceItemsJson = JSON.stringify(items);

  console.log(
    `🎉 [play] Account: ${accountId}, Stats: [${stat1},${stat2},${stat3},${stat4},${stat5}], Hash: ${raceHash}`,
  );

  // Create race entry and mark as busy
  yield* World.resolve(createRace, {
    account_id: accountId,
    race_hash: raceHash,
    car_stat1: stat1,
    car_stat2: stat2,
    car_stat3: stat3,
    car_stat4: stat4,
    car_stat5: stat5,
    race_items: raceItemsJson,
  });

  // Create concise format payload: "executeRace|accountId|raceHash"
  const stateMachinePayload = ["executeRace", accountId, raceHash];

  const dataScheduled: INewScheduledHeightDataParams = {
    from_address: data.signerAddress || "",
    from_address_type: data.signerAddressType || AddressType.NONE,
    future_block_height: data.blockHeight + 10,
    input_data: JSON.stringify(stateMachinePayload),
  };

  yield* World.resolve(newScheduledHeightData, dataScheduled);

  console.log(
    `[play] Scheduled race execution for Account ${accountId} at block ${
      data.blockHeight + 10
    }`,
  );
});

stm.addStateTransition("executeRace", function* (data) {
  const { accountId, raceHash } = data.parsedInput;

  if (accountId === undefined || accountId === null || !raceHash) {
    console.log(`[executeRace] Missing accountId or raceHash`);
    return;
  }

  // Verify race exists and is still busy
  const [gameState] = yield* World.resolve(getGameState, {
    account_id: accountId,
  });
  if (
    !gameState || !gameState.race_in_progress ||
    gameState.race_hash !== raceHash
  ) {
    console.log(
      `[executeRace] Race not found or already completed for Account ${accountId}`,
    );
    return;
  }

  console.log(
    `🎉 [executeRace] Simulating race for Account ${accountId}, Hash: ${raceHash}`,
  );

  const stringToHash = (str: string): number => {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };
  const playerConfig: PlayerConfig = {
    stats: {
      max_velocity: gameState.car_stat1!,
      accel_curve: gameState.car_stat2!,
      mass: gameState.car_stat3!,
      turn_radius: gameState.car_stat4!,
      grip_factor: gameState.car_stat5!,
      boost_efficiency: 5, //gameState.car_stat6,
    },
    items: JSON.parse(gameState.race_items!).map((item: string, index: number) => ({
      slotIndex: index,
      itemType: item,
    })),
  };

  const raceResults = runSimulation(
    playerConfig,
    stringToHash(gameState.race_hash!),
  );

  const playerPlace = raceResults.find((r) => r.playerName === "Player");

  // Calculate score based on rank
  let score = 0;
  if (playerPlace?.rank === 1) score = 100;
  else if (playerPlace?.rank === 2) score = 50;
  else if (playerPlace?.rank === 3) score = 25;
  else if (playerPlace?.rank === 4) score = 10;
  // Other ranks get 0 score
  const dataTable = raceResults.map((r) => {
    return `${r.rank} | ${r.playerName} | ${(r.time | 0)/1000}s`;
  });
  console.log(
    `===========
[executeRace] Account ${accountId} finished in rank ${playerPlace?.rank}, score: ${score}
${dataTable.join("\n")}
===========`,
  );

  // Complete race: mark not busy, add score
  if (score > 0) {
    yield* World.resolve(completeRace, {
      account_id: accountId,
      score: score,
    });
  } else {
    yield* World.resolve(incrementGamesLost, {
      account_id: accountId,
    });
  }
});

stm.addStateTransition("event_midnight", function* (data) {
  const { payload } = data.parsedInput;
  console.log(`🎉 [MIDNIGHT] Payload:`, payload);
});

// ... rest of file (gameStateTransitions)
/**
 * This function allows you to route between different State Transition Functions
 * based on block height. In other words when a new update is pushed for your game
 * that includes new logic, this router allows your game node to cleanly maintain
 * backwards compatibility with the old history before the new update came into effect.
 * @param blockHeight - The block height to process the game state transitions for.
 * @param input - The input to process the game state transitions for.
 * @returns The result of the game state transitions.
 */
export const gameStateTransitions: StartConfigGameStateTransitions = function* (
  blockHeight: number,
  input: BaseStfInput,
): SyncStateUpdateStream<void> {
  if (blockHeight >= 0) {
    yield* stm.processInput(input);
  } else {
    yield* stm.processInput(input);
  }
  return;
};
