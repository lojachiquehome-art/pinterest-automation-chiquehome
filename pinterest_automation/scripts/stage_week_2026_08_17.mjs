import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE = "https://chiquehome.com.br";
const BASE_URL =
  process.env.PIN_IMAGE_BASE_URL ||
  "https://raw.githubusercontent.com/lojachiquehome-art/pinterest-automation-chiquehome/main/pinterest_automation/public/pinterest";
const PREVIEW_DIR = path.join(ROOT, "public", "pinterest", "preview-2026-08-17");
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
const byHandle = new Map(products.map((item) => [item.handle, item]));

function product(handle) {
  const found = byHandle.get(handle);
  if (!found) throw new Error(`Produto nao encontrado: ${handle}`);
  return found;
}

function productTitle(handle) {
  return product(handle).title.replace(/\s+/g, " ").trim();
}

function imageUrl(handle) {
  const found = product(handle);
  const url = found.images?.[0]?.src ?? found.image?.src;
  if (!url) throw new Error(`Produto sem imagem: ${handle}`);
  return url.startsWith("//") ? `https:${url}` : url;
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
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}

function cleanProductTitle(title) {
  return title
    .replace(/ para Sala\/Quarto\/Cozinha/g, "")
    .replace(/ para Sala de Jantar\/Cozinha/g, "")
    .replace(/ para Cozinha\/Sala/g, "")
    .replace(/ - Organizadores de Cozinha/g, "")
    .replace(/ - Organizador de Mesa/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const collectionSlug = {
  "Banheiro organizado": "banheiro-organizado",
  "Cozinha elegante": "cozinha-elegante",
  "Escritório em casa": "escritorio-em-casa",
  "Iluminacao decorativa": "iluminacao-decorativa",
  "Quarto decorado": "quarto-decorado",
  "Relogios de parede": "relogios-de-parede",
  "Sala sofisticada": "sala-sofisticada",
  "Tapetes para cozinha": "tapetes-para-cozinha",
};

const collectionById = new Map([
  [5005, "banheiro-organizado"],
  [5010, "iluminacao-decorativa"],
  [5015, "relogios-de-parede"],
  [5020, "iluminacao-decorativa"],
  [5025, "sala-sofisticada"],
  [5030, "quarto-decorado"],
  [5035, "cozinha-elegante"],
]);

function linkFor(row) {
  const isCollection = row.landing_type === "collection";
  const base = isCollection
    ? `${STORE}/collections/${collectionById.get(row.id) ?? collectionSlug[row.board_name] ?? slug(row.board_name)}`
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
    return `${capitalize(keyword)} com composição elegante, funcional e pensada para inspirar uma casa mais sofisticada. ${cta()}`;
  }
  if (row.visual_strategy === "split_two_products") {
    return `${capitalize(keyword)} em duas opções da mesma coleção para comparar acabamento, cor e estilo antes de escolher. ${cta()}`;
  }
  if (/relógio/i.test(keyword)) {
    return `${productName} ajuda a compor o ambiente com leitura fácil, acabamento decorativo e presença elegante na parede ou no móvel. ${cta()}`;
  }
  if (/luminária|lustre|arandela/i.test(keyword)) {
    return `${productName} cria uma iluminação mais acolhedora e sofisticada para valorizar a decoração do ambiente. ${cta()}`;
  }
  if (/porta-papel|banheiro/i.test(keyword)) {
    return `${productName} organiza o banheiro com acabamento moderno, visual limpo e uso prático no dia a dia. ${cta()}`;
  }
  if (/vaso|escultura|sala/i.test(keyword)) {
    return `${productName} adiciona presença decorativa e deixa a sala com um acabamento mais chique e bem cuidado. ${cta()}`;
  }
  return `${productName} deixa o ambiente mais organizado, bonito e funcional sem perder a sensação de casa sofisticada. ${cta()}`;
}

function scheduledAt(id, date) {
  const slot = (id - 5001) % 5;
  return `${date}T12:${String(30 + slot).padStart(2, "0")}:00.000Z`;
}

function finalImageUrl(id) {
  return `${BASE_URL.replace(/\/$/, "")}/final/pin-${id}.jpg`;
}

function previewImagePath(row) {
  const dir = row.visual_strategy === "product_full_bleed" ? "product" : "generated";
  const preview = path.join(PREVIEW_DIR, dir, `pin-${row.id}.jpg`);
  if (existsSync(preview)) return preview;
  return path.join(FINAL_DIR, `pin-${row.id}.jpg`);
}

function copyFinalImage(row) {
  const source = previewImagePath(row);
  if (!existsSync(source)) throw new Error(`Imagem validada nao encontrada: ${source}`);
  mkdirSync(FINAL_DIR, { recursive: true });
  const target = path.join(FINAL_DIR, `pin-${row.id}.jpg`);
  if (path.resolve(source) !== path.resolve(target)) {
    copyFileSync(source, target);
  }
}

function makeRow(id, date, board_name, keyword, product_handle, visual_strategy, product_2_handle = "", titleOverride = "") {
  const landing_type = visual_strategy === "environment_title_overlay" || visual_strategy === "split_two_products"
    ? "collection"
    : "product";
  const title = titleOverride
    || (visual_strategy === "environment_title_overlay" || visual_strategy === "split_two_products"
      ? capitalize(keyword)
      : cleanProductTitle(productTitle(product_handle)));
  const row = {
    id,
    scheduled_at: scheduledAt(id, date),
    board_name,
    keyword,
    intent: board_name,
    content_angle: visual_strategy === "environment_title_overlay" ? "ambiente" : "produto",
    trend_monthly_change: "",
    visual_strategy,
    landing_type,
    title,
    description: "",
    link: "",
    image_url: imageUrl(product_handle),
    product_2_title: product_2_handle ? productTitle(product_2_handle) : "",
    product_2_handle,
    product_2_image_url: product_2_handle ? imageUrl(product_2_handle) : "",
    generated_image_prompt: "",
    generated_image_path: `public/pinterest/final/pin-${id}.jpg`,
    generated_image_url: finalImageUrl(id),
    media_source: {
      source_type: "image_url",
      url: finalImageUrl(id),
    },
    requires_ai_image: visual_strategy === "product_full_bleed" ? "no" : "yes",
    alt_text: `${title} - ${keyword} Chique Home`,
    product_title: productTitle(product_handle),
    product_handle,
    status: "ready",
  };
  row.description = descriptionFor(row);
  row.link = linkFor(row);
  copyFinalImage(row);
  return row;
}

const rows = [
  makeRow(5001, "2026-08-17", "Banheiro organizado", "porta-papel higiênico cinza", "porta-papel-higienico-de-parede-moderno-duplo-para-banheiro-cinza", "product_full_bleed"),
  makeRow(5002, "2026-08-17", "Banheiro organizado", "porta-papel higiênico branco", "porta-papel-higienico-de-parede-moderno-para-banheiro-branco", "product_in_environment"),
  makeRow(5003, "2026-08-17", "Banheiro organizado", "banheiro moderno", "porta-papel-higienico-de-parede-moderno-para-banheiro-preto", "environment_title_overlay"),
  makeRow(5004, "2026-08-17", "Banheiro organizado", "porta-papel higiênico preto", "porta-papel-higienico-de-parede-moderno-para-banheiro-preto", "product_full_bleed"),
  makeRow(5005, "2026-08-17", "Banheiro organizado", "porta-papéis higiênicos branco e cinza", "porta-papel-higienico-de-parede-moderno-para-banheiro-branco", "split_two_products", "porta-papel-higienico-de-parede-moderno-duplo-para-banheiro-cinza"),

  makeRow(5006, "2026-08-18", "Iluminacao decorativa", "lustre pendente dourado", "lustre-pendente-para-sala-de-jantar-cozinha-moderno-led-dourado", "product_full_bleed"),
  makeRow(5007, "2026-08-18", "Iluminacao decorativa", "lustre pendente preto", "lustre-pendente-para-sala-de-jantar-cozinha-moderno-led-preto", "product_in_environment"),
  makeRow(5008, "2026-08-18", "Iluminacao decorativa", "sala de jantar elegante", "luminaria-de-teto-para-sala-quarto-cozinha-em-led-circular-dourada", "environment_title_overlay"),
  makeRow(5009, "2026-08-18", "Iluminacao decorativa", "luminária circular branca", "luminaria-de-teto-para-sala-quarto-cozinha-em-led-circular-branca", "product_full_bleed"),
  makeRow(5010, "2026-08-18", "Iluminacao decorativa", "luminárias circulares branca e dourada", "luminaria-de-teto-para-sala-quarto-cozinha-em-led-circular-branca", "split_two_products", "luminaria-de-teto-para-sala-quarto-cozinha-em-led-circular-dourada"),

  makeRow(5011, "2026-08-19", "Relogios de parede", "relógio de parede Verona Rose", "relogio-de-parede-verona-rose", "product_full_bleed"),
  makeRow(5012, "2026-08-19", "Relogios de parede", "relógio de parede Cremona Dark Wood", "relogio-de-parede-cremona-dark-wood", "product_in_environment"),
  makeRow(5013, "2026-08-19", "Relogios de parede", "sala moderna", "relogio-de-parede-milano-white", "environment_title_overlay"),
  makeRow(5014, "2026-08-19", "Relogios de parede", "relógio de parede Toscana Brown", "relogio-de-parede-toscana-brown", "product_full_bleed"),
  makeRow(5015, "2026-08-19", "Relogios de parede", "relógios Aurelio dourado e preto", "relogio-de-parede-aurelio-gold-white", "split_two_products", "relogio-de-parede-aurelio-gold-black"),

  makeRow(5016, "2026-08-20", "Escritório em casa", "luminária de mesa dourada", "luminaria-de-mesa-led-para-quarto-sala-dourada-espiral-3-cores", "product_full_bleed"),
  makeRow(5017, "2026-08-20", "Escritório em casa", "luminária de mesa espiral", "luminaria-de-mesa-led-para-quarto-sala-espiral-decoracao", "product_in_environment"),
  makeRow(5018, "2026-08-20", "Escritório em casa", "escritório moderno", "arandela-de-parede-interna-para-quarto-sala-led-curva", "environment_title_overlay"),
  makeRow(5019, "2026-08-20", "Escritório em casa", "luminária de mesa borboleta", "luminaria-de-mesa-led-para-quarto-sala-borboleta-3-cores", "product_full_bleed"),
  makeRow(5020, "2026-08-20", "Escritório em casa", "luminárias de mesa curva e espiral", "luminaria-de-mesa-led-para-quarto-sala-curvo-decorativa", "split_two_products", "luminaria-de-mesa-led-para-quarto-sala-espiral-decoracao"),

  makeRow(5021, "2026-08-21", "Sala sofisticada", "vaso decorativo espiral", "vaso-decorativo-para-sala-de-ceramica-espiral-2-pecas-decoracao", "product_full_bleed"),
  makeRow(5022, "2026-08-21", "Sala sofisticada", "escultura decorativa casal", "escultura-decorativa-casal-estatua-decoracao-para-sala", "product_in_environment"),
  makeRow(5023, "2026-08-21", "Sala sofisticada", "sala de estar elegante", "vaso-decorativo-para-sala-de-ceramica-2-pecas-decoracao", "environment_title_overlay"),
  makeRow(5024, "2026-08-21", "Sala sofisticada", "escultura decorativa touro", "escultura-decorativa-touro-estatua-para-mesa-decoracao", "product_full_bleed"),
  makeRow(5025, "2026-08-21", "Sala sofisticada", "esculturas decorativas cachorro e renas", "escultura-decorativa-cachorro-balao-moderna-decoracao-para-sala", "split_two_products", "escultura-decorativa-renas-estatua-para-mesa-decoracao-para-sala"),

  makeRow(5026, "2026-08-22", "Quarto decorado", "relógio de mesa redondo branco", "relogio-de-mesa-digital-despertador-redondo-branco-colorido", "product_full_bleed"),
  makeRow(5027, "2026-08-22", "Quarto decorado", "relógio de mesa redondo preto", "relogio-de-mesa-digital-despertador-redondo-preto", "product_in_environment"),
  makeRow(5028, "2026-08-22", "Quarto decorado", "quarto aconchegante", "relogio-de-mesa-digital-despertador-curvado-verde", "environment_title_overlay"),
  makeRow(5029, "2026-08-22", "Quarto decorado", "relógio de mesa espelhado preto", "relogio-de-mesa-digital-despertador-espelhado-preto", "product_full_bleed"),
  makeRow(5030, "2026-08-22", "Quarto decorado", "relógios de mesa decorativos branco e preto", "relogio-de-mesa-digital-despertador-decorativo-branco", "split_two_products", "relogio-de-mesa-digital-despertador-decorativo-preto"),

  makeRow(5031, "2026-08-23", "Cozinha elegante", "kit de utensílios de madeira", "kit-utensilios-de-cozinha-de-madeira-antiaderente-7-pecas", "product_full_bleed"),
  makeRow(5032, "2026-08-23", "Cozinha elegante", "kit de utensílios de silicone", "kit-7-utensilios-de-cozinha-de-silicone-antiaderente-decoracao-cozinha", "product_in_environment"),
  makeRow(5033, "2026-08-23", "Cozinha elegante", "cozinha sofisticada", "escorredor-de-talheres-organizador-de-cozinha-decoracao", "environment_title_overlay"),
  makeRow(5034, "2026-08-23", "Cozinha elegante", "porta papel toalha de mesa", "porta-papel-toalha-de-mesa-vertical-para-cozinha", "product_full_bleed"),
  makeRow(5035, "2026-08-23", "Cozinha elegante", "potes organizadores de vidro e plástico", "pote-de-vidro-com-tampa-de-bambu-decoracao-para-cozinha", "split_two_products", "potes-hermeticos-organizadores-de-plastico-decoracao-cozinha"),
];

const batchPath = path.join(ROOT, "output", "pins_batch.json");
const batch = JSON.parse(readFileSync(batchPath, "utf8"));
const ids = new Set(rows.map((item) => item.id));
const nextBatch = batch.filter((item) => !ids.has(item.id)).concat(rows).sort((a, b) => a.id - b.id);
writeFileSync(batchPath, `${JSON.stringify(nextBatch, null, 2)}\n`, "utf8");

const csv = [
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
writeFileSync(path.join(ROOT, "data", "weekly_campaign_2026-08-17.csv"), `${csv}\n`, "utf8");

console.log(`Staged ${rows.length} pins for 2026-08-17 to 2026-08-23.`);
