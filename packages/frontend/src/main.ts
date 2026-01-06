import { GameManager } from "./GameManager.ts";
import {
    getConnectedWallet,
    initializeLocalWallet,
    initWalletUI,
    updateSetNameButtonLabel,
} from "./effectstream/EffectStreamWallet.ts";
import { EffectStreamService } from "./effectstream/EffectStreamService.ts";

// Basic entry point
console.log("Block Kart Legends started");

const init = () => {
    const api = new EffectStreamService();

    // Initialize Wallet UI and Local Wallet
    initWalletUI();
    initializeLocalWallet().then(async (wallet) => {
        if (wallet) {
            console.log("Local wallet initialized:", wallet.walletAddress);
            await updateSetNameButtonLabel();
        }
    });

    // Set Name Logic
    const btnSetName = document.getElementById("btn-set-name");
    const setNameModal = document.getElementById("set-name-modal");
    const closeSetNameModal = document.getElementById("close-set-name-modal");
    const btnConfirmSetName = document.getElementById("btn-confirm-set-name");
    const btnCancelSetName = document.getElementById("btn-cancel-set-name");
    const inputPlayerName = document.getElementById(
        "input-player-name",
    ) as HTMLInputElement;

    if (btnSetName && setNameModal) {
        btnSetName.addEventListener("click", async () => {
            setNameModal.style.display = "flex";
            let wallet = getConnectedWallet();
            if (!wallet) {
                wallet = await initializeLocalWallet();
            }

            if (wallet && wallet.walletAddress) {
                try {
                    const profile = await api.getUserProfile(
                        wallet.walletAddress,
                    );
                    inputPlayerName.value = profile.name || "";
                } catch (e) {
                    console.error("Failed to load profile for name", e);
                }
            }
        });
    }

    if (closeSetNameModal && setNameModal) {
        closeSetNameModal.addEventListener("click", () => {
            setNameModal.style.display = "none";
        });
    }

    if (btnCancelSetName && setNameModal) {
        btnCancelSetName.addEventListener("click", () => {
            setNameModal.style.display = "none";
        });
    }

    if (btnConfirmSetName && setNameModal && inputPlayerName) {
        btnConfirmSetName.addEventListener("click", async () => {
            const name = inputPlayerName.value.trim();
            if (!name) {
                alert("Please enter a name.");
                return;
            }

            let wallet = getConnectedWallet();
            if (!wallet) {
                wallet = await initializeLocalWallet();
            }

            if (!wallet || !wallet.walletAddress) {
                alert("Wallet not connected.");
                return;
            }

            const originalText = btnConfirmSetName.innerText;
            btnConfirmSetName.innerText = "Saving...";

            try {
                await api.setUserName(wallet.walletAddress, name);
                setNameModal.style.display = "none";
                if (btnSetName) {
                    btnSetName.textContent = name;
                }
            } catch (e) {
                console.error("Failed to set name", e);
                alert("Failed to save name.");
            } finally {
                btnConfirmSetName.innerText = originalText;
            }
        });
    }

    window.addEventListener("click", (event) => {
        if (event.target == setNameModal && setNameModal) {
            setNameModal.style.display = "none";
        }
    });

    // The container for the Three.js canvas
    const containerId = "game-canvas-container";
    const container = document.getElementById(containerId);

    if (container) {
        // Clear placeholder if any
        container.innerHTML = "";

        // Start Game Manager
        try {
            // GameManager now handles the UI flow and won't auto-start the race
            const seed = new Date().getTime();
            new GameManager(containerId, seed);
        } catch (e: any) {
            console.error("Failed to start game:", e);
            container.innerHTML =
                `<p style="color:red">Error starting game: ${e.message}</p><pre>${e.stack}</pre>`;
        }
    } else {
        console.error(`Container #${containerId} not found!`);
    }
};

window.addEventListener("DOMContentLoaded", init);
