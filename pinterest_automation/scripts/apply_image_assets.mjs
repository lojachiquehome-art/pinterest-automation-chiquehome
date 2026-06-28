import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FINAL_DIR = path.join(ROOT, "public", "pinterest", "final");

const baseUrl = process.env.PIN_IMAGE_BASE_URL?.replace(/\/$/, "");
if (!baseUrl) {
  throw new Error("PIN_IMAGE_BASE_URL precisa estar configurado para aplicar imagens finais.");
}

const rowsPath = path.join(ROOT, "output", "pins_batch.json");
const rows = JSON.parse(readFileSync(rowsPath, "utf8"));
let applied = 0;

for (const row of rows) {
  if (row.requires_ai_image !== "yes" || row.generated_image_url) continue;
  const fileName = `pin-${String(row.id).padStart(4, "0")}.png`;
  const filePath = path.join(FINAL_DIR, fileName);
  if (!existsSync(filePath)) continue;
  row.generated_image_path = `public/pinterest/final/${fileName}`;
  row.generated_image_url = `${baseUrl}/final/${fileName}`;
  applied++;
}

writeFileSync(rowsPath, JSON.stringify(rows, null, 2), "utf8");
console.log(`Applied ${applied} final AI images`);
