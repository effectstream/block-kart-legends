import { VehicleStats } from "./types.ts";

export class CarBase {
    public id: string;
    public stats: VehicleStats;
    public isPlayer: boolean;

    public progress: number = 0;
    public lap: number = 1;
    public finished: boolean = false;
    public finishTime: number = 0;
    public horizontalOffset: number = 0;

    constructor(id: string, stats: VehicleStats, isPlayer: boolean = false) {
        this.id = id;
        this.stats = stats;
        this.isPlayer = isPlayer;
    }

    public setSimState(progress: number, lap: number) {
        this.progress = progress;
        this.lap = lap;
    }

    public getProgress(): number {
        return this.progress;
    }

    public getCarConfig() {
        return {
            id: this.id,
            stats: this.stats,
            isPlayer: this.isPlayer,
            progress: this.progress,
            horizontalOffset: this.horizontalOffset,
            finished: this.finished,
            finishTime: this.finishTime,
        };
    }
}
