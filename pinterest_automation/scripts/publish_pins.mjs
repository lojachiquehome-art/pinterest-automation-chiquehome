import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPinterestAccessToken } from "./pinterest_auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const API_BASE = "https://api.pinterest.com/v5";
const MISSING_BOARD_ID = "BOARD_ID_AQUI";

class PinterestApiError extends Error {
  constructor(status, body) {
    super(`Pinterest API ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const readNumberArg = (name, fallback) => {
    const index = args.indexOf(name);
    if (index === -1) return fallback;
    const value = Number(args[index + 1]);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    dryRun: args.includes("--dry-run"),
    limit: readNumberArg("--limit", 10),
    sleep: readNumberArg("--sleep", 10),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pinterestPost(pathname, token, payload) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new PinterestApiError(response.status, await response.text());
  }
  return response.json();
}

function createPayload(row, boardId) {
  const imageUrl = row.generated_image_url || row.image_url;
  if (!imageUrl) throw new Error(`Pin ${row.id} nao tem image_url publica.`);
  return {
    board_id: boardId,
    title: row.title,
    description: row.description,
    link: row.link,
    alt_text: row.alt_text,
    media_source: {
      source_type: "image_url",
      url: imageUrl,
    },
  };
}

function isPinterestFetchableImageUrl(url) {
  try {
    const parsed = new URL(url);
    return /\.(png|jpe?g)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function readPublishedHistory() {
  const file = path.join(ROOT, "output", "published_pins.json");
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8"));
}

function readFailureHistory() {
  const file = path.join(ROOT, "output", "publish_failures.json");
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8"));
}

const { dryRun, limit, sleep: sleepSeconds } = parseArgs();
const token = dryRun ? "" : await getPinterestAccessToken();

const publishedFile = path.join(ROOT, "output", "published_pins.json");
const failuresFile = path.join(ROOT, "output", "publish_failures.json");
const publishedHistory = readPublishedHistory();
const failureHistory = readFailureHistory();
const alreadyPublished = new Set(publishedHistory.map((item) => String(item.row_id)));
const failedRows = new Set(
  failureHistory
    .filter((item) => item.status >= 400 && item.status < 500)
    .map((item) => String(item.row_id)),
);
const rows = JSON.parse(readFileSync(path.join(ROOT, "output", "pins_batch.json"), "utf8"))
  .filter((row) => row.status === "ready" && !alreadyPublished.has(String(row.id)) && !failedRows.has(String(row.id)));
const boardMap = JSON.parse(readFileSync(path.join(ROOT, "data", "board_ids.json"), "utf8"));
const published = [...publishedHistory];
const failures = [...failureHistory];
let processed = 0;

for (const row of rows) {
  if (processed >= limit) break;
  if (row.requires_ai_image === "yes" && !row.generated_image_url) {
    console.log(`SKIP missing approved AI image: row ${row.id} | ${row.keyword} | ${row.visual_strategy}`);
    continue;
  }
  const imageUrl = row.generated_image_url || row.image_url;
  if (!isPinterestFetchableImageUrl(imageUrl)) {
    console.log(`SKIP image format not accepted by Pinterest: row ${row.id} | ${imageUrl}`);
    continue;
  }
  const boardId = boardMap[row.board_name];
  if (!boardId || boardId === MISSING_BOARD_ID) {
    console.log(`SKIP missing board id: ${row.board_name} | ${row.title}`);
    continue;
  }
  const payload = createPayload(row, boardId);
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    try {
      const result = await pinterestPost("/pins", token, payload);
      published.push({ row_id: row.id, pin: result });
      console.log(`Published pin for row ${row.id}: ${result.id}`);
      await sleep(sleepSeconds * 1000);
    } catch (error) {
      const status = error instanceof PinterestApiError ? error.status : 0;
      const body = error instanceof PinterestApiError ? error.body : String(error?.message || error);
      failures.push({
        row_id: row.id,
        title: row.title,
        image_url: imageUrl,
        status,
        error: body,
        failed_at: new Date().toISOString(),
      });
      console.log(`SKIP Pinterest publish error: row ${row.id} | status ${status} | ${body}`);
      continue;
    }
  }
  processed += 1;
}

if (!dryRun && published.length !== publishedHistory.length) {
  writeFileSync(publishedFile, JSON.stringify(published, null, 2), "utf8");
}

if (!dryRun && failures.length !== failureHistory.length) {
  writeFileSync(failuresFile, JSON.stringify(failures, null, 2), "utf8");
}
