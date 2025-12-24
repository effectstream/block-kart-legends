import { effectStreamService } from './EffectStreamService';

export interface LeaderboardEntry {
    name: string;
    score: number;
}

class Leaderboard {
    private entries: LeaderboardEntry[] = [];
    private isLoading: boolean = true;

    constructor() {
        // Initial load
        this.fetchData();

        // Setup refresh button
        const refreshBtn = document.getElementById('btn-refresh-leaderboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.fetchData();
            });
        }
    }

    async fetchData() {
        this.isLoading = true;
        this.render();
        try {
            this.entries = await effectStreamService.getLeaderboard();
        } catch (error) {
            console.error("Failed to fetch leaderboard", error);
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    async addScore(name: string, score: number) {
        try {
            this.entries = await effectStreamService.submitScore(name, score);
            this.render();
        } catch (error) {
            console.error("Failed to submit score", error);
        }
    }

    render() {
        const list = document.getElementById('leaderboard-list');
        if (!list) return;

        list.innerHTML = '';
        if (this.isLoading) {
            list.innerHTML = '<li>Loading...</li>';
            return;
        }

        if (this.entries.length === 0) {
            list.innerHTML = '<li>No players found</li>';
            return;
        }

        this.entries.forEach((entry, index) => {
            const li = document.createElement('li');
            
            const placeSpan = document.createElement('span');
            placeSpan.textContent = `${index + 1}.`;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = entry.name;
            
            const scoreSpan = document.createElement('span');
            scoreSpan.textContent = entry.score.toFixed(2);
            
            li.appendChild(placeSpan);
            li.appendChild(nameSpan);
            li.appendChild(scoreSpan);
            
            list.appendChild(li);
        });
    }
}

export const leaderboard = new Leaderboard();
