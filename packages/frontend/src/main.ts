import { GameManager } from "./GameManager.ts";
import {
    checkExistingDelegation,
    initializeLocalWallet,
    initWalletUI,
    updateSetNameButtonLabel,
} from "./effectstream/EffectStreamWallet.ts";
import { soundManager } from "./SoundManager.ts";

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

    // Mute toggle
    const muteBtn = document.getElementById("mute-btn");
    if (muteBtn) {
        let muted = false;
        muteBtn.addEventListener("click", () => {
            muted = !muted;
            soundManager.setEnabled(!muted);
            muteBtn.innerHTML = muted ? "&#x1F507;" : "&#x1F50A;";
        });
    }

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

// Button sound effects via event delegation
const CLICK_SELECTORS = ".primary-btn, .wallet-btn, .bkl-btn-primary, .bkl-btn-outline, #delegate-send-btn";
const HOVER_SELECTORS = CLICK_SELECTORS;
const CANCEL_SELECTORS = ".close, .bkl-overlay-close";

document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("#mute-btn")) return;
    if (target.closest(CANCEL_SELECTORS)) {
        soundManager.play("cancel");
    } else if (target.closest("#play-btn")) {
        soundManager.play("confirm");
    } else if (target.closest(CLICK_SELECTORS)) {
        soundManager.play("click");
    }
}, true);

document.addEventListener("mouseenter", (e) => {
    const target = e.target as HTMLElement;
    if (target.matches(HOVER_SELECTORS) || target.matches(CANCEL_SELECTORS)) {
        soundManager.play("hover");
    }
}, true);

window.addEventListener("DOMContentLoaded", init);
