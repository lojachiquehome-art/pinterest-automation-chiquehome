import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WIDTH = 1000;
const HEIGHT = 1500;
const STORE_URL = "https://chiquehome.com.br";
const PRODUCT_DIR = path.join(ROOT, "public", "pinterest", "product-originals");
const GENERATED_DIR = path.join(ROOT, "public", "pinterest", "generated");
const IMAGE_OVERRIDES_BY_ROW_ID = {
  1001: "https://chiquehome.com.br/cdn/shop/files/porta-papel-higienico-de-parede-para-banheiro-moderno-duplo-preto-produto-principal_75876fa6-c49c-4794-9b99-c68be51e78a1.jpg?v=1783619178",
};

function parseArgs() {
  const args = process.argv.slice(2);
  const valueAfter = (flag, fallback) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : fallback;
  };
  return {
    limit: Number(valueAfter("--limit", 10)),
    offset: Number(valueAfter("--offset", 0)),
    includePublished: args.includes("--include-published"),
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

function textContext(row) {
  return `${row.board_name} ${row.keyword} ${row.product_title} ${row.product_handle}`.toLowerCase();
}

function accentText(value) {
  return String(value ?? "")
    .replace(/\brelogios\b/gi, "relógios")
    .replace(/\brelogio\b/gi, "relógio")
    .replace(/\biluminacao\b/gi, "iluminação")
    .replace(/\bluminaria\b/gi, "luminária")
    .replace(/\bdecoracao\b/gi, "decoração")
    .replace(/\borganizacao\b/gi, "organização")
    .replace(/\bhigienico\b/gi, "higiênico")
    .replace(/\bacrilico\b/gi, "acrílico")
    .replace(/\bgiratorio\b/gi, "giratório")
    .replace(/\bsofa\b/gi, "sofá")
    .replace(/\btrico\b/gi, "tricô")
    .replace(/\bmoveis\b/gi, "móveis");
}

function conciseProductTitle(row) {
  const text = textContext(row);
  if (text.includes("lorenzzo")) return "Relógio de parede Lorenzzo";
  if (text.includes("relogio de parede")) return "Relógio de parede";
  if (text.includes("relogio digital") || text.includes("relogio de mesa")) return "Relógio de mesa";
  if (text.includes("porta-papel") || text.includes("porta papel")) return "Porta papel higiênico";
  if (text.includes("tapete")) return "Tapete para cozinha";
  if (text.includes("organizador")) return "Organizador de maquiagem";
  if (text.includes("bandeja")) return "Bandeja para banheiro";
  if (text.includes("luminaria")) return "Luminária de teto";
  if (text.includes("lustre")) return "Lustre pendente";
  if (text.includes("arandela")) return "Arandela de parede";
  if (text.includes("capa para cadeira") || text.includes("cadeira")) return "Capa para cadeira";
  if (text.includes("almofada")) return "Capa de almofada";
  if (text.includes("livro caixa")) return "Livro caixa decorativo";
  return accentText(row.keyword);
}

function shouldZoomOut(row) {
  return /relogio|rel[oó]gio/i.test(`${row.board_name} ${row.keyword} ${row.product_title}`);
}

function isDigitalTableClock(row) {
  return /relogio.*mesa|relogio.*digital|despertador|cabeceira/i.test(textContext(row));
}

function smartImagePosition(row) {
  const text = textContext(row);
  if (text.includes("lorenzzo")) return "right";
  if (text.includes("relogio de parede") && row.visual_strategy === "environment_full_bleed") return "right";
  return "center";
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
  <text x="125" y="${textY}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${colors.accent}" letter-spacing="2">${escapeXml(accentText(row.board_name).toUpperCase())}</text>
  ${titleLines.map((line, i) => `<text x="125" y="${textY + 72 + i * 62}" font-family="Arial, sans-serif" font-size="54" font-weight="800" fill="${colors.dark}">${escapeXml(line)}</text>`).join("")}
  ${keywordLines.map((line, i) => `<text x="125" y="${textY + 330 + i * 42}" font-family="Arial, sans-serif" font-size="34" fill="${colors.dark}" opacity="0.82">${escapeXml(accentText(line))}</text>`).join("")}
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

function normalizeImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function imageUrlsFromProductPage(html) {
  const candidates = [];
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi,
    /\/\/chiquehome\.com\.br\/cdn\/shop\/files\/[^"'\s>]+/gi,
    /\/\/cdn\.shopify\.com\/s\/files\/[^"'\s>]+/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html))) candidates.push(normalizeImageUrl(match[1] || match[0]));
  }
  return [...new Set(candidates)]
    .filter((url) => !/logo|favicon|payment|visa|mastercard|pix/i.test(url));
}

function imageUrlFromProductPage(html) {
  return imageUrlsFromProductPage(html)[0] ?? "";
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ChiqueHomePinterestAutomation/1.0",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`Imagem ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function productPageImageUrls(row) {
  const productUrl = `${STORE_URL}/products/${row.product_handle}`;
  const page = await fetch(productUrl, {
    headers: { "User-Agent": "ChiqueHomePinterestAutomation/1.0" },
  });
  if (!page.ok) return [];
  return imageUrlsFromProductPage(await page.text());
}

function pickImageUrl(row, urls) {
  if (IMAGE_OVERRIDES_BY_ROW_ID[row.id]) return IMAGE_OVERRIDES_BY_ROW_ID[row.id];

  const normalizedPrimary = normalizeImageUrl(row.image_url).replace(/^http:/, "https:");
  const cleanUrls = urls
    .map((url) => normalizeImageUrl(url).replace(/^http:/, "https:"))
    .filter(Boolean);
  const alternateUrls = cleanUrls.filter((url) => url !== normalizedPrimary);

  if (/livro-caixa/i.test(row.product_handle)) return normalizedPrimary;
  if (/lorenzzo/i.test(textContext(row))) {
    const fullSceneUrl = alternateUrls.find((url) => /lorenzzo_wood/i.test(url)) ?? alternateUrls[0] ?? normalizedPrimary;
    if (row.visual_strategy === "product_in_environment" || row.visual_strategy === "environment_full_bleed" || row.visual_strategy === "product_title_overlay") {
      return fullSceneUrl;
    }
  }
  if (row.visual_strategy === "product_full_bleed" && isDigitalTableClock(row)) return alternateUrls[0] ?? normalizedPrimary;
  if (row.visual_strategy === "product_full_bleed") return normalizedPrimary;
  if (row.visual_strategy === "product_in_environment") return alternateUrls[1] ?? alternateUrls[0] ?? normalizedPrimary;
  if (row.visual_strategy === "environment_full_bleed") return alternateUrls[2] ?? alternateUrls[1] ?? alternateUrls[0] ?? normalizedPrimary;
  if (row.visual_strategy === "environment_title_overlay") return alternateUrls[3] ?? alternateUrls[1] ?? alternateUrls[0] ?? normalizedPrimary;
  if (row.visual_strategy === "product_title_overlay") return alternateUrls[0] ?? normalizedPrimary;
  return normalizedPrimary;
}

async function productImageBuffer(row) {
  const productUrls = await productPageImageUrls(row);
  const selectedUrl = pickImageUrl(row, productUrls);
  const candidates = [
    selectedUrl,
    ...productUrls,
    row.image_url,
  ]
    .map((url) => normalizeImageUrl(url).replace(/^http:/, "https:"))
    .filter(Boolean);
  const uniqueCandidates = [...new Set(candidates)];
  let lastError;

  for (const imageUrl of uniqueCandidates) {
    try {
      if (imageUrl !== normalizeImageUrl(row.image_url).replace(/^http:/, "https:")) {
        console.log(`Using alternate Shopify image for row ${row.id}: ${imageUrl}`);
      }
      return await fetchBuffer(imageUrl);
    } catch (error) {
      lastError = error;
      console.log(`Skipping unavailable Shopify image for row ${row.id}: ${imageUrl}`);
    }
  }

  throw lastError ?? new Error(`Nenhuma imagem Shopify disponivel para row ${row.id}`);
}

async function productDataUrl(row) {
  const input = await productImageBuffer(row);
  const output = await sharp(input)
    .rotate()
    .resize(720, 720, { fit: "cover", position: "center" })
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${output.toString("base64")}`;
}

function designedOverlay(row) {
  const colors = palette(row.board_name);
  const rawTitle = row.visual_strategy === "product_title_overlay"
    ? conciseProductTitle(row)
    : row.visual_strategy === "environment_title_overlay"
      ? row.keyword
      : "";
  const title = accentText(rawTitle);
  const titleLines = wrapText(title, 18, 3);
  const showTitle = row.visual_strategy === "environment_title_overlay" || row.visual_strategy === "product_title_overlay";
  const showSmall = row.visual_strategy === "product_in_environment";
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="#000" opacity="${showTitle ? "0.22" : "0.03"}"/>
      ${showTitle ? `<rect x="70" y="360" width="860" height="560" rx="0" fill="#000" opacity="0.10"/>` : ""}
      ${titleLines.map((line, i) => `<text x="500" y="${500 + i * 92}" text-anchor="middle" font-family="Georgia, serif" font-size="82" font-weight="700" fill="#fff7ed">${escapeXml(accentText(line).toUpperCase())}</text>`).join("")}
      ${showSmall ? `<rect x="80" y="1090" width="610" height="86" rx="43" fill="#fff8ef" opacity="0.88"/><text x="124" y="1146" font-family="Arial" font-size="34" font-weight="700" fill="${colors.dark}">Veja o produto na Chique Home</text>` : ""}
      <rect x="640" y="1380" width="280" height="72" rx="36" fill="#d9b98f" opacity="0.9"/>
      <text x="780" y="1427" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#3b2d24">PINTEREST10</text>
    </svg>
  `;
}

async function renderDesignedPin(row) {
  mkdirSync(GENERATED_DIR, { recursive: true });
  const fileName = `pin-${String(row.id).padStart(4, "0")}.jpg`;
  const filePath = path.join(GENERATED_DIR, fileName);
  const input = await productImageBuffer(row);
  const background = await sharp(input)
    .rotate()
    .resize(WIDTH, HEIGHT, {
      fit: "cover",
      position: smartImagePosition(row),
    })
    .modulate({ brightness: row.visual_strategy === "environment_full_bleed" ? 1.02 : 0.88, saturation: 0.94 })
    .jpeg({ quality: 91 })
    .toBuffer();

  const finalImage = await sharp(background)
    .composite([{ input: Buffer.from(designedOverlay(row)), left: 0, top: 0 }])
    .jpeg({ quality: 91 })
    .toBuffer();

  writeFileSync(filePath, finalImage);

  return { fileName, filePath };
}

async function renderProductPin(row) {
  mkdirSync(PRODUCT_DIR, { recursive: true });
  const fileName = `pin-${String(row.id).padStart(4, "0")}.jpg`;
  const filePath = path.join(PRODUCT_DIR, fileName);

  const input = await productImageBuffer(row);
  const style = Number(row.id) % 2 === 0 ? "shopify_original" : "product_closeup";
  const image = sharp(input).rotate();
  const metadata = await image.metadata();

  const resized = await sharp(input)
    .rotate()
    .resize(WIDTH, HEIGHT, {
      fit: "cover",
      position: smartImagePosition(row),
    })
    .jpeg({ quality: 92 })
    .toBuffer();

  const badge = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="640" y="1380" width="280" height="72" rx="36" fill="#d9b98f" opacity="0.9"/>
      <text x="780" y="1427" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#3b2d24">PINTEREST10</text>
    </svg>
  `);

  const finalImage = await sharp(resized)
    .composite([
      { input: badge, left: 0, top: 0 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();

  writeFileSync(filePath, finalImage);

  return {
    fileName,
    filePath,
    style,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
  };
}

function datedDir() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const { limit, offset, includePublished } = parseArgs();
const rowsPath = path.join(ROOT, "output", "pins_batch.json");
const rows = JSON.parse(readFileSync(rowsPath, "utf8"));
const publishedPath = path.join(ROOT, "output", "published_pins.json");
const publishedIds = existsSync(publishedPath)
  ? new Set(JSON.parse(readFileSync(publishedPath, "utf8")).map((item) => String(item.row_id)))
  : new Set();
const imageDate = datedDir();
const outDir = path.join(ROOT, "public", "pinterest", imageDate);
mkdirSync(outDir, { recursive: true });
mkdirSync(PRODUCT_DIR, { recursive: true });
mkdirSync(GENERATED_DIR, { recursive: true });

const selected = rows
  .filter((row) => row.status === "ready" && (includePublished || !publishedIds.has(String(row.id))) && (includePublished || !row.generated_image_url))
  .slice(offset, offset + limit);
const baseUrl = process.env.PIN_IMAGE_BASE_URL?.replace(/\/$/, "");
const needsAi = [];

for (const row of selected) {
  if (row.visual_strategy === "product_full_bleed") {
    if (!baseUrl) throw new Error("PIN_IMAGE_BASE_URL precisa estar configurado para imagens de produto.");
    const rendered = await renderProductPin(row);
    row.generated_image_url = `${baseUrl}/product-originals/${rendered.fileName}`;
    row.generated_image_path = `public/pinterest/product-originals/${rendered.fileName}`;
    row.product_image_style = rendered.style;
    console.log(`Rendered product image: row ${row.id} | ${rendered.fileName} | ${rendered.style}`);
    continue;
  }

  if (!baseUrl) throw new Error("PIN_IMAGE_BASE_URL precisa estar configurado para imagens geradas.");
  const rendered = await renderDesignedPin(row);
  row.generated_image_url = `${baseUrl}/generated/${rendered.fileName}`;
  row.generated_image_path = `public/pinterest/generated/${rendered.fileName}`;
  console.log(`Rendered designed image: row ${row.id} | ${rendered.fileName} | ${row.visual_strategy}`);
}

writeFileSync(rowsPath, JSON.stringify(rows, null, 2), "utf8");
writeFileSync(path.join(ROOT, "output", "image_manifest.json"), JSON.stringify({
  imageDate,
  baseUrl: baseUrl ?? "",
  rendered: selected.filter((row) => row.generated_image_url).map((row) => ({
    id: row.id,
    keyword: row.keyword,
    visual_strategy: row.visual_strategy,
    generated_image_path: row.generated_image_path,
    generated_image_url: row.generated_image_url,
  })),
  needsAi: needsAi.map((row) => ({
    id: row.id,
    board_name: row.board_name,
    keyword: row.keyword,
    visual_strategy: row.visual_strategy,
    product_title: row.product_title,
    product_image_url: row.image_url,
    prompt: row.generated_image_prompt,
  })),
}, null, 2), "utf8");
