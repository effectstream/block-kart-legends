import { getConnection } from "@effectstream/db";
// TODO Update this to use the @effectstream/db-emulator package
// import { standAloneApplyMigrations } from "@effectstream/db-emulator";
import { standAloneApplyMigrations } from "./src/patch-emulator.ts";
import { migrationTable } from "./src/migration-order.ts";
import { config } from "@kart-legends/data-types/config-dev";

// This helper applies Paima Engine Migrations to the database, so you can use it to generate the pgtyped files.
const db: any = await getConnection();
await standAloneApplyMigrations(db, migrationTable, config as any, {});
console.log("✅ System & User migrations applied");
process.exit(0);
