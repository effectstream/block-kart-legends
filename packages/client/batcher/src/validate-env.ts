import { validateEnv, type EnvVarSpec } from "@kart-legends/data-types/validate-env";

const env = Deno.env.get("EFFECTSTREAM_ENV");

const specs: EnvVarSpec[] = [
  { name: "EFFECTSTREAM_ENV", required: true, secret: false },
  { name: "BATCHER_EVM_SECRET_KEY", required: true, secret: true },
  { name: "BATCHER_PORT", required: false, secret: false, defaultValue: "3334" },
];

if (env === "preprod") {
  specs.push(
    { name: "ARBITRUM_SEPOLIA_RPC_URL", required: true, secret: true },
    { name: "MIDNIGHT_WALLET_SEEDS", required: true, secret: true },
  );
} else if (env === "mainnet") {
  specs.push(
    { name: "ARBITRUM_ONE_RPC_URL", required: true, secret: true },
    { name: "MIDNIGHT_WALLET_SEEDS", required: true, secret: true },
  );
}

validateEnv(`Batcher (${env ?? "unknown"})`, specs);
