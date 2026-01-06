/** Types generated for queries found in "src/sql/game-queries.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'UpdateAccountBalance' parameters type */
export interface IUpdateAccountBalanceParams {
  account_id: number;
  amount: number;
}

/** 'UpdateAccountBalance' return type */
export type IUpdateAccountBalanceResult = void;

/** 'UpdateAccountBalance' query type */
export interface IUpdateAccountBalanceQuery {
  params: IUpdateAccountBalanceParams;
  result: IUpdateAccountBalanceResult;
}

const updateAccountBalanceIR: any = {"usedParamSet":{"account_id":true,"amount":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":84}]},{"name":"amount","required":true,"transform":{"type":"scalar"},"locs":[{"a":87,"b":94},{"a":179,"b":186}]}],"statement":"INSERT INTO user_game_state (account_id, balance, last_login_at)\nVALUES (:account_id!, :amount!, NOW())\nON CONFLICT (account_id) DO UPDATE\nSET balance = user_game_state.balance + :amount!,\n    last_login_at = NOW()"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO user_game_state (account_id, balance, last_login_at)
 * VALUES (:account_id!, :amount!, NOW())
 * ON CONFLICT (account_id) DO UPDATE
 * SET balance = user_game_state.balance + :amount!,
 *     last_login_at = NOW()
 * ```
 */
export const updateAccountBalance = new PreparedQuery<IUpdateAccountBalanceParams,IUpdateAccountBalanceResult>(updateAccountBalanceIR);


/** 'UpsertGameState' parameters type */
export interface IUpsertGameStateParams {
  account_id: number;
  race_hash: string;
  race_in_progress: boolean;
}

/** 'UpsertGameState' return type */
export type IUpsertGameStateResult = void;

/** 'UpsertGameState' query type */
export interface IUpsertGameStateQuery {
  params: IUpsertGameStateParams;
  result: IUpsertGameStateResult;
}

const upsertGameStateIR: any = {"usedParamSet":{"account_id":true,"race_hash":true,"race_in_progress":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":101,"b":112}]},{"name":"race_hash","required":true,"transform":{"type":"scalar"},"locs":[{"a":115,"b":125},{"a":210,"b":220}]},{"name":"race_in_progress","required":true,"transform":{"type":"scalar"},"locs":[{"a":128,"b":145},{"a":246,"b":263}]}],"statement":"INSERT INTO user_game_state (account_id, race_hash, race_in_progress, games_lost, games_won)\nVALUES (:account_id!, :race_hash!, :race_in_progress!, 0, 0)\nON CONFLICT (account_id) DO UPDATE\nSET \n    race_hash = :race_hash!,\n    race_in_progress = :race_in_progress!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO user_game_state (account_id, race_hash, race_in_progress, games_lost, games_won)
 * VALUES (:account_id!, :race_hash!, :race_in_progress!, 0, 0)
 * ON CONFLICT (account_id) DO UPDATE
 * SET 
 *     race_hash = :race_hash!,
 *     race_in_progress = :race_in_progress!
 * ```
 */
export const upsertGameState = new PreparedQuery<IUpsertGameStateParams,IUpsertGameStateResult>(upsertGameStateIR);


/** 'UpdateGameStatus' parameters type */
export interface IUpdateGameStatusParams {
  account_id: number;
  race_in_progress: boolean;
}

/** 'UpdateGameStatus' return type */
export type IUpdateGameStatusResult = void;

/** 'UpdateGameStatus' query type */
export interface IUpdateGameStatusQuery {
  params: IUpdateGameStatusParams;
  result: IUpdateGameStatusResult;
}

const updateGameStatusIR: any = {"usedParamSet":{"race_in_progress":true,"account_id":true},"params":[{"name":"race_in_progress","required":true,"transform":{"type":"scalar"},"locs":[{"a":46,"b":63}]},{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":84,"b":95}]}],"statement":"UPDATE user_game_state\nSET race_in_progress = :race_in_progress!\nWHERE account_id = :account_id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE user_game_state
 * SET race_in_progress = :race_in_progress!
 * WHERE account_id = :account_id!
 * ```
 */
export const updateGameStatus = new PreparedQuery<IUpdateGameStatusParams,IUpdateGameStatusResult>(updateGameStatusIR);


/** 'IncrementGamesLost' parameters type */
export interface IIncrementGamesLostParams {
  account_id: number;
}

/** 'IncrementGamesLost' return type */
export type IIncrementGamesLostResult = void;

/** 'IncrementGamesLost' query type */
export interface IIncrementGamesLostQuery {
  params: IIncrementGamesLostParams;
  result: IIncrementGamesLostResult;
}

const incrementGamesLostIR: any = {"usedParamSet":{"account_id":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":100,"b":111}]}],"statement":"UPDATE user_game_state\nSET games_lost = games_lost + 1, race_in_progress = FALSE\nWHERE account_id = :account_id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE user_game_state
 * SET games_lost = games_lost + 1, race_in_progress = FALSE
 * WHERE account_id = :account_id!
 * ```
 */
export const incrementGamesLost = new PreparedQuery<IIncrementGamesLostParams,IIncrementGamesLostResult>(incrementGamesLostIR);


/** 'GetGameState' parameters type */
export interface IGetGameStateParams {
  account_id: number;
}

/** 'GetGameState' return type */
export interface IGetGameStateResult {
  account_id: number;
  balance: number | null;
  car_stat1: number | null;
  car_stat2: number | null;
  car_stat3: number | null;
  car_stat4: number | null;
  car_stat5: number | null;
  games_lost: number | null;
  games_won: number | null;
  last_login_at: Date | null;
  name: string | null;
  race_hash: string | null;
  race_in_progress: boolean | null;
  race_items: string | null;
}

/** 'GetGameState' query type */
export interface IGetGameStateQuery {
  params: IGetGameStateParams;
  result: IGetGameStateResult;
}

const getGameStateIR: any = {"usedParamSet":{"account_id":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":49,"b":60}]}],"statement":"SELECT * FROM user_game_state WHERE account_id = :account_id!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM user_game_state WHERE account_id = :account_id!
 * ```
 */
export const getGameState = new PreparedQuery<IGetGameStateParams,IGetGameStateResult>(getGameStateIR);


/** 'IsRaceInProgress' parameters type */
export interface IIsRaceInProgressParams {
  account_id: number;
}

/** 'IsRaceInProgress' return type */
export interface IIsRaceInProgressResult {
  race_in_progress: boolean | null;
}

/** 'IsRaceInProgress' query type */
export interface IIsRaceInProgressQuery {
  params: IIsRaceInProgressParams;
  result: IIsRaceInProgressResult;
}

const isRaceInProgressIR: any = {"usedParamSet":{"account_id":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":76}]}],"statement":"SELECT race_in_progress FROM user_game_state \nWHERE account_id = :account_id!\nAND race_in_progress = TRUE"};

/**
 * Query generated from SQL:
 * ```
 * SELECT race_in_progress FROM user_game_state 
 * WHERE account_id = :account_id!
 * AND race_in_progress = TRUE
 * ```
 */
export const isRaceInProgress = new PreparedQuery<IIsRaceInProgressParams,IIsRaceInProgressResult>(isRaceInProgressIR);


/** 'CreateRace' parameters type */
export interface ICreateRaceParams {
  account_id: number;
  car_stat1: number;
  car_stat2: number;
  car_stat3: number;
  car_stat4: number;
  car_stat5: number;
  race_hash: string;
  race_items: string;
}

/** 'CreateRace' return type */
export type ICreateRaceResult = void;

/** 'CreateRace' query type */
export interface ICreateRaceQuery {
  params: ICreateRaceParams;
  result: ICreateRaceResult;
}

const createRaceIR: any = {"usedParamSet":{"account_id":true,"race_hash":true,"car_stat1":true,"car_stat2":true,"car_stat3":true,"car_stat4":true,"car_stat5":true,"race_items":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":176,"b":187}]},{"name":"race_hash","required":true,"transform":{"type":"scalar"},"locs":[{"a":200,"b":210},{"a":385,"b":395}]},{"name":"car_stat1","required":true,"transform":{"type":"scalar"},"locs":[{"a":215,"b":225},{"a":414,"b":424}]},{"name":"car_stat2","required":true,"transform":{"type":"scalar"},"locs":[{"a":230,"b":240},{"a":443,"b":453}]},{"name":"car_stat3","required":true,"transform":{"type":"scalar"},"locs":[{"a":245,"b":255},{"a":472,"b":482}]},{"name":"car_stat4","required":true,"transform":{"type":"scalar"},"locs":[{"a":260,"b":270},{"a":501,"b":511}]},{"name":"car_stat5","required":true,"transform":{"type":"scalar"},"locs":[{"a":275,"b":285},{"a":530,"b":540}]},{"name":"race_items","required":true,"transform":{"type":"scalar"},"locs":[{"a":290,"b":301},{"a":560,"b":571}]}],"statement":"INSERT INTO user_game_state (\n  account_id, \n  race_in_progress, \n  race_hash, \n  car_stat1, \n  car_stat2, \n  car_stat3, \n  car_stat4, \n  car_stat5, \n  race_items\n)\nVALUES (\n  :account_id!,\n  TRUE,\n  :race_hash!,\n  :car_stat1!,\n  :car_stat2!,\n  :car_stat3!,\n  :car_stat4!,\n  :car_stat5!,\n  :race_items!\n)\nON CONFLICT (account_id) DO UPDATE\nSET race_in_progress = TRUE,\n    race_hash = :race_hash!,\n    car_stat1 = :car_stat1!,\n    car_stat2 = :car_stat2!,\n    car_stat3 = :car_stat3!,\n    car_stat4 = :car_stat4!,\n    car_stat5 = :car_stat5!,\n    race_items = :race_items!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO user_game_state (
 *   account_id, 
 *   race_in_progress, 
 *   race_hash, 
 *   car_stat1, 
 *   car_stat2, 
 *   car_stat3, 
 *   car_stat4, 
 *   car_stat5, 
 *   race_items
 * )
 * VALUES (
 *   :account_id!,
 *   TRUE,
 *   :race_hash!,
 *   :car_stat1!,
 *   :car_stat2!,
 *   :car_stat3!,
 *   :car_stat4!,
 *   :car_stat5!,
 *   :race_items!
 * )
 * ON CONFLICT (account_id) DO UPDATE
 * SET race_in_progress = TRUE,
 *     race_hash = :race_hash!,
 *     car_stat1 = :car_stat1!,
 *     car_stat2 = :car_stat2!,
 *     car_stat3 = :car_stat3!,
 *     car_stat4 = :car_stat4!,
 *     car_stat5 = :car_stat5!,
 *     race_items = :race_items!
 * ```
 */
export const createRace = new PreparedQuery<ICreateRaceParams,ICreateRaceResult>(createRaceIR);


/** 'CompleteRace' parameters type */
export interface ICompleteRaceParams {
  account_id: number;
  score: number;
}

/** 'CompleteRace' return type */
export type ICompleteRaceResult = void;

/** 'CompleteRace' query type */
export interface ICompleteRaceQuery {
  params: ICompleteRaceParams;
  result: ICompleteRaceResult;
}

const completeRaceIR: any = {"usedParamSet":{"score":true,"account_id":true},"params":[{"name":"score","required":true,"transform":{"type":"scalar"},"locs":[{"a":77,"b":83}]},{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":146}]}],"statement":"UPDATE user_game_state\nSET race_in_progress = FALSE,\n    balance = balance + :score!,\n    games_won = games_won + 1\nWHERE account_id = :account_id!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE user_game_state
 * SET race_in_progress = FALSE,
 *     balance = balance + :score!,
 *     games_won = games_won + 1
 * WHERE account_id = :account_id!
 * ```
 */
export const completeRace = new PreparedQuery<ICompleteRaceParams,ICompleteRaceResult>(completeRaceIR);


/** 'InsertCar' parameters type */
export interface IInsertCarParams {
  account_id: number;
  car_stat1: number;
  car_stat2: number;
  car_stat3: number;
  car_stat4: number;
  car_stat5: number;
  name: string;
  race_items: string;
}

/** 'InsertCar' return type */
export type IInsertCarResult = void;

/** 'InsertCar' query type */
export interface IInsertCarQuery {
  params: IInsertCarParams;
  result: IInsertCarResult;
}

const insertCarIR: any = {"usedParamSet":{"account_id":true,"name":true,"car_stat1":true,"car_stat2":true,"car_stat3":true,"car_stat4":true,"car_stat5":true,"race_items":true},"params":[{"name":"account_id","required":true,"transform":{"type":"scalar"},"locs":[{"a":120,"b":131}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":134,"b":139},{"a":267,"b":272}]},{"name":"car_stat1","required":true,"transform":{"type":"scalar"},"locs":[{"a":142,"b":152},{"a":291,"b":301}]},{"name":"car_stat2","required":true,"transform":{"type":"scalar"},"locs":[{"a":155,"b":165},{"a":320,"b":330}]},{"name":"car_stat3","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":178},{"a":349,"b":359}]},{"name":"car_stat4","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":191},{"a":378,"b":388}]},{"name":"car_stat5","required":true,"transform":{"type":"scalar"},"locs":[{"a":194,"b":204},{"a":407,"b":417}]},{"name":"race_items","required":true,"transform":{"type":"scalar"},"locs":[{"a":207,"b":218},{"a":437,"b":448}]}],"statement":"INSERT INTO last_user_car (account_id, name, car_stat1, car_stat2, car_stat3, car_stat4, car_stat5, race_items)\nVALUES (:account_id!, :name!, :car_stat1!, :car_stat2!, :car_stat3!, :car_stat4!, :car_stat5!, :race_items!)\nON CONFLICT (account_id) DO UPDATE\nSET name = :name!,\n    car_stat1 = :car_stat1!,\n    car_stat2 = :car_stat2!,\n    car_stat3 = :car_stat3!,\n    car_stat4 = :car_stat4!,\n    car_stat5 = :car_stat5!,\n    race_items = :race_items!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO last_user_car (account_id, name, car_stat1, car_stat2, car_stat3, car_stat4, car_stat5, race_items)
 * VALUES (:account_id!, :name!, :car_stat1!, :car_stat2!, :car_stat3!, :car_stat4!, :car_stat5!, :race_items!)
 * ON CONFLICT (account_id) DO UPDATE
 * SET name = :name!,
 *     car_stat1 = :car_stat1!,
 *     car_stat2 = :car_stat2!,
 *     car_stat3 = :car_stat3!,
 *     car_stat4 = :car_stat4!,
 *     car_stat5 = :car_stat5!,
 *     race_items = :race_items!
 * ```
 */
export const insertCar = new PreparedQuery<IInsertCarParams,IInsertCarResult>(insertCarIR);


