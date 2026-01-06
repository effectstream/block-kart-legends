export class RNG {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    // Linear Congruential Generator
    // Using constants from glibc
    next(): number {
        const a = 1103515245;
        const c = 12345;
        const m = 2147483648;
        this.seed = (a * this.seed + c) % m;
        return this.seed / m;
    }

    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
}
