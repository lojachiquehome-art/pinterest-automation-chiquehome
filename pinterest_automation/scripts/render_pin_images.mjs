import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WIDTH = 1000;
const HEIGHT = 1500;

function parseArgs() {
  const args = process.argv.slice(2);
  const valueAfter = (flag, fallback) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : fallback;
  };
  return {
    limit: Number(valueAfter("--limit", 10)),
    offset: Number(valueAfter("--offset", 0)),
  };
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text, maxChars, maxLines) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function palette(boardName) {
  if (/cozinha|tapete/i.test(boardName)) return { bg: "#f5f1e9", accent: "#8b6f47", dark: "#2f2a22", soft: "#dfd3c0" };
  if (/banheiro/i.test(boardName)) return { bg: "#eef3f2", accent: "#6c8f8b", dark: "#1f3130", soft: "#d8e3e1" };
  if (/sala|jantar|quarto/i.test(boardName)) return { bg: "#f3eee8", accent: "#8b5e52", dark: "#332724", soft: "#e2d2c8" };
  return { bg: "#f4f0e8", accent: "#6f735b", dark: "#282a22", soft: "#ded9c8" };
}

function svgTemplate(row, productDataUrl) {
  const colors = palette(row.board_name);
  const titleLines = wrapText(row.title, 24, 4);
  const keywordLines = wrapText(row.keyword, 26, 1);
  const textY = row.visual_strategy === "generated_scene_with_text" ? 940 : 1010;
  const imageBlock = productDataUrl
    ? `<image href="${productDataUrl}" x="150" y="245" width="700" height="610" preserveAspectRatio="xMidYMid meet"/>`
    : "";

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="${colors.bg}"/>
  <rect x="70" y="80" width="860" height="1340" rx="42" fill="#fffaf3"/>
  <circle cx="125" cy="132" r="18" fill="${colors.accent}"/>
  <text x="160" y="143" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${colors.dark}">Chique Home</text>
  <rect x="125" y="205" width="750" height="700" rx="36" fill="${colors.soft}"/>
  <path d="M125 790 C300 710 440 850 620 750 C740 685 810 715 875 670 L875 905 L125 905 Z" fill="${colors.accent}" opacity="0.18"/>
  ${imageBlock}
  <text x="125" y="${textY}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${colors.accent}" letter-spacing="2">${escapeXml(row.board_name.toUpperCase())}</text>
  ${titleLines.map((line, i) => `<text x="125" y="${textY + 72 + i * 62}" font-family="Arial, sans-serif" font-size="54" font-weight="800" fill="${colors.dark}">${escapeXml(line)}</text>`).join("")}
  ${keywordLines.map((line, i) => `<text x="125" y="${textY + 330 + i * 42}" font-family="Arial, sans-serif" font-size="34" fill="${colors.dark}" opacity="0.82">${escapeXml(line)}</text>`).join("")}
  <rect x="125" y="1310" width="345" height="72" rx="36" fill="${colors.dark}"/>
  <text x="162" y="1357" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff">PINTEREST10</text>
  <text x="500" y="1356" font-family="Arial, sans-serif" font-size="28" fill="${colors.dark}">10% OFF no site</text>
</svg>`;
}

async function imageToDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Imagem ${response.status}: ${url}`);
  const input = Buffer.from(await response.arrayBuffer());
  const output = await sharp(input)
    .resize(700, 610, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return `data:image/png;base64,${output.toString("base64")}`;
}

function datedDir() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const { limit, offset } = parseArgs();
const rowsPath = path.join(ROOT, "output", "pins_batch.json");
const rows = JSON.parse(readFileSync(rowsPath, "utf8"));
const publishedPath = path.join(ROOT, "output", "published_pins.json");
const publishedIds = existsSync(publishedPath)
  ? new Set(JSON.parse(readFileSync(publishedPath, "utf8")).map((item) => String(item.row_id)))
  : new Set();
const imageDate = datedDir();
const outDir = path.join(ROOT, "public", "pinterest", imageDate);
mkdirSync(outDir, { recursive: true });

const selected = rows
  .filter((row) => row.status === "ready" && !publishedIds.has(String(row.id)) && !row.generated_image_url)
  .slice(offset, offset + limit);
const baseUrl = process.env.PIN_IMAGE_BASE_URL?.replace(/\/$/, "");

for (const row of selected) {
  if (row.visual_strategy === "shopify_product_photo") {
    row.generated_image_url = row.image_url;
    row.generated_image_path = "";
    continue;
  }

  const fileName = `pin-${String(row.id).padStart(4, "0")}.png`;
  const filePath = path.join(outDir, fileName);
  const productDataUrl = await imageToDataUrl(row.image_url);
  const svg = svgTemplate(row, productDataUrl);
  await sharp(Buffer.from(svg)).png().toFile(filePath);
  row.generated_image_path = `public/pinterest/${imageDate}/${fileName}`;
  row.generated_image_url = baseUrl ? `${baseUrl}/${imageDate}/${fileName}` : "";
  console.log(`Rendered ${row.generated_image_path}`);
}

writeFileSync(rowsPath, JSON.stringify(rows, null, 2), "utf8");
writeFileSync(path.join(ROOT, "output", "image_manifest.json"), JSON.stringify({
  imageDate,
  baseUrl: baseUrl ?? "",
  rendered: selected.map((row) => ({
    id: row.id,
    keyword: row.keyword,
    visual_strategy: row.visual_strategy,
    generated_image_path: row.generated_image_path,
    generated_image_url: row.generated_image_url,
  })),
}, null, 2), "utf8");
