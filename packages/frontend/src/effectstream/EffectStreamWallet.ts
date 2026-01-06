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
      const info = await api.getAddressInfo(currentAddress);
      if (info && info.account_id !== null) {
        const accountInfo = await api.getAccountInfo(info.account_id);
        if (accountInfo && accountInfo.primary_address) {
          effectiveAddress = accountInfo.primary_address;
        }
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
  const walletList = document.getElementById('wallet-list');
  const loadingWallets = document.getElementById('loading-wallets');

  if (connectWalletBtn) {
    connectWalletBtn.addEventListener('click', () => {
      if (walletModal) {
        walletModal.style.display = 'flex';
        renderWalletList();
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

  async function renderWalletList() {

    if (!walletList || !loadingWallets) return;

    walletList.innerHTML = '';
    loadingWallets.style.display = 'block';
    const api = new EffectStreamService();

    try {
      const wallets = await getAvailableWallets();
      loadingWallets.style.display = 'none';

      // Check local wallet account status
      let localWalletHasAccount = false;
      let localWalletAddress = null;
      let associatedAddressesCount = 0;
      try {
        const wallet = await initializeLocalWallet();
        if (wallet) {
          localWalletAddress = wallet.walletAddress;
          const addressInfo = await api.getAddressInfo(localWalletAddress);
          if (addressInfo && addressInfo.account_id !== null) {
            localWalletHasAccount = true;
            const addresses = await api.getAccountAddresses(addressInfo.account_id);
            associatedAddressesCount = addresses ? addresses.length : 0;
          }
        }
      } catch (e) {
        console.error("Failed to check local wallet status", e);
      }

      // Check if already connected or local wallet has account
      const connectedWallet = getConnectedWallet();

      const isLinkedToRealWallet = localWalletHasAccount && associatedAddressesCount >= 2;

      if (connectedWallet || isLinkedToRealWallet) {
        const displayAddress = connectedWallet?.walletAddress || localWalletAddress;
        const title = connectedWallet ? "Wallet Connected" : "Local Account Active";
        const color = connectedWallet ? "#4caf50" : "#64b5f6";

        walletList.innerHTML = `
          <li>
            <div style="padding: 10px; text-align: center;">
              <p style="margin: 0; font-weight: bold; color: ${color};">${title}</p>
              <p style="margin: 5px 0 0; font-size: 0.8em; color: #aaa;">
                ${displayAddress ?
            displayAddress.substring(0, 6) + '...' + displayAddress.substring(displayAddress.length - 4) :
            'Unknown Address'}
              </p>
            </div>
          </li>
         `;
      } else if (wallets && wallets.length > 0) {
        wallets.forEach(wallet => {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.className = 'wallet-btn';

          let iconHtml = '';
          if (wallet.metadata && wallet.metadata.icon) {
            iconHtml = `<img src="${wallet.metadata.icon}" width="20" height="20" style="margin-right: 10px; vertical-align: middle;">`;
          } else {
            const initial = wallet.metadata && wallet.metadata.displayName ? wallet.metadata.displayName.charAt(0) : '?';
            iconHtml = `<span style="display:inline-block; width:20px; text-align:center; background:#ccc; margin-right:10px; border-radius:3px;">${initial}</span>`;
          }

          btn.innerHTML = `
            <div style="display:flex; align-items:center;">
              ${iconHtml}
              <div style="display:flex; flex-direction:column; align-items:flex-start;">
                <span style="font-weight:bold;">${wallet.name}</span>
                <span style="font-size:0.8em; color:#666;">${wallet.types.join(', ')}</span>
              </div>
            </div>
          `;

          btn.onclick = () => handleLogin(wallet);
          li.appendChild(btn);
          walletList.appendChild(li);
        });
      } else {
        walletList.innerHTML = '<li>No wallets found.</li>';
      }


      const localWalletInfo = document.getElementById('local-wallet-info');
      if (localWalletInfo) {
        const wallet = await initializeLocalWallet();
        if (wallet) {
          const address = wallet.walletAddress;
          const addressInfo = await api.getAddressInfo(address);

          let accountHtml = '<p style="margin:5px 0; font-size:0.8em; color:#666;">Not associated with an account yet.</p>';

          if (addressInfo && addressInfo.account_id !== null) {
            const accountId = addressInfo.account_id;
            const addresses = await api.getAccountAddresses(accountId);
            const accountInfo = await api.getAccountInfo(accountId);
            const primaryAddr = accountInfo ? accountInfo.primary_address : null;

            // Sort: Primary first
            if (primaryAddr) {
              addresses.sort((a, b) => {
                if (a.address === primaryAddr) return -1;
                if (b.address === primaryAddr) return 1;
                return 0;
              });
            }

            let addressesHtml = '';
            if (addresses && addresses.length > 0) {
              addressesHtml = `
                        <div style="margin-top:5px; padding:5px; background:#e6ffe6; border-radius:3px;">
                          <p style="margin:0 0 5px; font-weight:bold; font-size:0.8em; color:#004d00;">Linked Addresses:</p>
                          <ul style="margin:0; padding-left:15px; font-size:0.75em; font-family:monospace; color:#003300;">
                            ${addresses.map(a => {
                const isMain = a.address === primaryAddr;
                const isLocal = a.address === address;
                const shortAddr = a.address.substring(0, 6) + '...' + a.address.substring(a.address.length - 4);
                let label = '';
                if (isMain) label += ' (Main Wallet)';
                if (isLocal) label += ' (Local Wallet Address)';
                return `<li>${shortAddr}${label}</li>`;
              }).join('')}
                          </ul>
                        </div>
                      `;
            }

            accountHtml = `
                    <p style="font-weight:bold; margin:5px 0; font-size:0.8em; color:#007700;">Account ID: ${accountId}</p>
                    ${addressesHtml}
                  `;
          }

          localWalletInfo.innerHTML = `
                  <div style="margin-top: 10px;">
                    <p style="margin:0; font-weight:bold;">Local Wallet Address:</p>
                    <p style="margin:5px 0; font-family:monospace; font-size:0.85em; background: #f0f0f0; padding: 5px; border-radius: 4px; color: #333333;">${address}</p>
                    <p style="margin:5px 0 0; font-size:0.8em; color:#aaa;">This is an auto-generated local wallet unique to your browser session.</p>

                    <div style="border-top: 1px solid #ccc; margin: 10px 0;"></div>

                    ${accountHtml}
                    <button id="btn-delete-local-data" style="margin-top: 5px; padding: 5px 10px; background: #cc0000; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8em;">Delete Local Data</button>
                  </div>
              `;

          const deleteBtn = document.getElementById('btn-delete-local-data');
          if (deleteBtn) {
            deleteBtn.onclick = () => {
              if (confirm("Are you sure you want to delete your local wallet data? This cannot be undone.")) {
                localStorage.clear();
                location.reload();
              }
            };
          }
        }
      }
    } catch (e: any) {
      loadingWallets.style.display = 'none';
      walletList.innerHTML = `<li>Error loading wallets: ${e.message}</li>`;
    }
  }

  async function handleLogin(walletOption: WalletOption) {
    if (!walletModal || !connectWalletBtn) return;

    try {
      walletModal.style.display = 'none';
      connectWalletBtn.textContent = 'Connecting...';

      const wallet = await login(walletOption);

      connectWalletBtn.textContent = 'Verifying...';

      connectWalletBtn.textContent = 'Connected: ' + (wallet?.walletAddress ? wallet.walletAddress.substring(0, 6) + '...' + wallet.walletAddress.substring(wallet.walletAddress.length - 4) : 'Unknown');

      console.log("Connected wallet:", wallet);

      // Update Set Name button
      await updateSetNameButtonLabel();

    } catch (err: any) {
      console.error(err);
      alert('Login failed: ' + err.message);
      connectWalletBtn.textContent = 'Connect Wallet';
    }
  }
}

