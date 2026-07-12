import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const passthroughArgs = process.argv.slice(2);
const args = ["test"];

if (process.env.npm_config_list === "true" && !passthroughArgs.includes("--list")) {
  args.push("--list");
}

args.push(...passthroughArgs);

const __dirname = dirname(fileURLToPath(import.meta.url));
const playwrightCli = resolve(__dirname, "../../node_modules/@playwright/test/cli.js");
const result = spawnSync(process.execPath, [playwrightCli, ...args], {
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
