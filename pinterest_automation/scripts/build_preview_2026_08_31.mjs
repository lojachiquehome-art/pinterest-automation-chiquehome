import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WIDTH = 1000;
const HEIGHT = 1500;
const OUT_DIR = path.join(ROOT, "public", "pinterest", "preview-2026-08-31");
const PRODUCT_DIR = path.join(OUT_DIR, "product");
const GENERATED_DIR = path.join(OUT_DIR, "generated");
const AI_SOURCE_DIR = path.join(OUT_DIR, "ai-source");
const BACKGROUND_DIR = path.join(ROOT, "public", "pinterest", "backgrounds", "2026-08-31");
const PREVIEW_PATH = path.join(ROOT, "output", "preview_week_5_styles_2026-08-31_to_2026-09-06.jpg");

mkdirSync(PRODUCT_DIR, { recursive: true });
mkdirSync(GENERATED_DIR, { recursive: true });
mkdirSync(path.dirname(PREVIEW_PATH), { recursive: true });

function readProducts(file) {
  const raw = readFileSync(path.join(ROOT, file), "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw);
  return parsed.products ?? parsed;
}

const products = [
  ...readProducts("tmp/shopify_products_pages/page1.json"),
  ...readProducts("tmp/shopify_products_pages/page2.json"),
];

const byHandle = new Map(products.map((product) => [product.handle, product]));

function product(handle) {
  const found = byHandle.get(handle);
  if (!found) throw new Error(`Produto nao encontrado no cache Shopify: ${handle}`);
  return found;
}

function imageUrl(product) {
  const url = product.images?.[0]?.src ?? product.image?.src;
  if (!url) throw new Error(`Produto sem imagem: ${product.handle}`);
  return url.startsWith("//") ? `https:${url}` : url;
}

function imageUrls(product) {
  const urls = [];
  for (const item of product.images ?? []) {
    const url = item?.src;
    if (url) urls.push(url.startsWith("//") ? `https:${url}` : url);
  }
  if (!urls.length && product.image?.src) {
    const url = product.image.src;
    urls.push(url.startsWith("//") ? `https:${url}` : url);
  }
  if (!urls.length) throw new Error(`Produto sem imagem: ${product.handle}`);
  return [...new Set(urls)];
}

function cleanTitle(title) {
  return String(title)
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(value, maxChars, maxLines = 3) {
  const words = String(value ?? "").split(/\s+/).filter(Boolean);
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
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

async function fetchBuffer(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });
      if (!response.ok) throw new Error(`Imagem ${response.status}: ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    }
  }
  throw lastError;
}

async function productBuffer(handle, preferredIndex = 0) {
  const found = product(handle);
  let lastError;
  const urls = imageUrls(found);
  const ordered = [
    ...urls.slice(preferredIndex),
    ...urls.slice(0, preferredIndex),
  ];
  for (const url of ordered) {
    try {
      return await fetchBuffer(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function backgroundPathFor(row, day) {
  const room = row.room ?? day.room ?? "living";
  if (row.background) return path.join(BACKGROUND_DIR, row.background);
  if (room === "bath") return path.join(BACKGROUND_DIR, "bathroom.png");
  if (room === "kitchen") return path.join(BACKGROUND_DIR, "kitchen.png");
  if (room === "bed") return path.join(BACKGROUND_DIR, "bedroom.png");
  if (/jantar/i.test(day.board)) return path.join(BACKGROUND_DIR, "dining_living.png");
  return path.join(BACKGROUND_DIR, "decor_living.png");
}

function palette(day) {
  if (/banheiro/i.test(day.board)) return { bg: "#eee9df", dark: "#3b2b23", accent: "#d5b98f", shadow: "#231916" };
  if (/cozinha|tapete/i.test(day.board)) return { bg: "#f2eee6", dark: "#3b2b23", accent: "#c4aa81", shadow: "#211915" };
  if (/relógio|quarto/i.test(day.board)) return { bg: "#f3eee8", dark: "#3b2b23", accent: "#d3b486", shadow: "#211915" };
  if (/iluminação/i.test(day.board)) return { bg: "#eee7de", dark: "#34251d", accent: "#d8bb89", shadow: "#1e1714" };
  return { bg: "#f4efe7", dark: "#3b2b23", accent: "#c8ab80", shadow: "#211915" };
}

async function coverImage(input, w = WIDTH, h = HEIGHT, position = "center") {
  return sharp(input).rotate().resize(w, h, { fit: "cover", position }).jpeg({ quality: 92 }).toBuffer();
}

async function productFullBleed(row, day) {
  const input = await productBuffer(row.handle, row.imageIndex ?? 0);
  const filePath = path.join(PRODUCT_DIR, `pin-${row.id}.jpg`);
  await sharp(input)
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: "cover", position: row.position ?? "center" })
    .jpeg({ quality: 92 })
    .toFile(filePath);
  return filePath;
}

function environmentSvg(row, day, options = {}) {
  const colors = palette(day);
  const text = options.text ? wrapText(options.text.toUpperCase(), 17, 3) : [];
  const coupon = options.coupon === false ? "" : `
    <rect x="704" y="1390" width="230" height="60" rx="30" fill="#d9bd8f" opacity="0.92"/>
    <text x="819" y="1429" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="${colors.dark}">PINTEREST10</text>
  `;
  const title = text.length
    ? `<rect x="70" y="430" width="860" height="460" fill="#000" opacity="0.12"/>
      ${text.map((line, i) => `<text x="500" y="${555 + i * 92}" text-anchor="middle" font-family="Georgia, serif" font-size="78" font-weight="700" fill="#fff7ef">${escapeXml(line)}</text>`).join("")}`
    : "";

  return `
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#fff8ef"/>
        <stop offset="0.45" stop-color="${colors.bg}"/>
        <stop offset="1" stop-color="#c8a982"/>
      </linearGradient>
      <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="${colors.shadow}" flood-opacity="0.24"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect x="0" y="0" width="100%" height="100%" fill="#2f211a" opacity="${options.dark ? "0.16" : "0.03"}"/>
    ${options.room ?? ""}
    ${title}
    ${coupon}
  </svg>`;
}

function roomShapes(kind) {
  if (kind === "bath") {
    return `
      <rect x="0" y="0" width="1000" height="1500" fill="#d7c4aa"/>
      <rect x="78" y="78" width="844" height="1320" fill="#c6aa8b" opacity="0.34"/>
      <ellipse cx="450" cy="360" rx="210" ry="210" fill="none" stroke="#2b201c" stroke-width="24" opacity="0.72"/>
      <rect x="78" y="980" width="844" height="230" fill="#a87d55" opacity="0.74"/>
      <rect x="140" y="785" width="550" height="105" rx="28" fill="#f4eee7"/>
      <rect x="145" y="890" width="540" height="355" fill="#9c734e"/>
      <rect x="675" y="1080" width="190" height="190" rx="54" fill="#efe9e1"/>
      <rect x="112" y="210" width="92" height="700" fill="#2b201c" opacity="0.58"/>
      <rect x="780" y="230" width="56" height="580" fill="#2b201c" opacity="0.58"/>
    `;
  }
  if (kind === "kitchen") {
    return `
      <rect width="1000" height="1500" fill="#d6c2a4"/>
      <rect x="0" y="0" width="1000" height="330" fill="#a7794f" opacity="0.55"/>
      <rect x="90" y="575" width="820" height="125" fill="#f7f0e8"/>
      <rect x="95" y="702" width="810" height="485" fill="#a8784d" opacity="0.95"/>
      <rect x="610" y="612" width="235" height="70" rx="35" fill="#2b2520"/>
      <rect x="690" y="430" width="26" height="190" rx="12" fill="#a17a4b"/>
      <rect x="606" y="880" width="250" height="515" rx="16" fill="#efe0c8" opacity="0.28"/>
    `;
  }
  if (kind === "living") {
    return `
      <rect width="1000" height="1500" fill="#b28a62"/>
      <rect x="0" y="0" width="1000" height="950" fill="#8d6d52" opacity="0.54"/>
      <rect x="85" y="690" width="835" height="310" rx="26" fill="#d9c5ad"/>
      <rect x="105" y="980" width="790" height="115" rx="28" fill="#a2754e"/>
      <rect x="190" y="470" width="620" height="78" fill="#d6bb93"/>
      <rect x="210" y="545" width="580" height="25" fill="#f5d798"/>
      <rect x="190" y="265" width="620" height="78" fill="#d6bb93"/>
      <rect x="210" y="340" width="580" height="25" fill="#f5d798"/>
    `;
  }
  if (kind === "bed") {
    return `
      <rect width="1000" height="1500" fill="#b99a77"/>
      <rect x="140" y="520" width="720" height="460" rx="34" fill="#d2b894"/>
      <rect x="175" y="470" width="650" height="150" rx="22" fill="#efe5d7"/>
      <rect x="70" y="970" width="860" height="320" fill="#7b563e"/>
      <rect x="690" y="350" width="80" height="220" fill="#f6dfaa"/>
      <ellipse cx="730" cy="330" rx="92" ry="58" fill="#dfbf86"/>
    `;
  }
  if (kind === "office") {
    return `
      <rect width="1000" height="1500" fill="#8b6b4e"/>
      <rect x="0" y="0" width="1000" height="910" fill="#5f4a39" opacity="0.42"/>
      <rect x="70" y="850" width="860" height="120" fill="#b1855b"/>
      <rect x="120" y="470" width="760" height="54" fill="#a87a52"/>
      <rect x="140" y="525" width="720" height="20" fill="#f4d48f"/>
      <rect x="230" y="730" width="250" height="165" rx="12" fill="#181614"/>
      <rect x="490" y="720" width="145" height="185" rx="20" fill="#c8ad91"/>
    `;
  }
  return "";
}

function sceneDecor(kind, width = WIDTH, height = HEIGHT) {
  const h = height;
  if (kind === "bath") {
    return `
      <rect width="${width}" height="${h}" fill="#d5c4ad"/>
      <rect x="70" y="${h * 0.05}" width="860" height="${h * 0.9}" fill="#c1a98c" opacity="0.32"/>
      <ellipse cx="350" cy="${h * 0.23}" rx="205" ry="205" fill="none" stroke="#332721" stroke-width="24" opacity="0.45"/>
      <rect x="95" y="${h * 0.63}" width="810" height="${h * 0.12}" fill="#f5eee7"/>
      <rect x="105" y="${h * 0.75}" width="790" height="${h * 0.17}" fill="#a77b55" opacity="0.68"/>
      <rect x="770" y="${h * 0.17}" width="46" height="${h * 0.42}" fill="#2d211b" opacity="0.42"/>
      <circle cx="805" cy="${h * 0.18}" r="32" fill="#e9d2a5" opacity="0.85"/>
    `;
  }
  if (kind === "kitchen") {
    return `
      <rect width="${width}" height="${h}" fill="#d8c2a4"/>
      <rect x="0" y="0" width="${width}" height="${h * 0.22}" fill="#a57951" opacity="0.52"/>
      <rect x="72" y="${h * 0.45}" width="856" height="${h * 0.11}" fill="#f6eee5"/>
      <rect x="82" y="${h * 0.56}" width="836" height="${h * 0.28}" fill="#a87a50" opacity="0.82"/>
      <rect x="650" y="${h * 0.47}" width="220" height="58" rx="29" fill="#28231f"/>
      <rect x="722" y="${h * 0.29}" width="26" height="${h * 0.18}" rx="13" fill="#ad8755"/>
      <rect x="110" y="${h * 0.15}" width="780" height="12" fill="#f5d69c" opacity="0.92"/>
    `;
  }
  if (kind === "bed") {
    return `
      <rect width="${width}" height="${h}" fill="#b99a76"/>
      <rect x="115" y="${h * 0.36}" width="770" height="${h * 0.32}" rx="34" fill="#d6bf9f"/>
      <rect x="170" y="${h * 0.31}" width="660" height="${h * 0.13}" rx="24" fill="#efe5d8"/>
      <rect x="95" y="${h * 0.70}" width="810" height="${h * 0.18}" fill="#76523c"/>
      <ellipse cx="735" cy="${h * 0.23}" rx="88" ry="54" fill="#dfbf86"/>
      <rect x="700" y="${h * 0.25}" width="72" height="${h * 0.2}" fill="#f6dfaa"/>
    `;
  }
  if (kind === "office") {
    return `
      <rect width="${width}" height="${h}" fill="#7e6047"/>
      <rect x="0" y="0" width="${width}" height="${h * 0.58}" fill="#5f4a39" opacity="0.42"/>
      <rect x="75" y="${h * 0.67}" width="850" height="${h * 0.12}" fill="#b1855b"/>
      <rect x="130" y="${h * 0.33}" width="740" height="52" fill="#a87a52"/>
      <rect x="150" y="${h * 0.38}" width="700" height="18" fill="#f4d48f"/>
      <rect x="230" y="${h * 0.56}" width="245" height="${h * 0.13}" rx="12" fill="#191615"/>
    `;
  }
  return `
    <rect width="${width}" height="${h}" fill="#b89068"/>
    <rect x="0" y="0" width="${width}" height="${h * 0.62}" fill="#84654b" opacity="0.48"/>
    <rect x="80" y="${h * 0.50}" width="840" height="${h * 0.20}" rx="26" fill="#d9c5ad"/>
    <rect x="110" y="${h * 0.70}" width="780" height="${h * 0.08}" rx="25" fill="#a2754e"/>
    <rect x="185" y="${h * 0.29}" width="630" height="70" fill="#d6bb93"/>
    <rect x="210" y="${h * 0.35}" width="580" height="22" fill="#f5d798"/>
  `;
}

function averageCornerColor(data, info, sample = 18) {
  const colors = [];
  const pushPixel = (x, y) => {
    const idx = (y * info.width + x) * 4;
    colors.push([data[idx], data[idx + 1], data[idx + 2]]);
  };
  for (let y = 0; y < Math.min(sample, info.height); y += 1) {
    for (let x = 0; x < Math.min(sample, info.width); x += 1) pushPixel(x, y);
    for (let x = Math.max(0, info.width - sample); x < info.width; x += 1) pushPixel(x, y);
  }
  for (let y = Math.max(0, info.height - sample); y < info.height; y += 1) {
    for (let x = 0; x < Math.min(sample, info.width); x += 1) pushPixel(x, y);
    for (let x = Math.max(0, info.width - sample); x < info.width; x += 1) pushPixel(x, y);
  }
  const sum = colors.reduce((acc, color) => {
    acc[0] += color[0];
    acc[1] += color[1];
    acc[2] += color[2];
    return acc;
  }, [0, 0, 0]);
  return sum.map((value) => value / Math.max(1, colors.length));
}

async function trimmedProductImage(input, maxW, maxH) {
  const { data, info } = await sharp(input)
    .rotate()
    .trim({ threshold: 12 })
    .resize(maxW, maxH, { fit: "inside", withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bg = averageCornerColor(data, info);
  const totalPixels = info.width * info.height;
  const background = new Uint8Array(totalPixels);
  const queued = new Uint8Array(totalPixels);
  const queue = [];

  const isBackgroundLike = (idx) => {
    const i = idx * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const distanceFromBg = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
    const brightNeutral = max > 214 && max - min < 42;
    const mutedNeutral = max > 170 && max - min < 24;
    return alpha < 12 || distanceFromBg < 74 || (brightNeutral && distanceFromBg < 118) || (mutedNeutral && distanceFromBg < 96);
  };

  const enqueue = (idx) => {
    if (idx < 0 || idx >= totalPixels || queued[idx]) return;
    if (!isBackgroundLike(idx)) return;
    queued[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < info.width; x += 1) {
    enqueue(x);
    enqueue((info.height - 1) * info.width + x);
  }
  for (let y = 0; y < info.height; y += 1) {
    enqueue(y * info.width);
    enqueue(y * info.width + info.width - 1);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const idx = queue[cursor];
    background[idx] = 1;
    const x = idx % info.width;
    if (x > 0) enqueue(idx - 1);
    if (x < info.width - 1) enqueue(idx + 1);
    if (idx >= info.width) enqueue(idx - info.width);
    if (idx < totalPixels - info.width) enqueue(idx + info.width);
  }

  for (let idx = 0; idx < totalPixels; idx += 1) {
    const i = idx * 4;
    if (background[idx]) {
      data[i + 3] = 0;
      continue;
    }
    const x = idx % info.width;
    const y = Math.floor(idx / info.width);
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const distanceFromBg = Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
    const edgeDistance = Math.min(x, y, info.width - 1 - x, info.height - 1 - y);
    if (edgeDistance < 18 && distanceFromBg < 104) {
      data[i + 3] = Math.min(data[i + 3], Math.round((edgeDistance / 18) * 220));
    }
  }

  return sharp(data, { raw: info })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .extend({ top: 18, bottom: 18, left: 18, right: 18, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function hasCleanCutout(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = 0;
  const pixels = info.width * info.height;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 16) transparent += 1;
  }
  return transparent / pixels > 0.18;
}

async function productPhotoPanel(row, day, options = {}) {
  const w = options.width ?? WIDTH;
  const h = options.height ?? HEIGHT;
  const input = await productBuffer(row.handle, options.imageIndex ?? 0);
  const colors = palette(day);
  const base = await sharp(input)
    .rotate()
    .resize(w, h, { fit: "cover", position: row.position ?? "center" })
    .modulate({ brightness: 1.02, saturation: 0.96 })
    .jpeg({ quality: 92 })
    .toBuffer();
  const overlays = [];
  if (options.text) {
    const text = wrapText(options.text.toUpperCase(), 18, 3);
    overlays.push({
      input: Buffer.from(`
        <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
          <rect x="${Math.round(w * 0.07)}" y="${Math.round(h * 0.29)}" width="${Math.round(w * 0.86)}" height="${120 + Math.max(0, text.length - 1) * 74}" fill="#2d211b" opacity="0.28"/>
          ${text.map((line, i) => `<text x="${w / 2}" y="${Math.round(h * 0.36) + i * 74}" text-anchor="middle" font-family="Georgia, serif" font-size="66" font-weight="700" fill="#fff7ef">${escapeXml(line)}</text>`).join("")}
        </svg>`),
      left: 0,
      top: 0,
    });
  }
  if (options.coupon !== false) {
    overlays.push({
      input: Buffer.from(`
        <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
          <rect x="${w - 296}" y="${h - 92}" width="230" height="58" rx="29" fill="#d9bd8f" opacity="0.92"/>
          <text x="${w - 181}" y="${h - 55}" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="${colors.dark}">PINTEREST10</text>
        </svg>`),
      left: 0,
      top: 0,
    });
  }
  return sharp(base).composite(overlays).jpeg({ quality: 92 }).toBuffer();
}

function aiSourcePath(id) {
  const filePath = path.join(AI_SOURCE_DIR, `pin-${id}.png`);
  return existsSync(filePath) ? filePath : "";
}

function titleOverlaySvg(textValue, w = WIDTH, h = HEIGHT) {
  const text = wrapText(String(textValue ?? "").toUpperCase(), 18, 3);
  const y = Math.round(h * 0.33);
  return Buffer.from(`
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#1b120e" flood-opacity="0.72"/>
        </filter>
      </defs>
      ${text.map((line, i) => `<text x="${w / 2}" y="${y + i * 76}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="68" font-weight="700" letter-spacing="0" fill="#fff8ef" filter="url(#textShadow)">${escapeXml(line)}</text>`).join("")}
    </svg>`);
}

async function aiPhotoPanel(row, options = {}) {
  const source = aiSourcePath(row.id);
  if (!source) return null;
  const w = options.width ?? WIDTH;
  const h = options.height ?? HEIGHT;
  const base = await sharp(source)
    .rotate()
    .resize(w, h, { fit: "cover", position: "center" })
    .modulate({ brightness: 1.01, saturation: 0.98 })
    .jpeg({ quality: 94 })
    .toBuffer();
  const overlays = [];
  if (options.text) {
    overlays.push({ input: titleOverlaySvg(options.text, w, h), left: 0, top: 0 });
  }
  return sharp(base).composite(overlays).jpeg({ quality: 94 }).toBuffer();
}

async function environmentPanel(row, day, options = {}) {
  const w = options.width ?? WIDTH;
  const h = options.height ?? HEIGHT;
  const input = await productBuffer(row.handle, options.imageIndex ?? row.imageIndex ?? 0);
  const colors = palette(day);
  const text = options.text ? wrapText(options.text.toUpperCase(), 18, 3) : [];
  const bgPath = backgroundPathFor(row, day);
  const scene = Buffer.from(`
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="warmLight" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#fff7ed"/>
          <stop offset="0.48" stop-color="${colors.bg}"/>
          <stop offset="1" stop-color="#b99268"/>
        </linearGradient>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="${colors.shadow}" flood-opacity="0.24"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#warmLight)"/>
      ${sceneDecor(row.room ?? day.room ?? "living", w, h)}
      <rect width="100%" height="100%" fill="#211711" opacity="0.035"/>
    </svg>`);
  const base = existsSync(bgPath)
    ? await sharp(bgPath)
      .rotate()
      .resize(w, h, { fit: "cover", position: "center" })
      .modulate({ brightness: 1.01, saturation: 0.96 })
      .jpeg({ quality: 94 })
      .toBuffer()
    : await sharp(scene)
      .jpeg({ quality: 94 })
      .toBuffer();
  const targetW = Math.max(options.productW ?? 0, Math.round(w * 0.72));
  const targetH = Math.max(options.productH ?? 0, Math.round(h * 0.44));
  const productCutout = await trimmedProductImage(input, targetW, targetH);
  const meta = await sharp(productCutout).metadata();
  const productTop = Math.round(options.productTop ?? h * 0.64);
  const productLeft = Math.round(options.productLeft ?? (w - meta.width) / 2);
  const productY = Math.max(0, Math.min(h - meta.height, productTop - Math.round(meta.height / 2)));
  const productX = Math.max(0, Math.min(w - meta.width, productLeft));
  const titleY = Math.round(h * 0.30);
  const title = text.length
    ? `<rect x="${Math.round(w * 0.08)}" y="${titleY - 78}" width="${Math.round(w * 0.84)}" height="${112 + Math.max(0, text.length - 1) * 66}" fill="#2d211b" opacity="0.30"/>
      ${text.map((line, i) => `<text x="${w / 2}" y="${titleY + i * 66}" text-anchor="middle" font-family="Georgia, serif" font-size="${h <= 760 ? 42 : 64}" font-weight="700" fill="#fff7ef">${escapeXml(line)}</text>`).join("")}`
    : "";
  const coupon = options.coupon === false ? "" : `
    <rect x="${w - 296}" y="${h - 92}" width="230" height="58" rx="29" fill="#d9bd8f" opacity="0.92"/>
    <text x="${w - 181}" y="${h - 55}" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="${colors.dark}">PINTEREST10</text>`;
  const overlay = Buffer.from(`
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="warm" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#fff7ef" stop-opacity="0.12"/>
          <stop offset="0.45" stop-color="#5a3824" stop-opacity="0.08"/>
          <stop offset="1" stop-color="#1d1410" stop-opacity="0.10"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#warm)"/>
      ${title}
      ${coupon}
    </svg>`);
  const shadow = Buffer.from(`
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <filter id="blur"><feGaussianBlur stdDeviation="24"/></filter>
      <ellipse cx="${productX + meta.width / 2}" cy="${Math.min(h - 42, productY + meta.height - 12)}" rx="${Math.max(120, meta.width * 0.42)}" ry="${Math.max(24, meta.height * 0.065)}" fill="#1f1712" opacity="0.26" filter="url(#blur)"/>
    </svg>`);
  const composites = [
    { input: shadow, left: 0, top: 0 },
    { input: productCutout, left: productX, top: productY },
    { input: overlay, left: 0, top: 0 },
  ];

  return sharp(base)
    .composite(composites)
    .resize(w, h, { fit: "cover", position: "center" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function productInEnvironment(row, day) {
  const filePath = path.join(GENERATED_DIR, `pin-${row.id}.jpg`);
  const aiImage = await aiPhotoPanel(row);
  if (aiImage) {
    await sharp(aiImage).jpeg({ quality: 94 }).toFile(filePath);
    return filePath;
  }
  const image = await environmentPanel(row, day, {
    imageIndex: row.imageIndex ?? 0,
    productW: row.productW,
    productH: row.productH,
    productTop: row.productTop,
    productLeft: row.productLeft,
  });
  await sharp(image).jpeg({ quality: 92 }).toFile(filePath);
  return filePath;
}

async function environmentWithTitle(row, day) {
  const filePath = path.join(GENERATED_DIR, `pin-${row.id}.jpg`);
  const aiImage = await aiPhotoPanel(row, { text: row.overlay ?? row.keyword });
  if (aiImage) {
    await sharp(aiImage).jpeg({ quality: 94 }).toFile(filePath);
    return filePath;
  }
  const image = await environmentPanel(row, day, {
    imageIndex: row.imageIndex ?? 0,
    text: row.overlay ?? row.keyword,
    productW: row.productW,
    productH: row.productH,
    productTop: row.productTop,
    productLeft: row.productLeft,
  });
  await sharp(image).jpeg({ quality: 92 }).toFile(filePath);
  return filePath;
}

async function splitTwoProducts(row, day) {
  const filePath = path.join(GENERATED_DIR, `pin-${row.id}.jpg`);
  const aiImage = await aiPhotoPanel(row);
  if (aiImage) {
    await sharp(aiImage).jpeg({ quality: 94 }).toFile(filePath);
    return filePath;
  }
  const top = await environmentPanel(row, day, {
    height: HEIGHT / 2,
    coupon: false,
    imageIndex: row.imageIndex ?? 0,
    productW: row.productW,
    productH: row.productH,
    productTop: row.splitTopProductTop,
    productLeft: row.productLeft,
  });
  const bottom = await environmentPanel({ ...row, handle: row.handle2 }, day, {
    height: HEIGHT / 2,
    coupon: false,
    imageIndex: row.imageIndex2 ?? 0,
    productW: row.productW2 ?? row.productW,
    productH: row.productH2 ?? row.productH,
    productTop: row.splitBottomProductTop,
    productLeft: row.productLeft2 ?? row.productLeft,
  });
  const divider = Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="${HEIGHT / 2 - 3}" width="${WIDTH}" height="6" fill="#fbf7ef"/></svg>`);
  await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: "#f4efe7" } })
    .composite([
      { input: top, left: 0, top: 0 },
      { input: bottom, left: 0, top: HEIGHT / 2 },
      { input: divider, left: 0, top: 0 },
    ])
    .jpeg({ quality: 92 })
    .toFile(filePath);
  return filePath;
}

const week = [
  {
    date: "2026-08-31",
    board: "Banheiro moderno",
    rows: [
      { id: 8001, label: "foto Shopify sem texto", keyword: "porta papel higiênico preto para banheiro moderno", handle: "porta-papel-higienico-de-parede-papeleira-para-banheiro-preto", style: "product" },
      { id: 8002, label: "produto em ambiente sem texto", keyword: "porta papel higiênico dourado para lavabo chique", handle: "porta-papel-higienico-de-parede-papeleira-para-banheiro-dourado", style: "environment", room: "bath", imageIndex: 1, position: "center", productW: 720, productH: 520, productTop: 860 },
      { id: 8003, label: "ambiente com texto", keyword: "banheiro moderno", overlay: "Banheiro moderno", handle: "porta-papel-higienico-de-parede-moderno-estilo-a-prateado", style: "title", room: "bath", imageIndex: 1, position: "center", productW: 720, productH: 520, productTop: 940 },
      { id: 8004, label: "foto Shopify sem texto", keyword: "porta papel higiênico cinza para banheiro", handle: "porta-papel-higienico-de-parede-moderno-para-banheiro-cinza", style: "product" },
      { id: 8005, label: "grade 2 produtos", keyword: "banheiro organizado com acessórios modernos", handle: "saboneteira-para-banheiro-de-parede-em-inox-2-pecas", handle2: "suporte-para-toalha-banheiro-moderno-decoracao", style: "split", room: "bath", imageIndex: 1, imageIndex2: 1, productW: 760, productH: 360, splitTopProductTop: 480, splitBottomProductTop: 475 },
    ],
  },
  {
    date: "2026-09-01",
    board: "Cozinha sofisticada",
    rows: [
      { id: 8006, label: "foto Shopify sem texto", keyword: "tapete de cozinha minimalista azul antiderrapante", handle: "tapete-para-cozinha-antiderrapante-absorvente-minimalista-azul", style: "product" },
      { id: 8007, label: "produto em ambiente sem texto", keyword: "tapete de cozinha listrado vermelho moderno", handle: "tapete-para-cozinha-antiderrapante-absorvente-listrado-vermelho", style: "environment", room: "kitchen", imageIndex: 1, position: "center", productW: 900, productH: 520, productTop: 1110 },
      { id: 8008, label: "ambiente com texto", keyword: "cozinha sofisticada", overlay: "Cozinha sofisticada", handle: "tapete-para-cozinha-antiderrapante-absorvente-listrado-marrom", style: "title", room: "kitchen", imageIndex: 1, position: "center", productW: 900, productH: 520, productTop: 1120 },
      { id: 8009, label: "foto Shopify sem texto", keyword: "tapete de cozinha versátil preto absorvente", handle: "tapete-para-cozinha-antiderrapante-absorvente-versatil-preto", style: "product" },
      { id: 8010, label: "grade 2 produtos", keyword: "passadeiras modernas para cozinha decorada", handle: "tapete-para-cozinha-antiderrapante-passadeira-moderno-branco-c-laranja", handle2: "tapete-para-cozinha-antiderrapante-passadeira-moderno-estampado", style: "split", room: "kitchen", imageIndex: 1, imageIndex2: 1, productW: 880, productH: 360, splitTopProductTop: 505, splitBottomProductTop: 505 },
    ],
  },
  {
    date: "2026-09-02",
    board: "Sala de jantar elegante",
    rows: [
      { id: 8011, label: "foto Shopify sem texto", keyword: "luminária espiral dourada para sala de jantar", handle: "luminaria-de-teto-para-sala-quarto-cozinha-em-led-espiral-dourada", style: "product" },
      { id: 8012, label: "produto em ambiente sem texto", keyword: "luminária pendente led para sala de jantar", handle: "luminaria-pendente-para-quarto-sala-cozinha-banheiro-led", style: "environment", room: "living", imageIndex: 1, position: "center", productW: 760, productH: 620, productTop: 490 },
      { id: 8013, label: "ambiente com texto", keyword: "sala de jantar elegante", overlay: "Sala de jantar elegante", handle: "luminaria-pendente-para-sala-quarto-cozinha-led-minimalista-2-pecas", style: "title", room: "living", imageIndex: 1, position: "center", productW: 760, productH: 620, productTop: 560 },
      { id: 8014, label: "foto Shopify sem texto", keyword: "arandela led moderna para sala", handle: "arandela-de-parede-externa-interna-luminaria-led", style: "product" },
      { id: 8015, label: "grade 2 produtos", keyword: "sala de jantar com cadeira elegante", handle: "capa-de-cadeira-de-jantar-impermeavel-chique-longa", handle2: "capa-para-cadeira-eames-eiffel-impermeavel-lisa-decorativa", style: "split", room: "living", imageIndex: 1, imageIndex2: 1, productW: 760, productH: 440, splitTopProductTop: 500, splitBottomProductTop: 500 },
    ],
  },
  {
    date: "2026-09-03",
    board: "Sala decorada",
    rows: [
      { id: 8016, label: "foto Shopify sem texto", keyword: "porta retrato de vidro dourado para sala", handle: "porta-retrato-personalizado-de-vidro-chique-moderno-dourado", style: "product" },
      { id: 8017, label: "produto em ambiente sem texto", keyword: "porta retrato de vidro rosa decorativo", handle: "porta-retrato-personalizado-de-vidro-chique-moderno-rosa", style: "environment", room: "living", imageIndex: 1, position: "center", productW: 620, productH: 620, productTop: 980 },
      { id: 8018, label: "ambiente com texto", keyword: "sala decorada", overlay: "Sala decorada", handle: "porta-retrato-personalizado-de-vidro-chique-moderno-prateado", style: "title", room: "living", imageIndex: 1, position: "center", productW: 620, productH: 620, productTop: 1000 },
      { id: 8019, label: "foto Shopify sem texto", keyword: "porta retrato de vidro preto moderno", handle: "porta-retrato-personalizado-de-vidro-chique-moderno-preto", style: "product" },
      { id: 8020, label: "grade 2 produtos", keyword: "porta retratos modernos para decoração", handle: "porta-retrato-personalizado-de-vidro-moderno-prateado", handle2: "porta-retrato-personalizado-em-madeira-acrilico-10x15-13x18-15x21-e-20x25", style: "split", room: "living", imageIndex: 1, imageIndex2: 1, productW: 660, productH: 380, splitTopProductTop: 500, splitBottomProductTop: 500 },
    ],
  },
  {
    date: "2026-09-04",
    board: "Sala sofisticada",
    rows: [
      { id: 8021, label: "foto Shopify sem texto", keyword: "escultura decorativa buldogue para sala", handle: "escultura-decorativa-bandeja-buldogue-frances-decoracao-para-sala", style: "product" },
      { id: 8022, label: "produto em ambiente sem texto", keyword: "escultura pássaro de cerâmica para decoração", handle: "escultura-decorativa-para-sala-estatueta-passaro-ceramica-decoracao", style: "environment", room: "living", imageIndex: 1, position: "center", productW: 640, productH: 540, productTop: 1020 },
      { id: 8023, label: "ambiente com texto", keyword: "sala sofisticada", overlay: "Sala sofisticada", handle: "escultura-decorativa-abstrata-o-apaixonado-decoracao-para-sala", style: "title", room: "living", imageIndex: 1, position: "center", productW: 640, productH: 540, productTop: 1030 },
      { id: 8024, label: "foto Shopify sem texto", keyword: "castiçal dourado para mesa decorada", handle: "castical-de-vela-dourado-para-mesa-decoracao", style: "product" },
      { id: 8025, label: "grade 2 produtos", keyword: "objetos decorativos sofisticados para sala", handle: "adorno-decorativo-de-frutas-cristal-moderno-decoracao-para-sala", handle2: "escultura-decorativa-com-bandeja-urso-geometrico-decoracao-sala", style: "split", room: "living", imageIndex: 1, imageIndex2: 1, productW: 680, productH: 400, splitTopProductTop: 500, splitBottomProductTop: 500 },
    ],
  },
  {
    date: "2026-09-05",
    board: "Mesa posta elegante",
    rows: [
      { id: 8026, label: "foto Shopify sem texto", keyword: "jogo de talheres inox para mesa posta elegante", handle: "jogo-de-talheres-faqueiro-em-inox-completo-24-pecas-decoracao-cozinha", style: "product" },
      { id: 8027, label: "produto em ambiente sem texto", keyword: "bandeja espelhada redonda para café e sala", handle: "bandeja-decorativa-espelhada-redonda-de-acrilico-para-cafe-e-sala", style: "environment", room: "living", imageIndex: 1, position: "center", productW: 760, productH: 520, productTop: 1050 },
      { id: 8028, label: "ambiente com texto", keyword: "mesa posta elegante", overlay: "Mesa posta elegante", handle: "bandeja-decorativa-redonda-de-vime-rattan-premium", style: "title", room: "living", imageIndex: 1, position: "center", productW: 760, productH: 520, productTop: 1060 },
      { id: 8029, label: "foto Shopify sem texto", keyword: "organizador de pratos vertical para cozinha", handle: "organizador-de-pratos-vertical-para-cozinha-decoracao", style: "product" },
      { id: 8030, label: "grade 2 produtos", keyword: "cozinha organizada para servir com estilo", handle: "suporte-para-papel-toalha-de-cozinha-prateleira-decoracao", handle2: "porta-copos-pratos-para-sofa-redondo-portatil", style: "split", room: "kitchen", imageIndex: 1, imageIndex2: 1, productW: 760, productH: 380, splitTopProductTop: 505, splitBottomProductTop: 505 },
    ],
  },
  {
    date: "2026-09-06",
    board: "Quarto aconchegante",
    rows: [
      { id: 8031, label: "foto Shopify sem texto", keyword: "relógio de mesa triangular marrom para quarto", handle: "relogio-de-mesa-digital-despertador-triangular-marrom", style: "product" },
      { id: 8032, label: "produto em ambiente sem texto", keyword: "relógio de mesa decorativo marrom para cabeceira", handle: "relogio-de-mesa-digital-despertador-decorativo-marrom", style: "environment", room: "bed", imageIndex: 1, position: "center", productW: 660, productH: 430, productTop: 1015 },
      { id: 8033, label: "ambiente com texto", keyword: "quarto aconchegante", overlay: "Quarto aconchegante", handle: "relogio-de-mesa-digital-despertador-led-grande", style: "title", room: "bed", imageIndex: 1, position: "center", productW: 660, productH: 430, productTop: 1030 },
      { id: 8034, label: "foto Shopify sem texto", keyword: "relógio de mesa moderno branco", handle: "relogio-de-mesa-digital-despertador-moderno-branco", style: "product" },
      { id: 8035, label: "grade 2 produtos", keyword: "relógios de mesa com carregador sem fio", handle: "relogio-de-mesa-digital-despertador-e-carregador-sem-fio-led-moderno-3-em-1", handle2: "relogio-de-mesa-digital-carregador-e-despertador-sem-fio-led-4-em-1", style: "split", room: "bed", imageIndex: 1, imageIndex2: 1, productW: 720, productH: 390, splitTopProductTop: 505, splitBottomProductTop: 505 },
    ],
  },
];

const csv = ["id,date,board_name,keyword,product_handle,visual_strategy,product_2_handle"];
const cards = [];

for (const day of week) {
  for (const row of day.rows) {
    let imagePath;
    if (row.style === "product") imagePath = await productFullBleed(row, day);
    if (row.style === "environment") imagePath = await productInEnvironment(row, day);
    if (row.style === "title") imagePath = await environmentWithTitle(row, day);
    if (row.style === "split") imagePath = await splitTwoProducts(row, day);
    row.imagePath = imagePath;
    row.title = cleanTitle(product(row.handle).title);
    if (row.style === "split") {
      row.title = `${cleanTitle(product(row.handle).title)} + ${cleanTitle(product(row.handle2).title)}`;
    }
    csv.push([row.id, day.date, day.board, row.keyword, row.handle, row.style, row.handle2 ?? ""].join(","));
    cards.push({ day, row, imagePath });
  }
}

writeFileSync(path.join(ROOT, "data", "weekly_campaign_2026-08-31.csv"), `${csv.join("\n")}\n`, "utf8");

const cardW = 210;
const cardH = 315;
const gap = 18;
const headH = 58;
const labelH = 64;
const pad = 18;
const previewW = pad * 2 + 5 * cardW + 4 * gap;
const dayH = headH + cardH + labelH + pad;
const previewH = pad + week.length * dayH;
const composites = [];
let y = pad;

for (const day of week) {
  composites.push({
    input: Buffer.from(`
      <svg width="${previewW}" height="${headH}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#3b2b23"/>
        <text x="18" y="38" font-family="Arial" font-size="28" font-weight="800" fill="#fff7ef">${escapeXml(day.date)} | ${escapeXml(day.board)} | 5 estilos</text>
      </svg>`),
    left: 0,
    top: y,
  });
  y += headH;
  let x = pad;
  for (const row of day.rows) {
    const image = await sharp(row.imagePath).resize(cardW, cardH, { fit: "cover", position: "center" }).jpeg({ quality: 88 }).toBuffer();
    composites.push({ input: image, left: x, top: y });
    composites.push({
      input: Buffer.from(`
        <svg width="${cardW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#fbf7ef"/>
          <text x="0" y="22" font-family="Arial" font-size="15" font-weight="800" fill="#3b2b23">${escapeXml(row.id)} | ${escapeXml(row.label)}</text>
          <text x="0" y="48" font-family="Arial" font-size="15" fill="#6b5a50">${escapeXml(row.keyword.slice(0, 29))}</text>
        </svg>`),
      left: x,
      top: y + cardH,
    });
    x += cardW + gap;
  }
  y += cardH + labelH + pad;
}

await sharp({
  create: { width: previewW, height: previewH, channels: 3, background: "#fbf7ef" },
})
  .composite(composites)
  .jpeg({ quality: 90 })
  .toFile(PREVIEW_PATH);

console.log(PREVIEW_PATH);
