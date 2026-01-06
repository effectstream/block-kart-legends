# BlockKart Legends

A blockchain-based autonomous racing strategy game.

## Project Structure

- `src/main.ts`: Entry point, handles wallet UI events.
- `src/GameManager.ts`: Main game loop, Three.js scene, and state management.
- `src/UIManager.ts`: Handles UI screen transitions and updates.
- `src/types.ts`: TypeScript interfaces for game state.
- `src/style.css`: Game styling.
- `index.html`: Main HTML file containing UI layers.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open the browser at the provided URL (usually `http://localhost:3000`).

## Game Flow

1. **Start Screen**: Click "Play Demo" or connect wallet to enter.
2. **Select Vehicle**: Configure your kart stats (Speed, Accel, Weight,
   Handling, Traction) within a 25-point budget.
3. **Lobby**: Wait for other players (simulated in demo mode).
4. **Race**: Watch the race (placeholder animation) and view HUD.
5. **Results**: See the winner and return to menu.

## Technologies

- Vite
- TypeScript
- Three.js
- Wallet Connect (Mocked for UI demo)
