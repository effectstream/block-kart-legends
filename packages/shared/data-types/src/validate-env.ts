export interface EnvVarSpec {
  name: string;
  required: boolean;
  secret: boolean;
  defaultValue?: string;
}

function getEnvVar(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env[name];
  }
  const deno = (globalThis as { Deno?: { env: { get(name: string): string | undefined } } }).Deno;
  return deno?.env.get(name);
}

function exit(code: number): never {
  if (typeof process !== "undefined" && process.exit) {
    process.exit(code);
  }
  const deno = (globalThis as { Deno?: { exit(code: number): never } }).Deno;
  if (deno) {
    deno.exit(code);
  }
  throw new Error(`exit ${code}`);
}

export function validateEnv(programName: string, specs: EnvVarSpec[]): void {
  const maxNameLen = Math.max(...specs.map((s) => s.name.length));
  const rows: string[] = [];
  const missing: string[] = [];

  for (const spec of specs) {
    const raw = getEnvVar(spec.name);
    let status: string;
    let display: string;
    let tag = "";

    if (raw != null && raw !== "") {
      if (spec.defaultValue != null && raw === spec.defaultValue) {
        status = "DEFAULT";
      } else {
        status = "SET";
      }
      display = spec.secret ? "****" : raw;
    } else if (spec.defaultValue != null) {
      status = "DEFAULT";
      display = spec.secret ? "****" : spec.defaultValue;
      if (typeof process !== "undefined" && process.env) {
        process.env[spec.name] ??= spec.defaultValue;
      } else {
        const deno = (globalThis as { Deno?: { env: { set(name: string, value: string): void } } }).Deno;
        deno?.env.set(spec.name, spec.defaultValue);
      }
    } else {
      status = "MISSING";
      display = "(not set)";
      if (spec.required) {
        tag = "  <-- REQUIRED";
        missing.push(spec.name);
      }
    }

    const name = spec.name.padEnd(maxNameLen);
    const st = status.padEnd(9);
    rows.push(`  ${name}  ${st}  ${display}${tag}`);
  }

  const sep = "=".repeat(48);
  console.log(sep);
  console.log(` Environment: ${programName}`);
  console.log(sep);
  for (const row of rows) {
    console.log(row);
  }
  console.log(sep);

  if (missing.length > 0) {
    console.error("ERROR: Missing required environment variables:");
    for (const name of missing) {
      console.error(`  - ${name}`);
    }
    console.error("Exiting.");
    exit(1);
  }

  console.log("All required environment variables are set.\n");
}
