/* @name UpdateAccountBalance */
INSERT INTO user_game_state (account_id, balance, last_login_at)
VALUES (:account_id!, :amount!, NOW())
ON CONFLICT (account_id) DO UPDATE
SET balance = user_game_state.balance + :amount!,
    last_login_at = NOW();

/* @name UpsertGameState */
INSERT INTO user_game_state (account_id, race_hash, race_in_progress, games_lost, games_won)
VALUES (:account_id!, :race_hash!, :race_in_progress!, 0, 0)
ON CONFLICT (account_id) DO UPDATE
SET 
    race_hash = :race_hash!,
    race_in_progress = :race_in_progress!
;

/* @name UpdateGameStatus */
UPDATE user_game_state
SET race_in_progress = :race_in_progress!
WHERE account_id = :account_id!;

/* @name IncrementGamesLost */
UPDATE user_game_state
SET games_lost = games_lost + 1, race_in_progress = FALSE
WHERE account_id = :account_id!;

/* @name GetGameState */
SELECT * FROM user_game_state WHERE account_id = :account_id!;

/* @name IsRaceInProgress */
SELECT race_in_progress FROM user_game_state 
WHERE account_id = :account_id!
AND race_in_progress = TRUE;

/* @name CreateRace */
INSERT INTO user_game_state (
  account_id, 
  race_in_progress, 
  race_hash, 
  car_stat1, 
  car_stat2, 
  car_stat3, 
  car_stat4, 
  car_stat5, 
  race_items
)
VALUES (
  :account_id!,
  TRUE,
  :race_hash!,
  :car_stat1!,
  :car_stat2!,
  :car_stat3!,
  :car_stat4!,
  :car_stat5!,
  :race_items!
)
ON CONFLICT (account_id) DO UPDATE
SET race_in_progress = TRUE,
    race_hash = :race_hash!,
    car_stat1 = :car_stat1!,
    car_stat2 = :car_stat2!,
    car_stat3 = :car_stat3!,
    car_stat4 = :car_stat4!,
    car_stat5 = :car_stat5!,
    race_items = :race_items!;

/* @name CompleteRace */
UPDATE user_game_state
SET race_in_progress = FALSE,
    balance = balance + :score!,
    games_won = games_won + 1
WHERE account_id = :account_id!;

/* @name InsertCar */
INSERT INTO last_user_car (account_id, name, car_stat1, car_stat2, car_stat3, car_stat4, car_stat5, race_items)
VALUES (:account_id!, :name!, :car_stat1!, :car_stat2!, :car_stat3!, :car_stat4!, :car_stat5!, :race_items!)
ON CONFLICT (account_id) DO UPDATE
SET name = :name!,
    car_stat1 = :car_stat1!,
    car_stat2 = :car_stat2!,
    car_stat3 = :car_stat3!,
    car_stat4 = :car_stat4!,
    car_stat5 = :car_stat5!,
    race_items = :race_items!;
