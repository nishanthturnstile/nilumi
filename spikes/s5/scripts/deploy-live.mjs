import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const config = JSON.parse(
  await readFile("validation-results/live-private.json", "utf8"),
);
if (
  config.project !== "9acde490-30a2-4452-889a-fa5c67a79271" ||
  config.environment !== "ab1b8903-8615-484e-9410-04481200abbf"
)
  throw Error("s5_wrong_target");
const service = config[`${process.argv[2]}Service`];
if (
  !service ||
  ![config.appService, config.workerService].includes(service) ||
  service === "2b23798e-f3ef-46c4-bb20-29e518784bfa"
)
  throw Error("s5_wrong_service");
const stage = await mkdtemp(join(tmpdir(), "nilumi-s5-upload-"));
try {
  const target = join(stage, "spikes", "s5");
  await mkdir(target, { recursive: true });
  // Explicit allowlist: credentials, ignored results, tests and the rest of the repo never upload.
  for (const file of [
    "Dockerfile",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "src",
  ])
    await cp(file, join(target, file), { recursive: true });
  const result = execFileSync(
    "railway",
    [
      "up",
      stage,
      "--path-as-root",
      "--detach",
      "-p",
      config.project,
      "-e",
      config.environment,
      "-s",
      service,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000 },
  );
  console.log(result);
} catch {
  console.log("s5_upload_failed");
  process.exitCode = 1;
} finally {
  await rm(stage, { recursive: true, force: true });
}
