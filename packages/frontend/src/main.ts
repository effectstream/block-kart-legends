import { GameManager } from "./GameManager.ts";
import {
    checkExistingDelegation,
    initializeLocalWallet,
    initWalletUI,
    updateSetNameButtonLabel,
} from "./effectstream/EffectStreamWallet.ts";

// Basic entry point
console.log("Block Kart Legends started");

const init = () => {
    // Initialize Wallet UI and Local Wallet
    initWalletUI();
    initializeLocalWallet().then(async (wallet) => {
        if (wallet) {
            console.log("Local wallet initialized:", wallet.walletAddress);
            await checkExistingDelegation();
            await updateSetNameButtonLabel();
        }
    });

    // SET PLAYER NAME button is now display-only (shows address or delegated address)
    // No click handler needed - the button is non-interactive (pointer-events: none)

    // Footer overlay toggle
    const footerLink = document.getElementById("bkl-footer-link");
    const linksOverlay = document.getElementById("bkl-links-overlay");
    const linksClose = document.getElementById("bkl-links-close");
    if (footerLink && linksOverlay && linksClose) {
        footerLink.addEventListener("click", (e) => {
            e.preventDefault();
            linksOverlay.style.display = "flex";
        });
        linksClose.addEventListener("click", () => {
            linksOverlay.style.display = "none";
        });
        linksOverlay.addEventListener("click", (e) => {
            if (e.target === linksOverlay) linksOverlay.style.display = "none";
        });
    }

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
