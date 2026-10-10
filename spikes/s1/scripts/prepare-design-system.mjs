import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const spike = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(spike, "..", "..", "packages", "ui", "specimen");
const destination = join(spike, "public", "design-system");

// Copy only the public reference assets; the shared package owns their source.
const assets = [
  "index.html",
  "phone.html",
  "icons.js",
  "kit.js",
  "specimen.js",
  "phone.js",
  "dist/specimen.css",
];

for (const asset of assets) {
  const target = join(destination, asset);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(source, asset), target);
}

console.log("Design-system catalogue ready at /design-system/index.html");
