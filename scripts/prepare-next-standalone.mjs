import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// Next.js standalone output does not copy public/ and .next/static automatically.
// Preserve the Docker image layout while also supporting Render's npm start.
const root = process.cwd();
const standalone = join(root, ".next", "standalone");
if (!existsSync(join(standalone, "server.js"))) {
  throw new Error("Standalone Next.js server.js missing after build");
}
const publicDir = join(root, "public");
if (existsSync(publicDir)) {
  cpSync(publicDir, join(standalone, "public"), { recursive: true, force: true });
}
// Private APK is never copied into a public preview without separate approval.
const privateTarget = join(standalone, "private-assets");
rmSync(privateTarget, { recursive: true, force: true });
if (process.env.DENA_PUBLIC_ANDROID_APK_ENABLED === "1") {
  const privateSource = join(root, "private-assets");
  if (!existsSync(join(privateSource, "android"))) throw new Error("Approved APK missing");
  cpSync(privateSource, privateTarget, { recursive: true, force: true });
}
const staticDir = join(root, ".next", "static");
if (existsSync(staticDir)) {
  mkdirSync(join(standalone, ".next"), { recursive: true });
  cpSync(staticDir, join(standalone, ".next", "static"), { recursive: true, force: true });
}
console.log("Standalone server prepared with public and static assets.");
