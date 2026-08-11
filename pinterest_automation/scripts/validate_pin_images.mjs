import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIN_RATIO = 0.62;
const MAX_RATIO = 0.72;

function parseArgs() {
  const args = process.argv.slice(2);
  const readStringArg = (name, fallback) => {
    const index = args.indexOf(name);
    if (index === -1) return fallback;
    return args[index + 1] || fallback;
  };
  return {
    date: readStringArg("--date", brazilDateKey()),
  };
}

function brazilDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function rowScheduledDateKey(row) {
  return brazilDateKey(row.scheduled_at);
}

function localImagePath(url) {
  const parsed = new URL(url);
  const marker = "/pinterest_automation/";
  const markerIndex = parsed.pathname.indexOf(marker);
  if (markerIndex === -1) return null;
  const relative = parsed.pathname.slice(markerIndex + marker.length);
  return path.join(ROOT, relative);
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function hasBlackBars(filePath) {
  const { data, info } = await sharp(filePath)
    .resize(120, 180, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const checkBand = (xStart, xEnd, yStart, yEnd) => {
    let black = 0;
    let total = 0;
    for (let y = yStart; y < yEnd; y += 1) {
      for (let x = xStart; x < xEnd; x += 1) {
        const index = (y * info.width + x) * info.channels;
        if (luminance(data[index], data[index + 1], data[index + 2]) < 12) black += 1;
        total += 1;
      }
    }
    return total > 0 && black / total > 0.72;
  };

  const yBand = Math.round(info.height * 0.08);
  const xBand = Math.round(info.width * 0.08);
  return (
    checkBand(0, info.width, 0, yBand)
    || checkBand(0, info.width, info.height - yBand, info.height)
    || checkBand(0, xBand, 0, info.height)
    || checkBand(info.width - xBand, info.width, 0, info.height)
  );
}

const { date } = parseArgs();
const rows = JSON.parse(fs.readFileSync(path.join(ROOT, "output", "pins_batch.json"), "utf8"))
  .filter((row) => row.status === "ready" && rowScheduledDateKey(row) === date);

if (!rows.length) {
  throw new Error(`No ready Pinterest rows found for ${date}.`);
}

for (const row of rows) {
  const imageUrl = row.generated_image_url || row.image_url;
  if (!imageUrl) throw new Error(`Row ${row.id} has no image URL.`);

  const filePath = localImagePath(imageUrl);
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Row ${row.id} image is not available locally for validation: ${imageUrl}`);
  }

  const meta = await sharp(filePath).metadata();
  const ratio = meta.width / meta.height;
  if (ratio < MIN_RATIO || ratio > MAX_RATIO || meta.height <= meta.width) {
    throw new Error(`Row ${row.id} image is not vertical Pinterest format: ${meta.width}x${meta.height} ${filePath}`);
  }

  if (await hasBlackBars(filePath)) {
    throw new Error(`Row ${row.id} image has black bars/borders: ${filePath}`);
  }
}

console.log(`Validated ${rows.length} vertical Pinterest images for ${date}.`);
