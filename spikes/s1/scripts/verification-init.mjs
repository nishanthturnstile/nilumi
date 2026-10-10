import { resolve } from "node:path";
import { initializeLedger } from "../lib/verification/ledger.ts";

const scope = process.argv
  .find((arg) => arg.startsWith("--scope="))
  ?.split("=")[1];
const directory = process.argv
  .find((arg) => arg.startsWith("--directory="))
  ?.split("=")[1];
if (!["s4", "vgw"].includes(scope) || !directory) {
  process.stderr.write(
    "Usage: pnpm verification:init --scope=s4|vgw --directory=<durable directory>\n",
  );
  process.exitCode = 1;
} else {
  try {
    await initializeLedger(resolve(directory), scope);
    process.stdout.write(
      `${scope} cumulative ledger initialized. Existing ledgers are never replaced.\n`,
    );
  } catch {
    process.stderr.write(
      "Initialization refused: ledger exists or directory is unavailable.\n",
    );
    process.exitCode = 1;
  }
}
