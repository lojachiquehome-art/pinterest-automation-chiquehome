import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPinterestAccessToken } from "./pinterest_auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const API_BASE = "https://api.pinterest.com/v5";
const token = await getPinterestAccessToken();

async function pinterest(pathname, options = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Pinterest API ${response.status}: ${await response.text()}`);
  return response.json();
}

async function listBoards() {
  const boards = [];
  let bookmark = "";
  do {
    const query = bookmark ? `?bookmark=${encodeURIComponent(bookmark)}` : "";
    const data = await pinterest(`/boards${query}`);
    boards.push(...(data.items ?? []));
    bookmark = data.bookmark ?? "";
  } while (bookmark);
  return boards;
}

async function createBoard(name) {
  return pinterest("/boards", {
    method: "POST",
    body: JSON.stringify({
      name,
      description: `Inspirações de decoração Chique Home: ${name}.`,
      privacy: "PUBLIC",
    }),
  });
}

const wanted = JSON.parse(readFileSync(path.join(ROOT, "data", "board_ids.example.json"), "utf8"));
const existing = await listBoards();
const byName = new Map(existing.map((board) => [board.name.toLowerCase(), board]));
const result = {};

for (const name of Object.keys(wanted)) {
  const found = byName.get(name.toLowerCase());
  if (found) {
    result[name] = found.id;
    console.log(`Found board: ${name}`);
  } else {
    const created = await createBoard(name);
    result[name] = created.id;
    console.log(`Created board: ${name}`);
  }
}

writeFileSync(path.join(ROOT, "data", "board_ids.json"), JSON.stringify(result, null, 2), "utf8");
console.log("Saved data/board_ids.json");
