import { type Static, Type } from "@sinclair/typebox";
import { runPreparedQuery } from "@paimaexample/db";
import {
  getAchievementsWithCompletionCount,
  getGameMetadata,
  getLeaderboardV1,
  getResolvedAddressByAccountId,
  getResolvedIdentityByAddress,
  getUserAchievementsByResolvedAddress,
  getUserStatsByResolvedAddress,
} from "@kart-legends/database";
import type { Pool } from "pg";
import type fastify from "fastify";

export const apiCommon = async (
  server: fastify.FastifyInstance,
  dbConn: Pool
): Promise<void> => {
  // Ensure this function is truly async for linting purposes
  await Promise.resolve();

  // === Spec: GET /v1/game/info ===
  const AchievementInfoSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    description: Type.String(),
    icon_url: Type.String(),
    completed_count: Type.Number(),
  });

  const GameInfoResponseSchema = Type.Object({
    name: Type.String(),
    description: Type.String(),
    score_unit: Type.String(),
    sort_order: Type.String(),
    achievements: Type.Array(AchievementInfoSchema),
  });

  server.get<{
    Reply: Static<typeof GameInfoResponseSchema>;
  }>("/v1/game/info", async (_request, reply) => {
    const [meta] = await runPreparedQuery(
      getGameMetadata.run(void 0, dbConn),
      "getGameMetadata"
    );

    const achievements = await runPreparedQuery(
      getAchievementsWithCompletionCount.run(void 0, dbConn),
      "getAchievementsWithCompletionCount"
    );

    reply.send({
      name: meta?.name ?? "Unknown Game",
      description: meta?.description ?? "",
      score_unit: meta?.score_unit ?? "Points",
      sort_order: meta?.sort_order ?? "DESC",
      achievements: achievements.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon_url: a.icon_url,
        completed_count: Number(a.completed_count ?? "0"),
      })),
    });
  });

  // === Spec: GET /v1/game/leaderboard ===
  const LeaderboardQuerySchema = Type.Object({
    start_date: Type.Optional(Type.String()),
    end_date: Type.Optional(Type.String()),
    limit: Type.Optional(Type.Number()),
    offset: Type.Optional(Type.Number()),
  });

  const LeaderboardEntrySchema = Type.Object({
    rank: Type.Number(),
    address: Type.String(),
    player_id: Type.String(),
    display_name: Type.Union([Type.String(), Type.Null()]),
    score: Type.Number(),
    achievements_unlocked: Type.Number(),
  });

  const GameLeaderboardResponseSchema = Type.Object({
    start_date: Type.String(),
    end_date: Type.String(),
    total_players: Type.Number(),
    entries: Type.Array(LeaderboardEntrySchema),
  });

  server.get<{
    Querystring: Static<typeof LeaderboardQuerySchema>;
    Reply: Static<typeof GameLeaderboardResponseSchema>;
  }>("/v1/game/leaderboard", async (request, reply) => {
    const { start_date, end_date, limit, offset } = request.query;

    const now = new Date();
    const end = end_date ? new Date(end_date) : now;
    const start = start_date
      ? new Date(start_date)
      : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);

    const safeLimit =
      typeof limit === "number" && limit > 0
        ? Math.min(limit, 1000)
        : 50;
    const safeOffset = typeof offset === "number" && offset >= 0 ? offset : 0;

    const rows = await runPreparedQuery(
      getLeaderboardV1.run(
        {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          limit: safeLimit,
          offset: safeOffset,
        },
        dbConn
      ),
      "getLeaderboardV1"
    );

    const totalPlayers =
      rows.length > 0 ? Number(rows[0].total_players ?? "0") : 0;

    reply.send({
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      total_players: totalPlayers,
      entries: rows.map((r) => ({
        rank: Number(r.rank ?? "0"),
        address: r.address ?? "",
        player_id: r.player_id ?? "",
        display_name: r.display_name,
        score: Number(r.score ?? 0),
        achievements_unlocked: Number(r.achievements_unlocked ?? "0"),
      })),
    });
  });

  // === Spec: GET /v1/game/users/{address} ===
  const UserProfileParamsSchema = Type.Object({
    address: Type.String(),
  });

  const UserProfileQuerySchema = Type.Object({
    start_date: Type.Optional(Type.String()),
    end_date: Type.Optional(Type.String()),
  });

  const IdentitySchema = Type.Object({
    queried_address: Type.String(),
    resolved_address: Type.String(),
    is_delegate: Type.Boolean(),
    display_name: Type.Union([Type.String(), Type.Null()]),
  });

  const StatsSchema = Type.Object({
    rank: Type.Union([Type.Number(), Type.Null()]),
    score: Type.Number(),
    matches_played: Type.Number(),
  });

  const UserProfileResponseSchema = Type.Object({
    identity: IdentitySchema,
    stats: StatsSchema,
    achievements: Type.Array(Type.String()),
    start_date: Type.String(),
    end_date: Type.String(),
  });

  server.get<{
    Params: Static<typeof UserProfileParamsSchema>;
    Querystring: Static<typeof UserProfileQuerySchema>;
    Reply: Static<typeof UserProfileResponseSchema> | { error: string };
  }>("/v1/game/users/:address", async (request, reply) => {
    const { address } = request.params;
    const { start_date, end_date } = request.query;

    // Resolve identity
    const [identityRow] = await runPreparedQuery(
      getResolvedIdentityByAddress.run({ address }, dbConn),
      "getResolvedIdentityByAddress"
    );

    if (!identityRow) {
      reply.code(404).send({ error: "Address not found" });
      return;
    }

    const resolvedAddress =
      identityRow.resolved_address ?? identityRow.queried_address;

    // Achievements timeframe (spec query params)
    const now = new Date();
    const achievementsEnd = end_date ? new Date(end_date) : now;
    const achievementsStart = start_date
      ? new Date(start_date)
      : new Date(achievementsEnd.getTime() - 365 * 24 * 60 * 60 * 1000);

    const achievementsRows = await runPreparedQuery(
      getUserAchievementsByResolvedAddress.run(
        {
          resolved_address: resolvedAddress,
          start_date: achievementsStart.toISOString(),
          end_date: achievementsEnd.toISOString(),
        },
        dbConn
      ),
      "getUserAchievementsByResolvedAddress"
    );

    // Stats are "all-time best"; use a very wide window
    const statsRows = await runPreparedQuery(
      getUserStatsByResolvedAddress.run(
        {
          resolved_address: resolvedAddress,
          start_date: new Date(0).toISOString(),
          end_date: new Date("9999-12-31T23:59:59.999Z").toISOString(),
        },
        dbConn
      ),
      "getUserStatsByResolvedAddress"
    );

    const statsRow = statsRows[0];

    reply.send({
      identity: {
        queried_address: identityRow.queried_address,
        resolved_address: resolvedAddress,
        is_delegate: Boolean(identityRow.is_delegate),
        display_name: identityRow.display_name,
      },
      stats: {
        rank: statsRow && statsRow.rank != null ? Number(statsRow.rank) : null,
        score: statsRow && statsRow.score != null ? Number(statsRow.score) : 0,
        matches_played:
          statsRow && statsRow.matches_played != null
            ? Number(statsRow.matches_played)
            : 0,
      },
      achievements: achievementsRows.map((a) => a.id),
      start_date: achievementsStart.toISOString(),
      end_date: achievementsEnd.toISOString(),
    });
  });

  // Account Addresses Endpoint (delegation-aware: single resolved address)
  const AccountParamsSchema = Type.Object({
    id: Type.Number(),
  });

  const AccountAddressesResponseSchema = Type.Array(
    Type.Object({
      address: Type.String(),
      address_type: Type.Number(),
      account_id: Type.Union([Type.Number(), Type.Null()]),
    })
  );

  server.get<{
    Params: Static<typeof AccountParamsSchema>;
    Reply: Static<typeof AccountAddressesResponseSchema>;
  }>("/api/account/:id/addresses", async (request, reply) => {
    const { id } = request.params;
    const [resolved] = await runPreparedQuery(
      getResolvedAddressByAccountId.run({ account_id: id }, dbConn),
      "getResolvedAddressByAccountId"
    );
    if (!resolved?.resolved_address) {
      reply.send([]);
      return;
    }
    reply.send([
      { address: resolved.resolved_address, address_type: 0, account_id: id },
    ]);
  });
};
