import { LeaderboardEntry } from "./EffectStreamLeaderboard";
import { getLocalWallet } from "./EffectStreamWallet";
import { EngineConfig } from "./EffectStreamEngineConfig";
import { sendTransaction } from "@paimaexample/wallets";
import { showToast } from "./Utils";
import { accountPayload_ as accountPayload } from "@paimaexample/wallets";
import { AddressType } from "@paimaexample/wallets";
import { ENV } from "./EffectStreamEngineConfig";

class EffectStreamService {
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async sendTransactionWrapper(wallet: any, data: any, config: any, waitType: any) {
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
   * Helper to ensure the local wallet has an account before proceeding.
   */
  private async ensureLocalAccount(): Promise<void> {
    const localWallet = getLocalWallet();
    if (!localWallet) {
      throw new Error("Local wallet not found");
    }

    try {
      const walletAddress: { address: string, type: number } = await localWallet.provider.getAddress();
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
        "wait-effectstream-processed"
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
   * Initializes the level on the "server".
   */
  async initLevel(): Promise<void> {
    const localWallet = getLocalWallet();
    if (!localWallet) {
      throw new Error("Local wallet not found");
    }
    await this.ensureLocalAccount();

    const conciseData = ["initLevel"];
    await this.sendTransactionWrapper(
      localWallet,
      conciseData,
      EngineConfig,
      "wait-effectstream-processed"
    );

    console.log(
      `[MockServer] Request: Init Level`
    );
  }

  public getPrize(numSafes: number, round: number): number {
    const prizes = [0.33, 0.22, 0.16, 0.13, 0.11];
    // Safe indexing: 3 safes -> index 0
    const base = prizes[numSafes - 3] || 0.1;
    const val = base * (1 + (round - 1) * 0.55);
    return Math.floor(val * 100);
  }

  /**
   * Checks if the clicked safe is bad.
   */
  async checkSafe(safeIndex: number): Promise<{
    isBad: boolean;
    prize: number;
    nextSafeCount?: number;
  }> {
    const localWallet = getLocalWallet();
    if (!localWallet) {
      throw new Error("Local wallet not found");
    }
    const walletAddress = (await localWallet.provider.getAddress()).address;

    // Get state BEFORE transaction
    const beforeState = await this.getGameState(walletAddress);

    const conciseData = ["checkSafe", safeIndex];
    await this.sendTransactionWrapper(
      localWallet,
      conciseData,
      EngineConfig,
      "wait-effectstream-processed"
    );

    console.log(`[MockServer] Request: Check safe ${safeIndex}`);

    // Poll for state change
    let retries = 5;
    let afterState = beforeState;
    while (retries > 0) {
      await this.delay(500);
      afterState = await this.getGameState(walletAddress);
      // Check if round changed or ongoing status changed
      if (afterState.round !== beforeState.round || afterState.is_ongoing !== beforeState.is_ongoing) {
        break;
      }
      retries--;
    }

    const isBad = !afterState.is_ongoing && afterState.round === beforeState.round;
    // If round same and not ongoing -> Lost (because if won round would advance, or if cash out... but this is checkSafe)
    // Actually if we lose, round stays same? Or resets? 
    // Backend: if bad, incrementGamesLost, is_ongoing = false. Round stays same.
    // If good: increment round, is_ongoing = true.

    const prize = isBad ? 0 : this.getPrize(beforeState.safe_count, beforeState.round);

    console.log(
      `[MockServer] Response: Safe ${safeIndex} is ${isBad ? "BAD" : "GOOD"
      }. Prize: ${prize}`
    );

    return {
      isBad,
      prize,
      nextSafeCount: afterState.safe_count
    };
  }

  /**
   * Fetches the leaderboard data.
   */
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    console.log(`[MockServer] Request: Get Leaderboard`);
    try {
      const response = await fetch(`${ENV.API_URL}/api/leaderboard`);
      if (!response.ok) {
        console.error("Leaderboard fetch failed");
        return [];
      }
      const data = await response.json();
      console.log(`[MockServer] Response: Sending ${data.length} leaderboard entries`);
      return data;
    } catch (e) {
      console.error("Error fetching leaderboard", e);
      return [];
    }
  }

  /**
   * Submits a new score (Cash Out).
   */
  async submitScore(accountId: number): Promise<LeaderboardEntry[]> {
    const localWallet = getLocalWallet();
    if (!localWallet) {
      throw new Error("Local wallet not found");
    }
    const conciseData = ["submitScore", accountId];
    await this.sendTransactionWrapper(
      localWallet,
      conciseData,
      EngineConfig,
      "wait-effectstream-processed"
    );

    console.log(`[MockServer] Request: Submit Score for Account ${accountId}`);
    await this.delay(2000); // Wait for indexing

    return await this.getLeaderboard();
  }

  /**
   * Fetches the user profile (balance, etc.) given a wallet address.
   */
  async getUserProfile(
    walletAddress: string
  ): Promise<{ balance: number; lastLogin: number; name?: string }> {
    console.log(`[MockServer] Request: Get User Profile for ${walletAddress}`);
    try {
      const response = await fetch(`${ENV.API_URL}/api/user/${walletAddress}`);
      if (!response.ok) {
        return { balance: 0, lastLogin: Date.now(), name: undefined };
      }
      const data = await response.json();
      console.log(`[MockServer] Response: User ${walletAddress} has ${data.balance} tokens.`);
      return data;
    } catch (e) {
      console.error("Error fetching profile", e);
      return { balance: 0, lastLogin: Date.now(), name: undefined };
    }
  }

  /**
   * Fetches the current game state.
   */
  async getGameState(walletAddress: string): Promise<{ round: number; safe_count: number; is_ongoing: boolean; random_hash: string | null; current_score?: number }> {
    try {
      const response = await fetch(`${ENV.API_URL}/api/gamestate/${walletAddress}`);
      if (!response.ok) {
        // Return default
        return { round: 1, safe_count: 3, is_ongoing: false, random_hash: null, current_score: 0 };
      }
      return await response.json();
    } catch (e) {
      console.error("Error fetching game state", e);
      return { round: 1, safe_count: 3, is_ongoing: false, random_hash: null, current_score: 0 };
    }
  }

  public async getAddressInfo(address: string): Promise<{ address: string, address_type: number, account_id: number | null } | null> {
    try {
      const response = await fetch(`${ENV.API_URL}/api/address/${address}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.error("Error fetching address info", e);
      return null;
    }
  }

  public async getAccountInfo(id: number): Promise<{ id: number, primary_address: string | null } | null> {
    try {
      const response = await fetch(`${ENV.API_URL}/api/account/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  public async getAccountAddresses(id: number): Promise<Array<{ address: string, address_type: number, account_id: number }>> {
    try {
      const response = await fetch(`${ENV.API_URL}/api/account/${id}/addresses`);
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.error("Error fetching account addresses", e);
      return [];
    }
  }

  /**
   * Associates a local wallet with a real wallet.
   */
  async connectWallets(
    localWallet: { provider: { getAddress: () => Promise<{ address: string, type: number }>, signMessage: (message: string) => Promise<string> } },
    realWallet: { provider: { getAddress: () => Promise<{ address: string, type: number }>, signMessage: (message: string) => Promise<string> } },
  ): Promise<boolean> {
    // 1. Get Addresses
    const localAddrObj = await localWallet.provider.getAddress();
    const realAddrObj = await realWallet.provider.getAddress();
    const localAddress = localAddrObj.address;
    const realAddress = realAddrObj.address;

    // 2. Fetch Info
    let localInfo = await this.getAddressInfo(localAddress);
    const realInfo = await this.getAddressInfo(realAddress);

    const localHasAccount = localInfo && localInfo.account_id !== null;
    const realHasAccount = realInfo && realInfo.account_id !== null;

    console.log("[MockServer] ConnectWallets:", { localAddress, realAddress, localInfo, realInfo });

    // Case 1: Neither has account (or at least local doesn't)
    if (!localHasAccount && !realHasAccount) {
      console.log("[MockServer] Case 1: Creating account for local...");
      const createAccData = await accountPayload.createAccount();
      await this.sendTransactionWrapper(
        localWallet,
        createAccData,
        EngineConfig,
        "wait-effectstream-processed"
      );

      // Wait/Poll for account creation
      let retries = 10;
      while (retries > 0) {
        await this.delay(1000);
        localInfo = await this.getAddressInfo(localAddress);
        if (localInfo && localInfo.account_id !== null) break;
        retries--;
      }

      if (!localInfo || localInfo.account_id === null) {
        console.error("Failed to create account for local wallet");
        return false;
      }
    }

    // Refresh local status
    const currentLocalId = localInfo?.account_id;

    // Case 2: Local has account, Real does not
    if (currentLocalId !== undefined && currentLocalId !== null && !realHasAccount) {
      console.log("[MockServer] Case 2: Linking Real to Local (New Primary)");
      const conciseData = await accountPayload.linkAddress(
        localWallet,
        realWallet,
        currentLocalId,
        true // Real becomes new primary
      );
      await this.sendTransactionWrapper(
        localWallet,
        conciseData,
        EngineConfig,
        "wait-effectstream-processed"
      );
      return true;
    }

    // Case 3: Both have accounts
    if (currentLocalId !== undefined && currentLocalId !== null && realHasAccount) {
      const realId = realInfo!.account_id!;
      if (currentLocalId === realId) {
        console.log("[MockServer] Case 3: Same account. Doing nothing.");
        return true;
      } else {
        console.warn("[MockServer] Case 3: Different accounts!");
        alert("The local wallet and real wallet belong to different accounts");
        return false;
      }
    }

    // Case 4: Local has no account, Real has account
    if ((!currentLocalId) && realHasAccount) {
      const realId = realInfo!.account_id!;
      const accountInfo = await this.getAccountInfo(realId);

      if (accountInfo && accountInfo.primary_address === realAddress) {
        console.log("[MockServer] Case 4: Linking Local to Real (Real stays Primary)");
        const conciseData = await accountPayload.linkAddress(
          realWallet,
          localWallet,
          realId,
          false
        );
        await this.sendTransactionWrapper(
          localWallet,
          conciseData,
          EngineConfig,
          "wait-effectstream-processed"
        );
        return true;
      } else {
        console.warn("[MockServer] Case 4: Real is not account owner.");
        alert("The account is managed by another account");
        return false;
      }
    }

    return false;
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
      "wait-effectstream-processed"
    );

    console.log(
      `[MockServer] Request: Set Name for ${walletAddress} to ${name}`
    );
    await this.delay(500);
    console.log(`[MockServer] Response: Name set (queued).`);
    return true;
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
  const localWallet = getLocalWallet();
  if (!localWallet) {
    throw new Error("Local wallet not found");
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
      signature: await localWallet.provider.signMessage(`${target}:${address}:${addressType}:${timestamp}`),
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

export const effectStreamService = new EffectStreamService();
