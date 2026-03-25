import {
  allInjectedWallets,
  walletLogin,
  WalletMode,
  WalletNameMap,
  // LoginOptions,
} from "@paimaexample/wallets";
import { hardhat, arbitrumSepolia } from "viem/chains";
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
let midnightAddress: string | null = null;

export function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return addr.substring(0, 10) + '...' + addr.substring(addr.length - 4);
}

export function getLocalWallet() {
  return localWallet;
}

export function getMidnightAddress() {
  return midnightAddress;
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

/**
 * Check on page load if the local wallet already has a delegation.
 * If so, update the Connect Wallet button and SET PLAYER NAME button.
 */
export async function checkExistingDelegation() {
  const connectWalletBtn = document.getElementById('connect-wallet-btn');

  let local = localWallet;
  if (!local) {
    local = await initializeLocalWallet();
  }
  if (!local) return;

  const api = new EffectStreamService();
  try {
    const user = await api.getGameUserByAddress(local.walletAddress);
    if (user?.identity) {
      const hasDelegation = user.identity.delegatedFrom.length > 0;
      if (hasDelegation && connectWalletBtn) {
        midnightAddress = user.identity.address;
        connectWalletBtn.textContent = "WALLET CONNECTED";
      }
    }
  } catch (e) {
    // Not found or error — no delegation yet
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
  const currentAddress = midnightAddress || (wallet && wallet.walletAddress) || (local && local.walletAddress);

  if (currentAddress) {
    try {
      const user = await api.getGameUserByAddress(currentAddress);
      if (user?.identity?.address) {
        effectiveAddress = user.identity.address;
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
    btnSetName.textContent = "SET PLAYER NAME";
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

  // 2. Use Effective Address (truncated, full on hover)
  btnSetName.textContent = truncateAddress(effectiveAddress);
  btnSetName.title = effectiveAddress;
}

/**
 * Connect to the Midnight extension wallet via dapp-connector-api.
 * Returns the shielded address from the wallet, or null if not available.
 */
export async function connectMidnightWallet(): Promise<string | null> {
  try {
    // Wait a bit for wallets to inject
    await new Promise(resolve => setTimeout(resolve, 200));

    const injectedWallets = await allInjectedWallets({ signatureSupport: false, transactionSupport: false });
    const midnightWallets = injectedWallets?.[WalletMode.Midnight] ?? [];

    if (!midnightWallets.length) {
      console.warn("No Midnight wallet extension found");
      alert("No Midnight wallet extension found. Please install the Midnight Lace wallet.");
      return null;
    }

    // Connect to the first available Midnight wallet
    const wallet = midnightWallets[0];
    console.log("Connecting to Midnight wallet:", wallet.metadata.displayName);

    const loginOptions = {
      mode: WalletMode.Midnight,
      preference: { name: wallet.metadata.name },
      preferBatchedMode: false,
    };

    const result = await walletLogin(loginOptions as any);

    if (!result.success) {
      console.error("Midnight wallet login failed:", result.errorMessage);
      alert("Failed to connect Midnight wallet: " + result.errorMessage);
      return null;
    }

    connectedWallet = { ...result.result, mode: WalletMode.Midnight };
    midnightAddress = connectedWallet.walletAddress;
    console.log("Midnight wallet connected, address:", midnightAddress);

    return midnightAddress;
  } catch (e) {
    console.error("Failed to connect Midnight wallet", e);
    alert("Failed to connect Midnight wallet.");
    return null;
  }
}


export async function getAvailableWallets(): Promise<WalletOption[]> {
  const wallets: WalletOption[] = [];

  // 1. Fetch Injected Wallets
  try {
    // Wait a bit for wallets to inject
    await new Promise(resolve => setTimeout(resolve, 200));

    const injectedWallets = await allInjectedWallets({ signatureSupport: false, transactionSupport: false });

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
    chain: (walletOption.mode === WalletMode.EvmInjected || walletOption.mode === WalletMode.EvmEthers) ? (({ hardhat, arbitrumSepolia } as Record<string, any>)[import.meta.env.VITE_CHAIN ?? "hardhat"] ?? hardhat) : undefined,
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
    connectWalletBtn.addEventListener('click', async () => {
      // Connect to Midnight wallet extension
      const address = await connectMidnightWallet();
      if (address) {
        // Auto-fill the delegate address input
        if (delegateInput) {
          delegateInput.value = address;
        }

        // Check if this address is already delegated
        const api = new EffectStreamService();
        try {
          const user = await api.getGameUserByAddress(address);
          if ((user?.identity?.delegatedFrom?.length ?? 0) > 0) {
            connectWalletBtn.textContent = "WALLET CONNECTED";
          } else {
            connectWalletBtn.textContent = "WALLET CONNECTED";
            // Show the delegation modal so user can delegate
            if (walletModal) {
              walletModal.style.display = 'flex';
            }
          }
        } catch (e) {
          connectWalletBtn.textContent = "WALLET CONNECTED";
          // Show modal for delegation
          if (walletModal) {
            walletModal.style.display = 'flex';
          }
        }

        // Update the name button with address/delegated address
        await updateSetNameButtonLabel();
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
        // Update Connect Wallet button
        if (connectWalletBtn) {
          connectWalletBtn.textContent = "WALLET CONNECTED";
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
