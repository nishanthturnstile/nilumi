import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

// A new catalogue build must not reuse scripts or styles cached by the CDN.
const hash = createHash("sha256");
for (const asset of assets) hash.update(readFileSync(join(source, asset)));
const revision = hash.digest("hex").slice(0, 12);
const versionedAssets = assets.filter(
  (asset) => asset.endsWith(".js") || asset.endsWith(".css"),
);

for (const asset of assets) {
  const target = join(destination, asset);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(source, asset), target);
  if (asset.endsWith(".html")) {
    let html = readFileSync(target, "utf8");
    for (const path of versionedAssets) {
      html = html.replaceAll(`"${path}"`, `"${path}?v=${revision}"`);
    }
    writeFileSync(target, html);
  }
}

console.log("Design-system catalogue ready at /design-system/index.html");
