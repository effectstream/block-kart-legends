
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
