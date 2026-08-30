import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE = "https://chiquehome.com.br";
const BASE_URL =
  process.env.PIN_IMAGE_BASE_URL ||
  "https://raw.githubusercontent.com/lojachiquehome-art/pinterest-automation-chiquehome/main/pinterest_automation/public/pinterest";
const CAMPAIGN_PATH = path.join(ROOT, "data", "weekly_campaign_2026-08-31.csv");
const PREVIEW_DIR = path.join(ROOT, "public", "pinterest", "preview-2026-08-31");
const FINAL_DIR = path.join(ROOT, "public", "pinterest", "final");

function readProducts(file) {
  const raw = readFileSync(path.join(ROOT, file), "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw);
  return parsed.products ?? parsed;
}

const products = [
  ...readProducts("tmp/shopify_products_pages/page1.json"),
  ...readProducts("tmp/shopify_products_pages/page2.json"),
];
const productsByHandle = new Map(products.map((item) => [item.handle, item]));

function product(handle) {
  const found = productsByHandle.get(handle);
  if (!found) throw new Error(`Produto nao encontrado no cache Shopify: ${handle}`);
  return found;
}

function productTitle(handle) {
  return product(handle).title.replace(/\s+/g, " ").trim();
}

function imageUrl(handle) {
  const found = product(handle);
  const url = found.images?.[0]?.src ?? found.image?.src;
  if (!url) throw new Error(`Produto sem imagem Shopify: ${handle}`);
  return url.startsWith("//") ? `https:${url}` : url;
}

function parseCsv(filePath) {
  const [headerLine, ...lines] = readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  const headers = headerLine.split(",");
  return lines.filter(Boolean).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function slug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function capitalize(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "";
}

function cleanProductTitle(title) {
  return String(title)
    .replace(/ para Sala\/Quarto\/Cozinha/g, "")
    .replace(/ para Sala de Jantar\/Cozinha/g, "")
    .replace(/ para Cozinha\/Sala/g, "")
    .replace(/ - Organizadores de Cozinha/g, "")
    .replace(/ - Organizador de Mesa/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const collectionSlug = {
  "Banheiro moderno": "banheiro-moderno",
  "Banheiro organizado": "banheiro-organizado",
  "Cozinha sofisticada": "cozinha-sofisticada",
  "Tapetes para cozinha": "tapetes-para-cozinha",
  "Iluminacao decorativa": "iluminacao-decorativa",
  "Mesa posta elegante": "mesa-posta-elegante",
  "Quarto aconchegante": "quarto-aconchegante",
  "Quarto decorado": "quarto-decorado",
  "Relógios de parede": "relogios-de-parede",
  "Relogios de parede": "relogios-de-parede",
  "Sala decorada": "sala-decorada",
  "Sala de jantar elegante": "sala-de-jantar-elegante",
  "Sala sofisticada": "sala-sofisticada",
};

const publishBoardName = {
  "Banheiro moderno": "Banheiro organizado",
  "Cozinha sofisticada": "Tapetes para cozinha",
  "Relógios de parede": "Relogios de parede",
  "Sala de jantar elegante": "Iluminacao decorativa",
  "Sala decorada": "Sala sofisticada",
  "Quarto aconchegante": "Quarto decorado",
};

const strategyMap = {
  product: "product_full_bleed",
  environment: "product_in_environment",
  title: "environment_title_overlay",
  split: "split_two_products",
};

function longStrategy(shortStrategy) {
  if (Object.values(strategyMap).includes(shortStrategy)) return shortStrategy;
  const mapped = strategyMap[shortStrategy];
  if (!mapped) throw new Error(`Estrategia visual desconhecida: ${shortStrategy}`);
  return mapped;
}

function linkFor(row) {
  const isCollection = row.landing_type === "collection";
  const base = isCollection
    ? `${STORE}/collections/${collectionSlug[row.board_name] ?? slug(row.board_name)}`
    : `${STORE}/products/${row.product_handle}`;
  return `${base}?utm_source=pinterest&utm_medium=organic_pin&utm_campaign=pinterest_organic_chiquehome&utm_content=${slug(row.keyword)}_${row.id}`;
}

function cta() {
  return 'Clique no botão "Acessar o site" para ver detalhes, medidas e preço na Chique Home. Use o cupom PINTEREST10 e ganhe 10% de desconto por ter vindo do Pinterest.';
}

function descriptionFor(row) {
  const productName = cleanProductTitle(productTitle(row.product_handle));
  const keyword = row.keyword;
  if (row.visual_strategy === "environment_title_overlay") {
    return `${capitalize(keyword)} com uma composição elegante, realista e pensada para inspirar uma casa mais bonita e sofisticada. ${cta()}`;
  }
  if (row.visual_strategy === "split_two_products") {
    return `${capitalize(keyword)} em duas opções da mesma coleção para comparar acabamento, cor e estilo antes de escolher. ${cta()}`;
  }
  if (/relógio/i.test(keyword)) {
    return `${productName} valoriza o ambiente com leitura fácil, proporção elegante e acabamento decorativo para completar a parede ou o móvel. ${cta()}`;
  }
  if (/luminária|lustre|arandela/i.test(keyword)) {
    return `${productName} cria uma iluminação mais acolhedora e sofisticada para transformar a decoração do ambiente. ${cta()}`;
  }
  if (/bandeja|banheiro|porta-papel/i.test(keyword)) {
    return `${productName} ajuda a organizar o banheiro com visual limpo, acabamento bonito e presença discreta na decoração. ${cta()}`;
  }
  if (/vaso|escultura|sala/i.test(keyword)) {
    return `${productName} adiciona presença decorativa e deixa a composição da sala mais elegante, bem acabada e acolhedora. ${cta()}`;
  }
  if (/cesto|mesa posta|cozinha|organizador|utensílio|pote/i.test(keyword)) {
    return `${productName} deixa a rotina mais organizada e bonita, com acabamento prático para compor cozinha, mesa ou bancada. ${cta()}`;
  }
  return `${productName} deixa o ambiente mais organizado, bonito e funcional sem perder a sensação de casa sofisticada. ${cta()}`;
}

function scheduledAt(id, date) {
  const slot = (Number(id) - 8001) % 5;
  return `${date}T12:${String(30 + slot).padStart(2, "0")}:00.000Z`;
}

function finalImageUrl(id) {
  return `${BASE_URL.replace(/\/$/, "")}/final/pin-${id}.jpg`;
}

function previewImagePath(row) {
  const dir = row.visual_strategy === "product_full_bleed" ? "product" : "generated";
  const filePath = path.join(PREVIEW_DIR, dir, `pin-${row.id}.jpg`);
  if (!existsSync(filePath)) throw new Error(`Imagem validada nao encontrada: ${filePath}`);
  return filePath;
}

function copyFinalImage(row) {
  mkdirSync(FINAL_DIR, { recursive: true });
  copyFileSync(previewImagePath(row), path.join(FINAL_DIR, `pin-${row.id}.jpg`));
}

function titleFor(row) {
  if (row.visual_strategy === "environment_title_overlay") return capitalize(row.keyword);
  if (row.visual_strategy === "split_two_products") return capitalize(row.keyword);
  return cleanProductTitle(productTitle(row.product_handle));
}

const campaignRows = parseCsv(CAMPAIGN_PATH);
const rows = campaignRows.map((campaign) => {
  const visual_strategy = longStrategy(campaign.visual_strategy);
  const board_name = publishBoardName[campaign.board_name] ?? campaign.board_name;
  const row = {
    id: Number(campaign.id),
    scheduled_at: scheduledAt(campaign.id, campaign.date),
    board_name,
    keyword: campaign.keyword,
    intent: campaign.board_name,
    content_angle: visual_strategy === "environment_title_overlay" ? "ambiente" : "produto",
    trend_monthly_change: "",
    visual_strategy,
    landing_type: visual_strategy === "environment_title_overlay" || visual_strategy === "split_two_products" ? "collection" : "product",
    title: "",
    description: "",
    link: "",
    image_url: imageUrl(campaign.product_handle),
    product_2_title: campaign.product_2_handle ? productTitle(campaign.product_2_handle) : "",
    product_2_handle: campaign.product_2_handle,
    product_2_image_url: campaign.product_2_handle ? imageUrl(campaign.product_2_handle) : "",
    generated_image_prompt: "",
    generated_image_path: `public/pinterest/final/pin-${campaign.id}.jpg`,
    generated_image_url: finalImageUrl(campaign.id),
    media_source: {
      source_type: "image_url",
      url: finalImageUrl(campaign.id),
    },
    requires_ai_image: visual_strategy === "product_full_bleed" ? "no" : "yes",
    alt_text: "",
    product_title: productTitle(campaign.product_handle),
    product_handle: campaign.product_handle,
    status: "ready",
  };
  row.title = titleFor(row);
  row.description = descriptionFor(row);
  row.link = linkFor(row);
  row.alt_text = `${row.title} - ${row.keyword} Chique Home`;
  copyFinalImage(row);
  return row;
});

const batchPath = path.join(ROOT, "output", "pins_batch.json");
const batch = JSON.parse(readFileSync(batchPath, "utf8"));
const ids = new Set(rows.map((item) => String(item.id)));
const nextBatch = batch
  .filter((item) => !ids.has(String(item.id)))
  .concat(rows)
  .sort((a, b) => Number(a.id) - Number(b.id));
writeFileSync(batchPath, `${JSON.stringify(nextBatch, null, 2)}\n`, "utf8");

const stagedCsv = [
  "id,date,board_name,keyword,product_handle,visual_strategy,product_2_handle,generated_image_path",
  ...rows.map((item) => [
    item.id,
    item.scheduled_at.slice(0, 10),
    item.board_name,
    item.keyword,
    item.product_handle,
    item.visual_strategy,
    item.product_2_handle,
    item.generated_image_path,
  ].join(",")),
].join("\n");
writeFileSync(CAMPAIGN_PATH, `${stagedCsv}\n`, "utf8");

console.log(`Staged ${rows.length} pins for 2026-08-31 to 2026-09-06.`);
