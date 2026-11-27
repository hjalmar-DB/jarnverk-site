/**
 * Copies only the public site into ./public, which is what Render serves
 * (staticPublishPath: public). Notes (*.md), api/, scripts and config stay private.
 * Uses only Node built-ins, so it runs on Render without npm install:
 *   node scripts/publish.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "public");
const SKIP_DIRS = new Set([".git", ".github", "node_modules", "scripts", "api", "public"]);
const SKIP_FILES = new Set(["package.json", "package-lock.json", "render.yaml", ".gitignore"]);
const ALLOW_EXT = new Set([
  ".html", ".css", ".js", ".webp", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".gif", ".avif", ".otf", ".ttf",
  ".woff", ".woff2", ".xml", ".txt", ".webmanifest",
]);

fs.rmSync(out, { recursive: true, force: true });
let n = 0;
function copy(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (dir === root && SKIP_DIRS.has(e.name)) continue;
      copy(full);
      continue;
    }
    if (dir === root && SKIP_FILES.has(e.name)) continue;
    if (!ALLOW_EXT.has(path.extname(e.name).toLowerCase())) continue;
    const dest = path.join(out, path.relative(root, full));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(full, dest);
    n++;
  }
}
copy(root);
for (const must of ["index.html", "robots.txt", "sitemap.xml"]) {
  if (!fs.existsSync(path.join(out, must))) throw new Error(`public/${must} vantar`);
}
console.log(`Publish: ${n} skrár í public/.`);
