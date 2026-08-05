import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMAGE_DIRS = [
  { folder: "final", extensions: [".png", ".jpg", ".jpeg"] },
  { folder: "generated", extensions: [".jpg", ".jpeg", ".png"] },
  { folder: "product-originals", extensions: [".jpg", ".jpeg", ".png"] },
];

const baseUrl = process.env.PIN_IMAGE_BASE_URL?.replace(/\/$/, "");
if (!baseUrl) {
  throw new Error("PIN_IMAGE_BASE_URL precisa estar configurado para aplicar imagens finais.");
}

function findImageAsset(id) {
  const paddedId = String(id).padStart(4, "0");
  for (const { folder, extensions } of IMAGE_DIRS) {
    for (const extension of extensions) {
      const fileName = `pin-${paddedId}${extension}`;
      const filePath = path.join(ROOT, "public", "pinterest", folder, fileName);
      if (existsSync(filePath)) {
        return { folder, fileName };
      }
    }
  }
  return null;
}

const rowsPath = path.join(ROOT, "output", "pins_batch.json");
const rows = JSON.parse(readFileSync(rowsPath, "utf8"));
let applied = 0;

for (const row of rows) {
  if (row.generated_image_url) continue;
  const asset = findImageAsset(row.id);
  if (!asset) continue;
  row.generated_image_path = `public/pinterest/${asset.folder}/${asset.fileName}`;
  row.generated_image_url = `${baseUrl}/${asset.folder}/${asset.fileName}`;
  applied++;
}

writeFileSync(rowsPath, JSON.stringify(rows, null, 2), "utf8");
console.log(`Applied ${applied} final AI images`);
