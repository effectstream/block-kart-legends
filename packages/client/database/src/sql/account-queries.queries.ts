/** Types generated for queries found in "src/sql/account-queries.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

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


/** 'GetAddressByAddress' parameters type */
export interface IGetAddressByAddressParams {
  address: string;
}

/** 'GetAddressByAddress' return type */
export interface IGetAddressByAddressResult {
  account_id: number | null;
  address: string;
  address_type: number;
}

/** 'GetAddressByAddress' query type */
export interface IGetAddressByAddressQuery {
  params: IGetAddressByAddressParams;
  result: IGetAddressByAddressResult;
}

const getAddressByAddressIR: any = {"usedParamSet":{"address":true},"params":[{"name":"address","required":true,"transform":{"type":"scalar"},"locs":[{"a":53,"b":61}]}],"statement":"SELECT * FROM effectstream.addresses WHERE address = :address!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM effectstream.addresses WHERE address = :address!
 * ```
 */
export const getAddressByAddress = new PreparedQuery<IGetAddressByAddressParams,IGetAddressByAddressResult>(getAddressByAddressIR);


/** 'GetAccountById' parameters type */
export interface IGetAccountByIdParams {
  id: number;
}

/** 'GetAccountById' return type */
export interface IGetAccountByIdResult {
  id: number;
  primary_address: string | null;
}

/** 'GetAccountById' query type */
export interface IGetAccountByIdQuery {
  params: IGetAccountByIdParams;
  result: IGetAccountByIdResult;
}

const getAccountByIdIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":47,"b":50}]}],"statement":"SELECT * FROM effectstream.accounts WHERE id = :id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM effectstream.accounts WHERE id = :id!
 * ```
 */
export const getAccountById = new PreparedQuery<IGetAccountByIdParams,IGetAccountByIdResult>(getAccountByIdIR);


/** 'GetAddressesByAccountId' parameters type */
export interface IGetAddressesByAccountIdParams {
  account_id: number;
}

/** 'GetAddressesByAccountId' return type */
export interface IGetAddressesByAccountIdResult {
  account_id: number | null;
  address: string;
  address_type: number;
}

/** 'GetAddressesByAccountId' query type */
export interface IGetAddressesByAccountIdQuery {
  params: IGetAddressesByAccountIdParams;
  result: IGetAddressesByAccountIdResult;
}

const getAddressesByAccountIdIR: any = {"usedParamSet":{"account_id":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":56,"b":67}]}],"statement":"SELECT * FROM effectstream.addresses WHERE account_id = :account_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM effectstream.addresses WHERE account_id = :account_id!
 * ```
 */
export const getAddressesByAccountId = new PreparedQuery<IGetAddressesByAccountIdParams,IGetAddressesByAccountIdResult>(getAddressesByAccountIdIR);


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


