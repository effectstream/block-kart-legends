export class RNG {
    private static seed: number = 0;
    private static instance: RNG;

    constructor(seed: number) {
        RNG.seed = seed;
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
            throw new Error('RNG not initialized');
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