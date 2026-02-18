import { ItemPlacement, VehicleStats } from "../simulation/types.ts";
import { sendTransaction } from "@paimaexample/wallets";
import { EngineConfig } from "./EffectStreamEngineConfig.ts";
import { getLocalWallet, initializeLocalWallet } from "./EffectStreamWallet.ts";
import { showToast } from "../Toast.ts";
import { accountPayload_ as accountPayload } from "@paimaexample/wallets";
import { ENV } from "./EffectStreamEngineConfig.ts";

// types for the service
export interface UserProfile {
  id: string;
  username: string;
  level: number;
  coins: number;
  stats: {
    totalRaces: number;
    wins: number;
    bestTime: number;
  };
}

export interface NetworkResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  score: number;
  rank: number;
}

/** Response shape from GET /v1/game/users/:address */
export interface GameUserProfile {
  identity: {
    queried_address: string;
    resolved_address: string;
    is_delegate: boolean;
    display_name: string | null;
  };
  stats: {
    rank: number | null;
    score: number;
    matches_played: number;
  };
  achievements: string[];
  start_date: string;
  end_date: string;
}

export class EffectStreamService {

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async sendTransactionWrapper(
    wallet: any,
    data: any,
    config: any,
    waitType: any,
  ) {
    sendMintToBatcher(JSON.stringify(data)).then((status) => {
      console.log("Mint sent to batcher successfully", status);
    }).catch((error) => {
      console.error("Error sending mint to batcher", error);
    });

    const toast = showToast("Sending Signed Message", 0); // 0 = don't auto close

    const t1 = setTimeout(() => {
      toast.updateMessage("Writing in Blockchain");
    }, 1000);

    const t2 = setTimeout(() => {
      toast.updateMessage("Waiting for Update");
    }, 2000);

    try {
      const result = await sendTransaction(wallet, data, config, waitType);
      return result;
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      toast.close();
    }
  }

  /**
   * Fetches the current game state.
   */
  async getGameState(
    walletAddress: string,
  ): Promise<
    {
      round: number;
      safe_count: number;
      is_ongoing: boolean;
      race_hash: string | null;
      current_score?: number;
    }
  > {
    try {
      const response = await fetch(`${ENV.API_URL}/api/gamestate/${walletAddress}`);
      if (!response.ok) {
        // Return default
        return {
          round: 1,
          safe_count: 3,
          is_ongoing: false,
          race_hash: null,
          current_score: 0,
        };
      }
      return await response.json();
    } catch (e) {
      console.error("Error fetching game state", e);
      return {
        round: 1,
        safe_count: 3,
        is_ongoing: false,
        race_hash: null,
        current_score: 0,
      };
    }
  }

  // --- Helpers -------------------------------------------------

  private async safeJson<T>(res: Response): Promise<T> {
    try {
      return (await res.json()) as T;
    } catch {
      return {} as T; // fallback
    }
  }

  // --- Auth / Profile ------------------------------------------

  /**
   * Fetch profile from /api/user/:walletAddress and adapt to UserProfile.
   */
  public async getUserProfile(
    walletAddress: string,
  ): Promise<UserProfile & { name?: string; balance?: number }> {
    try {
      const res = await fetch(`${ENV.API_URL}/api/user/${walletAddress}`);
      if (!res.ok) {
        const fallbackName = walletAddress.slice(0, 6) + "..." +
          walletAddress.slice(-4);
        return {
          id: "0",
          username: fallbackName,
          level: 1,
          coins: 0,
          stats: { totalRaces: 0, wins: 0, bestTime: 0 },
          name: fallbackName,
          balance: 0,
        };
      }

      const data: {
        accountId: number;
        balance: number;
        lastLogin: number;
        name?: string;
      } = await this.safeJson(res);

      const username = data.name ||
        walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);

      return {
        id: String(data.accountId ?? 0),
        username,
        level: 1,
        coins: data.balance ?? 0,
        stats: {
          totalRaces: 0,
          wins: 0,
          bestTime: 0,
        },
        name: data.name,
        balance: data.balance ?? 0,
      };
    } catch (e) {
      console.error("[EffectStreamService] getUserProfile error", e);
      const fallbackName = walletAddress.slice(0, 6) + "..." +
        walletAddress.slice(-4);
      return {
        id: "0",
        username: fallbackName,
        level: 1,
        coins: 0,
        stats: { totalRaces: 0, wins: 0, bestTime: 0 },
        name: fallbackName,
        balance: 0,
      };
    }
  }

  /**
   * GET /v1/game/users/:address — returns whether the address is known (has account).
   * We only expose account_id as a sentinel (1 = known, null = not found) for backward compat.
   */
  public async getAddressInfo(
    address: string,
  ): Promise<{ account_id: number | null }> {
    try {
      const res = await fetch(`${ENV.API_URL}/v1/game/users/${encodeURIComponent(address)}`);
      return { account_id: res.ok ? 1 : null };
    } catch (e) {
      console.error("[EffectStreamService] getAddressInfo error", e);
      return { account_id: null };
    }
  }

  /**
   * GET /v1/game/users/:address — full user profile (identity, stats, achievements).
   */
  public async getGameUserByAddress(
    address: string,
  ): Promise<GameUserProfile | null> {
    try {
      const res = await fetch(`${ENV.API_URL}/v1/game/users/${encodeURIComponent(address)}`);
      if (!res.ok) return null;
      const data: GameUserProfile = await this.safeJson(res);
      return data;
    } catch (e) {
      console.error("[EffectStreamService] getGameUserByAddress error", e);
      return null;
    }
  }

  /**
   * GET /api/account/:id/addresses -> [{ address, address_type, account_id }]
   */
  public async getAccountAddresses(
    accountId: number,
  ): Promise<{ address: string; address_type: number; account_id: number }[]> {
    try {
      const res = await fetch(`${ENV.API_URL}/api/account/${accountId}/addresses`);
      if (!res.ok) return [];
      const data: {
        address: string;
        address_type: number;
        account_id: number;
      }[] = await this.safeJson(res);
      return data;
    } catch (e) {
      console.error("[EffectStreamService] getAccountAddresses error", e);
      return [];
    }
  }

  /**
   * For now just logs; on‑chain linking will be wired later via sendTransaction.
   */
  public async connectWallets(
    localWallet: any,
    connectedWallet: any,
  ): Promise<void> {
    console.log(
      "[EffectStreamService] connectWallets called",
      localWallet?.walletAddress,
      connectedWallet?.walletAddress,
    );
  }

  /**
   * Helper to ensure the local wallet has an account before proceeding.
   */
  private async ensureLocalAccount(): Promise<void> {
    const localWallet = getLocalWallet();
    if (!localWallet) {
      throw new Error("Local wallet not found");
    }

    try {
      const walletAddress: { address: string; type: number } = await localWallet
        .provider.getAddress();
      const info = await this.getAddressInfo(walletAddress.address);

      if (info && info.account_id !== null) {
        return; // Already has account
      }

      console.log("[MockServer] Creating account for local wallet...");
      const createAccData = await accountPayload.createAccount();
      await this.sendTransactionWrapper(
        localWallet,
        createAccData,
        EngineConfig,
        "wait-effectstream-processed",
      );

      // Wait for account creation
      let retries = 10;
      while (retries > 0) {
        await this.delay(1000);
        const newInfo = await this.getAddressInfo(walletAddress.address);
        if (newInfo && newInfo.account_id !== null) break;
        retries--;
      }
    } catch (e) {
      console.error("Failed to ensure local account", e);
    }
  }

  /**
   * Sets the user name for a given wallet address.
   */
  async setUserName(walletAddress: string, name: string): Promise<boolean> {
    await this.ensureLocalAccount();
    const localWallet = getLocalWallet();
    if (!localWallet) {
      throw new Error("Local wallet not found");
    }
    // We send transaction. Name is updated on chain.
    const conciseData = ["setName", name];
    await this.sendTransactionWrapper(
      localWallet,
      conciseData,
      EngineConfig,
      "wait-effectstream-processed",
    );

    console.log(
      `[MockServer] Request: Set Name for ${walletAddress} to ${name}`,
    );
    await this.delay(500);
    console.log(`[MockServer] Response: Name set (queued).`);
    return true;
  }

  /**
   * Sends a delegate transaction to link the local session wallet
   * to a chosen main wallet address.
   */
  async delegateToAddress(delegateToAddress: string): Promise<void> {
    await this.ensureLocalAccount();
    const localWallet = getLocalWallet() || await initializeLocalWallet();
    if (!localWallet) {
      throw new Error("Local wallet not found");
    }

    const conciseData = ["delegate", delegateToAddress];
    console.log(
      "[EffectStreamService] Sending delegate transaction:",
      conciseData,
    );

    await this.sendTransactionWrapper(
      localWallet,
      conciseData,
      EngineConfig,
      "wait-effectstream-processed",
    );
  }

  // --- Session helpers (local only; no backend state) ----------

  public async login(
    _username: string,
  ): Promise<NetworkResponse<UserProfile>> {
    return {
      success: true,
      timestamp: Date.now(),
    };
  }

  public async logout(): Promise<NetworkResponse<void>> {
    return {
      success: true,
      timestamp: Date.now(),
    };
  }

  // --- Game Data (Leaderboard / Results) -----------------------

  /**
   * GET /v1/game/leaderboard -> { entries: [{ rank, address, player_id, display_name, score, achievements_unlocked }], ... }
   * Adapted to LeaderboardEntry for the UI.
   */
  public async getLeaderboard(
    limit: number = 10,
  ): Promise<NetworkResponse<LeaderboardEntry[]>> {
    try {
      const url = new URL(`${ENV.API_URL}/v1/game/leaderboard`);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", "0");
      const res = await fetch(url.toString());
      if (!res.ok) {
        return {
          success: true,
          data: [],
          timestamp: Date.now(),
        };
      }

      const body: {
        entries: Array<{
          rank: number;
          address: string;
          player_id: string;
          display_name: string | null;
          score: number;
          achievements_unlocked: number;
        }>;
      } = await this.safeJson(res);
      const data: LeaderboardEntry[] = (body.entries ?? []).slice(0, limit).map((row) => ({
        playerId: row.player_id ?? row.address,
        username: row.display_name ?? row.address ?? "Anonymous",
        score: row.score ?? 0,
        rank: row.rank ?? 0,
      }));

      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (e) {
      console.error("[EffectStreamService] getLeaderboard error", e);
      return {
        success: true,
        data: [],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Sends a play transaction to start a race with the given car configuration.
   * This creates a race entry, marks the player as busy, and schedules race execution.
   */
  public async play(
    stats: VehicleStats,
    items: ItemPlacement[],
  ): Promise<NetworkResponse<string>> {
    await this.ensureLocalAccount();

    try {
      const localWallet = await initializeLocalWallet();
      if (!localWallet) {
        throw new Error("Local wallet not found");
      }
      const walletAddress = localWallet.provider.getAddress().address;

      // Build items array (10 slots, null for empty)
      const itemsArray: (string | null)[] = new Array(10).fill(null);
      items.forEach((placement) => {
        if (placement.slotIndex >= 0 && placement.slotIndex < 10) {
          itemsArray[placement.slotIndex] = placement.itemType;
        }
      });

      // Build concise data: ["play", stat1, stat2, stat3, stat4, stat5, item1, ..., item10]
      const conciseData = [
        "play",
        stats.max_velocity,
        stats.accel_curve,
        stats.mass,
        stats.turn_radius,
        stats.grip_factor,
        ...itemsArray,
      ];

      console.log("[EffectStreamService] Play function called from UI");
      console.log("[EffectStreamService] Sending play transaction:", conciseData);

      await this.sendTransactionWrapper(
        localWallet,
        conciseData,
        EngineConfig,
        "wait-effectstream-processed",
      );

      // Poll for game state to get race_hash
      let retries = 25;
      let raceHash: string | null = null;
      while (retries > 0) {
        await this.delay(500);
        const gameState = await this.getGameState(walletAddress);
        if (gameState.race_hash) {
          raceHash = gameState.race_hash;
          break;
        }
        retries--;
      }

      if (!raceHash) {
        console.warn(
          "Race hash not found after polling, using random fallback",
        );
        raceHash = "fallback_seed_" + Date.now();
      }

      return {
        success: true,
        data: raceHash,
        timestamp: Date.now(),
      };
    } catch (e) {
      console.error("[EffectStreamService] play error", e);
      return {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
        timestamp: Date.now(),
      };
    }
  }

  // --- Optional flavour endpoints kept as local stubs ----------

  public async fetchDailyChallenges(): Promise<NetworkResponse<string[]>> {
    return {
      success: true,
      data: [
        "Complete 3 races",
        "Win 1 race",
        "Drift for 500 meters",
      ],
      timestamp: Date.now(),
    };
  }

  public async findMatch(): Promise<
    NetworkResponse<{ matchId: string; opponents: string[] }>
  > {
    return {
      success: true,
      data: {
        matchId: `match_${Date.now()}`,
        opponents: ["Bot Alpha", "Bot Beta", "Bot Gamma"],
      },
      timestamp: Date.now(),
    };
  }
}

async function sendMintToBatcher(
  _input: string,
  confirmationLevel: string = "no-wait",
): Promise<number> {
  const input = JSON.stringify({
    circuit: "storeValue",
    args: [_input],
  });
  const localWallet = await initializeLocalWallet();
  if (!localWallet) {
    throw new Error("Local wallet not found");
  }
  console.log("[EffectStreamService] localWallet keys:", Object.keys(localWallet));
  if (localWallet.provider) {
    console.log(
      "[EffectStreamService] localWallet.provider keys:",
      Object.keys(localWallet.provider),
    );
    console.log(
      "[EffectStreamService] localWallet.provider constructor:",
      localWallet.provider.constructor.name,
    );
  }
  const target = "midnightAdapter_midnight_data";
  const address = localWallet.provider.getAddress().address;
  const addressType = localWallet.provider.getAddress().type;
  const timestamp = Date.now();
  const body = {
    data: {
      target,
      address,
      addressType,
      input,
      timestamp,
      signature: await localWallet.provider.signMessage(
        `${target}:${address}:${addressType}:${timestamp}`,
      ),
    },
    confirmationLevel,
  };
  const response = await fetch(`${ENV.BATCHER_URL}/send-input`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (response.ok) {
    console.log("Mint sent to batcher successfully");
  } else {
    console.error("[ERROR] Sending mint to batcher:", result);
  }
  return response.status;
}
