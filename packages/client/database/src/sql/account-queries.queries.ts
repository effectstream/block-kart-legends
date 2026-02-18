/** Types generated for queries found in "src/sql/account-queries.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

/** 'GetAccountProfile' parameters type */
export interface IGetAccountProfileParams {
  account_id: number;
}

/** 'GetAccountProfile' return type */
export interface IGetAccountProfileResult {
  balance: number | null;
  last_login_at: Date | null;
  username: string | null;
}

/** 'GetAccountProfile' query type */
export interface IGetAccountProfileQuery {
  params: IGetAccountProfileParams;
  result: IGetAccountProfileResult;
}

const getAccountProfileIR: any = {"usedParamSet":{"account_id":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":176,"b":187}]}],"statement":"SELECT u.balance, u.last_login_at, COALESCE(u.name, a.primary_address) as username\nFROM effectstream.accounts a\nLEFT JOIN user_game_state u ON a.id = u.account_id\nWHERE a.id = :account_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT u.balance, u.last_login_at, COALESCE(u.name, a.primary_address) as username
 * FROM effectstream.accounts a
 * LEFT JOIN user_game_state u ON a.id = u.account_id
 * WHERE a.id = :account_id!
 * ```
 */
export const getAccountProfile = new PreparedQuery<IGetAccountProfileParams,IGetAccountProfileResult>(getAccountProfileIR);


/** 'SetAccountName' parameters type */
export interface ISetAccountNameParams {
  account_id: number;
  name: string;
}

/** 'SetAccountName' return type */
export type ISetAccountNameResult = void;

/** 'SetAccountName' query type */
export interface ISetAccountNameQuery {
  params: ISetAccountNameParams;
  result: ISetAccountNameResult;
}

const setAccountNameIR: any = {"usedParamSet":{"account_id":true,"name":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":66}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":69,"b":74},{"a":123,"b":128}]}],"statement":"INSERT INTO user_game_state (account_id, name)\nVALUES (:account_id!, :name!)\nON CONFLICT (account_id) DO UPDATE\nSET name = :name!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO user_game_state (account_id, name)
 * VALUES (:account_id!, :name!)
 * ON CONFLICT (account_id) DO UPDATE
 * SET name = :name!
 * ```
 */
export const setAccountName = new PreparedQuery<ISetAccountNameParams,ISetAccountNameResult>(setAccountNameIR);


/** 'UpsertDelegation' parameters type */
export interface IUpsertDelegationParams {
  account_id: number;
  delegate_to_address: string;
}

/** 'UpsertDelegation' return type */
export type IUpsertDelegationResult = void;

/** 'UpsertDelegation' query type */
export interface IUpsertDelegationQuery {
  params: IUpsertDelegationParams;
  result: IUpsertDelegationResult;
}

const upsertDelegationIR: any = {"usedParamSet":{"account_id":true,"delegate_to_address":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":66,"b":77}]},{"name":"delegate_to_address","required":true,"transform":{"type":"scalar"},"locs":[{"a":80,"b":100},{"a":164,"b":184}]}],"statement":"INSERT INTO delegations (account_id, delegate_to_address)\nVALUES (:account_id!, :delegate_to_address!)\nON CONFLICT (account_id) DO UPDATE\nSET delegate_to_address = :delegate_to_address!,\n    delegated_at = NOW()"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO delegations (account_id, delegate_to_address)
 * VALUES (:account_id!, :delegate_to_address!)
 * ON CONFLICT (account_id) DO UPDATE
 * SET delegate_to_address = :delegate_to_address!,
 *     delegated_at = NOW()
 * ```
 */
export const upsertDelegation = new PreparedQuery<IUpsertDelegationParams,IUpsertDelegationResult>(upsertDelegationIR);


/** 'GetResolvedAddressByAccountId' parameters type */
export interface IGetResolvedAddressByAccountIdParams {
  account_id: number;
}

/** 'GetResolvedAddressByAccountId' return type */
export interface IGetResolvedAddressByAccountIdResult {
  resolved_address: string | null;
}

/** 'GetResolvedAddressByAccountId' query type */
export interface IGetResolvedAddressByAccountIdQuery {
  params: IGetResolvedAddressByAccountIdParams;
  result: IGetResolvedAddressByAccountIdResult;
}

const getResolvedAddressByAccountIdIR: any = {"usedParamSet":{"account_id":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":167,"b":178}]}],"statement":"SELECT COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address\nFROM effectstream.accounts a\nLEFT JOIN delegations d ON d.account_id = a.id\nWHERE a.id = :account_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address
 * FROM effectstream.accounts a
 * LEFT JOIN delegations d ON d.account_id = a.id
 * WHERE a.id = :account_id!
 * ```
 */
export const getResolvedAddressByAccountId = new PreparedQuery<IGetResolvedAddressByAccountIdParams,IGetResolvedAddressByAccountIdResult>(getResolvedAddressByAccountIdIR);


/** 'GetDelegationByAccountId' parameters type */
export interface IGetDelegationByAccountIdParams {
  account_id: number;
}

/** 'GetDelegationByAccountId' return type */
export interface IGetDelegationByAccountIdResult {
  account_id: number;
  delegate_to_address: string;
  delegated_at: Date;
}

/** 'GetDelegationByAccountId' query type */
export interface IGetDelegationByAccountIdQuery {
  params: IGetDelegationByAccountIdParams;
  result: IGetDelegationByAccountIdResult;
}

const getDelegationByAccountIdIR: any = {"usedParamSet":{"account_id":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":45,"b":56}]}],"statement":"SELECT *\nFROM delegations\nWHERE account_id = :account_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM delegations
 * WHERE account_id = :account_id!
 * ```
 */
export const getDelegationByAccountId = new PreparedQuery<IGetDelegationByAccountIdParams,IGetDelegationByAccountIdResult>(getDelegationByAccountIdIR);


/** 'GetDelegationByAddress' parameters type */
export interface IGetDelegationByAddressParams {
  address: string;
}

/** 'GetDelegationByAddress' return type */
export interface IGetDelegationByAddressResult {
  account_id: number;
  delegate_to_address: string;
  delegated_at: Date;
}

/** 'GetDelegationByAddress' query type */
export interface IGetDelegationByAddressQuery {
  params: IGetDelegationByAddressParams;
  result: IGetDelegationByAddressResult;
}

const getDelegationByAddressIR: any = {"usedParamSet":{"address":true},"params":[{"name":"address","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":180}]}],"statement":"SELECT\n  d.account_id,\n  d.delegate_to_address,\n  d.delegated_at\nFROM effectstream.addresses addr\nJOIN delegations d ON addr.account_id = d.account_id\nWHERE addr.address = :address!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   d.account_id,
 *   d.delegate_to_address,
 *   d.delegated_at
 * FROM effectstream.addresses addr
 * JOIN delegations d ON addr.account_id = d.account_id
 * WHERE addr.address = :address!
 * ```
 */
export const getDelegationByAddress = new PreparedQuery<IGetDelegationByAddressParams,IGetDelegationByAddressResult>(getDelegationByAddressIR);


/** 'GetResolvedIdentityByAddress' parameters type */
export interface IGetResolvedIdentityByAddressParams {
  address: string;
}

/** 'GetResolvedIdentityByAddress' return type */
export interface IGetResolvedIdentityByAddressResult {
  account_id: number | null;
  display_name: string | null;
  is_delegate: boolean | null;
  queried_address: string;
  resolved_address: string | null;
}

/** 'GetResolvedIdentityByAddress' query type */
export interface IGetResolvedIdentityByAddressQuery {
  params: IGetResolvedIdentityByAddressParams;
  result: IGetResolvedIdentityByAddressResult;
}

const getResolvedIdentityByAddressIR: any = {"usedParamSet":{"address":true},"params":[{"name":"address","required":true,"transform":{"type":"scalar"},"locs":[{"a":560,"b":568}]}],"statement":"SELECT\n  addr.account_id AS account_id,\n  addr.address AS queried_address,\n  COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address,\n  (addr.address <> COALESCE(d.delegate_to_address, a.primary_address)) AS is_delegate,\n  COALESCE(u.name, COALESCE(d.delegate_to_address, a.primary_address, addr.address)) AS display_name\nFROM effectstream.addresses addr\nLEFT JOIN effectstream.accounts a ON addr.account_id = a.id\nLEFT JOIN delegations d ON addr.account_id = d.account_id\nLEFT JOIN user_game_state u ON a.id = u.account_id\nWHERE addr.address = :address!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   addr.account_id AS account_id,
 *   addr.address AS queried_address,
 *   COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address,
 *   (addr.address <> COALESCE(d.delegate_to_address, a.primary_address)) AS is_delegate,
 *   COALESCE(u.name, COALESCE(d.delegate_to_address, a.primary_address, addr.address)) AS display_name
 * FROM effectstream.addresses addr
 * LEFT JOIN effectstream.accounts a ON addr.account_id = a.id
 * LEFT JOIN delegations d ON addr.account_id = d.account_id
 * LEFT JOIN user_game_state u ON a.id = u.account_id
 * WHERE addr.address = :address!
 * ```
 */
export const getResolvedIdentityByAddress = new PreparedQuery<IGetResolvedIdentityByAddressParams,IGetResolvedIdentityByAddressResult>(getResolvedIdentityByAddressIR);


/** 'GetLeaderboard' parameters type */
export interface IGetLeaderboardParams {
  limit: NumberOrString;
}

/** 'GetLeaderboard' return type */
export interface IGetLeaderboardResult {
  score: number | null;
  username: string | null;
  wallet: string | null;
}

/** 'GetLeaderboard' query type */
export interface IGetLeaderboardQuery {
  params: IGetLeaderboardParams;
  result: IGetLeaderboardResult;
}

const getLeaderboardIR: any = {"usedParamSet":{"limit":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":209,"b":215}]}],"statement":"SELECT u.balance as score, COALESCE(u.name, a.primary_address) as username, a.primary_address as wallet\nFROM user_game_state u\nJOIN effectstream.accounts a ON u.account_id = a.id\nORDER BY u.balance DESC LIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT u.balance as score, COALESCE(u.name, a.primary_address) as username, a.primary_address as wallet
 * FROM user_game_state u
 * JOIN effectstream.accounts a ON u.account_id = a.id
 * ORDER BY u.balance DESC LIMIT :limit!
 * ```
 */
export const getLeaderboard = new PreparedQuery<IGetLeaderboardParams,IGetLeaderboardResult>(getLeaderboardIR);


/** 'GetGameMetadata' parameters type */
export type IGetGameMetadataParams = void;

/** 'GetGameMetadata' return type */
export interface IGetGameMetadataResult {
  description: string;
  id: number;
  name: string;
  score_unit: string;
  sort_order: string;
}

/** 'GetGameMetadata' query type */
export interface IGetGameMetadataQuery {
  params: IGetGameMetadataParams;
  result: IGetGameMetadataResult;
}

const getGameMetadataIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT id, name, description, score_unit, sort_order\nFROM game_metadata\nWHERE id = 1"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, name, description, score_unit, sort_order
 * FROM game_metadata
 * WHERE id = 1
 * ```
 */
export const getGameMetadata = new PreparedQuery<IGetGameMetadataParams,IGetGameMetadataResult>(getGameMetadataIR);


/** 'GetAchievementsWithCompletionCount' parameters type */
export type IGetAchievementsWithCompletionCountParams = void;

/** 'GetAchievementsWithCompletionCount' return type */
export interface IGetAchievementsWithCompletionCountResult {
  completed_count: string | null;
  description: string;
  icon_url: string;
  id: string;
  name: string;
}

/** 'GetAchievementsWithCompletionCount' query type */
export interface IGetAchievementsWithCompletionCountQuery {
  params: IGetAchievementsWithCompletionCountParams;
  result: IGetAchievementsWithCompletionCountResult;
}

const getAchievementsWithCompletionCountIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT\n  ach.id,\n  ach.name,\n  ach.description,\n  ach.icon_url,\n  COALESCE(COUNT(DISTINCT au.delegate_to), 0) AS completed_count\nFROM achievements ach\nLEFT JOIN achievement_unlocks au ON ach.id = au.achievement_id\nGROUP BY ach.id, ach.name, ach.description, ach.icon_url\nORDER BY ach.id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   ach.id,
 *   ach.name,
 *   ach.description,
 *   ach.icon_url,
 *   COALESCE(COUNT(DISTINCT au.delegate_to), 0) AS completed_count
 * FROM achievements ach
 * LEFT JOIN achievement_unlocks au ON ach.id = au.achievement_id
 * GROUP BY ach.id, ach.name, ach.description, ach.icon_url
 * ORDER BY ach.id
 * ```
 */
export const getAchievementsWithCompletionCount = new PreparedQuery<IGetAchievementsWithCompletionCountParams,IGetAchievementsWithCompletionCountResult>(getAchievementsWithCompletionCountIR);


/** 'GetUserAchievementsByResolvedAddress' parameters type */
export interface IGetUserAchievementsByResolvedAddressParams {
  end_date: DateOrString;
  resolved_address: string;
  start_date: DateOrString;
}

/** 'GetUserAchievementsByResolvedAddress' return type */
export interface IGetUserAchievementsByResolvedAddressResult {
  id: string;
}

/** 'GetUserAchievementsByResolvedAddress' query type */
export interface IGetUserAchievementsByResolvedAddressQuery {
  params: IGetUserAchievementsByResolvedAddressParams;
  result: IGetUserAchievementsByResolvedAddressResult;
}

const getUserAchievementsByResolvedAddressIR: any = {"usedParamSet":{"resolved_address":true,"start_date":true,"end_date":true},"params":[{"name":"resolved_address","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":160}]},{"name":"start_date","required":true,"transform":{"type":"scalar"},"locs":[{"a":186,"b":197}]},{"name":"end_date","required":true,"transform":{"type":"scalar"},"locs":[{"a":223,"b":232}]}],"statement":"SELECT DISTINCT au.achievement_id AS id\nFROM achievement_unlocks au\nJOIN achievements ach ON au.achievement_id = ach.id\nWHERE au.delegate_to = :resolved_address!\n  AND au.unlocked_at >= :start_date!\n  AND au.unlocked_at <= :end_date!\nORDER BY au.achievement_id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT au.achievement_id AS id
 * FROM achievement_unlocks au
 * JOIN achievements ach ON au.achievement_id = ach.id
 * WHERE au.delegate_to = :resolved_address!
 *   AND au.unlocked_at >= :start_date!
 *   AND au.unlocked_at <= :end_date!
 * ORDER BY au.achievement_id
 * ```
 */
export const getUserAchievementsByResolvedAddress = new PreparedQuery<IGetUserAchievementsByResolvedAddressParams,IGetUserAchievementsByResolvedAddressResult>(getUserAchievementsByResolvedAddressIR);


/** 'GetUserStatsByResolvedAddress' parameters type */
export interface IGetUserStatsByResolvedAddressParams {
  end_date: DateOrString;
  resolved_address: string;
  start_date: DateOrString;
}

/** 'GetUserStatsByResolvedAddress' return type */
export interface IGetUserStatsByResolvedAddressResult {
  matches_played: number | null;
  rank: string | null;
  score: string | null;
}

/** 'GetUserStatsByResolvedAddress' query type */
export interface IGetUserStatsByResolvedAddressQuery {
  params: IGetUserStatsByResolvedAddressParams;
  result: IGetUserStatsByResolvedAddressResult;
}

const getUserStatsByResolvedAddressIR: any = {"usedParamSet":{"start_date":true,"end_date":true,"resolved_address":true},"params":[{"name":"start_date","required":true,"transform":{"type":"scalar"},"locs":[{"a":562,"b":573}]},{"name":"end_date","required":true,"transform":{"type":"scalar"},"locs":[{"a":599,"b":608}]},{"name":"resolved_address","required":true,"transform":{"type":"scalar"},"locs":[{"a":1030,"b":1047}]}],"statement":"WITH account_resolved AS (\n  SELECT a.id AS account_id, COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address\n  FROM effectstream.accounts a\n  LEFT JOIN delegations d ON d.account_id = a.id\n),\nidentity_balance AS (\n  SELECT ar.resolved_address, COALESCE(SUM(u.balance), 0)::bigint AS total_score\n  FROM account_resolved ar\n  LEFT JOIN user_game_state u ON u.account_id = ar.account_id\n  GROUP BY ar.resolved_address\n),\nmatches_in_range AS (\n  SELECT gm.delegate_to, COUNT(*)::int AS matches_played\n  FROM game_matches gm\n  WHERE gm.played_at >= :start_date!\n    AND gm.played_at <= :end_date!\n  GROUP BY gm.delegate_to\n),\nranked AS (\n  SELECT\n    ib.resolved_address,\n    ib.total_score AS score,\n    COALESCE(mir.matches_played, 0) AS matches_played,\n    RANK() OVER (ORDER BY ib.total_score DESC, ib.resolved_address ASC) AS rank\n  FROM identity_balance ib\n  LEFT JOIN matches_in_range mir ON mir.delegate_to = ib.resolved_address\n)\nSELECT\n  rank,\n  score,\n  matches_played\nFROM ranked\nWHERE resolved_address = :resolved_address!"};

/**
 * Query generated from SQL:
 * ```
 * WITH account_resolved AS (
 *   SELECT a.id AS account_id, COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address
 *   FROM effectstream.accounts a
 *   LEFT JOIN delegations d ON d.account_id = a.id
 * ),
 * identity_balance AS (
 *   SELECT ar.resolved_address, COALESCE(SUM(u.balance), 0)::bigint AS total_score
 *   FROM account_resolved ar
 *   LEFT JOIN user_game_state u ON u.account_id = ar.account_id
 *   GROUP BY ar.resolved_address
 * ),
 * matches_in_range AS (
 *   SELECT gm.delegate_to, COUNT(*)::int AS matches_played
 *   FROM game_matches gm
 *   WHERE gm.played_at >= :start_date!
 *     AND gm.played_at <= :end_date!
 *   GROUP BY gm.delegate_to
 * ),
 * ranked AS (
 *   SELECT
 *     ib.resolved_address,
 *     ib.total_score AS score,
 *     COALESCE(mir.matches_played, 0) AS matches_played,
 *     RANK() OVER (ORDER BY ib.total_score DESC, ib.resolved_address ASC) AS rank
 *   FROM identity_balance ib
 *   LEFT JOIN matches_in_range mir ON mir.delegate_to = ib.resolved_address
 * )
 * SELECT
 *   rank,
 *   score,
 *   matches_played
 * FROM ranked
 * WHERE resolved_address = :resolved_address!
 * ```
 */
export const getUserStatsByResolvedAddress = new PreparedQuery<IGetUserStatsByResolvedAddressParams,IGetUserStatsByResolvedAddressResult>(getUserStatsByResolvedAddressIR);


/** 'GetLeaderboardV1' parameters type */
export interface IGetLeaderboardV1Params {
  end_date: DateOrString;
  limit: NumberOrString;
  offset: NumberOrString;
  start_date: DateOrString;
}

/** 'GetLeaderboardV1' return type */
export interface IGetLeaderboardV1Result {
  achievements_unlocked: string | null;
  address: string | null;
  display_name: string | null;
  player_id: string | null;
  rank: string | null;
  score: string | null;
  total_players: string | null;
}

/** 'GetLeaderboardV1' query type */
export interface IGetLeaderboardV1Query {
  params: IGetLeaderboardV1Params;
  result: IGetLeaderboardV1Result;
}

const getLeaderboardV1IR: any = {"usedParamSet":{"start_date":true,"end_date":true,"limit":true,"offset":true},"params":[{"name":"start_date","required":true,"transform":{"type":"scalar"},"locs":[{"a":538,"b":549}]},{"name":"end_date","required":true,"transform":{"type":"scalar"},"locs":[{"a":575,"b":584}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1916,"b":1922}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":1931,"b":1938}]}],"statement":"WITH account_resolved AS (\n  SELECT a.id AS account_id, COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address\n  FROM effectstream.accounts a\n  LEFT JOIN delegations d ON d.account_id = a.id\n),\nidentity_balance AS (\n  SELECT ar.resolved_address, COALESCE(SUM(u.balance), 0)::bigint AS total_score\n  FROM account_resolved ar\n  LEFT JOIN user_game_state u ON u.account_id = ar.account_id\n  GROUP BY ar.resolved_address\n),\nmatches_in_range AS (\n  SELECT DISTINCT gm.delegate_to\n  FROM game_matches gm\n  WHERE gm.played_at >= :start_date!\n    AND gm.played_at <= :end_date!\n),\nidentity_scores AS (\n  SELECT ib.resolved_address, ib.total_score AS best_score\n  FROM identity_balance ib\n  JOIN matches_in_range mir ON mir.delegate_to = ib.resolved_address\n),\nachievement_counts AS (\n  SELECT\n    delegate_to AS resolved_address,\n    COUNT(DISTINCT achievement_id) AS achievements_unlocked\n  FROM achievement_unlocks\n  GROUP BY delegate_to\n),\ndisplay_names AS (\n  SELECT\n    ar.resolved_address,\n    MIN(ar.account_id) AS any_account_id\n  FROM account_resolved ar\n  GROUP BY ar.resolved_address\n),\nranked AS (\n  SELECT\n    ROW_NUMBER() OVER (ORDER BY iscores.best_score DESC, iscores.resolved_address ASC) AS rank,\n    iscores.resolved_address AS address,\n    (display_names.any_account_id)::TEXT AS player_id,\n    COALESCE(u.name, iscores.resolved_address) AS display_name,\n    iscores.best_score AS score,\n    COALESCE(ac.achievements_unlocked, 0) AS achievements_unlocked\n  FROM identity_scores iscores\n  JOIN display_names ON display_names.resolved_address = iscores.resolved_address\n  LEFT JOIN user_game_state u ON u.account_id = display_names.any_account_id\n  LEFT JOIN achievement_counts ac ON ac.resolved_address = iscores.resolved_address\n)\nSELECT\n  rank,\n  address,\n  player_id,\n  display_name,\n  score,\n  achievements_unlocked,\n  COUNT(*) OVER () AS total_players\nFROM ranked\nORDER BY rank\nLIMIT :limit! OFFSET :offset!"};

/**
 * Query generated from SQL:
 * ```
 * WITH account_resolved AS (
 *   SELECT a.id AS account_id, COALESCE(d.delegate_to_address, a.primary_address) AS resolved_address
 *   FROM effectstream.accounts a
 *   LEFT JOIN delegations d ON d.account_id = a.id
 * ),
 * identity_balance AS (
 *   SELECT ar.resolved_address, COALESCE(SUM(u.balance), 0)::bigint AS total_score
 *   FROM account_resolved ar
 *   LEFT JOIN user_game_state u ON u.account_id = ar.account_id
 *   GROUP BY ar.resolved_address
 * ),
 * matches_in_range AS (
 *   SELECT DISTINCT gm.delegate_to
 *   FROM game_matches gm
 *   WHERE gm.played_at >= :start_date!
 *     AND gm.played_at <= :end_date!
 * ),
 * identity_scores AS (
 *   SELECT ib.resolved_address, ib.total_score AS best_score
 *   FROM identity_balance ib
 *   JOIN matches_in_range mir ON mir.delegate_to = ib.resolved_address
 * ),
 * achievement_counts AS (
 *   SELECT
 *     delegate_to AS resolved_address,
 *     COUNT(DISTINCT achievement_id) AS achievements_unlocked
 *   FROM achievement_unlocks
 *   GROUP BY delegate_to
 * ),
 * display_names AS (
 *   SELECT
 *     ar.resolved_address,
 *     MIN(ar.account_id) AS any_account_id
 *   FROM account_resolved ar
 *   GROUP BY ar.resolved_address
 * ),
 * ranked AS (
 *   SELECT
 *     ROW_NUMBER() OVER (ORDER BY iscores.best_score DESC, iscores.resolved_address ASC) AS rank,
 *     iscores.resolved_address AS address,
 *     (display_names.any_account_id)::TEXT AS player_id,
 *     COALESCE(u.name, iscores.resolved_address) AS display_name,
 *     iscores.best_score AS score,
 *     COALESCE(ac.achievements_unlocked, 0) AS achievements_unlocked
 *   FROM identity_scores iscores
 *   JOIN display_names ON display_names.resolved_address = iscores.resolved_address
 *   LEFT JOIN user_game_state u ON u.account_id = display_names.any_account_id
 *   LEFT JOIN achievement_counts ac ON ac.resolved_address = iscores.resolved_address
 * )
 * SELECT
 *   rank,
 *   address,
 *   player_id,
 *   display_name,
 *   score,
 *   achievements_unlocked,
 *   COUNT(*) OVER () AS total_players
 * FROM ranked
 * ORDER BY rank
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getLeaderboardV1 = new PreparedQuery<IGetLeaderboardV1Params,IGetLeaderboardV1Result>(getLeaderboardV1IR);


/** 'GetLeaderboardTotalPlayers' parameters type */
export interface IGetLeaderboardTotalPlayersParams {
  end_date?: DateOrString | null | void;
  start_date?: DateOrString | null | void;
}

/** 'GetLeaderboardTotalPlayers' return type */
export interface IGetLeaderboardTotalPlayersResult {
  total_players: number | null;
}

/** 'GetLeaderboardTotalPlayers' query type */
export interface IGetLeaderboardTotalPlayersQuery {
  params: IGetLeaderboardTotalPlayersParams;
  result: IGetLeaderboardTotalPlayersResult;
}

const getLeaderboardTotalPlayersIR: any = {"usedParamSet":{"start_date":true,"end_date":true},"params":[{"name":"start_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":103,"b":113}]},{"name":"end_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":184,"b":192}]}],"statement":"SELECT COUNT(DISTINCT delegate_to)::int AS total_players\nFROM game_matches\nWHERE played_at >= COALESCE(:start_date::timestamptz, NOW() - INTERVAL '1 year')\n  AND played_at <= COALESCE(:end_date::timestamptz, NOW())"};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(DISTINCT delegate_to)::int AS total_players
 * FROM game_matches
 * WHERE played_at >= COALESCE(:start_date::timestamptz, NOW() - INTERVAL '1 year')
 *   AND played_at <= COALESCE(:end_date::timestamptz, NOW())
 * ```
 */
export const getLeaderboardTotalPlayers = new PreparedQuery<IGetLeaderboardTotalPlayersParams,IGetLeaderboardTotalPlayersResult>(getLeaderboardTotalPlayersIR);


/** 'GetLeaderboardEntries' parameters type */
export interface IGetLeaderboardEntriesParams {
  end_date?: DateOrString | null | void;
  limit: NumberOrString;
  offset: NumberOrString;
  start_date?: DateOrString | null | void;
}

/** 'GetLeaderboardEntries' return type */
export interface IGetLeaderboardEntriesResult {
  achievements_unlocked: number | null;
  address: string;
  display_name: string | null;
  player_id: string | null;
  rank: number | null;
  score: number | null;
}

/** 'GetLeaderboardEntries' query type */
export interface IGetLeaderboardEntriesQuery {
  params: IGetLeaderboardEntriesParams;
  result: IGetLeaderboardEntriesResult;
}

const getLeaderboardEntriesIR: any = {"usedParamSet":{"start_date":true,"end_date":true,"limit":true,"offset":true},"params":[{"name":"start_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":149,"b":159}]},{"name":"end_date","required":false,"transform":{"type":"scalar"},"locs":[{"a":232,"b":240}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":809,"b":815}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":824,"b":831}]}],"statement":"WITH best_scores AS (\n  SELECT delegate_to, SUM(score) AS score, MIN(account_id) AS any_account_id\n  FROM game_matches\n  WHERE played_at >= COALESCE(:start_date::timestamptz, NOW() - INTERVAL '1 year')\n    AND played_at <= COALESCE(:end_date::timestamptz, NOW())\n  GROUP BY delegate_to\n),\nranked AS (\n  SELECT delegate_to, score, any_account_id, ROW_NUMBER() OVER (ORDER BY score DESC)::int AS rank\n  FROM best_scores\n)\nSELECT\n  r.rank,\n  r.delegate_to AS address,\n  ('user_' || r.any_account_id::text) AS player_id,\n  u.name AS display_name,\n  r.score,\n  (\n    SELECT COUNT(DISTINCT au.achievement_id)::int\n    FROM achievement_unlocks au\n    WHERE au.delegate_to = r.delegate_to\n  ) AS achievements_unlocked\nFROM ranked r\nLEFT JOIN user_game_state u ON u.account_id = r.any_account_id\nORDER BY r.rank\nLIMIT :limit! OFFSET :offset!"};

/**
 * Query generated from SQL:
 * ```
 * WITH best_scores AS (
 *   SELECT delegate_to, SUM(score) AS score, MIN(account_id) AS any_account_id
 *   FROM game_matches
 *   WHERE played_at >= COALESCE(:start_date::timestamptz, NOW() - INTERVAL '1 year')
 *     AND played_at <= COALESCE(:end_date::timestamptz, NOW())
 *   GROUP BY delegate_to
 * ),
 * ranked AS (
 *   SELECT delegate_to, score, any_account_id, ROW_NUMBER() OVER (ORDER BY score DESC)::int AS rank
 *   FROM best_scores
 * )
 * SELECT
 *   r.rank,
 *   r.delegate_to AS address,
 *   ('user_' || r.any_account_id::text) AS player_id,
 *   u.name AS display_name,
 *   r.score,
 *   (
 *     SELECT COUNT(DISTINCT au.achievement_id)::int
 *     FROM achievement_unlocks au
 *     WHERE au.delegate_to = r.delegate_to
 *   ) AS achievements_unlocked
 * FROM ranked r
 * LEFT JOIN user_game_state u ON u.account_id = r.any_account_id
 * ORDER BY r.rank
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getLeaderboardEntries = new PreparedQuery<IGetLeaderboardEntriesParams,IGetLeaderboardEntriesResult>(getLeaderboardEntriesIR);


