// import hre from "hardhat";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import * as config from "./hardhat.config.ts";
import type { buildModule } from "@nomicfoundation/ignition-core";
import effectstreaml2Module from "./ignition/modules/effectstreaml2-module.ts";

const __dirname: any = import.meta.dirname;

type Deployment = {
  module: ReturnType<typeof buildModule>;
  network: string;
  parameters?: Record<string, Record<string, any>>;
};

// This is an example of how to deploy contracts.
// This is the list of contracts to deploy.
// Add or remove contracts as needed.
const myDeployments: Deployment[] = [
  // Example Erc20
  /*
   * {
   *   module: Erc20DevModule,
   *   network: "evmMainHttp",
   * },
   */
  {
    module: effectstreaml2Module,
    network: "evmMainHttp",
    parameters: {
      effectstreaml2Module: {
        owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        fee: 0,
      },
    },
  },
] as const;

/**
 * Deploy the contracts to the network.
 */
export async function deploy(): Promise<void> {
  const hre = await createHardhatRuntimeEnvironment(config.default, __dirname);
  const messages: string[] = [];
  for (const deployment of myDeployments) {
    const network = await hre.network.connect(deployment.network);
    const result = await (network as any).ignition.deploy(
      deployment.module,
      deployment.parameters ? { parameters: deployment.parameters } : undefined
    );
    messages.push(
      `${deployment.module.id
        .substring(0, 16)
        .padEnd(16)} @ ${deployment.network
        .substring(0, 16)
        .padEnd(16)} deployed to ${result.contract.address}`
    );
  }
  console.log("Deployed contracts:\n", messages.join("\n"));
  // Wait for a block to be minted on the slowest chain.
  await new Promise((r) => setTimeout(r, 1000 * 2));
}

if (import.meta.main) {
  await deploy();
}
