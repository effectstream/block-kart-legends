import {
    ItemPlacement,
    ItemType,
    PlayerConfig,
    VehicleStats,
} from "./simulation/types.ts";
import { ItemThumbnailGenerator } from "./ItemThumbnailGenerator.ts";
import { LeaderboardEntry } from "./effectstream/EffectStreamService.ts";

export class UIManager {
    private startScreen: HTMLElement;
    private setupScreen: HTMLElement;
    private resultsScreen: HTMLElement;
    private screens: HTMLElement[];
    private leaderboardList: HTMLElement;
    private sidebarTitle: HTMLElement;
    private carTooltip: HTMLElement;

    // Form inputs
    private speedInput: HTMLInputElement;
    private accelInput: HTMLInputElement;
    private weightInput: HTMLInputElement;
    private handlingInput: HTMLInputElement;
    private tractionInput: HTMLInputElement;

    private valSpeed: HTMLElement;
    private valAccel: HTMLElement;
    private valWeight: HTMLElement;
    private valHandling: HTMLElement;
    private valTraction: HTMLElement;

    private pointsRemainingDisplay: HTMLElement;
    private playBtn: HTMLButtonElement;

    // Items UI
    private itemsContainer: HTMLElement;
    private slotsContainer: HTMLElement;
    private availableItems: { id: string; type: ItemType }[] = [];
    private slots: (ItemType | null)[] = new Array(10).fill(null);
    private draggedItemIndex: number | null = null;
    private draggedFromSlot: boolean = false;

    private speedDisplay: HTMLElement;
    private positionDisplay: HTMLElement;
    private itemDisplay: HTMLElement;
    private effectsDisplay: HTMLElement;

    private thumbnailGenerator: ItemThumbnailGenerator;
    private readonly STORAGE_KEY = "mario-kart-sim-config";

    constructor() {
        this.thumbnailGenerator = new ItemThumbnailGenerator();
        this.startScreen = document.getElementById("start-screen")!;
        this.setupScreen = document.getElementById("setup-screen")!;
        this.resultsScreen = document.getElementById("results-screen")!;
        this.screens = [this.startScreen, this.setupScreen, this.resultsScreen];

        this.leaderboardList = document.getElementById("leaderboard-list")!;
        this.sidebarTitle = document.getElementById("sidebar-title")!;

        // Car Tooltip
        this.carTooltip = document.createElement("div");
        this.carTooltip.className = "car-tooltip";
        document.body.appendChild(this.carTooltip);

        const gameArea = document.getElementById("game-area");

        // Create Speed Display
        this.speedDisplay = document.createElement("div");
        this.speedDisplay.style.position = "absolute";
        this.speedDisplay.style.bottom = "50px";
        this.speedDisplay.style.right = "50px";
        this.speedDisplay.style.color = "white";
        this.speedDisplay.style.fontSize = "24px";
        this.speedDisplay.style.fontWeight = "bold";
        this.speedDisplay.style.fontFamily = "Exo 2, sans-serif";
        this.speedDisplay.style.textShadow = "2px 2px 0 #000";
        this.speedDisplay.style.zIndex = "100";
        this.speedDisplay.style.display = "none";
        gameArea?.appendChild(this.speedDisplay);

        // Create Effects Display
        this.effectsDisplay = document.createElement("div");
        this.effectsDisplay.style.position = "absolute";
        this.effectsDisplay.style.bottom = "100px";
        this.effectsDisplay.style.right = "50px";
        this.effectsDisplay.style.display = "none";
        this.effectsDisplay.style.flexDirection = "column";
        this.effectsDisplay.style.alignItems = "flex-end";
        this.effectsDisplay.style.gap = "5px";
        this.effectsDisplay.style.zIndex = "100";
        gameArea?.appendChild(this.effectsDisplay);

        // Create Position Display
        this.positionDisplay = document.createElement("div");
        this.positionDisplay.style.position = "absolute";
        this.positionDisplay.style.top = "50px";
        this.positionDisplay.style.right = "50px";
        this.positionDisplay.style.color = "white";
        this.positionDisplay.style.fontSize = "32px";
        this.positionDisplay.style.fontWeight = "bold";
        this.positionDisplay.style.fontFamily = "Exo 2, sans-serif";
        this.positionDisplay.style.textShadow = "2px 2px 0 #000";
        this.positionDisplay.style.zIndex = "100";
        this.positionDisplay.style.display = "none";
        gameArea?.appendChild(this.positionDisplay);

        // Create Item Display
        this.itemDisplay = document.createElement("div");
        this.itemDisplay.style.position = "absolute";
        this.itemDisplay.style.top = "50px";
        this.itemDisplay.style.left = "50px";
        this.itemDisplay.style.width = "64px";
        this.itemDisplay.style.height = "64px";
        this.itemDisplay.style.border = "4px solid white";
        this.itemDisplay.style.borderRadius = "8px";
        this.itemDisplay.style.backgroundColor = "rgba(0,0,0,0.5)";
        this.itemDisplay.style.zIndex = "100";
        this.itemDisplay.style.display = "none";
        this.itemDisplay.style.justifyContent = "center";
        this.itemDisplay.style.alignItems = "center";
        gameArea?.appendChild(this.itemDisplay);

        // Inputs
        this.speedInput = document.getElementById(
            "stat-speed",
        ) as HTMLInputElement;
        this.accelInput = document.getElementById(
            "stat-accel",
        ) as HTMLInputElement;
        this.weightInput = document.getElementById(
            "stat-weight",
        ) as HTMLInputElement;
        this.handlingInput = document.getElementById(
            "stat-handling",
        ) as HTMLInputElement;
        this.tractionInput = document.getElementById(
            "stat-traction",
        ) as HTMLInputElement;

        this.valSpeed = document.getElementById("val-speed")!;
        this.valAccel = document.getElementById("val-accel")!;
        this.valWeight = document.getElementById("val-weight")!;
        this.valHandling = document.getElementById("val-handling")!;
        this.valTraction = document.getElementById("val-traction")!;

        this.pointsRemainingDisplay = document.getElementById(
            "points-remaining",
        )!;
        this.playBtn = document.getElementById("play-btn") as HTMLButtonElement;

        this.itemsContainer = document.getElementById(
            "available-items-container",
        )!;
        this.slotsContainer = document.getElementById("slots-container")!;

        // Allow dropping back to pool
        this.itemsContainer.addEventListener(
            "dragover",
            (e) => e.preventDefault(),
        );
        this.itemsContainer.addEventListener(
            "drop",
            (e) => this.handleDropToPool(e),
        );

        this.initListeners();
        this.initLeaderboardHover();
    }

    private initLeaderboardHover() {
        this.leaderboardList.addEventListener("mouseover", (e) => {
            const target = e.target as HTMLElement;
            // With pointer-events: none on children, target should be the item or the list itself.
            if (target.classList.contains("leaderboard-item")) {
                const data = (target as any).__carData;
                if (data && data.stats) {
                    const rect = target.getBoundingClientRect();
                    this.showCarTooltip(
                        rect.right,
                        rect.top - 15,
                        data.name,
                        data.stats,
                        null,
                    );
                }
            }
        });

        this.leaderboardList.addEventListener("mouseout", (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains("leaderboard-item")) {
                this.hideCarTooltip();
            }
        });
    }

    private initListeners() {
        const inputs = [
            this.speedInput,
            this.accelInput,
            this.weightInput,
            this.handlingInput,
            this.tractionInput,
        ];
        const displays = [
            this.valSpeed,
            this.valAccel,
            this.valWeight,
            this.valHandling,
            this.valTraction,
        ];

        inputs.forEach((input, index) => {
            if (!input) return;

            // Store previous valid value to revert if over budget
            let prevValue = parseInt(input.value);

            input.addEventListener("input", () => {
                const newValue = parseInt(input.value);
                const currentTotal = this.calculateTotalPoints();

                if (currentTotal > 25) {
                    // Revert
                    input.value = prevValue.toString();
                } else {
                    prevValue = newValue;
                    displays[index].innerText = input.value;
                    this.updateBudgetDisplay();
                }
            });
        });

        // Initial update
        this.updateBudgetDisplay();
    }

    private calculateTotalPoints(): number {
        const s = parseInt(this.speedInput.value) || 0;
        const a = parseInt(this.accelInput.value) || 0;
        const w = parseInt(this.weightInput.value) || 0;
        const h = parseInt(this.handlingInput.value) || 0;
        const t = parseInt(this.tractionInput.value) || 0;
        return s + a + w + h + t;
    }

    private updateBudgetDisplay() {
        const used = this.calculateTotalPoints();
        const remaining = 25 - used;
        this.pointsRemainingDisplay.innerText = remaining.toString();

        if (remaining < 0) {
            this.pointsRemainingDisplay.style.color = "red";
            this.playBtn.disabled = true;
        } else {
            this.pointsRemainingDisplay.style.color = "inherit";
            this.playBtn.disabled = false; // Or require exactly 0 remaining? Spec says "Summing to 25 points", usually implies exact.
            // Let's enforce exact 25 for "The Point Budget System" to ensure fairness?
            // "Players must 'engineer' their vehicle... Total Point Budget: 25 Points."
            // "Bots use random configurations summing to 25 points."
            // Implies exact 25.

            if (remaining !== 0) {
                this.playBtn.disabled = true;
                this.playBtn.title = "Must use exactly 25 points";
            } else {
                this.playBtn.disabled = false;
                this.playBtn.title = "";
            }
        }
    }

    public updateSpeed(speedKmh: number) {
        // Speed is now in real KM/H (converted from progress/sec by GameSimulator)
        const displaySpeed = Math.round(speedKmh);
        this.speedDisplay.innerText = `${displaySpeed} km/h`;
    }

    public updatePosition(rank: number, total: number) {
        const suffix = (n: number) => {
            if (n >= 11 && n <= 13) return "th";
            switch (n % 10) {
                case 1:
                    return "st";
                case 2:
                    return "nd";
                case 3:
                    return "rd";
                default:
                    return "th";
            }
        };
        this.positionDisplay.innerText = `${rank}${suffix(rank)} / ${total}`;
    }

    public updateEffects(effects: { label: string; duration: number }[]) {
        this.effectsDisplay.innerHTML = "";
        if (effects.length > 0) {
            this.effectsDisplay.style.display = "flex";
            effects.forEach((e) => {
                const el = document.createElement("div");
                el.innerText = `${e.label} ${e.duration.toFixed(1)}s`;
                el.style.backgroundColor = "rgba(0,0,0,0.6)";
                el.style.color = "#fff";
                el.style.padding = "4px 8px";
                el.style.borderRadius = "4px";
                el.style.fontFamily = "Exo 2, sans-serif";
                el.style.fontSize = "14px";
                this.effectsDisplay.appendChild(el);
            });
        } else {
            this.effectsDisplay.style.display = "none";
        }
    }

    public updateItem(itemType: ItemType | null) {
        this.itemDisplay.innerHTML = "";
        if (itemType) {
            const img = document.createElement("img");
            img.src = this.thumbnailGenerator.getThumbnail(itemType);
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "contain";
            this.itemDisplay.appendChild(img);
        }
    }

    public showScreen(screenId: string) {
        // Show/Hide HUD based on screen
        if (
            screenId === "setup-screen" || screenId === "start-screen" ||
            screenId === "results-screen"
        ) {
            this.speedDisplay.style.display = "none";
            this.positionDisplay.style.display = "none";
            this.itemDisplay.style.display = "none";
            this.effectsDisplay.style.display = "none";
        }

        this.screens.forEach((s) => {
            if (s.id === screenId) {
                s.classList.remove("hidden");
                s.classList.add("active");
            } else {
                s.classList.remove("active");
                s.classList.add("hidden");
            }
        });
    }

    public hideAllScreens() {
        this.speedDisplay.style.display = "block";
        this.positionDisplay.style.display = "block";
        this.itemDisplay.style.display = "flex"; // Flex for centering
        this.screens.forEach((s) => {
            s.classList.remove("active");
            s.classList.add("hidden");
        });
    }

    // New: Init Setup Screen
    public initSetup() {
        this.generateAllItems();
        this.slots.fill(null);

        this.loadFromStorage();

        this.renderItems();
        this.updateBudgetDisplay(); // Reset validation state
        this.showScreen("setup-screen");
    }

    private saveToStorage(config: PlayerConfig) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.warn("Failed to save config to local storage", e);
        }
    }

    private loadFromStorage() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return;
            const config = JSON.parse(raw) as PlayerConfig;

            // Restore Stats
            if (config.stats) {
                if (this.speedInput) {
                    this.speedInput.value = config.stats.max_velocity
                        .toString();
                }
                if (this.accelInput) {
                    this.accelInput.value = config.stats.accel_curve.toString();
                }
                if (this.weightInput) {
                    this.weightInput.value = config.stats.mass.toString();
                }
                if (this.handlingInput) {
                    this.handlingInput.value = config.stats.turn_radius
                        .toString();
                }
                if (this.tractionInput) {
                    this.tractionInput.value = config.stats.grip_factor
                        .toString();
                }

                // Update display values
                if (this.valSpeed) {
                    this.valSpeed.innerText = this.speedInput.value;
                }
                if (this.valAccel) {
                    this.valAccel.innerText = this.accelInput.value;
                }
                if (this.valWeight) {
                    this.valWeight.innerText = this.weightInput.value;
                }
                if (this.valHandling) {
                    this.valHandling.innerText = this.handlingInput.value;
                }
                if (this.valTraction) {
                    this.valTraction.innerText = this.tractionInput.value;
                }
            }

            // Restore Items
            if (config.items && Array.isArray(config.items)) {
                config.items.forEach((placement) => {
                    if (
                        placement.slotIndex >= 0 &&
                        placement.slotIndex < this.slots.length
                    ) {
                        this.slots[placement.slotIndex] = placement.itemType;
                    }
                });
            }
        } catch (e) {
            console.warn("Failed to load config from local storage", e);
        }
    }

    private generateAllItems() {
        const types: ItemType[] = [
            "Mushroom",
            "Banana",
            "Red Shell",
            "Star",
            "Lightning",
        ];
        this.availableItems = types.map((type, i) => ({
            id: `item-source-${i}`,
            type,
        }));
    }

    private renderItems() {
        // Render Pool
        this.itemsContainer.innerHTML = "";
        this.availableItems.forEach((item, index) => {
            const el = this.createItemElement(item.type, index, false);
            this.itemsContainer.appendChild(el);
        });

        // Render Slots
        this.slotsContainer.innerHTML = "";
        const labels = [
            "L1 Start",
            "L1 Half",
            "L1 End",
            "L2 Start",
            "L2 Half",
            "L2 End",
            "L3 Start",
            "L3 Half",
            "L3 End",
            "Finish",
        ];

        for (let i = 0; i < 10; i++) {
            const slotEl = document.createElement("div");
            slotEl.className = "slot";

            // Drag Over handlers
            slotEl.addEventListener("dragover", (e) => {
                e.preventDefault();
                slotEl.classList.add("drag-over");
            });
            slotEl.addEventListener("dragleave", () => {
                slotEl.classList.remove("drag-over");
            });
            slotEl.addEventListener("drop", (e) => this.handleDropToSlot(e, i));

            // If item in slot
            if (this.slots[i]) {
                const itemEl = this.createItemElement(this.slots[i]!, i, true);
                slotEl.appendChild(itemEl);
            }

            // Label
            const label = document.createElement("div");
            label.className = "slot-label";
            label.innerText = labels[i];
            slotEl.appendChild(label);

            this.slotsContainer.appendChild(slotEl);
        }
    }

    private createItemElement(
        type: ItemType,
        index: number,
        isInSlot: boolean,
    ): HTMLElement {
        const el = document.createElement("div");
        el.className = `item item-${type.toLowerCase().replace(" ", "-")}`;
        // el.innerText = type[0]; // First letter - REMOVED
        el.draggable = true;
        // el.title = type; // Removed in favor of custom tooltip

        // Add thumbnail image
        const img = document.createElement("img");
        img.src = this.thumbnailGenerator.getThumbnail(type);
        img.alt = type;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        // Add pointer-events: none so dragging grabs the container div properly,
        // or ensure the image is part of the drag image.
        // Actually, preventing default on mousedown on image might be needed if it tries to drag the image itself.
        img.style.pointerEvents = "none";

        el.appendChild(img);

        // Add tooltip
        const descriptions: Record<string, string> = {
            "Mushroom": "Gives a short speed boost",
            "Banana": "Causes the next racer to spin out",
            "Red Shell": "Targets the racer in front of you",
            "Star": "Makes you invincible and increases speed",
            "Lightning": "Shrinks all other racers, slowing them down",
        };

        const tooltip = document.createElement("div");
        tooltip.className = "item-tooltip";
        tooltip.innerText = descriptions[type] || type;
        el.appendChild(tooltip);

        el.addEventListener("dragstart", (e) => {
            this.draggedItemIndex = index;
            this.draggedFromSlot = isInSlot;
            el.classList.add("dragging");

            // Optional: set drag image to the thumbnail
            if (e.dataTransfer) {
                e.dataTransfer.setDragImage(img, 22, 22); // Center of 44x44
            }

            e.stopPropagation();
        });

        el.addEventListener("dragend", () => {
            el.classList.remove("dragging");
            this.draggedItemIndex = null;
        });

        return el;
    }

    private handleDropToSlot(e: DragEvent, slotIndex: number) {
        e.preventDefault();
        if (this.draggedItemIndex === null) return;

        // Find the slot element to remove highlight
        // Since we re-render, we might not need to remove manually if we re-render fast enough,
        // but let's be safe.
        // Actually renderItems clears everything so it's fine.

        if (this.draggedFromSlot) {
            // Move from slot to slot
            const oldIndex = this.draggedItemIndex;
            if (oldIndex === slotIndex) {
                this.renderItems(); // just re-render to clear drag state
                return;
            }

            const item = this.slots[oldIndex];
            // Swap if occupied
            const targetItem = this.slots[slotIndex];
            this.slots[slotIndex] = item;
            this.slots[oldIndex] = targetItem;
        } else {
            // Clone from pool to slot
            const poolItem = this.availableItems[this.draggedItemIndex];
            this.slots[slotIndex] = poolItem.type;
        }

        this.renderItems();
    }

    private handleDropToPool(e: DragEvent) {
        e.preventDefault();
        if (this.draggedItemIndex === null) return;

        if (this.draggedFromSlot) {
            // Delete from slot (don't add back to pool as pool is static)
            this.slots[this.draggedItemIndex] = null;
        }
        // If from pool to pool, do nothing

        this.renderItems();
    }

    public getPlayerStats(): VehicleStats {
        return {
            max_velocity: parseInt(this.speedInput.value),
            accel_curve: parseInt(this.accelInput.value),
            mass: parseInt(this.weightInput.value),
            turn_radius: parseInt(this.handlingInput.value),
            grip_factor: parseInt(this.tractionInput.value),
            boost_efficiency: 5, // Default hidden stat
        };
    }

    public getPlayerConfiguration(): PlayerConfig {
        const items: ItemPlacement[] = [];
        this.slots.forEach((item, index) => {
            if (item) {
                items.push({ slotIndex: index, itemType: item });
            }
        });

        const config = {
            stats: this.getPlayerStats(),
            items,
        };

        this.saveToStorage(config);

        return config;
    }

    public setSidebarTitle(title: string) {
        if (this.sidebarTitle && this.sidebarTitle.innerText !== title) {
            this.sidebarTitle.innerText = title;
        }
    }

    public showCarTooltip(
        x: number,
        y: number,
        name: string,
        stats: VehicleStats,
        item: ItemType | null,
    ) {
        this.carTooltip.style.left = `${x + 15}px`;
        this.carTooltip.style.top = `${y + 15}px`;
        this.carTooltip.style.display = "block";

        const itemText = item ? item : "None";

        this.carTooltip.innerHTML = `
            <h4>${name}</h4>
            <div class="stat-row"><span class="stat-label">Speed:</span> <span class="stat-value">${stats.max_velocity}</span></div>
            <div class="stat-row"><span class="stat-label">Accel:</span> <span class="stat-value">${stats.accel_curve}</span></div>
            <div class="stat-row"><span class="stat-label">Weight:</span> <span class="stat-value">${stats.mass}</span></div>
            <div class="stat-row"><span class="stat-label">Handl.:</span> <span class="stat-value">${stats.turn_radius}</span></div>
            <div class="stat-row"><span class="stat-label">Grip:</span> <span class="stat-value">${stats.grip_factor}</span></div>
            <hr style="border-color: #444; margin: 5px 0;">
            <div class="stat-row"><span class="stat-label">Item:</span> <span class="stat-value" style="color:var(--accent-color)">${itemText}</span></div>
        `;
    }

    public hideCarTooltip() {
        this.carTooltip.style.display = "none";
    }

    public updateLeaderboard(
        cars: {
            name: string;
            rank: number;
            lap: number;
            progress: number;
            finished: boolean;
            finishTime: number;
            stats?: VehicleStats;
        }[],
    ) {
        this.setSidebarTitle("Positions");

        const sorted = [...cars].sort((a, b) => a.rank - b.rank);
        const container = this.leaderboardList;

        const getContent = (car: typeof cars[0]) => {
            const status = car.finished
                ? `<span style="color:#0f0">FINISHED (${
                    (car.finishTime / 1000).toFixed(2)
                }s)</span>`
                : `Lap ${car.lap}`;

            return `
                <span class="rank">#${car.rank}</span>
                <span class="name">${car.name}</span>
                <div style="font-size: 0.8em; color: #888; margin-top: 2px;">${status}</div>
            `;
        };

        if (container.children.length === sorted.length) {
            Array.from(container.children).forEach((child, i) => {
                const car = sorted[i];
                const item = child as HTMLElement;

                const newContent = getContent(car);
                if (item.innerHTML !== newContent) {
                    item.innerHTML = newContent;
                }

                (item as any).__carData = { name: car.name, stats: car.stats };
            });
        } else {
            container.innerHTML = "";
            sorted.forEach((car) => {
                const item = document.createElement("div");
                item.className = "leaderboard-item";
                item.innerHTML = getContent(car);

                (item as any).__carData = { name: car.name, stats: car.stats };

                container.appendChild(item);
            });
        }
    }

    public updateGlobalLeaderboard(entries: LeaderboardEntry[]) {
        this.setSidebarTitle("Global Ranking");
        this.leaderboardList.innerHTML = ""; // Clear list, title is handled by setSidebarTitle

        entries.forEach((entry) => {
            const item = document.createElement("div");
            item.className = "leaderboard-item";

            item.innerHTML = `
                <span class="rank">#${entry.rank}</span>
                <span class="name">${entry.username}</span>
                <div style="font-size: 0.8em; color: #aaa; margin-top: 2px;">Score: ${entry.score}</div>
            `;
            this.leaderboardList.appendChild(item);
        });
    }

    public showResults(
        cars: { name: string; rank: number; finishTime: number }[],
    ) {
        const container = document.getElementById("results-content");
        if (!container) return;

        let html =
            '<table style="width:100%; text-align:left; margin-bottom: 20px;">';
        html += "<tr><th>Rank</th><th>Name</th><th>Time</th></tr>";

        const sorted = [...cars].sort((a, b) => a.rank - b.rank);

        sorted.forEach((car) => {
            html += `<tr>
                <td>#${car.rank}</td>
                <td>${car.name}</td>
                <td>${
                car.finishTime > 0
                    ? (car.finishTime / 1000).toFixed(2) + "s"
                    : "-"
            }</td>
            </tr>`;
        });
        html += "</table>";

        container.innerHTML = html;
        this.showScreen("results-screen");
    }

    // Attach button handlers
    public onStartClick(cb: () => void) {
        const btn = document.getElementById("start-btn");
        if (btn) btn.onclick = cb;
    }

    public onPlayClick(cb: () => void) {
        const btn = document.getElementById("play-btn");
        if (btn) {
            btn.onclick = () => {
                console.log("Play button clicked");
                cb();
            };
        }
    }

    public onRestartClick(cb: () => void) {
        const btn = document.getElementById("restart-btn");
        if (btn) btn.onclick = cb;
    }

    public setPlayButtonLoading(loading: boolean) {
        if (!this.playBtn) return;

        if (loading) {
            this.playBtn.disabled = true;
            this.playBtn.innerText = "Starting...";
            this.playBtn.classList.add("loading");
        } else {
            this.playBtn.innerText = "PLAY";
            this.playBtn.classList.remove("loading");
            // Re-eval budget to see if it should stay disabled
            this.updateBudgetDisplay();
        }
    }
}
