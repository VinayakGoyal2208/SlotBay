import { cp, mkdir, readdir } from "node:fs/promises";

await import("./build.js");
const dist = new URL("../dist/", import.meta.url);
const files = await readdir(dist);
const assets = new URL("static/", dist);
await mkdir(assets, { recursive: true });
// Keep HTML in the function bundle for route-specific metadata. CDN output has
// only assets, so a static index.html cannot bypass the Express page renderer.
for (const name of files) {
  if (name !== "index.html" && name !== "static")
    await cp(new URL(name, dist), new URL(name, assets), { recursive: true });
}
