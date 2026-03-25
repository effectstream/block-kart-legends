type SoundType =
    | "click"
    | "hover"
    | "confirm"
    | "cancel"
    | "sliderTick"
    | "itemPickup"
    | "itemDrop"
    | "itemMushroom"
    | "itemBanana"
    | "itemRedShell"
    | "itemStar"
    | "itemLightning";

class SoundManager {
    private ctx: AudioContext | null = null;
    private enabled = true;

    private getContext(): AudioContext {
        if (!this.ctx) {
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === "suspended") {
            this.ctx.resume();
        }
        return this.ctx;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    play(type: SoundType) {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            switch (type) {
                case "click":
                    this.playClick(ctx);
                    break;
                case "hover":
                    this.playHover(ctx);
                    break;
                case "confirm":
                    this.playConfirm(ctx);
                    break;
                case "cancel":
                    this.playCancel(ctx);
                    break;
                case "sliderTick":
                    this.playSliderTick(ctx);
                    break;
                case "itemPickup":
                    this.playItemPickup(ctx);
                    break;
                case "itemDrop":
                    this.playItemDrop(ctx);
                    break;
                case "itemMushroom":
                    this.playItemMushroom(ctx);
                    break;
                case "itemBanana":
                    this.playItemBanana(ctx);
                    break;
                case "itemRedShell":
                    this.playItemRedShell(ctx);
                    break;
                case "itemStar":
                    this.playItemStar(ctx);
                    break;
                case "itemLightning":
                    this.playItemLightning(ctx);
                    break;
            }
        } catch {
            // Silently ignore audio errors
        }
    }

    // --- UI Sounds ---

    private playClick(ctx: AudioContext) {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.06);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
    }

    private playHover(ctx: AudioContext) {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, t);

        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.04);
    }

    private playConfirm(ctx: AudioContext) {
        const t = ctx.currentTime;

        for (const [freq, offset] of [[600, 0], [900, 0.07]] as const) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "square";
            osc.frequency.setValueAtTime(freq, t + offset);

            gain.gain.setValueAtTime(0.12, t + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + offset);
            osc.stop(t + offset + 0.08);
        }
    }

    private playCancel(ctx: AudioContext) {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    // --- Setup Screen Sounds ---

    private playSliderTick(ctx: AudioContext) {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(600, t);

        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);
    }

    private playItemPickup(ctx: AudioContext) {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.06);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
    }

    private playItemDrop(ctx: AudioContext) {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(700, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.07);
    }

    // --- Race Item Sounds ---

    private playItemMushroom(ctx: AudioContext) {
        // Quick ascending whoosh - speed boost feel
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    private playItemBanana(ctx: AudioContext) {
        // Comedic plop/splat
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    private playItemRedShell(ctx: AudioContext) {
        // Sharp attack projectile whistle
        const t = ctx.currentTime;
        for (const [freq, offset] of [[1000, 0], [1400, 0.05], [800, 0.1]] as const) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "square";
            osc.frequency.setValueAtTime(freq, t + offset);

            gain.gain.setValueAtTime(0.1, t + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.05);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + offset);
            osc.stop(t + offset + 0.05);
        }
    }

    private playItemStar(ctx: AudioContext) {
        // Sparkling ascending arpeggio
        const t = ctx.currentTime;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "square";
            osc.frequency.setValueAtTime(freq, t + i * 0.06);

            gain.gain.setValueAtTime(0.08, t + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + i * 0.06);
            osc.stop(t + i * 0.06 + 0.1);
        });
    }

    private playItemLightning(ctx: AudioContext) {
        // Harsh crackle/zap
        const t = ctx.currentTime;

        // Noise burst via oscillator detune trick
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(80, t);
        osc2.type = "square";
        osc2.frequency.setValueAtTime(83, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.setValueAtTime(0.15, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.25);
        osc2.stop(t + 0.25);

        // High crackle overlay
        const osc3 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc3.type = "square";
        osc3.frequency.setValueAtTime(2000, t);
        osc3.frequency.exponentialRampToValueAtTime(200, t + 0.15);

        gain2.gain.setValueAtTime(0.1, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc3.connect(gain2);
        gain2.connect(ctx.destination);
        osc3.start(t);
        osc3.stop(t + 0.18);
    }
}

export const soundManager = new SoundManager();
