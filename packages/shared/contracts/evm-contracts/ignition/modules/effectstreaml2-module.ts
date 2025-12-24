import { buildModule } from "@nomicfoundation/ignition-core";

export default buildModule("effectstreaml2Module", (m) => {
  const contract = m.contract("effectstreaml2");
  return { contract };
});
