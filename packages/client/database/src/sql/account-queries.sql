/* @name GetAccountProfile */
SELECT u.balance, u.last_login_at, COALESCE(u.name, a.primary_address) as username
FROM effectstream.accounts a
LEFT JOIN user_game_state u ON a.id = u.account_id
WHERE a.id = :account_id!;

/* @name GetAddressByAddress */
SELECT * FROM effectstream.addresses WHERE address = :address!;

/* @name GetAccountById */
SELECT * FROM effectstream.accounts WHERE id = :id!;

/* @name GetAddressesByAccountId */
SELECT * FROM effectstream.addresses WHERE account_id = :account_id!;

/* @name SetAccountName */
INSERT INTO user_game_state (account_id, name)
VALUES (:account_id!, :name!)
ON CONFLICT (account_id) DO UPDATE
SET name = :name!;

/* @name GetLeaderboard */
SELECT u.balance as score, COALESCE(u.name, a.primary_address) as username, a.primary_address as wallet
FROM user_game_state u
JOIN effectstream.accounts a ON u.account_id = a.id
ORDER BY u.balance DESC LIMIT :limit!;