import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(rows, file) {
  const headers = Object.keys(rows[0] ?? {
    id: "",
    board_name: "",
    keyword: "",
    visual_strategy: "",
    product_title: "",
    product_image_url: "",
    target_path: "",
    prompt: "",
  });
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  writeFileSync(file, `\uFEFF${lines.join("\n")}`, "utf8");
}

const rows = JSON.parse(readFileSync(path.join(ROOT, "output", "pins_batch.json"), "utf8"));
const queue = rows
  .filter((row) => row.status === "ready" && row.requires_ai_image === "yes" && !row.generated_image_url)
  .map((row) => ({
    id: row.id,
    board_name: row.board_name,
    keyword: row.keyword,
    visual_strategy: row.visual_strategy,
    product_title: row.product_title,
    product_image_url: row.image_url,
    target_path: `public/pinterest/final/pin-${String(row.id).padStart(4, "0")}.png`,
    prompt: row.generated_image_prompt,
  }));

const outDir = path.join(ROOT, "output");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "image_generation_queue.json"), JSON.stringify(queue, null, 2), "utf8");
writeCsv(queue, path.join(outDir, "image_generation_queue.csv"));
console.log(`Exported ${queue.length} image prompts`);
