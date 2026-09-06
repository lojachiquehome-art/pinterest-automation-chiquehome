import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WIDTH = 1000;
const HEIGHT = 1500;
const OUT_DIR = path.join(ROOT, "public", "pinterest", "preview-2026-09-07");
const PRODUCT_DIR = path.join(OUT_DIR, "product");
const GENERATED_DIR = path.join(OUT_DIR, "generated");
const AI_SOURCE_DIR = path.join(OUT_DIR, "ai-source");
const PREVIEW_PATH = path.join(ROOT, "output", "preview_week_5_styles_2026-09-07_to_2026-09-13.jpg");
const CSV_PATH = path.join(ROOT, "data", "weekly_campaign_2026-09-07.csv");

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

function imageUrls(item) {
  const urls = [];
  for (const image of item.images ?? []) {
    if (image?.src) urls.push(image.src.startsWith("//") ? `https:${image.src}` : image.src);
  }
  if (!urls.length && item.image?.src) {
    urls.push(item.image.src.startsWith("//") ? `https:${item.image.src}` : item.image.src);
  }
  if (!urls.length) throw new Error(`Produto sem imagem: ${item.handle}`);
  return [...new Set(urls)];
}

async function liveImageUrls(handle) {
  const response = await fetch(`https://chiquehome.com.br/products/${handle}.js`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) return [];
  const data = await response.json();
  const urls = [
    ...(data.images ?? []),
    data.featured_image,
  ].filter(Boolean);
  return [...new Set(urls)].map((url) => (url.startsWith("//") ? `https:${url}` : url));
}

async function fetchBuffer(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      });
      if (!response.ok) throw new Error(`Imagem ${response.status}: ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

async function productBuffer(handle, preferredIndex = 0) {
  const urls = imageUrls(product(handle));
  const ordered = [
    ...urls.slice(preferredIndex),
    ...urls.slice(0, preferredIndex),
  ];
  let lastError;
  for (const url of [...ordered, ...(await liveImageUrls(handle))]) {
    try {
      return await fetchBuffer(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
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

function titleOverlaySvg(textValue, w = WIDTH, h = HEIGHT, options = {}) {
  const fontSize = options.fontSize ?? 66;
  const lineGap = options.lineGap ?? 76;
  const text = wrapText(String(textValue ?? "").toUpperCase(), options.maxChars ?? 18, 3);
  const y = Math.round(h * (options.y ?? 0.33));
  const rectTop = y - Math.round(fontSize * 1.18);
  const rectHeight = Math.round(fontSize * 1.7) + Math.max(0, text.length - 1) * lineGap;
  return Buffer.from(`
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#21160f" flood-opacity="0.55"/>
        </filter>
      </defs>
      <rect x="${Math.round(w * 0.12)}" y="${rectTop}" width="${Math.round(w * 0.76)}" height="${rectHeight}" fill="#2d211b" opacity="0.18"/>
      ${text.map((line, i) => `<text x="${w / 2}" y="${y + i * lineGap}" text-anchor="middle" font-family="Georgia, serif" font-size="${fontSize}" font-weight="700" fill="#fff7ef" filter="url(#shadow)">${escapeXml(line)}</text>`).join("")}
    </svg>`);
}

function couponSvg(w = WIDTH, h = HEIGHT) {
  return Buffer.from(`
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${w - 296}" y="${h - 92}" width="230" height="58" rx="29" fill="#d9bd8f" opacity="0.92"/>
      <text x="${w - 181}" y="${h - 55}" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#3b2b23">PINTEREST10</text>
    </svg>`);
}

async function productFullBleed(row) {
  const input = await productBuffer(row.handle, row.imageIndex ?? 0);
  const filePath = path.join(PRODUCT_DIR, `pin-${row.id}.jpg`);
  await sharp(input)
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: "cover", position: row.position ?? "center" })
    .jpeg({ quality: 92 })
    .toFile(filePath);
  return filePath;
}

async function aiPhotoPanel(row, options = {}) {
  const src = path.join(AI_SOURCE_DIR, `pin-${row.id}.png`);
  if (!existsSync(src)) return "";
  const overlays = [];
  if (options.text) overlays.push({ input: titleOverlaySvg(options.text, WIDTH, HEIGHT, options.title ?? {}), left: 0, top: 0 });
  overlays.push({ input: couponSvg(), left: 0, top: 0 });
  return sharp(src)
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: "cover", position: row.position ?? "center" })
    .composite(overlays)
    .jpeg({ quality: 94 })
    .toBuffer();
}

async function generatedPanel(row, options = {}) {
  const image = await aiPhotoPanel(row, options);
  if (!image) throw new Error(`Imagem AI validada ausente: ${path.join(AI_SOURCE_DIR, `pin-${row.id}.png`)}`);
  const filePath = path.join(GENERATED_DIR, `pin-${row.id}.jpg`);
  await sharp(image).jpeg({ quality: 94 }).toFile(filePath);
  return filePath;
}

const week = [
  {
    date: "2026-09-07",
    board: "Relógios de parede",
    rows: [
      { id: 9001, label: "foto Shopify sem texto", keyword: "relógio de parede Napoli escuro para sala", handle: "relogio-de-parede-napoli-dark-a", style: "product" },
      { id: 9002, label: "produto em ambiente sem texto", keyword: "relógio de parede Torino verde decorativo", handle: "relogio-de-parede-torino-green", style: "environment" },
      { id: 9003, label: "ambiente com texto", keyword: "sala moderna", overlay: "Sala moderna", handle: "relogio-de-parede-valentino-black-rose", style: "title" },
      { id: 9004, label: "foto Shopify sem texto", keyword: "relógio de parede Valentino branco rose", handle: "relogio-de-parede-valentino-white-rose", style: "product" },
      { id: 9005, label: "grade 2 produtos", keyword: "relógios de parede elegantes para sala", handle: "relogio-de-parede-aurelio-silver-black", handle2: "relogio-de-parede-lorenzzo-white-gold", style: "split" },
    ],
  },
  {
    date: "2026-09-08",
    board: "Banheiro organizado",
    rows: [
      { id: 9006, label: "foto Shopify sem texto", keyword: "organizador de maquiagem para banheiro", handle: "organizador-de-maquiagem-e-cosmeticos-grande-com-gavetas-decoracao", style: "product" },
      { id: 9007, label: "produto em ambiente sem texto", keyword: "tapete de banheiro antiderrapante azul", handle: "tapete-para-banheiro-antiderrapante-box-banho-chique-azul", style: "environment" },
      { id: 9008, label: "ambiente com texto", keyword: "banheiro organizado", overlay: "Banheiro organizado", handle: "tapete-para-banheiro-antiderrapante-box-banho-chique-marrom", style: "title" },
      { id: 9009, label: "foto Shopify sem texto", keyword: "porta papel higiênico preto moderno", handle: "porta-papel-higienico-de-parede-moderno-estilo-a-preto", style: "product" },
      { id: 9010, label: "grade 2 produtos", keyword: "banheiro prático com tapetes e acessórios", handle: "tapete-capacho-de-natal-para-entrada-cozinha-banheiro-welcome", handle2: "tapete-capacho-de-natal-para-entrada-cozinha-banheiro-rena", style: "split" },
    ],
  },
  {
    date: "2026-09-09",
    board: "Sala decorada",
    rows: [
      { id: 9011, label: "foto Shopify sem texto", keyword: "vaso decorativo de cerâmica dois corações", handle: "vaso-decorativo-para-sala-de-ceramica-2-coracoes-decoracao", style: "product" },
      { id: 9012, label: "produto em ambiente sem texto", keyword: "vaso decorativo coração para sala", handle: "vaso-decorativo-para-sala-de-ceramica-coracao-decoracao", style: "environment" },
      { id: 9013, label: "ambiente com texto", keyword: "sala decorada", overlay: "Sala decorada", handle: "vaso-decorativo-para-sala-cilindro-para-mesa-decoracao", style: "title" },
      { id: 9014, label: "foto Shopify sem texto", keyword: "vaso decorativo mão para mesa", handle: "vaso-decorativo-para-sala-de-ceramica-para-mesa-mao-decoracao", style: "product" },
      { id: 9015, label: "grade 2 produtos", keyword: "vasos decorativos modernos para sala", handle: "vaso-decorativo-para-sala-de-ceramica-coracao-2-pecas", handle2: "porta-retrato-personalizado-de-madeira-em-c-10x15-13x18-e-15x21", style: "split" },
    ],
  },
  {
    date: "2026-09-10",
    board: "Mesa posta elegante",
    rows: [
      { id: 9016, label: "foto Shopify sem texto", keyword: "jogo americano redondo de tecido", handle: "conjunto-jogo-americano-redondo-de-tecido-para-pratos-e-copos", style: "product" },
      { id: 9017, label: "produto em ambiente sem texto", keyword: "jogo americano flor para mesa posta", handle: "jogo-americano-redondo-de-tecido-flor-2-pecas-decoracao-de-mesa", style: "environment" },
      { id: 9018, label: "ambiente com texto", keyword: "mesa posta elegante", overlay: "Mesa posta elegante", handle: "toalha-de-mesa-para-natal-retangular-impermeavel-quadriculada-xadrez", style: "title" },
      { id: 9019, label: "foto Shopify sem texto", keyword: "toalha de mesa impermeável quadriculada azul", handle: "toalha-de-mesa-para-natal-retangular-impermeavel-quadriculada-azul", style: "product" },
      { id: 9020, label: "grade 2 produtos", keyword: "mesa posta com toalhas impermeáveis", handle: "toalha-de-mesa-para-natal-retangular-impermeavel-quadriculada-vermelha", handle2: "toalha-de-mesa-para-natal-retangular-impermeavel-quadriculada-verde", style: "split" },
    ],
  },
  {
    date: "2026-09-11",
    board: "Decoracao de parede",
    rows: [
      { id: 9021, label: "foto Shopify sem texto", keyword: "guirlanda de natal dourada para porta", handle: "guirlanda-de-natal-para-porta-parede-de-luxo-grande-dourada", style: "product" },
      { id: 9022, label: "produto em ambiente sem texto", keyword: "guirlanda de natal vermelha para porta", handle: "guirlanda-de-natal-para-porta-parede-de-luxo-grande-vermelha", style: "environment" },
      { id: 9023, label: "ambiente com texto", keyword: "entrada decorada", overlay: "Entrada decorada", titleOverlay: { maxChars: 8, y: 0.14, fontSize: 50, lineGap: 58 }, handle: "guirlanda-de-natal-para-porta-parede-de-luxo-grande-vermelha-verde", style: "title" },
      { id: 9024, label: "foto Shopify sem texto", keyword: "guirlanda de natal luxo vermelha", handle: "guirlanda-de-natal-para-porta-parede-de-luxo-grande-vermelha-1", style: "product" },
      { id: 9025, label: "grade 2 produtos", keyword: "decoração de porta para natal elegante", handle: "guirlanda-de-natal-de-luxo-para-porta-parede-grande-dourada", handle2: "tapete-capacho-de-natal-para-entrada-cozinha-banheiro-merry-christmas", style: "split" },
    ],
  },
  {
    date: "2026-09-12",
    board: "Presentes para casa nova",
    rows: [
      { id: 9026, label: "foto Shopify sem texto", keyword: "mini árvore de natal iluminada para casa", handle: "mini-arvore-de-natal-iluminada-decoracao-natalina-para-casa", style: "product" },
      { id: 9027, label: "produto em ambiente sem texto", keyword: "casinha decorada de natal iluminada", handle: "casinha-decorada-de-natal-iluminada-decoracao-natalina-de-mesa", style: "environment" },
      { id: 9028, label: "ambiente com texto", keyword: "decoração natalina", overlay: "Decoração natalina", handle: "calendario-do-advento-de-natal-decoracao-natalina-de-mesa", style: "title" },
      { id: 9029, label: "foto Shopify sem texto", keyword: "carrossel de natal decorativo de mesa", handle: "carrossel-de-natal-de-enfeite-decoracao-natalina-de-mesa", style: "product" },
      { id: 9030, label: "grade 2 produtos", keyword: "enfeites natalinos para mesa decorada", handle: "trem-de-natal-iluminado-com-led-decoracao-de-mesa-natalina", handle2: "presepio-de-natal-completo-em-resina-decoracao-de-mesa-natalina", style: "split" },
    ],
  },
  {
    date: "2026-09-13",
    board: "Quarto decorado",
    rows: [
      { id: 9031, label: "foto Shopify sem texto", keyword: "capa de almofada natalina para sofá", handle: "capa-para-almofada-de-natal-45x45-para-sofa-decorativa", style: "product" },
      { id: 9032, label: "produto em ambiente sem texto", keyword: "capa de almofada lisa para sofá", handle: "capa-para-almofada-de-natal-para-sofa-lisa-45x45-e-30x50", style: "environment" },
      { id: 9033, label: "ambiente com texto", keyword: "quarto aconchegante", overlay: "Quarto aconchegante", handle: "capa-para-almofada-de-natal-45x45-para-sofa-neve-bordado", style: "title" },
      { id: 9034, label: "foto Shopify sem texto", keyword: "relógio de mesa analógico decorativo", handle: "relogio-de-mesa-analogico-decorativo-sofisticado", style: "product" },
      { id: 9035, label: "grade 2 produtos", keyword: "almofadas decorativas para quarto e sala", handle: "capa-para-almofada-de-natal-45x45-para-sofa-bordado", handle2: "capa-de-cadeira-de-jantar-impermeavel-lisa-decorativa", style: "split" },
    ],
  },
];

const csv = ["id,date,board_name,keyword,product_handle,visual_strategy,product_2_handle"];
const cards = [];

for (const day of week) {
  for (const row of day.rows) {
    let imagePath;
    if (row.style === "product") imagePath = await productFullBleed(row);
    if (row.style === "environment") imagePath = await generatedPanel(row);
    if (row.style === "title") imagePath = await generatedPanel(row, { text: row.overlay ?? row.keyword, title: row.titleOverlay });
    if (row.style === "split") imagePath = await generatedPanel(row);
    row.imagePath = imagePath;
    row.title = cleanTitle(product(row.handle).title);
    if (row.style === "split") row.title = `${cleanTitle(product(row.handle).title)} + ${cleanTitle(product(row.handle2).title)}`;
    csv.push([row.id, day.date, day.board, row.keyword, row.handle, row.style, row.handle2 ?? ""].join(","));
    cards.push({ day, row, imagePath });
  }
}

writeFileSync(CSV_PATH, `${csv.join("\n")}\n`, "utf8");

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
    const image = await sharp(row.imagePath)
      .resize(cardW, cardH, { fit: "cover", position: "center" })
      .jpeg({ quality: 88 })
      .toBuffer();
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
