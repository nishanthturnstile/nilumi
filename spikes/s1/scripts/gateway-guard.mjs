import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// The historical S3 evaluator is isolated synthetic tooling with its own
// independently tested policy/approval gates. Never add a runtime exemption.
const allowed = new Set(["lib/gateway/client.ts", "lib/nlu/gateway.ts"]);
const prohibited =
  /^(?:@ai-sdk\/(?!gateway$|provider(?:-utils)?$)|openai$|@anthropic-ai\/sdk$)/;
export function inspectSource(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const violations = [];
  function visit(node) {
    let importedModule;
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly)
      importedModule = node.moduleSpecifier.text;
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      !node.isTypeOnly
    )
      importedModule = node.moduleSpecifier.text;
    if (
      ts.isCallExpression(node) &&
      ["require", "import"].includes(node.expression.getText(file)) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      importedModule = node.arguments[0].text;
    if (
      importedModule &&
      (prohibited.test(importedModule) ||
        ((importedModule === "@ai-sdk/gateway" || importedModule === "ai") &&
          !allowed.has(path)))
    )
      violations.push(`${path}: provider access must use the gateway wrapper`);
    if (
      ts.isStringLiteral(node) &&
      /^https:\/\/(?:api\.openai\.com|api\.anthropic\.com|ai-gateway\.vercel\.sh)(?:\/|$)/.test(
        node.text,
      ) &&
      !allowed.has(path)
    )
      violations.push(`${path}: direct inference URL outside wrapper`);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return [...new Set(violations)];
}
export async function scan(root) {
  const violations = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.[cm]?[jt]sx?$/.test(entry.name))
        violations.push(
          ...inspectSource(relative(root, path), await readFile(path, "utf8")),
        );
    }
  }
  for (const directory of ["app", "components", "lib"])
    await walk(join(root, directory));
  return violations;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const violations = await scan(process.cwd());
  if (violations.length) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else
    process.stdout.write(
      "Gateway guard passed; S3 synthetic adapter is the sole legacy exemption.\n",
    );
}
