import type { DBMigrations } from "@effectstream/runtime";
import databaseSql from "./migrations/database.sql" with { type: "text" };
import gameInfoSql from "./migrations/game-info.sql" with { type: "text" };
import achievementsSql from "./migrations/achievements.sql" with { type: "text" };
import delegationsSql from "./migrations/delegations.sql" with { type: "text" };

export const migrationTable: DBMigrations[] = [
  {
    name: "database.sql",
    sql: databaseSql,
  },
  {
    name: "game-info.sql",
    sql: gameInfoSql,
  },
  {
    name: "achievements.sql",
    sql: achievementsSql,
  },
  {
    name: "delegations.sql",
    sql: delegationsSql,
  },
];
