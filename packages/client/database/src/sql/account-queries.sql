/* @name GetAccountProfile */
SELECT u.balance, u.last_login_at, COALESCE(u.name, a.primary_address) as username
FROM effectstream.accounts a
LEFT JOIN user_game_state u ON a.id = u.account_id
WHERE a.id = :account_id!;

/* @name SetAccountName */
INSERT INTO user_game_state (account_id, name)
VALUES (:account_id!, :name!)
ON CONFLICT (account_id) DO UPDATE
SET name = :name!;

/* @name UpsertDelegation */
INSERT INTO delegations (account_id, delegate_to_address)
VALUES (:account_id!, :delegate_to_address!)
ON CONFLICT (account_id) DO UPDATE
SET delegate_to_address = :delegate_to_address!,
    delegated_at = NOW();

/* @name GetResolvedAddressByAccountId */
SELECT COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address
FROM effectstream.accounts a
LEFT JOIN delegations d ON d.account_id = a.id
WHERE a.id = :account_id!;

/* @name GetDelegationByAccountId */
SELECT *
FROM delegations
WHERE account_id = :account_id!;

/* @name GetDelegationByAddress */
SELECT
  d.account_id,
  d.delegate_to_address,
  d.delegated_at
FROM effectstream.addresses addr
JOIN delegations d ON addr.account_id = d.account_id
WHERE addr.address = :address!;

/* @name GetResolvedIdentityByAddress */
SELECT
  addr.account_id AS account_id,
  addr.address AS queried_address,
  COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address,
  (addr.address <> COALESCE(d.delegate_to_address, a.primary_address)) AS is_delegate,
  COALESCE(u.name, COALESCE(d.delegate_to_address, a.primary_address, addr.address)) AS display_name
FROM effectstream.addresses addr
LEFT JOIN effectstream.accounts a ON addr.account_id = a.id
LEFT JOIN delegations d ON addr.account_id = d.account_id
LEFT JOIN user_game_state u ON a.id = u.account_id
WHERE addr.address = :address!;

/* @name GetLeaderboard */
SELECT u.balance as score, COALESCE(u.name, a.primary_address) as username, a.primary_address as wallet
FROM user_game_state u
JOIN effectstream.accounts a ON u.account_id = a.id
ORDER BY u.balance DESC LIMIT :limit!;

/* @name GetGameMetadata */
SELECT id, name, description, score_unit, sort_order
FROM game_metadata
WHERE id = 1;

/* @name GetAchievementsWithCompletionCount */
SELECT
  ach.id,
  ach.name,
  ach.description,
  ach.icon_url,
  COALESCE(COUNT(DISTINCT au.delegate_to), 0) AS completed_count
FROM achievements ach
LEFT JOIN achievement_unlocks au ON ach.id = au.achievement_id
GROUP BY ach.id, ach.name, ach.description, ach.icon_url
ORDER BY ach.id;

/* @name GetUserAchievementsByResolvedAddress */
SELECT DISTINCT au.achievement_id AS id
FROM achievement_unlocks au
JOIN achievements ach ON au.achievement_id = ach.id
WHERE au.delegate_to = :resolved_address!
  AND au.unlocked_at >= :start_date!
  AND au.unlocked_at <= :end_date!
ORDER BY au.achievement_id;

/* @name GetUserStatsByResolvedAddress */
WITH account_resolved AS (
  SELECT a.id AS account_id, COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address
  FROM effectstream.accounts a
  LEFT JOIN delegations d ON d.account_id = a.id
),
identity_balance AS (
  SELECT ar.resolved_address, COALESCE(SUM(u.balance), 0)::bigint AS total_score
  FROM account_resolved ar
  LEFT JOIN user_game_state u ON u.account_id = ar.account_id
  GROUP BY ar.resolved_address
),
matches_in_range AS (
  SELECT gm.delegate_to, COUNT(*)::int AS matches_played
  FROM game_matches gm
  WHERE gm.played_at >= :start_date!
    AND gm.played_at <= :end_date!
  GROUP BY gm.delegate_to
),
ranked AS (
  SELECT
    ib.resolved_address,
    ib.total_score AS score,
    COALESCE(mir.matches_played, 0) AS matches_played,
    RANK() OVER (ORDER BY ib.total_score DESC, ib.resolved_address ASC) AS rank
  FROM identity_balance ib
  LEFT JOIN matches_in_range mir ON mir.delegate_to = ib.resolved_address
)
SELECT
  rank,
  score,
  matches_played
FROM ranked
WHERE resolved_address = :resolved_address!;

/* @name GetLeaderboardV1 */
WITH account_resolved AS (
  SELECT a.id AS account_id, COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address
  FROM effectstream.accounts a
  LEFT JOIN delegations d ON d.account_id = a.id
),
identity_balance AS (
  SELECT ar.resolved_address, COALESCE(SUM(u.balance), 0)::bigint AS total_score
  FROM account_resolved ar
  LEFT JOIN user_game_state u ON u.account_id = ar.account_id
  GROUP BY ar.resolved_address
),
matches_in_range AS (
  SELECT DISTINCT gm.delegate_to
  FROM game_matches gm
  WHERE gm.played_at >= :start_date!
    AND gm.played_at <= :end_date!
),
identity_scores AS (
  SELECT ib.resolved_address, ib.total_score AS best_score
  FROM identity_balance ib
  JOIN matches_in_range mir ON mir.delegate_to = ib.resolved_address
),
achievement_counts AS (
  SELECT
    delegate_to AS resolved_address,
    COUNT(DISTINCT achievement_id) AS achievements_unlocked
  FROM achievement_unlocks
  GROUP BY delegate_to
),
display_names AS (
  SELECT
    ar.resolved_address,
    MIN(ar.account_id) AS any_account_id
  FROM account_resolved ar
  GROUP BY ar.resolved_address
),
ranked AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY iscores.best_score DESC, iscores.resolved_address ASC) AS rank,
    iscores.resolved_address AS address,
    (display_names.any_account_id)::TEXT AS player_id,
    COALESCE(u.name, iscores.resolved_address) AS display_name,
    iscores.best_score AS score,
    COALESCE(ac.achievements_unlocked, 0) AS achievements_unlocked
  FROM identity_scores iscores
  JOIN display_names ON display_names.resolved_address = iscores.resolved_address
  LEFT JOIN user_game_state u ON u.account_id = display_names.any_account_id
  LEFT JOIN achievement_counts ac ON ac.resolved_address = iscores.resolved_address
)
SELECT
  rank,
  address,
  player_id,
  display_name,
  score,
  achievements_unlocked,
  COUNT(*) OVER () AS total_players
FROM ranked
ORDER BY rank
LIMIT :limit! OFFSET :offset!;

/* @name GetLeaderboardTotalPlayers */
SELECT COUNT(DISTINCT delegate_to)::int AS total_players
FROM game_matches
WHERE played_at >= COALESCE(:start_date::timestamptz, NOW() - INTERVAL '1 year')
  AND played_at <= COALESCE(:end_date::timestamptz, NOW());

/* @name GetLeaderboardEntries */
WITH best_scores AS (
  SELECT delegate_to, SUM(score) AS score, MIN(account_id) AS any_account_id
  FROM game_matches
  WHERE played_at >= COALESCE(:start_date::timestamptz, NOW() - INTERVAL '1 year')
    AND played_at <= COALESCE(:end_date::timestamptz, NOW())
  GROUP BY delegate_to
),
ranked AS (
  SELECT delegate_to, score, any_account_id, ROW_NUMBER() OVER (ORDER BY score DESC)::int AS rank
  FROM best_scores
)
SELECT
  r.rank,
  r.delegate_to AS address,
  ('user_' || r.any_account_id::text) AS player_id,
  u.name AS display_name,
  r.score,
  (
    SELECT COUNT(DISTINCT au.achievement_id)::int
    FROM achievement_unlocks au
    WHERE au.delegate_to = r.delegate_to
  ) AS achievements_unlocked
FROM ranked r
LEFT JOIN user_game_state u ON u.account_id = r.any_account_id
ORDER BY r.rank
LIMIT :limit! OFFSET :offset!;