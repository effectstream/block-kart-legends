export class RNG {
    private static seed: number = 0;
    private static initialized: boolean = false;
    private static instance: RNG;

    constructor(seed: number) {
        if (!RNG.initialized) {
            RNG.seed = seed;
            RNG.initialized = true;
        }
    }

    // Linear Congruential Generator
    // Using constants from glibc
    next(): number {
        const a = 1103515245;
        const c = 12345;
        const m = 2147483648;
        RNG.seed = (a * RNG.seed + c) % m;
        return RNG.seed / m;
    }

    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }


    static getInstance(): RNG {
        if (!RNG.instance) {
            // Default seed if not initialized
            RNG.instance = new RNG(Date.now());
        }
        return RNG.instance;
    }

    static setSeed(seed: number) {
        RNG.instance = new RNG(seed);
    }

    static next(): number {
        return RNG.getInstance().next();
    }
}