import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accentPortugueseText, polishPortugueseTitle } from "./portuguese_text.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE_URL = "https://chiquehome.com.br";
const PINTEREST_COUPON_TEXT = "Use o cupom PINTEREST10 e ganhe 10% de desconto por ter vindo do Pinterest.";

const titleTemplates = [
  "{keyword}: ideia elegante com {product_short}",
  "{product_short}: inspiração para {keyword}",
  "{keyword} para deixar o ambiente mais sofisticado",
  "Inspire-se: {keyword} com toque Chique Home",
  "{product_short} para transformar o ambiente",
  "Veja como usar {product_short} em {keyword}",
  "{keyword}: produto para comprar e usar em casa",
  "Ideia pronta de {keyword} com link do produto",
];

const descriptionTemplates = [
  "Ideia de {keyword} para deixar sua casa mais bonita, funcional e sofisticada. Veja o produto na Chique Home e monte um ambiente com mais personalidade.",
  "Se você está buscando {keyword}, este item ajuda a renovar o ambiente sem reforma. Confira detalhes, medidas e opções na Chique Home.",
  "Uma inspiração simples para quem quer {keyword} com acabamento elegante. Produto com compra segura, frete e rastreio.",
  "Transforme o ambiente com uma escolha visual e funcional. Veja essa sugestão de {keyword} na Chique Home.",
  "Gostou da ideia? Clique para ver preço, medidas, cores e detalhes do produto na Chique Home.",
  "Uma sugestão prática para quem quer comprar decoração online com mais segurança. Veja o produto, variações e informações de entrega.",
];

const visualVariants = [
  "environment_full_bleed",
  "product_full_bleed",
  "environment_title_overlay",
  "product_in_environment",
  "listicle_idea_overlay",
];

const roomByType = {
  Banheiro: "banheiro",
  "Tapete Cozinha": "cozinha",
  Relogio: "sala ou cozinha",
  "Relogio Mesa": "quarto ou mesa de cabeceira",
  Iluminacao: "sala, quarto ou cozinha",
  Sala: "sala",
};

const collectionByBoard = {
  "Cozinha elegante": "collections/cozinha-elegante",
  "Tapetes para cozinha": "collections/tapetes-para-cozinha",
  "Banheiro com cara de hotel": "collections/banheiro-com-cara-de-hotel",
  "Banheiro organizado": "collections/banheiro-organizado",
  "Sala sofisticada": "collections/sala-sofisticada",
  "Apartamento pequeno decorado": "collections/apartamento-pequeno-decorado",
  "Decoracao sem reforma": "collections/decoracao-sem-reforma",
  "Decoracao de parede": "collections/decoracao-de-parede",
  "Mesa posta elegante": "collections/mesa-posta-elegante",
  "Achados para casa": "collections/achados-para-casa",
  "Lavanderia organizada": "collections/lavanderia-organizada",
  "Organizacao e prateleiras": "collections/organizacao-e-prateleiras",
  "Organização e prateleiras": "collections/organizacao-e-prateleiras",
  "Quarto decorado": "collections/quarto-decorado",
  "Relogios de parede": "collections/relogios-de-parede",
  "Iluminacao decorativa": "collections/iluminacao-decorativa",
  "Escritorio em casa": "collections/escritorio-em-casa",
  "Escritório em casa": "collections/escritorio-em-casa",
  "Hall de entrada": "collections/hall-de-entrada",
  "Design de interiores": "collections/decoracao-sem-reforma",
  "Paleta de cores para casa": "collections/decoracao-sem-reforma",
  "Truques de casa": "collections/achados-para-casa",
  "Presentes para casa nova": "collections/achados-para-casa",
  "Área externa e varanda": "collections/achados-para-casa",
};

const boardScene = {
  "Cozinha elegante": "cozinha pequena organizada, clean, clara, armarios planejados, bancada livre, potes organizadores, bandeja decorativa, tapete de cozinha discreto",
  "Tapetes para cozinha": "cozinha moderna e funcional com passadeira ou tapete antiderrapante em destaque no piso, bancada organizada e luz natural",
  "Banheiro com cara de hotel": "banheiro pequeno sofisticado com metais modernos, parede clara, bancada limpa e detalhe elegante de organizacao",
  "Banheiro organizado": "banheiro organizado com suporte de parede, nichos, porta-shampoo no box e poucos objetos aparentes",
  "Sala sofisticada": "sala de estar sofisticada, sofa neutro, almofadas decorativas, relogio de parede e decoracao elegante",
  "Apartamento pequeno decorado": "apartamento pequeno bem aproveitado, ambiente integrado, organizacao vertical e decoracao clara",
  "Decoracao sem reforma": "antes e depois sutil de ambiente renovado sem reforma, com produto decorativo aplicado e visual limpo",
  "Decoracao de parede": "parede decorada com composicao minimalista, relogio decorativo, prateleira ou textura discreta",
  "Mesa posta elegante": "sala de jantar elegante com cadeiras arrumadas, mesa posta clean e detalhes de decoracao",
  "Achados para casa": "cantinho da casa com achados uteis e bonitos, organizacao pratica e acabamento premium",
  "Lavanderia organizada": "area de servico pequena organizada, prateleiras, cestos, produtos alinhados e visual claro",
  "Organizacao e prateleiras": "prateleiras organizadas com potes, caixas e objetos de decoracao em ambiente pequeno",
  "Organização e prateleiras": "prateleiras organizadas com potes, caixas e objetos de decoracao em ambiente pequeno",
  "Quarto decorado": "quarto de casal pequeno decorado, mesa de cabeceira organizada, relogio digital e tons neutros",
  "Relogios de parede": "parede de sala ou cozinha com relogio decorativo grande, composicao limpa e elegante",
  "Iluminacao decorativa": "ambiente interno com luminaria decorativa acesa, luz aconchegante e decoracao sofisticada",
  "Escritorio em casa": "home office organizado, mesa clara, luminaria, porta-canetas e pequenos objetos decorativos",
  "Escritório em casa": "home office organizado, mesa clara, luminaria, porta-canetas e pequenos objetos decorativos",
  "Hall de entrada": "hall de entrada elegante com aparador, bandeja, vaso, relogio ou arandela na parede",
  "Design de interiores": "ambiente residencial bem decorado com composicao harmônica, cores neutras e detalhes Chique Home",
  "Paleta de cores para casa": "ambiente decorado com paleta de cores harmonica, tons neutros e objetos decorativos",
  "Truques de casa": "truque simples de organizacao e decoracao para deixar a casa mais bonita sem reforma",
  "Presentes para casa nova": "composicao de presentes para casa nova com itens uteis, decorativos e elegantes",
  "Área externa e varanda": "varanda pequena decorada com objetos funcionais, luz natural e clima acolhedor",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(value);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  const headers = rows.shift().map((h) => h.replace(/^\uFEFF/, ""));
  return rows.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(rows, file) {
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  writeFileSync(file, `\uFEFF${lines.join("\n")}`, "utf8");
}

function productShort(title) {
  return accentPortugueseText(title
    .split(" - ")[0]
    .replace(" para Sala/Quarto/Cozinha", "")
    .replace(" para Cozinha/Sala", "")
    .slice(0, 70));
}

function matches(product, term) {
  const haystack = `${product.title} ${product.product_type} ${product.tags}`.toLowerCase();
  const intent = term.intent.toLowerCase();
  const keyword = term.keyword.toLowerCase();
  if (term.source === "shopify_top_sellers_30d" && term.content_angle === "produto") {
    const generic = new Set([
      "para",
      "com",
      "sem",
      "casa",
      "cozinha",
      "banheiro",
      "sala",
      "grande",
      "moderno",
      "moderna",
      "decorativo",
      "decorativa",
      "porta",
      "preto",
      "preta",
      "bege",
      "verde",
      "cinza",
      "off",
      "nude",
      "stone",
      "terracota",
    ]);
    const tokens = keyword
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\W+/)
      .filter((token) => token.length > 3 && !generic.has(token));
    const normalizedHaystack = haystack.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matchCount = tokens.filter((token) => normalizedHaystack.includes(token)).length;
    return matchCount >= Math.min(2, tokens.length);
  }
  if (haystack.includes(intent)) return true;
  if (keyword.includes("cozinha") && (haystack.includes("cozinha") || haystack.includes("tapete"))) return true;
  if (keyword.includes("banheiro") && (haystack.includes("banheiro") || haystack.includes("lavabo") || haystack.includes("maquiagem"))) return true;
  if (keyword.includes("sala") && (haystack.includes("relogio") || haystack.includes("lustre") || haystack.includes("luminaria"))) return true;
  if (intent.includes("iluminacao") && (haystack.includes("lustre") || haystack.includes("luminaria") || haystack.includes("arandela"))) return true;
  if (intent.includes("relogio") && haystack.includes("relogio")) return true;
  return false;
}

function fill(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "");
}

function truncateText(text, maxLength) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const cut = normalized.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.65 ? cut.slice(0, lastSpace) : cut.slice(0, maxLength)).trim();
}

function addPinterestCoupon(description) {
  return truncateText(`${description} ${PINTEREST_COUPON_TEXT}`, 500);
}

function normalizeText(text) {
  return String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function makeUrl(handle, keyword, index) {
  const params = new URLSearchParams({
    utm_source: "pinterest",
    utm_medium: "organic_pin",
    utm_campaign: "pinterest_organic_chiquehome",
    utm_content: `${keyword.replace(/\s+/g, "_")}_${index}`,
  });
  return `${STORE_URL}/products/${handle}?${params.toString()}`;
}

function makeCollectionUrl(boardName, keyword, index) {
  const collectionPath = collectionByBoard[boardName] ?? "collections/achados-para-casa";
  const params = new URLSearchParams({
    utm_source: "pinterest",
    utm_medium: "organic_pin",
    utm_campaign: "pinterest_organic_chiquehome",
    utm_content: `${keyword.replace(/\s+/g, "_")}_${index}`,
  });
  return `${STORE_URL}/${collectionPath}?${params.toString()}`;
}

function visualStrategy(term, index) {
  const angle = normalizeText(term.content_angle);
  const variant = visualVariants[(index - 1) % visualVariants.length];
  if (angle === "produto" && variant === "environment_full_bleed") {
    return "product_full_bleed";
  }
  return variant;
}

function landingType(strategy) {
  return strategy === "product_full_bleed" || strategy === "product_in_environment" || strategy === "product_title_overlay"
    ? "product"
    : "collection";
}

function requiresAiImage(strategy) {
  return strategy !== "product_full_bleed";
}

function termForCampaign(row) {
  const isProductPin = row.visual_strategy === "product_full_bleed"
    || row.visual_strategy === "product_in_environment"
    || row.visual_strategy === "product_title_overlay";
  return {
    keyword: row.keyword,
    intent: row.intent || row.board_name,
    board: row.board_name,
    priority: "1",
    content_angle: isProductPin ? "produto" : "ambiente",
    monthly_change: "",
  };
}

function buildRow({ id, product, term, strategy, scheduledAt }) {
  const room = roomByType[product.product_type] ?? term.intent;
  const short = productShort(product.title);
  const displayKeyword = accentPortugueseText(term.keyword);
  const data = { keyword: displayKeyword, product_short: short, room: accentPortugueseText(room) };
  const title = polishPortugueseTitle(truncateText(fill(titleTemplates[id % titleTemplates.length], data), 100));
  const description = addPinterestCoupon(accentPortugueseText(fill(descriptionTemplates[id % descriptionTemplates.length], data)));
  const destinationType = landingType(strategy);
  return {
    id,
    scheduled_at: scheduledAt.toISOString(),
    board_name: term.board,
    keyword: term.keyword,
    intent: term.intent,
    content_angle: term.content_angle,
    trend_monthly_change: term.monthly_change ?? "",
    visual_strategy: strategy,
    landing_type: destinationType,
    title,
    description,
    link: destinationType === "collection"
      ? makeCollectionUrl(term.board, term.keyword, id)
      : makeUrl(product.handle, term.keyword, id),
    image_url: product.image_url,
    generated_image_prompt: accentPortugueseText(imagePrompt({ product, term: { ...term, keyword: displayKeyword }, title, strategy })),
    requires_ai_image: requiresAiImage(strategy) ? "yes" : "no",
    alt_text: accentPortugueseText(`${short} - ${displayKeyword} Chique Home`).slice(0, 500),
    product_title: accentPortugueseText(product.title),
    product_handle: product.handle,
    status: "ready",
  };
}

function imagePrompt({ product, term, title, strategy }) {
  const scene = boardScene[term.board] ?? `${term.keyword} em ambiente de casa elegante, organizado e realista`;
  const productName = productShort(product.title);
  const palette = "paleta Chique Home: off-white, bege, madeira clara, taupe suave, preto fosco, luz quente, visual premium brasileiro";
  const base = `Pinterest Pin vertical 2:3, imagem bonita full-bleed, sem card, sem borda, estilo foto premium realista. Tema: ${term.keyword}. Cenario: ${scene}. Usar ${palette}.`;
  if (strategy === "product_full_bleed") {
    return `Usar foto original do produto da Shopify em formato vertical cheio, sem moldura e sem card. Produto: ${productName}. Se precisar, aplicar fundo limpo premium e manter o produto grande e claro. Cupom PINTEREST10 apenas discreto, se houver texto.`;
  }
  if (strategy === "environment_full_bleed") {
    return `${base} Criar um cenario inspiracional de ambiente, sem texto grande. A imagem precisa parecer resultado real de busca no Pinterest, bonita e clicavel. Produto relacionado: ${productName}, aplicar apenas se fizer sentido natural.`;
  }
  if (strategy === "environment_title_overlay") {
    return `${base} Criar cenario bonito com titulo centralizado, curto e clicavel em portugues: "${title}". Texto elegante, alto contraste, estilo Pinterest Brasil, sem poluir. Cupom PINTEREST10 pequeno no canto inferior.`;
  }
  if (strategy === "product_in_environment") {
    return `${base} Aplicar visualmente o produto da Shopify em outro ambiente realista de forma natural. Produto: ${productName}. Sem texto grande, foco em inspirar clique para compra.`;
  }
  if (strategy === "product_title_overlay") {
    return `${base} Criar imagem com o produto em destaque e titulo centralizado usando o nome do produto ou colecao: "${productName}". Visual premium, elegante, estilo Pinterest Brasil, sem lista e sem marcadores. Cupom PINTEREST10 discreto.`;
  }
  return `${base} Criar imagem com produto ou ambiente em destaque, visual premium realista e clicavel. Produto relacionado: ${productName}.`;
}

function generate() {
  const products = parseCsv(readFileSync(path.join(ROOT, "data", "products_seed.csv"), "utf8"));
  const productsByHandle = new Map(products.map((product) => [product.handle, product]));
  const baseTerms = parseCsv(readFileSync(path.join(ROOT, "data", "pinterest_terms.csv"), "utf8"));
  const trendTermsPath = path.join(ROOT, "data", "trends_terms_manual.csv");
  const trendTerms = parseCsv(readFileSync(trendTermsPath, "utf8"));
  const terms = [...trendTerms, ...baseTerms]
    .sort((a, b) => Number(a.priority) - Number(b.priority));
  const slots = [9, 11, 13, 15, 17, 19, 21];
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const rows = [];
  let idx = 1001;

  const weeklyCampaignPath = path.join(ROOT, "data", "weekly_campaign_2026-07-21.csv");
  try {
    const weeklyRows = parseCsv(readFileSync(weeklyCampaignPath, "utf8"));
    for (let i = 0; i < weeklyRows.length; i++) {
      const campaign = weeklyRows[i];
      const product = productsByHandle.get(campaign.product_handle);
      if (!product) throw new Error(`Produto nao encontrado no weekly campaign: ${campaign.product_handle}`);
      const scheduled = new Date(`${campaign.date}T${String(slots[i % 5] ?? 9).padStart(2, "0")}:00:00-03:00`);
      rows.push(buildRow({
        id: idx,
        product,
        term: termForCampaign(campaign),
        strategy: campaign.visual_strategy,
        scheduledAt: scheduled,
      }));
      idx++;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  for (const product of products) {
    let relevant = terms.filter((term) => matches(product, term));
    if (!relevant.length) relevant = terms.slice(0, 8);
    for (const term of relevant.slice(0, 10)) {
      const strategy = visualStrategy(term, idx);
      const scheduled = new Date(start);
      scheduled.setDate(start.getDate() + Math.floor((idx - 1) / slots.length));
      scheduled.setHours(slots[(idx - 1) % slots.length], 0, 0, 0);
      rows.push(buildRow({ id: idx, product, term, strategy, scheduledAt: scheduled }));
      idx++;
    }
  }
  return rows;
}

const outDir = path.join(ROOT, "output");
mkdirSync(outDir, { recursive: true });
const rows = generate();
writeCsv(rows, path.join(outDir, "pins_batch.csv"));
writeFileSync(path.join(outDir, "pins_batch.json"), JSON.stringify(rows, null, 2), "utf8");
console.log(`Generated ${rows.length} pins`);
