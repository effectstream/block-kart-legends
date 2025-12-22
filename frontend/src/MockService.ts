import { RaceResult } from './GameSimulator.ts';

// types for the mock service
export interface UserProfile {
    id: string;
    username: string;
    level: number;
    coins: number;
    stats: {
        totalRaces: number;
        wins: number;
        bestTime: number;
    };
}

export interface NetworkResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}

export interface LeaderboardEntry {
    playerId: string;
    username: string;
    score: number;
    rank: number;
}

/**
 * MockService emulates all network activity for the game.
 * It uses setTimeout to simulate network latency.
 */
export class MockService {
    private static instance: MockService;
    private latency: number = 800; // Average latency in ms
    private failRate: number = 0.05; // 5% chance of network failure
    
    // Mock Database
    private mockUser: UserProfile = {
        id: 'user-123',
        username: 'SpeedRacer',
        level: 5,
        coins: 1250,
        stats: {
            totalRaces: 42,
            wins: 15,
            bestTime: 45.2
        }
    };

    private mockLeaderboard: LeaderboardEntry[] = [
        { playerId: 'u1', username: 'DriftKing', score: 9500, rank: 1 },
        { playerId: 'u2', username: 'SpeedDemon', score: 8800, rank: 2 },
        { playerId: 'u3', username: 'KartMaster', score: 8200, rank: 3 },
        { playerId: 'u4', username: 'BlockRacer', score: 7500, rank: 4 },
        { playerId: 'user-123', username: 'SpeedRacer', score: 4200, rank: 15 },
    ];

    private constructor() {}

    public static getInstance(): MockService {
        if (!MockService.instance) {
            MockService.instance = new MockService();
        }
        return MockService.instance;
    }

    /**
     * Simulate a network delay
     */
    private async simulateNetworkDelay(): Promise<void> {
        // const jitter = Math.random() * 400 - 200; // +/- 200ms jitter
        // const delay = Math.max(100, this.latency + jitter);
        const delay = 100;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Simulate random network failures
     */
    private checkNetworkCondition(): boolean {
        return Math.random() > this.failRate;
    }

    // --- Auth Endpoints ---

    public async getUserProfile(_address: string): Promise<UserProfile & { name?: string, balance?: number }> {
        await this.simulateNetworkDelay();
        // Return mock user for any address for now, or a specific one
        return {
            ...this.mockUser,
            name: this.mockUser.username,
            balance: this.mockUser.coins
        };
    }

    public async getAddressInfo(_address: string): Promise<{ account_id: string | null }> {
        await this.simulateNetworkDelay();
        // Simulate that the address is linked to the mock user if it matches, or a new account otherwise
        // For simplicity, let's say all addresses link to 'user-123' for now in this mock
        return { account_id: this.mockUser.id };
    }

    public async getAccountInfo(accountId: string): Promise<{ primary_address: string } | null> {
        await this.simulateNetworkDelay();
        if (accountId === this.mockUser.id) {
            return { primary_address: '0x123...mock' };
        }
        return null;
    }

    public async getAccountAddresses(accountId: string): Promise<{ address: string }[]> {
        await this.simulateNetworkDelay();
        if (accountId === this.mockUser.id) {
             return [{ address: '0x123...mock' }];
        }
        return [];
    }

    public async connectWallets(localWallet: any, connectedWallet: any): Promise<void> {
        await this.simulateNetworkDelay();
        console.log('[MockNetwork] Connecting wallets:', localWallet.walletAddress, connectedWallet.walletAddress);
    }

    public async setUserName(address: string, name: string): Promise<void> {
        await this.simulateNetworkDelay();
        console.log('[MockNetwork] Setting username for', address, 'to', name);
        // Update mock user for any address for demo purposes
        this.mockUser.username = name;
    }

    public async login(username: string): Promise<NetworkResponse<UserProfile>> {
        await this.simulateNetworkDelay();

        if (!this.checkNetworkCondition()) {
            throw new Error("Network Error: Connection timed out");
        }

        console.log(`[MockNetwork] Login request for: ${username}`);
        
        // Return mock user
        return {
            success: true,
            data: this.mockUser,
            timestamp: Date.now()
        };
    }

    public async logout(): Promise<NetworkResponse<void>> {
        await this.simulateNetworkDelay();
        console.log('[MockNetwork] Logout request');
        return {
            success: true,
            timestamp: Date.now()
        };
    }

    // --- Game Data Endpoints ---

    public async getLeaderboard(limit: number = 10): Promise<NetworkResponse<LeaderboardEntry[]>> {
        await this.simulateNetworkDelay();
        
        console.log(`[MockNetwork] Fetching leaderboard (limit: ${limit})`);

        return {
            success: true,
            data: this.mockLeaderboard.slice(0, limit),
            timestamp: Date.now()
        };
    }

    public async saveRaceResult(result: RaceResult): Promise<NetworkResponse<boolean>> {
        await this.simulateNetworkDelay();

        if (!this.checkNetworkCondition()) {
            throw new Error("Network Error: Failed to submit results");
        }

        console.log('[MockNetwork] Submitting race result:', result);
        
        // Update mock stats
        this.mockUser.stats.totalRaces++;
        if (result.rank === 1) {
            this.mockUser.stats.wins++;
        }
        if (this.mockUser.stats.bestTime === 0 || result.time < this.mockUser.stats.bestTime) {
            this.mockUser.stats.bestTime = result.time;
        }

        return {
            success: true,
            data: true,
            timestamp: Date.now()
        };
    }

    public async fetchDailyChallenges(): Promise<NetworkResponse<string[]>> {
        await this.simulateNetworkDelay();
        console.log('[MockNetwork] Fetching daily challenges');

        return {
            success: true,
            data: [
                "Complete 3 races",
                "Win 1 race",
                "Drift for 500 meters"
            ],
            timestamp: Date.now()
        };
    }

    // --- Multiplayer Simulation ---

    public async findMatch(): Promise<NetworkResponse<{ matchId: string, opponents: string[] }>> {
        await this.simulateNetworkDelay();
        console.log('[MockNetwork] Searching for match...');

        // Simulate varying wait time for matchmaking
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            data: {
                matchId: `match_${Date.now()}`,
                opponents: ['Bot Alpha', 'Bot Beta', 'Bot Gamma']
            },
            timestamp: Date.now()
        };
    }
}

export const mockService = MockService.getInstance();
