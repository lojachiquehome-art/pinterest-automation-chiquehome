import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE_URL = "https://chiquehome.com.br";
const PINTEREST_COUPON_TEXT = "Use o cupom PINTEREST10 e ganhe 10% de desconto por ter vindo do Pinterest.";

const titleTemplates = [
  "{keyword}: ideia elegante com {product_short}",
  "{product_short}: inspiracao para {keyword}",
  "{keyword} para deixar o ambiente mais sofisticado",
  "Inspire-se: {keyword} com toque Chique Home",
  "{product_short} para transformar o ambiente",
  "Veja como usar {product_short} em {keyword}",
  "{keyword}: produto para comprar e usar em casa",
  "Ideia pronta de {keyword} com link do produto",
];

const descriptionTemplates = [
  "Ideia de {keyword} para deixar sua casa mais bonita, funcional e sofisticada. Veja o produto na Chique Home e monte um ambiente com mais personalidade.",
  "Se voce esta buscando {keyword}, este item ajuda a renovar o ambiente sem reforma. Confira detalhes, medidas e opcoes na Chique Home.",
  "Uma inspiracao simples para quem quer {keyword} com acabamento elegante. Produto com compra segura, frete e rastreio.",
  "Transforme o ambiente com uma escolha visual e funcional. Veja essa sugestao de {keyword} na Chique Home.",
  "Gostou da ideia? Clique para ver preco, medidas, cores e detalhes do produto na Chique Home.",
  "Uma sugestao pratica para quem quer comprar decoracao online com mais seguranca. Veja o produto, variacoes e informacoes de entrega.",
];

const roomByType = {
  Banheiro: "banheiro",
  "Tapete Cozinha": "cozinha",
  Relogio: "sala ou cozinha",
  Iluminacao: "sala, quarto ou cozinha",
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
  "Quarto decorado": "collections/quarto-decorado",
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
  "Quarto decorado": "quarto de casal pequeno decorado, mesa de cabeceira organizada, relogio digital e tons neutros",
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
  return title
    .split(" - ")[0]
    .replace(" para Sala/Quarto/Cozinha", "")
    .replace(" para Cozinha/Sala", "")
    .slice(0, 70);
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

function addPinterestCoupon(description) {
  return `${description} ${PINTEREST_COUPON_TEXT}`.slice(0, 500);
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
  if (angle === "produto") {
    return index % 3 === 0 ? "product_editorial_text" : "shopify_product_photo";
  }
  if (angle === "dor" || angle === "ambiente" || angle === "transformacao" || angle === "projeto") {
    return index % 2 === 0 ? "generated_scene_with_product" : "generated_scene_with_text";
  }
  return index % 4 === 0 ? "shopify_product_photo" : "generated_scene_with_text";
}

function landingType(strategy) {
  return strategy.startsWith("generated_scene") ? "collection" : "product";
}

function imagePrompt({ product, term, title, strategy }) {
  const scene = boardScene[term.board] ?? `${term.keyword} em ambiente de casa elegante, organizado e realista`;
  const productName = productShort(product.title);
  const base = `Imagem vertical para Pinterest, proporcao 2:3, estilo clean e premium para a marca Chique Home. Tema: ${term.keyword}. Cenario: ${scene}.`;
  if (strategy === "shopify_product_photo") {
    return `Usar a foto original do produto da Shopify sem texto na imagem. Produto: ${productName}.`;
  }
  if (strategy === "product_editorial_text") {
    return `${base} Produto em destaque: ${productName}. Criar arte editorial minimalista com texto curto: "${title}". Inserir chamada pequena: "PINTEREST10".`;
  }
  if (strategy === "generated_scene_with_product") {
    return `${base} Aplicar visualmente o produto da Shopify no ambiente de forma natural e realista. Produto: ${productName}. Sem texto grande na imagem.`;
  }
  return `${base} Criar imagem de ambiente inspiracional com texto minimalista legivel: "${title}". Inserir o produto ${productName} como parte do cenario quando fizer sentido.`;
}

function generate() {
  const products = parseCsv(readFileSync(path.join(ROOT, "data", "products_seed.csv"), "utf8"));
  const baseTerms = parseCsv(readFileSync(path.join(ROOT, "data", "pinterest_terms.csv"), "utf8"));
  const trendTermsPath = path.join(ROOT, "data", "trends_terms_manual.csv");
  const trendTerms = parseCsv(readFileSync(trendTermsPath, "utf8"));
  const terms = [...trendTerms, ...baseTerms]
    .sort((a, b) => Number(a.priority) - Number(b.priority));
  const slots = [9, 11, 13, 15, 17, 19, 21];
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const rows = [];
  let idx = 1;

  for (const product of products) {
    let relevant = terms.filter((term) => matches(product, term));
    if (!relevant.length) relevant = terms.slice(0, 8);
    for (const term of relevant.slice(0, 10)) {
      const room = roomByType[product.product_type] ?? term.intent;
      const short = productShort(product.title);
      const data = { keyword: term.keyword, product_short: short, room };
      const title = fill(titleTemplates[idx % titleTemplates.length], data).slice(0, 100);
      const description = addPinterestCoupon(fill(descriptionTemplates[idx % descriptionTemplates.length], data));
      const strategy = visualStrategy(term, idx);
      const destinationType = landingType(strategy);
      const scheduled = new Date(start);
      scheduled.setDate(start.getDate() + Math.floor((idx - 1) / slots.length));
      scheduled.setHours(slots[(idx - 1) % slots.length], 0, 0, 0);
      rows.push({
        id: idx,
        scheduled_at: scheduled.toISOString(),
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
          ? makeCollectionUrl(term.board, term.keyword, idx)
          : makeUrl(product.handle, term.keyword, idx),
        image_url: product.image_url,
        generated_image_prompt: imagePrompt({ product, term, title, strategy }),
        alt_text: `${short} - ${term.keyword} Chique Home`.slice(0, 500),
        product_title: product.title,
        product_handle: product.handle,
        status: "ready",
      });
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
