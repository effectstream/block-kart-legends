import {
  allInjectedWallets,
  walletLogin,
  WalletMode,
  WalletNameMap,
  // LoginOptions,
} from "@paimaexample/wallets";
import { hardhat } from "viem/chains";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { getChainByChainIdAsync } from "@thirdweb-dev/chains";
import { EffectStreamService } from "./EffectStreamService.ts";
import { EngineConfig } from "./EffectStreamEngineConfig.ts";

interface IWallet {
  walletAddress: string;
  provider: {
    getAddress: () => { address: string, type: number },
    signMessage: (message: string) => Promise<string>
  };
  mode?: number;
}

interface WalletOption {
  name: string;
  mode: number;
  preference: { name: string };
  types: string[];
  metadata: any;
  isInjected?: boolean;
  checkChainId?: boolean;
}


let localWallet: IWallet | null = null;
let connectedWallet: IWallet | null = null;

export function getLocalWallet() {
  return localWallet;
}

export async function initializeLocalWallet() {
  if (localWallet) return localWallet;

  async function _getLocalWallet() {
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
        api: await _getLocalWallet(),
      },
    };

    const walletLoginResult = await walletLogin(loginOptions as any);
    if (walletLoginResult.success) {
      localWallet = walletLoginResult.result;
    }
    return localWallet;
  } catch (e) {
    console.error("Failed to initialize local wallet", e);
    return null;
  }
}

export async function updateSetNameButtonLabel() {
  const btnSetName = document.getElementById('btn-set-name');
  if (!btnSetName) return;

  btnSetName.style.display = 'inline-block';

  let wallet = getConnectedWallet();
  let local = localWallet;
  if (!local) {
    local = await initializeLocalWallet();
  }

  const api = new EffectStreamService();

  // Determine the effective address (Account Primary Address if available)
  let effectiveAddress: string | null = null;
  const currentAddress = (wallet && wallet.walletAddress) || (local && local.walletAddress);

  if (currentAddress) {
    try {
      const user = await api.getGameUserByAddress(currentAddress);
      if (user?.identity?.resolved_address) {
        effectiveAddress = user.identity.resolved_address;
      }
    } catch (e) {
      console.error("Error determining primary address", e);
    }

    // Fallback to current address if not part of account or check failed
    if (!effectiveAddress) {
      effectiveAddress = currentAddress;
    }
  }

  if (!effectiveAddress) {
    btnSetName.textContent = "SET NAME";
    return;
  }

  // 1. Get User Account Name (using effective address)
  let nameFound = false;
  try {
    const profile = await api.getUserProfile(effectiveAddress);
    if (profile && profile.name) {
      btnSetName.textContent = profile.name;
      nameFound = true;
    }
  } catch (e) {
    // ignore
  }

  if (nameFound) return;

  // 2. Use Effective Address (truncated)
  const addr = effectiveAddress;
  btnSetName.textContent = addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
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

export function getConnectedWallet() {
  return connectedWallet;
}

export async function login(walletOption: WalletOption) {
  let checkChainId = true;

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

  if (!result.success) throw new Error("Cannot login: " + result.errorMessage);
  connectedWallet = { ...result.result, mode: walletOption.mode };

  if (localWallet && connectedWallet.walletAddress) {
    console.log(`Associating Local Wallet ${localWallet.walletAddress} with Real Wallet ${connectedWallet.walletAddress}`);
    const api = new EffectStreamService();
    await api.connectWallets(localWallet, connectedWallet);
  }

  return connectedWallet;
}

export function initWalletUI() {
  const connectWalletBtn = document.getElementById('connect-wallet-btn');
  const walletModal = document.getElementById('wallet-modal');
  const closeModal = document.getElementById('close-modal');
  const delegateInput = document.getElementById('delegate-address-input') as HTMLInputElement | null;
  const delegateSendBtn = document.getElementById('delegate-send-btn');
  const delegateStatus = document.getElementById('delegate-status');

  if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', () => {
      if (walletModal) {
        walletModal.style.display = 'flex';
      } else {
        console.error("Wallet modal not found");
      }
    });
  }

  if (closeModal) {
    closeModal.addEventListener('click', () => {
      if (walletModal) walletModal.style.display = 'none';
    });
  }

  window.addEventListener('click', (event) => {
    if (event.target == walletModal && walletModal) {
      walletModal.style.display = 'none';
    }
  });
  if (delegateSendBtn && delegateInput) {
    delegateSendBtn.addEventListener('click', async () => {
      const addr = delegateInput.value.trim();
      if (!addr) {
        alert("Please enter an address to delegate to.");
        return;
      }

      const api = new EffectStreamService();
      const originalText = delegateSendBtn.textContent;
      delegateSendBtn.textContent = "Sending...";
      delegateSendBtn.setAttribute("disabled", "true");
      if (delegateStatus) {
        delegateStatus.textContent = "";
      }

      try {
        await initializeLocalWallet();
        await api.delegateToAddress(addr);
        if (delegateStatus) {
          delegateStatus.textContent = "Delegation transaction sent. It may take a moment to appear.";
        }
      } catch (e: any) {
        console.error("Failed to delegate address", e);
        alert("Failed to send delegation transaction.");
      } finally {
        delegateSendBtn.textContent = originalText || "Set Delegation";
        delegateSendBtn.removeAttribute("disabled");
      }
    });
  }
}

