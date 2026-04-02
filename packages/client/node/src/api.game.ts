import { type Static, Type } from "@sinclair/typebox";
import { runPreparedQuery } from "@paimaexample/db";
import {
  getAccountProfile,
  getGameState,
  getResolvedIdentityByAddress,
} from "@kart-legends/database";
import type { Pool } from "pg";
import type fastify from "fastify";

export const apiGame = async (
  server: fastify.FastifyInstance,
  dbConn: Pool
): Promise<void> => {
  // Game State Endpoint
  const GameStateResponseSchema = Type.Object({
    race_in_progress: Type.Boolean(),
    race_hash: Type.Union([Type.String(), Type.Null()]),
    balance: Type.Number(),
    car_stats: Type.Optional(Type.Array(Type.Number())),
    race_items: Type.Optional(Type.Array(Type.Union([Type.String(), Type.Null()]))),
  });

  // User Profile Endpoint
  const UserProfileParamsSchema = Type.Object({
    walletAddress: Type.String(),
  });

  server.get<{
    Params: Static<typeof UserProfileParamsSchema>;
    Reply: Static<typeof GameStateResponseSchema> | { error: string };
  }>("/api/gamestate/:walletAddress", async (request, reply) => {
    const { walletAddress } = request.params;

    // Resolve address to account (delegation-aware)
    const [identity] = await runPreparedQuery(
      getResolvedIdentityByAddress.run({ address: walletAddress }, dbConn),
      "getResolvedIdentityByAddress"
    );

    if (!identity || !identity.account_id) {
      reply.code(404).send({ error: "Account not found" });
      return;
    }

    const [gameState] = await runPreparedQuery(
      getGameState.run({ account_id: identity.account_id }, dbConn),
      "getGameState"
    );

    if (!gameState) {
      // Default state if not started
      reply.send({
        balance: 0,
        race_in_progress: false,
        race_hash: null,
        car_stats: undefined,
        race_items: undefined,
      });
      return;
    }

    // Parse race items JSON if present
    let raceItems: (string | null)[] | undefined = undefined;
    if (gameState.race_items) {
      try {
        raceItems = JSON.parse(gameState.race_items);
      } catch (e) {
        console.error("Failed to parse race_items JSON", e);
      }
    }

    // Build car stats array if present
    const carStats = gameState.car_stat1 !== null && gameState.car_stat1 !== undefined
      ? [
        gameState.car_stat1 ?? 0,
        gameState.car_stat2 ?? 0,
        gameState.car_stat3 ?? 0,
        gameState.car_stat4 ?? 0,
        gameState.car_stat5 ?? 0,
      ]
      : undefined;

    reply.send({
      race_in_progress: gameState.race_in_progress ?? false,
      race_hash: gameState.race_hash ?? null,
      balance: gameState.balance ?? 0,
      car_stats: carStats,
      race_items: raceItems,
    });
  });

  const UserProfileResponseSchema = Type.Object({
    accountId: Type.Number(),
    balance: Type.Number(),
    lastLogin: Type.Number(),
    name: Type.Optional(Type.String()),
  });

  server.get<{
    Params: Static<typeof UserProfileParamsSchema>;
    Reply: Static<typeof UserProfileResponseSchema>;
  }>("/api/user/:walletAddress", async (request, reply) => {
    const { walletAddress } = request.params;

    // Resolve address to account (delegation-aware)
    const [identity] = await runPreparedQuery(
      getResolvedIdentityByAddress.run({ address: walletAddress }, dbConn),
      "getResolvedIdentityByAddress"
    );

    if (!identity || !identity.account_id) {
      // New user or no account yet
      reply.send({
        accountId: 0,
        balance: 0,
        lastLogin: Date.now(),
        name: undefined,
      });
      return;
    }

    const [profile] = await runPreparedQuery(
      getAccountProfile.run({ account_id: identity.account_id }, dbConn),
      "getAccountProfile"
    );

    if (!profile) {
      reply.send({
        accountId: 0,
        balance: 0,
        lastLogin: Date.now(),
        name: undefined,
      });
      return;
    }

    let name = profile.username;
    // Detect raw wallet addresses (EVM 0x… or Midnight mn_…) and don't
    // treat them as a real player name — return undefined so the frontend
    // can show an appropriate fallback.
    const looksLikeAddress = name && (
      /^0x[0-9a-fA-F]{40}$/.test(name) ||
      name.startsWith("mn_")
    );
    if (looksLikeAddress) {
      name = undefined;
    }

    reply.send({
      accountId: identity.account_id,
      balance: profile.balance ?? 0,
      lastLogin: profile.last_login_at
        ? new Date(profile.last_login_at).getTime()
        : Date.now(),
      name: name || undefined,
    });
  });
};
