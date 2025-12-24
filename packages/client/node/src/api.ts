import type { Pool } from "pg";
import type { StartConfigApiRouter } from "@paimaexample/runtime";
import type fastify from "fastify";
import { apiCommon } from "./api.common.ts";
import { apiGame } from "./api.game.ts";
/**
 * Example for User Defined API Routes.
 * Register custom endpoints here.
 * @param server - The Fastify instance.
 * @param dbConn - The database connection.
 */
export const apiRouter: StartConfigApiRouter = async function (
  server: fastify.FastifyInstance,
  dbConn: Pool,
): Promise<void> {
  // await Promise.resolve();
  await apiCommon(server, dbConn);
  await apiGame(server, dbConn);
};
