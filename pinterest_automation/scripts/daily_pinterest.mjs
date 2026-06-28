import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? args[limitIndex + 1] : "10";

await run("node", ["scripts/generate_pin_batch.mjs"]);
await run("node", ["scripts/render_pin_images.mjs", "--limit", limit]);
await run("node", ["scripts/publish_pins.mjs", dryRun ? "--dry-run" : "", "--limit", limit].filter(Boolean));
