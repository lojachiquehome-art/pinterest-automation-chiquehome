import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { accentPortugueseText as accentText } from "./portuguese_text.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs() {
  const args = process.argv.slice(2);
  const valueAfter = (flag, fallback) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : fallback;
  };
  return {
    from: valueAfter("--from", ""),
    to: valueAfter("--to", ""),
    output: valueAfter("--output", ""),
  };
}

const styleLabel = {
  product_full_bleed: "foto Shopify sem texto",
  product_in_environment: "produto em ambiente sem texto",
  environment_title_overlay: "ambiente com texto",
  split_two_products: "grade 2 produtos",
};

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const { from, to, output } = parseArgs();
const rows = JSON.parse(readFileSync(path.join(ROOT, "output", "pins_batch.json"), "utf8"))
  .filter((row) => {
    const date = row.scheduled_at.slice(0, 10);
    return (!from || date >= from) && (!to || date <= to);
  });

const byDay = {};
for (const row of rows) {
  const date = row.scheduled_at.slice(0, 10);
  if (!byDay[date]) byDay[date] = [];
  byDay[date].push(row);
}

const cardW = 210;
const cardH = 315;
const gap = 18;
const headH = 58;
const labelH = 64;
const pad = 18;
const width = pad * 2 + 5 * cardW + 4 * gap;
const dayH = headH + cardH + labelH + pad;
const height = pad + Object.keys(byDay).length * dayH;
const composites = [];
let y = pad;

for (const [date, dayRows] of Object.entries(byDay)) {
  const header = `${date} | ${accentText(dayRows[0].board_name)} | ${dayRows.length} estilos`;
  composites.push({
    input: Buffer.from(`
      <svg width="${width}" height="${headH}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#3b2b23"/>
        <text x="18" y="38" font-family="Arial" font-size="28" font-weight="800" fill="#fff7ef">${escapeXml(header)}</text>
      </svg>
    `),
    left: 0,
    top: y,
  });

  let x = pad;
  y += headH;
  for (const row of dayRows) {
    const fallbackDir = row.visual_strategy === "product_full_bleed"
      ? "public/pinterest/product-originals"
      : "public/pinterest/generated";
    const fallbackPath = `${fallbackDir}/pin-${String(row.id).padStart(4, "0")}.jpg`;
    const imagePath = path.join(ROOT, row.generated_image_path || fallbackPath);
    const image = await sharp(imagePath)
      .resize(cardW, cardH, { fit: "cover", position: "center" })
      .jpeg({ quality: 88 })
      .toBuffer();
    composites.push({ input: image, left: x, top: y });

    const label = `${row.id} | ${styleLabel[row.visual_strategy] ?? row.visual_strategy}`;
    const keyword = accentText(row.keyword).slice(0, 29);
    composites.push({
      input: Buffer.from(`
        <svg width="${cardW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#fbf7ef"/>
          <text x="0" y="22" font-family="Arial" font-size="15" font-weight="800" fill="#3b2b23">${escapeXml(label)}</text>
          <text x="0" y="48" font-family="Arial" font-size="15" fill="#6b5a50">${escapeXml(keyword)}</text>
        </svg>
      `),
      left: x,
      top: y + cardH,
    });
    x += cardW + gap;
  }
  y += cardH + labelH + pad;
}

const defaultName = from && to
  ? `preview_week_5_styles_${from}_to_${to}.jpg`
  : "preview_week_5_styles.jpg";
const outPath = path.join(ROOT, output || path.join("output", defaultName));

await sharp({
  create: {
    width,
    height,
    channels: 3,
    background: "#fbf7ef",
  },
})
  .composite(composites)
  .jpeg({ quality: 90 })
  .toFile(outPath);

console.log(outPath);
