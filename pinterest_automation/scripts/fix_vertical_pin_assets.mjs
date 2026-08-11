import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const WIDTH = 1000;
const HEIGHT = 1500;
const GENERATED_DIR = path.join(ROOT, "public", "pinterest", "generated");
const PRODUCT_DIR = path.join(ROOT, "public", "pinterest", "product-originals");
const BATCH_PATH = path.join(ROOT, "output", "pins_batch.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const ids = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--ids") {
      ids.push(...String(args[i + 1] || "").split(",").map((item) => Number(item.trim())).filter(Number.isFinite));
      i += 1;
    }
  }
  return { ids };
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function nonBlackBounds(input) {
  const image = sharp(input).rotate().ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const rowIsContent = new Array(info.height).fill(false);

  for (let y = 0; y < info.height; y += 1) {
    let contentPixels = 0;
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels;
      const alpha = data[index + 3] ?? 255;
      if (alpha < 16) continue;
      if (luminance(data[index], data[index + 1], data[index + 2]) > 12) {
        contentPixels += 1;
      }
    }
    rowIsContent[y] = contentPixels > info.width * 0.04;
  }

  const runs = [];
  for (let y = 0; y < rowIsContent.length; y += 1) {
    if (!rowIsContent[y]) continue;
    const top = y;
    while (y + 1 < rowIsContent.length && rowIsContent[y + 1]) y += 1;
    runs.push({ top, bottom: y, height: y - top + 1 });
  }

  const mainRun = runs.sort((a, b) => b.height - a.height)[0];
  if (!mainRun) {
    return { left: 0, top: 0, width: info.width, height: info.height };
  }

  const colIsContent = new Array(info.width).fill(false);
  for (let y = mainRun.top; y <= mainRun.bottom; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels;
      const alpha = data[index + 3] ?? 255;
      if (alpha < 16) continue;
      if (luminance(data[index], data[index + 1], data[index + 2]) > 12) {
        colIsContent[x] = true;
      }
    }
  }

  const left = colIsContent.findIndex(Boolean);
  const right = colIsContent.length - 1 - [...colIsContent].reverse().findIndex(Boolean);

  if (left < 0) {
    return { left: 0, top: 0, width: info.width, height: info.height };
  }

  const marginY = Math.round(mainRun.height * 0.02);
  const top = Math.max(0, mainRun.top - marginY);
  const bottom = Math.min(info.height - 1, mainRun.bottom + marginY);
  const marginX = Math.round((right - left + 1) * 0.02);
  const safeLeft = Math.max(0, left - marginX);
  const safeRight = Math.min(info.width - 1, right + marginX);

  return {
    left: safeLeft,
    top: Math.max(0, top),
    width: Math.min(info.width - safeLeft, safeRight - safeLeft + 1),
    height: Math.min(info.height - top, bottom - top + 1),
  };
}

async function normalizeVertical(filePath) {
  const original = await sharp(filePath).rotate().toBuffer();
  const bounds = await nonBlackBounds(original);
  const cropped = await sharp(original).extract(bounds).toBuffer();

  await sharp(cropped)
    .resize(WIDTH, HEIGHT, {
      fit: "cover",
      position: "center",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 93, mozjpeg: true })
    .toFile(`${filePath}.tmp`);

  fs.renameSync(`${filePath}.tmp`, filePath);
}

async function hasBlackBars(filePath) {
  const { data, info } = await sharp(filePath)
    .resize(100, 150, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bandHeight = 12;
  const bands = [
    [0, bandHeight],
    [info.height - bandHeight, info.height],
  ];

  return bands.some(([start, end]) => {
    let black = 0;
    let total = 0;
    for (let y = start; y < end; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const index = (y * info.width + x) * info.channels;
        if (luminance(data[index], data[index + 1], data[index + 2]) < 14) black += 1;
        total += 1;
      }
    }
    return black / total > 0.72;
  });
}

const { ids } = parseArgs();
const batch = JSON.parse(fs.readFileSync(BATCH_PATH, "utf8"));
const rows = ids.length ? batch.filter((row) => ids.includes(Number(row.id))) : batch;

let fixed = 0;
for (const row of rows) {
  const isGenerated = row.generated_image_url?.includes("/generated/");
  const folder = isGenerated ? GENERATED_DIR : PRODUCT_DIR;
  const fileName = `pin-${row.id}.jpg`;
  const filePath = path.join(folder, fileName);
  if (!fs.existsSync(filePath)) continue;

  await normalizeVertical(filePath);
  const meta = await sharp(filePath).metadata();
  const bars = await hasBlackBars(filePath);
  if (meta.width !== WIDTH || meta.height !== HEIGHT || bars) {
    throw new Error(`Invalid vertical pin after fix: ${filePath} ${meta.width}x${meta.height} blackBars=${bars}`);
  }
  fixed += 1;
}

console.log(`Normalized ${fixed} Pinterest assets to ${WIDTH}x${HEIGHT} without black bars.`);
