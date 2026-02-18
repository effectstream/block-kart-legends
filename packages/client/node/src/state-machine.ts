import { PaimaSTM } from "@paimaexample/sm";
import { grammar } from "@kart-legends/data-types/grammar";
import type { BaseStfInput } from "@paimaexample/sm";
import type { StartConfigGameStateTransitions } from "@paimaexample/runtime";
import { type SyncStateUpdateStream, World } from "@paimaexample/coroutine";
import {
  completeRace,
  createRace,
  getGameState,
  getResolvedAddressByAccountId,
  getResolvedIdentityByAddress,
  getWinsBySurface,
  incrementGamesLost,
  insertGameMatch,
  setAccountName,
  unlockAchievement,
  updateAchievementUnlocksDelegateTo,
  updateGameMatchesDelegateTo,
  upsertDelegation,
} from "@kart-legends/database";
import type { INewScheduledHeightDataParams } from "@paimaexample/db";
import { newScheduledHeightData } from "@paimaexample/db";
import type { WalletAddress } from "@paimaexample/utils";
import { AddressType } from "@paimaexample/utils";
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
  const [identity] = yield* World.resolve(getResolvedIdentityByAddress, { address });
  if (!identity) {
    console.log(`[getAccount] No address for ${address}`);
    return null;
  }
  if (!identity.account_id) {
    console.log(`[getAccountId] No account for ${address}`);
    return null;
  }

  return identity.account_id;
}

// Achievements thresholds based on total wins / losses
const WIN_ACHIEVEMENTS: Array<{ id: string; threshold: number }> = [
  { id: "win_1_race", threshold: 1 },
  // { id: "win_2_races", threshold: 2 },
  { id: "win_5_races", threshold: 5 },
  { id: "win_10_races", threshold: 10 },
  { id: "win_20_races", threshold: 20 },
  { id: "win_30_races", threshold: 30 },
  { id: "win_40_races", threshold: 40 },
  { id: "win_100_races", threshold: 100 },
  { id: "win_250_races", threshold: 250 },
];

const LOSS_ACHIEVEMENTS: Array<{ id: string; threshold: number }> = [
  { id: "lose_1_race", threshold: 1 },
  { id: "lose_5_races", threshold: 5 },
  { id: "lose_10_races", threshold: 10 },
  { id: "lose_50_races", threshold: 50 },
  { id: "lose_100_races", threshold: 100 },
];

const SURFACE_ACHIEVEMENTS: Array<{ id: string; surface: string; threshold: number }> = [
  { id: "win_10_dirt", surface: "DIRT", threshold: 10 },
  { id: "win_10_ice", surface: "ICE", threshold: 10 },
  { id: "win_10_asphalt", surface: "ASPHALT", threshold: 10 },
];

function* maybeAwardProgressAchievements(
  accountId: number,
  delegateTo: string,
  gamesWon: number,
  gamesLost: number,
): Generator<any, void, any> {
  for (const { id, threshold } of WIN_ACHIEVEMENTS) {
    if (gamesWon >= threshold) {
      yield* World.resolve(unlockAchievement, {
        account_id: accountId,
        achievement_id: id,
        delegate_to: delegateTo,
      });
    }
  }

  for (const { id, threshold } of LOSS_ACHIEVEMENTS) {
    if (gamesLost >= threshold) {
      yield* World.resolve(unlockAchievement, {
        account_id: accountId,
        achievement_id: id,
        delegate_to: delegateTo,
      });
    }
  }

  // Surface-specific win achievements
  const winsBySurfaceRows = yield* World.resolve(getWinsBySurface, {
    delegate_to: delegateTo,
  });
  const winsMap = new Map<string, number>();
  const winsList = Array.isArray(winsBySurfaceRows) ? winsBySurfaceRows : [];
  for (const row of winsList) {
    if (row.surface != null && row.wins != null) {
      winsMap.set(row.surface.toUpperCase(), row.wins);
    }
  }
  for (const { id, surface, threshold } of SURFACE_ACHIEVEMENTS) {
    const wins = winsMap.get(surface) ?? 0;
    if (wins >= threshold) {
      yield* World.resolve(unlockAchievement, {
        account_id: accountId,
        achievement_id: id,
        delegate_to: delegateTo,
      });
    }
  }
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

stm.addStateTransition("delegate", function* (data) {
  const { delegateToAddress } = data.parsedInput;
  if (!delegateToAddress || delegateToAddress.length < 3) {
    console.log("[delegate] Invalid delegateToAddress");
    return;
  }

  const accountId = yield* getAccountId(
    data.signerAddress,
    data.signerAddressType,
  );
  if (accountId === null) return;

  console.log(
    `🎉 [delegate] Account ${accountId} delegates to ${delegateToAddress}`,
  );
  yield* World.resolve(upsertDelegation, {
    account_id: accountId,
    delegate_to_address: delegateToAddress,
  });
  // Update all existing score_entries and achievement_unlocks to the new delegate address
  yield* World.resolve(updateGameMatchesDelegateTo, {
    account_id: accountId,
    delegate_to_address: delegateToAddress,
  });
  yield* World.resolve(updateAchievementUnlocksDelegateTo, {
    account_id: accountId,
    delegate_to_address: delegateToAddress,
  });
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

  const { results: raceResults, surface } = runSimulation(
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

  // Resolved identity: effectstream.accounts.primary_address or delegations.delegate_to_address
  const [resolvedRow] = yield* World.resolve(getResolvedAddressByAccountId, {
    account_id: accountId,
  });
  const delegateTo = resolvedRow?.resolved_address ?? "";
  if (!delegateTo) {
    console.log(
      `[executeRace] No resolved address for account ${accountId}, skipping match/achievement write`,
    );
  }

  // Always record a match for leaderboard & stats (with delegate_to for identity)
  if (delegateTo) {
    yield* World.resolve(insertGameMatch, {
      account_id: accountId,
      delegate_to: delegateTo,
      score,
      surface,
    });
  }

  // Complete race: mark not busy, add score or loss
  if (score > 0) {
    yield* World.resolve(completeRace, {
      account_id: accountId,
      score,
    });
  } else {
    yield* World.resolve(incrementGamesLost, {
      account_id: accountId,
    });
  }

  // Fetch updated state and award achievements (pass delegate_to for identity)
  const [updatedState] = yield* World.resolve(getGameState, {
    account_id: accountId,
  });
  if (updatedState && delegateTo) {
    const gamesWon = updatedState.games_won ?? 0;
    const gamesLost = updatedState.games_lost ?? 0;
    yield* maybeAwardProgressAchievements(
      accountId,
      delegateTo,
      gamesWon,
      gamesLost,
    );
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
