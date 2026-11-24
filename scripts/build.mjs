import { build } from "esbuild";
import { mkdir, readFile, writeFile, readdir, rm, cp } from "node:fs/promises";
import { join, extname } from "node:path";
await mkdir("public/vendor", { recursive: true });
await cp(
  "node_modules/tesseract.js/dist/worker.min.js",
  "public/vendor/worker.min.js",
);
await build({
  entryPoints: ["client/ocr-entry.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  minify: true,
  outfile: "public/vendor/ocr.js",
});
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".csv": "text/csv; charset=utf-8",
};
const assets = {};
async function visit(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name),
      path = prefix + "/" + entry.name;
    if (entry.isDirectory()) await visit(file, path);
    else
      assets[path] = {
        body: await readFile(file, "utf8"),
        type: types[extname(file)] || "text/plain; charset=utf-8",
      };
  }
}
await visit("public");
await writeFile(
  "server/assets.generated.mjs",
  "export default " + JSON.stringify(assets) + ";\n",
);
await rm("dist", { recursive: true, force: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await build({
  entryPoints: ["server/worker.mjs"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/server/index.js",
  minify: false,
});
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
console.log("Built the LoCoMatch app and database-backed Worker.");
