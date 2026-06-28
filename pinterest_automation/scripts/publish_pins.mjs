import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPinterestAccessToken } from "./pinterest_auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const API_BASE = "https://api.pinterest.com/v5";
const MISSING_BOARD_ID = "BOARD_ID_AQUI";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    limit: Number(args[args.indexOf("--limit") + 1] || 10),
    sleep: Number(args[args.indexOf("--sleep") + 1] || 10),
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(value);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift().map((h) => h.replace(/^\uFEFF/, ""));
  return rows.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
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
    throw new Error(`Pinterest API ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function createPayload(row, boardId) {
  return {
    board_id: boardId,
    title: row.title,
    description: row.description,
    link: row.link,
    alt_text: row.alt_text,
    media_source: {
      source_type: "image_url",
      url: row.generated_image_url || row.image_url,
    },
  };
}

const { dryRun, limit, sleep: sleepSeconds } = parseArgs();
const token = dryRun ? "" : await getPinterestAccessToken();

const rows = parseCsv(readFileSync(path.join(ROOT, "output", "pins_batch.csv"), "utf8"))
  .filter((row) => row.status === "ready")
  .slice(0, limit);
const boardMap = JSON.parse(readFileSync(path.join(ROOT, "data", "board_ids.json"), "utf8"));
const published = [];

for (const row of rows) {
  const boardId = boardMap[row.board_name];
  if (!boardId || boardId === MISSING_BOARD_ID) {
    console.log(`SKIP missing board id: ${row.board_name} | ${row.title}`);
    continue;
  }
  const payload = createPayload(row, boardId);
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    const result = await pinterestPost("/pins", token, payload);
    published.push({ row_id: row.id, pin: result });
    console.log(`Published pin for row ${row.id}: ${result.id}`);
    await sleep(sleepSeconds * 1000);
  }
}

if (published.length) {
  writeFileSync(path.join(ROOT, "output", "published_pins.json"), JSON.stringify(published, null, 2), "utf8");
}
