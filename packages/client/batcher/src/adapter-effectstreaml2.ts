import { PaimaL2DefaultAdapter } from "@paimaexample/batcher";
import { contractAddressesEvmMain } from "@kart-legends/evm-contracts";

// Config values mirroring ./packages/client/node/scripts/start.ts
const paimaL2Address = contractAddressesEvmMain()["chain31337"][
  "effectstreaml2Module#effectstreaml2"
] as `0x${string}`;

if (!paimaL2Address) {
  throw new Error("EffectstreamL2 address not found");
}

const paimaSyncProtocolName = "mainEvmRPC";

// In real cases use Deno.env for reading private key
const batcherPrivateKey =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

// Defaults consistent with E2E usage
const paimaL2Fee = 0n; // old batcher defaulted to 0 for local dev

// PaimaL2 EVM adapter
export const effectstreaml2Adapter = new PaimaL2DefaultAdapter(
  paimaL2Address,
  batcherPrivateKey,
  paimaL2Fee,
  paimaSyncProtocolName
);
