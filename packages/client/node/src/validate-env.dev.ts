import { validateEnv } from "@kart-legends/data-types/validate-env";

validateEnv("Node (dev)", [
  { name: "EFFECTSTREAM_ENV", required: true, secret: false },
  { name: "NODE_ENV", required: true, secret: false },
  { name: "BATCHER_EVM_SECRET_KEY", required: true, secret: true, defaultValue: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" },
  { name: "MIDNIGHT_NETWORK_ID", required: false, secret: false },
  { name: "EFFECTSTREAM_STDOUT", required: false, secret: false },
]);
