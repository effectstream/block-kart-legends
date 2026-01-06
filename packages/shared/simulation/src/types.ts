export type ItemType =
    | "Mushroom"
    | "Banana"
    | "Red Shell"
    | "Star"
    | "Lightning";

export interface ItemPlacement {
    slotIndex: number; // 0-9
    itemType: ItemType;
}

export interface PlayerConfig {
    stats: VehicleStats;
    items: ItemPlacement[];
}

export interface VehicleStats {
    max_velocity: number; // Top Speed
    accel_curve: number; // Acceleration
    mass: number; // Weight
    turn_radius: number; // Handling
    grip_factor: number; // Traction
    boost_efficiency: number; // Mini-Turbo (Hidden)
    // // Legacy support until refactor
    // speed?: number;
    // accel?: number;
    // weight?: number;
    // handling?: number;
    // traction?: number;
}

export type TrackCondition = "Asphalt" | "Dirt" | "Ice";

export interface TrackConfig {
    condition: TrackCondition; // "Asphalt", "Dirt", "Ice"
    speedModifier: number;
    handlingModifier: number;
    gripModifier: number;
    roadColor: number;
    grassColor: number;
    skyColor: number;
}
