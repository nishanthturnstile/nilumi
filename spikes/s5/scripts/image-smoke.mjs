import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { runCommand } from "./backup.mjs";

await mkdir("validation-results", { recursive: true });
const token = randomBytes(32).toString("hex");
const name = `nilumi-s5-image-${randomBytes(4).toString("hex")}`;
const envPath = "validation-results/image.env";
await writeFile(
  envPath,
  `S5_ALLOW_REMOTE=true\nS5_DATABASE_URL=postgres://s5_app:s5-local-synthetic-only@postgres:5432/s5_smoke\nS5_SMOKE_TOKEN=${token}\n`,
  { mode: 0o600 },
);
let created = false;
try {
  await runCommand("docker", [
    "run",
    "-d",
    "--name",
    name,
    "--network",
    "nilumi-s5_default",
    "-p",
    "127.0.0.1::3000",
    "--env-file",
    envPath,
    "nilumi-s5",
  ]);
  created = true;
  const port = (await runCommand("docker", ["port", name, "3000/tcp"]))
    .toString()
    .trim()
    .split(":")
    .at(-1);
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      if (
        (await fetch(`${origin}/readyz`, { signal: AbortSignal.timeout(1000) }))
          .status === 200
      ) {
        ready = true;
        break;
      }
    } catch {}
    await delay(100);
  }
  assert.equal(ready, true);
  assert.equal(
    (await fetch(`${origin}/stream`, { method: "POST" })).status,
    401,
  );
  const response = await fetch(`${origin}/stream`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Last-Event-ID": "9" },
  });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /id: 10/);
  const image = (
    await runCommand("docker", [
      "image",
      "inspect",
      "nilumi-s5",
      "--format",
      "{{.Id}}",
    ])
  )
    .toString()
    .trim();
  const result = {
    at: new Date().toISOString(),
    environment: "local_docker_image",
    image,
    ready: true,
    unauthenticatedStream: 401,
    resumedStream: true,
    railwayAccepted: false,
  };
  await writeFile(
    "validation-results/image-smoke.json",
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(JSON.stringify(result));
} finally {
  if (created) await runCommand("docker", ["rm", "-f", name]);
  await rm(envPath, { force: true });
}
