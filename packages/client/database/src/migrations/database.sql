
CREATE TABLE user_game_state (
  account_id INTEGER PRIMARY KEY,
  name TEXT,
  balance INTEGER DEFAULT 0,
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- round INTEGER DEFAULT 1,
  -- safe_count INTEGER DEFAULT 0,
  -- random_hash TEXT,
  -- is_ongoing BOOLEAN DEFAULT FALSE,
  games_lost INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  -- current_score INTEGER DEFAULT 0,
  -- Race game fields
  race_in_progress BOOLEAN DEFAULT FALSE,
  race_hash TEXT,
  -- Car stats (5 stats: max_velocity, accel_curve, mass, turn_radius, grip_factor)
  car_stat1 INTEGER,
  car_stat2 INTEGER,
  car_stat3 INTEGER,
  car_stat4 INTEGER,
  car_stat5 INTEGER,
  -- Items (10 slots, stored as JSON array or comma-separated)
  race_items TEXT -- JSON array of item types: ["Mushroom", "Banana", ...]
);

CREATE TABLE last_user_car (
  account_id INTEGER PRIMARY KEY,
  name TEXT,
  car_stat1 INTEGER NOT NULL,
  car_stat2 INTEGER NOT NULL,
  car_stat3 INTEGER NOT NULL,
  car_stat4 INTEGER NOT NULL,
  car_stat5 INTEGER NOT NULL,
  race_items TEXT NOT NULL
);

CREATE INDEX idx_user_game_state_balance ON user_game_state(balance DESC);

-- Delegations: account (delegator) declares which wallet address they delegate to
CREATE TABLE delegations (
  account_id INTEGER PRIMARY KEY REFERENCES effectstream.accounts(id) ON DELETE CASCADE,
  delegate_to_address TEXT NOT NULL,
  delegated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delegations_delegate_to_address ON delegations(delegate_to_address);

-- Game metadata (single row for this game)
CREATE TABLE game_metadata (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  score_unit TEXT NOT NULL,
  sort_order TEXT NOT NULL CHECK (sort_order IN ('ASC', 'DESC'))
);

-- Achievements configuration
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL
);

-- Per-account achievement unlocks; delegate_to = resolved identity (primary_address or delegated address)
CREATE TABLE achievement_unlocks (
  account_id INTEGER NOT NULL REFERENCES effectstream.accounts(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  delegate_to TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, achievement_id)
);

CREATE INDEX idx_achievement_unlocks_achievement_id
  ON achievement_unlocks(achievement_id);

CREATE INDEX idx_achievement_unlocks_account_id
  ON achievement_unlocks(account_id);

CREATE INDEX idx_achievement_unlocks_delegate_to
  ON achievement_unlocks(delegate_to);

-- Per-match scores; delegate_to = resolved identity (primary_address or delegated address)
-- surface: track condition (DIRT, ICE, ASPHALT) for surface-specific achievements
CREATE TABLE game_matches (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES effectstream.accounts(id) ON DELETE CASCADE,
  delegate_to TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  surface TEXT,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_matches_played_at
  ON game_matches(played_at DESC);

CREATE INDEX idx_game_matches_account_id
  ON game_matches(account_id);

CREATE INDEX idx_game_matches_delegate_to
  ON game_matches(delegate_to);
