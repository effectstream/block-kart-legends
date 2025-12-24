import {
  allInjectedWallets,
  PaimaEngineConfig,
  walletLogin,
  WalletMode,
  WalletNameMap,
} from "@paimaexample/wallets";
import { hardhat } from "viem/chains";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { getChainByChainIdAsync } from "@thirdweb-dev/chains";
import { showCustomAlert } from "./Utils";
import { effectStreamService } from "./EffectStreamService";
import { state } from "./GameState";
import { updateTokenDisplay } from "./GameLogic";
import { EngineConfig } from "./EffectStreamEngineConfig";

interface WalletOption {
  name: string;
  mode: number;
  preference: { name: string };
  types: string[];
  metadata: any;
  isInjected?: boolean;
  checkChainId?: boolean;
}

let localWallet = null;

let connectedWallet: {
  provider: {
    getAddress: () => Promise<{ address: string, type: number }>,
    signMessage: (message: string) => Promise<string>
  },
} | null = null;

export function getConnectedWallet() {
  return connectedWallet;
}

export function getLocalWallet() {
  return localWallet;
}

export async function initializeLocalWallet() {
  if (localWallet) return localWallet;

  async function getLocalWallet() {
    const chain = await getChainByChainIdAsync(EngineConfig.paimaL2Chain.id);
    const wallet = new LocalWallet({ chain });
    await wallet.loadOrCreate({
      strategy: "encryptedJson",
      password: "safe-solver",
    });
    await wallet.connect();
    return await wallet.getSigner();
  }

  try {
    const loginOptions = {
      mode: WalletMode.EvmEthers,
      preferBatchedMode: true,
      connection: {
        metadata: {
          name: "thirdweb.localwallet",
          displayName: "Local Wallet",
        },
        api: await getLocalWallet(),
      },
    };

    const walletLoginResult = await walletLogin(loginOptions);
    localWallet = walletLoginResult.result;
    return localWallet;
  } catch (e) {
    console.error("Failed to initialize local wallet", e);
    return null;
  }
}

export async function getAvailableWallets(): Promise<WalletOption[]> {
  const wallets: WalletOption[] = [];

  // 1. Fetch Injected Wallets
  try {
    // Wait a bit for wallets to inject
    await new Promise(resolve => setTimeout(resolve, 200));

    const injectedWallets = await allInjectedWallets();

    if (injectedWallets) {
      for (const [modeStr, walletList] of Object.entries(injectedWallets)) {
        const mode = Number(modeStr);
        if (Array.isArray(walletList) && walletList.length > 0) {
          for (const w of walletList) {
            const networkType = ((WalletNameMap as any)[mode] || "").toLowerCase();

            wallets.push({
              name: w.metadata.displayName,
              mode,
              preference: { name: w.metadata.name },
              types: [networkType],
              metadata: w.metadata,
              isInjected: true,
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch injected wallets:", e);
  }

  return wallets;
}

export async function login(walletOption: WalletOption) {
  let checkChainId = true;

  // TODO This should be a system wide setting
  if (walletOption.metadata && (walletOption.metadata.name === "app.phantom" || walletOption.metadata.name === "com.exodus.web3-wallet")) {
    checkChainId = false;
  }

  if (walletOption.checkChainId !== undefined) {
    checkChainId = walletOption.checkChainId;
  }

  const loginOptions = {
    mode: walletOption.mode,
    preference: walletOption.preference,
    preferBatchedMode: false,
    chain: (walletOption.mode === WalletMode.EvmInjected || walletOption.mode === WalletMode.EvmEthers) ? (hardhat as any) : undefined,
    checkChainId: checkChainId,
  };

  console.log("Logging in with options:", loginOptions);

  const result = await walletLogin(loginOptions);

  if (!result.success) throw new Error("Cannot login: " + JSON.stringify(result.errorMessage));
  connectedWallet = { ...result.result, mode: walletOption.mode };

  if (localWallet && connectedWallet.walletAddress) {
    console.log(`Associating Local Wallet ${localWallet.walletAddress} with Real Wallet ${connectedWallet.walletAddress}`);
    await effectStreamService.connectWallets(localWallet, connectedWallet);
  }

  return connectedWallet;
}
