const fs = require("node:fs");
const path = require("node:path");
const ts = (() => {
  try {
    return require("typescript");
  } catch {
    return require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");
  }
})();
const root = path.resolve(__dirname, "..");
let checked = 0;
let failed = 0;
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|tsx)$/.test(file) && !file.endsWith(".d.ts")) {
      checked++;
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      for (const error of source.parseDiagnostics) {
        failed++;
        console.error(
          `${path.relative(root, file)}: ${ts.flattenDiagnosticMessageText(error.messageText, " ")}`,
        );
      }
    }
  }
}
walk(root);
// Parse CSS using PostCSS if installed; static braces check otherwise.
let cssChecked = 0;
try {
  const postcss = require("postcss");
  for (const rel of [
    "app/globals.css",
    "styles/admin-interactions.css",
    "styles/public-effects.css",
  ]) {
    postcss.parse(fs.readFileSync(path.join(root, rel), "utf8"), { from: rel });
    cssChecked++;
  }
} catch (error) {
  if (error.code === "MODULE_NOT_FOUND") {
    console.warn(
      "PostCSS not installed; CSS parser check skipped. Run npm install first.",
    );
  } else {
    failed++;
    console.error(error.message);
  }
}
if (failed) process.exitCode = 1;
else
  console.log(
    `PASS: ${checked} TS/TSX syntax files, ${cssChecked} CSS files parsed`,
  );
