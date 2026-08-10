import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE = "https://chiquehome.com.br";

function pt(strings, ...values) {
  return String.raw({ raw: strings }, ...values)
    .replaceAll("\\u00e1", "\u00e1")
    .replaceAll("\\u00e0", "\u00e0")
    .replaceAll("\\u00e2", "\u00e2")
    .replaceAll("\\u00e3", "\u00e3")
    .replaceAll("\\u00e7", "\u00e7")
    .replaceAll("\\u00e9", "\u00e9")
    .replaceAll("\\u00ea", "\u00ea")
    .replaceAll("\\u00ed", "\u00ed")
    .replaceAll("\\u00f3", "\u00f3")
    .replaceAll("\\u00f4", "\u00f4")
    .replaceAll("\\u00f5", "\u00f5")
    .replaceAll("\\u00fa", "\u00fa")
    .replaceAll("\\u00c1", "\u00c1")
    .replaceAll("\\u00c9", "\u00c9");
}

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

const collectionSlug = {
  [pt`Cozinha elegante`]: "cozinha-elegante",
  [pt`Tapetes para cozinha`]: "tapetes-para-cozinha",
  [pt`Banheiro organizado`]: "banheiro-organizado",
  [pt`Banheiro com cara de hotel`]: "banheiro-com-cara-de-hotel",
  [pt`Relogios de parede`]: "relogios-de-parede",
  [pt`Escrit\u00f3rio em casa`]: "escritorio-em-casa",
  [pt`Sala sofisticada`]: "sala-sofisticada",
  [pt`Quarto decorado`]: "quarto-decorado",
};

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

function linkFor(row) {
  const base = row.landing_type === "collection"
    ? `${STORE}/collections/${collectionSlug[row.board_name] ?? slug(row.board_name)}`
    : `${STORE}/products/${row.product_handle}`;
  return `${base}?utm_source=pinterest&utm_medium=organic_pin&utm_campaign=pinterest_organic_chiquehome&utm_content=${slug(row.keyword)}_${row.id}`;
}

function descriptionFor(row) {
  const cta = pt`Clique no bot\u00e3o "Acessar o site" para ver detalhes, medidas e pre\u00e7o na Chique Home. Use o cupom PINTEREST10 e ganhe 10% de desconto por ter vindo do Pinterest.`;
  if (row.visual_strategy === "environment_title_overlay") {
    return `${capitalize(row.keyword)} com uma composi\u00e7\u00e3o elegante, funcional e pensada para inspirar uma casa mais bonita no dia a dia. ${cta}`;
  }
  if (row.visual_strategy === "split_two_products") {
    return `${capitalize(row.keyword)} em duas varia\u00e7\u00f5es da mesma cole\u00e7\u00e3o para comparar acabamento, cor e estilo com mais clareza. ${cta}`;
  }
  const title = cleanProductTitle(productTitle(row.product_handle));
  return `${title} valoriza o ambiente com presen\u00e7a discreta, acabamento bonito e uso pr\u00e1tico na rotina. ${cta}`;
}

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}

function scheduledAt(id, date) {
  const slot = (id - 4001) % 5;
  return `${date}T12:${String(30 + slot).padStart(2, "0")}:00.000Z`;
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
    requires_ai_image: visual_strategy === "product_full_bleed" || visual_strategy === "split_two_products" ? "no" : "yes",
    alt_text: `${title} - ${keyword} Chique Home`,
    product_title: productTitle(product_handle),
    product_handle,
    status: "ready",
  };
  row.description = descriptionFor(row);
  row.link = linkFor(row);
  return row;
}

const rows = [
  makeRow(4001, "2026-08-10", pt`Cozinha elegante`, pt`organizador de geladeira transparente`, "kit-4-organizador-de-geladeira-pote-organizador-para-cozinha", "product_full_bleed"),
  makeRow(4002, "2026-08-10", pt`Cozinha elegante`, pt`organizador de latas para geladeira`, "organizador-de-latas-para-geladeira-automatico-organizadores-de-cozinha", "product_in_environment"),
  makeRow(4003, "2026-08-10", pt`Cozinha elegante`, pt`cozinha planejada`, "potes-de-vidro-hermeticos-com-tampa-de-bambu-e-colher", "environment_title_overlay"),
  makeRow(4004, "2026-08-10", pt`Cozinha elegante`, pt`organizador de ovos para geladeira`, "organizador-de-ovos-para-geladeira-organizadores-de-cozinha", "product_full_bleed"),
  makeRow(4005, "2026-08-10", pt`Cozinha elegante`, pt`organizadores de geladeira transparentes`, "organizador-de-geladeira-pote-organizador-para-cozinha", "split_two_products", "kit-3-organizador-de-geladeira-com-tampa-organizadores-de-cozinha"),

  makeRow(4006, "2026-08-11", pt`Relogios de parede`, pt`rel\u00f3gio de parede Bellagio preto`, "relogio-de-parede-para-cozinha-sala-grande-decorativo-sofisticado", "product_full_bleed"),
  makeRow(4007, "2026-08-11", pt`Relogios de parede`, pt`rel\u00f3gio de parede Valentino branco e preto`, "relogio-de-parede-para-cozinha-sala-grande-decorativo-quartz", "product_in_environment"),
  makeRow(4008, "2026-08-11", pt`Relogios de parede`, pt`sala de estar moderna`, "relogio-de-parede-bellagio-white", "environment_title_overlay"),
  makeRow(4009, "2026-08-11", pt`Relogios de parede`, pt`rel\u00f3gio de parede Milano cinza`, "relogio-de-parede-milano-gray", "product_full_bleed"),
  makeRow(4010, "2026-08-11", pt`Relogios de parede`, pt`rel\u00f3gios de parede Bellagio azul e rose`, "relogio-de-parede-bellagio-blue", "split_two_products", "relogio-de-parede-bellagio-rose"),

  makeRow(4011, "2026-08-12", pt`Banheiro organizado`, pt`porta-escova de dentes verde`, "porta-escova-de-dentes-e-pasta-com-tampa-para-banheiro-viagem-luxo", "product_full_bleed"),
  makeRow(4012, "2026-08-12", pt`Banheiro organizado`, pt`porta-escova para banheiro`, "porta-escova-de-dentes-com-tampa-para-banheiro-chique", "product_in_environment"),
  makeRow(4013, "2026-08-12", pt`Banheiro organizado`, pt`banheiro pequeno e luxuoso`, "porta-escova-de-dentes-e-pasta-com-tampa-para-banheiro-viagem-elegante", "environment_title_overlay"),
  makeRow(4014, "2026-08-12", pt`Banheiro organizado`, pt`porta-escova de dentes elegante`, "porta-escova-de-dentes-e-pasta-com-tampa-para-banheiro-viagem", "product_full_bleed"),
  makeRow(4015, "2026-08-12", pt`Banheiro organizado`, pt`porta-escovas para banheiro luxo e viagem`, "porta-escova-de-dentes-com-tampa-para-viagem-banheiro", "split_two_products", "porta-escova-de-dentes-e-pasta-com-tampa-para-banheiro-viagem-luxo"),

  makeRow(4016, "2026-08-13", pt`Escrit\u00f3rio em casa`, pt`porta-canetas de madeira`, "porta-canetas-e-lapis-para-escritorio-organizador-de-mesa-em-madeira", "product_full_bleed"),
  makeRow(4017, "2026-08-13", pt`Escrit\u00f3rio em casa`, pt`organizador de mesa`, "porta-canetas-e-lapis-para-escritorio-organizadores-de-mesa", "product_in_environment"),
  makeRow(4018, "2026-08-13", pt`Escrit\u00f3rio em casa`, pt`escrit\u00f3rio moderno`, "porta-canetas-e-lapis-para-escritorio-organizador-de-mesa", "environment_title_overlay"),
  makeRow(4019, "2026-08-13", pt`Escrit\u00f3rio em casa`, pt`pasta sanfonada A4`, "pasta-sanfonada-com-7-divisorias-a4-organizadora-para-documentos-escolar", "product_full_bleed"),
  makeRow(4020, "2026-08-13", pt`Escrit\u00f3rio em casa`, pt`organizadores de mesa em madeira e branco`, "porta-canetas-e-lapis-para-escritorio-organizador-de-mesa-em-madeira", "split_two_products", "porta-canetas-e-lapis-para-escritorio-organizador-de-mesa"),

  makeRow(4021, "2026-08-14", pt`Sala sofisticada`, pt`cesto de vime redondo`, "cesto-de-vime-redondo-para-decoracao-organizador", "product_full_bleed"),
  makeRow(4022, "2026-08-14", pt`Sala sofisticada`, pt`cesto de vime para sala`, "cesto-de-vime-para-decoracao-organizador-rustico", "product_in_environment"),
  makeRow(4023, "2026-08-14", pt`Sala sofisticada`, pt`sala de estar chique`, "porta-retrato-personalizado-de-madeira-para-sala-quarto-escritorio-bege", "environment_title_overlay"),
  makeRow(4024, "2026-08-14", pt`Sala sofisticada`, pt`porta-retrato de madeira branco`, "porta-retrato-personalizado-de-madeira-para-sala-quarto-escritorio-branco", "product_full_bleed"),
  makeRow(4025, "2026-08-14", pt`Sala sofisticada`, pt`porta-retratos de madeira retr\u00f4 e bege`, "porta-retrato-personalizado-de-madeira-para-sala-quarto-escritorio-retro", "split_two_products", "porta-retrato-personalizado-de-madeira-para-sala-quarto-escritorio-bege"),

  makeRow(4026, "2026-08-15", pt`Quarto decorado`, pt`umidificador de ar verde e rosa`, "umidificador-de-ar-para-quarto-ultrassonico-portatil-de-ambiente", "product_full_bleed"),
  makeRow(4027, "2026-08-15", pt`Quarto decorado`, pt`umidificador para quarto`, "umidificador-de-ar-para-quarto-ultrassonico-de-ambiente-portatil-7-bicos", "product_in_environment"),
  makeRow(4028, "2026-08-15", pt`Quarto decorado`, pt`quarto aconchegante`, "umidificador-de-ar-para-quarto-ultrassonico-de-ambiente-portatil", "environment_title_overlay"),
  makeRow(4029, "2026-08-15", pt`Quarto decorado`, pt`rel\u00f3gio de mesa triangular bege`, "relogio-de-mesa-digital-despertador-triangular-bege", "product_full_bleed"),
  makeRow(4030, "2026-08-15", pt`Quarto decorado`, pt`rel\u00f3gios de mesa triangulares preto e branco`, "relogio-de-mesa-digital-despertador-triangular-preto", "split_two_products", "relogio-de-mesa-digital-despertador-triangular-branco"),

  makeRow(4031, "2026-08-16", pt`Tapetes para cozinha`, pt`tapete para cozinha off white`, "tapete-para-cozinha-antiderrapante-absorvente-sofisticado-off-white", "product_full_bleed"),
  makeRow(4032, "2026-08-16", pt`Tapetes para cozinha`, pt`tapete para cozinha preto`, "tapete-para-cozinha-antiderrapante-absorvente-minimalista-preto", "product_in_environment"),
  makeRow(4033, "2026-08-16", pt`Tapetes para cozinha`, pt`cozinha chique`, "tapete-para-cozinha-antiderrapante-absorvente-elegante-bege", "environment_title_overlay"),
  makeRow(4034, "2026-08-16", pt`Tapetes para cozinha`, pt`tapete para cozinha cinza listrado`, "tapete-para-cozinha-antiderrapante-absorvente-listrado-cinza", "product_full_bleed"),
  makeRow(4035, "2026-08-16", pt`Tapetes para cozinha`, pt`tapetes para cozinha bege e cinza`, "tapete-para-cozinha-antiderrapante-absorvente-bege-neutro", "split_two_products", "tapete-para-cozinha-antiderrapante-absorvente-sofisticado-cinza"),
];

const batchPath = path.join(ROOT, "output", "pins_batch.json");
const batch = JSON.parse(readFileSync(batchPath, "utf8"));
const ids = new Set(rows.map((item) => item.id));
const nextBatch = batch.filter((item) => !ids.has(item.id)).concat(rows).sort((a, b) => a.id - b.id);
writeFileSync(batchPath, JSON.stringify(nextBatch, null, 2), "utf8");

const csv = [
  "id,date,board_name,keyword,product_handle,visual_strategy,product_2_handle",
  ...rows.map((item) => [
    item.id,
    item.scheduled_at.slice(0, 10),
    item.board_name,
    item.keyword,
    item.product_handle,
    item.visual_strategy,
    item.product_2_handle,
  ].join(",")),
].join("\n");

writeFileSync(path.join(ROOT, "data", "weekly_campaign_2026-08-10.csv"), `${csv}\n`, "utf8");
console.log(`Staged ${rows.length} pins for 2026-08-10 to 2026-08-16.`);
