import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPinterestAccessToken } from "./pinterest_auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const API_BASE = "https://api.pinterest.com/v5";

function parseArgs() {
  const args = process.argv.slice(2);
  const index = args.indexOf("--rows");
  if (index === -1 || !args[index + 1]) {
    throw new Error("Use --rows 4002,4003");
  }
  return new Set(args[index + 1].split(",").map((item) => String(item.trim())).filter(Boolean));
}

function pinId(item) {
  return item.pinterest_id || item.pin?.id || item.id || null;
}

async function pinterestDelete(pinIdValue, token) {
  const response = await fetch(`${API_BASE}/pins/${pinIdValue}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (response.status === 404) return { deleted: false, missing: true };
  if (!response.ok) {
    throw new Error(`Pinterest API ${response.status}: ${await response.text()}`);
  }
  return { deleted: true, missing: false };
}

const rowsToDelete = parseArgs();
const publishedFile = path.join(ROOT, "output", "published_pins.json");
if (!existsSync(publishedFile)) {
  throw new Error("output/published_pins.json not found");
}

const history = JSON.parse(readFileSync(publishedFile, "utf8"));
const token = await getPinterestAccessToken();
const kept = [];

for (const item of history) {
  const rowId = String(item.row_id);
  if (!rowsToDelete.has(rowId)) {
    kept.push(item);
    continue;
  }

  const id = pinId(item);
  if (!id) {
    console.log(`Removed row ${rowId} from history without Pinterest id.`);
    continue;
  }

  const result = await pinterestDelete(id, token);
  console.log(`${result.missing ? "Already missing" : "Deleted"} Pinterest pin for row ${rowId}: ${id}`);
}

writeFileSync(publishedFile, `${JSON.stringify(kept, null, 2)}\n`, "utf8");
console.log(`Updated published history. Removed rows: ${[...rowsToDelete].join(", ")}`);
