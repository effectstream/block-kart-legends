export interface EnvVarSpec {
  name: string;
  required: boolean;
  secret: boolean;
  defaultValue?: string;
}

export function validateEnv(programName: string, specs: EnvVarSpec[]): void {
  const maxNameLen = Math.max(...specs.map((s) => s.name.length));
  const rows: string[] = [];
  const missing: string[] = [];

  for (const spec of specs) {
    const raw = Deno.env.get(spec.name);
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
    Deno.exit(1);
  }

  console.log("All required environment variables are set.\n");
}
