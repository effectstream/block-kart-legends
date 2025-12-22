export interface PhysicsConfig {
    // Speed
    minMaxSpeed: number; // 0.05
    maxMaxSpeed: number; // 0.25

    // Acceleration
    baseAccel: number; // 0.2
    accelPerStat: number; // 1.0
    decelMult: number; // 2.0 (relative to accel)

    // Handling / Cornering
    handlingCurveThreshold: number; // 0.1
    handlingMaxFactor: number; // 12 (divisor)
    brakingStrengthMult: number; // 16.0
    minCorneringSpeedFactor: number; // 0.2

    // Grip (New: Grip affects cornering speed retention)
    gripCorneringEffect: number; // 0.0 - 1.0 effect

    // Mass (New: Mass affects momentum/coasting)
    massDecelReduction: number; // 0.0 - 0.5 reduction in deceleration per stat point

    // Boost
    boostGripBonusBase: number; // 0.6
    boostGripBonusPerStat: number; // 0.9 (per 10 stats)

    // Resistance
    massResistanceDivisor: number; // 20
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
    minMaxSpeed: 0.05461780422431757,
    maxMaxSpeed: 0.25683147824255714,
    baseAccel: 0.20559022654110695,
    accelPerStat: 1.0674473571133247,
    decelMult: 1.9129059011273872,
    handlingCurveThreshold: 0.0926527494075724,
    handlingMaxFactor: 12,
    brakingStrengthMult: 16,
    minCorneringSpeedFactor: 0.20227278635508059,
    gripCorneringEffect: 0.09723810051943599,
    massDecelReduction: 0.05113500680114807,
    boostGripBonusBase: 0.6,
    boostGripBonusPerStat: 0.9,
    massResistanceDivisor: 20
};
