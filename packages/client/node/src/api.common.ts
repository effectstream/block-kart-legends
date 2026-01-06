import { type Static, Type } from "@sinclair/typebox";
import { runPreparedQuery } from "@paimaexample/db";
import {
  getLeaderboard,
  getAddressByAddress,
  getAccountById,
  getAddressesByAccountId,
} from "@kart-legends/database";
import type { Pool } from "pg";
import type fastify from "fastify";

export const apiCommon = async (
  server: fastify.FastifyInstance,
  dbConn: Pool
): Promise<void> => {
  // Leaderboard Endpoint
  const LeaderboardResponseSchema = Type.Array(
    Type.Object({
      name: Type.String(),
      score: Type.Number(),
    })
  );

  server.get<{
    Reply: Static<typeof LeaderboardResponseSchema>;
  }>("/api/leaderboard", async (request, reply) => {
    const leaderboardData = await runPreparedQuery(
      getLeaderboard.run({ limit: 10 }, dbConn),
      "getLeaderboard"
    );
    const leaderboard = leaderboardData.map((row) => {
      let displayName = row.username;
      if ((!displayName || displayName === row.wallet) && row.wallet) {
        const w = row.wallet;
        displayName = w.length > 10 ? `${w.slice(0, 6)}...${w.slice(-4)}` : w;
      }
      return {
        name: displayName || "Anonymous",
        score: row.score ?? 0,
      };
    });
    reply.send(leaderboard);
  });

  // Address Endpoint
  const AddressParamsSchema = Type.Object({
    address: Type.String(),
  });

  const AddressResponseSchema = Type.Object({
    address: Type.String(),
    address_type: Type.Number(),
    account_id: Type.Union([Type.Number(), Type.Null()]),
  });

  server.get<{
    Params: Static<typeof AddressParamsSchema>;
    Reply: Static<typeof AddressResponseSchema> | { error: string };
  }>("/api/address/:address", async (request, reply) => {
    const { address } = request.params;
    const [result] = await runPreparedQuery(
      getAddressByAddress.run({ address }, dbConn),
      "getAddressByAddress"
    );

    if (!result) {
      reply.code(404).send({ error: "Address not found" });
      return;
    }
    reply.send(result);
  });

  // Account Endpoint
  const AccountParamsSchema = Type.Object({
    id: Type.Number(),
  });

  const AccountResponseSchema = Type.Object({
    id: Type.Number(),
    primary_address: Type.Union([Type.String(), Type.Null()]),
  });

  server.get<{
    Params: Static<typeof AccountParamsSchema>;
    Reply: Static<typeof AccountResponseSchema> | { error: string };
  }>("/api/account/:id", async (request, reply) => {
    const { id } = request.params;
    const [result] = await runPreparedQuery(
      getAccountById.run({ id }, dbConn),
      "getAccountById"
    );

    if (!result) {
      reply.code(404).send({ error: "Account not found" });
      return;
    }
    reply.send(result);
  });

  // Account Addresses Endpoint
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
    const results = await runPreparedQuery(
      getAddressesByAccountId.run({ account_id: id }, dbConn),
      "getAddressesByAccountId"
    );
    reply.send(results);
  });
};
