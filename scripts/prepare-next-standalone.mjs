import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
if (!existsSync(join(standalone, "server.js"))) {
  throw new Error("Standalone Next.js server.js missing after build");
}

const publicDir = join(root, "public");
if (existsSync(publicDir)) {
  cpSync(publicDir, join(standalone, "public"), { recursive: true, force: true });
}

const staticDir = join(root, ".next", "static");
if (existsSync(staticDir)) {
  mkdirSync(join(standalone, ".next"), { recursive: true });
  cpSync(staticDir, join(standalone, ".next", "static"), { recursive: true, force: true });
}

console.log("Standalone server prepared with public and static assets.");
