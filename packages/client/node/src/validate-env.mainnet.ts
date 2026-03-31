import { validateEnv } from "@kart-legends/data-types/validate-env";

validateEnv("Node (mainnet)", [
  { name: "EFFECTSTREAM_ENV", required: true, secret: false },
  { name: "NODE_ENV", required: true, secret: false },
  { name: "ARBITRUM_ONE_RPC", required: true, secret: true },
  { name: "BATCHER_EVM_SECRET_KEY", required: true, secret: true },
  { name: "MIDNIGHT_WALLET_SEED", required: true, secret: true },
  { name: "MIDNIGHT_NETWORK_ID", required: false, secret: false },
  { name: "EFFECTSTREAM_STDOUT", required: false, secret: false },
]);
