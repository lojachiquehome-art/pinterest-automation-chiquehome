import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accentPortugueseText, polishPortugueseTitle } from "./portuguese_text.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE_URL = "https://chiquehome.com.br";
const PINTEREST_COUPON_TEXT = "Use o cupom PINTEREST10 e ganhe 10% de desconto por ter vindo do Pinterest.";

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
  Cozinha: "cozinha",
  Organizacao: "closet ou area de organizacao",
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
  "Truques de casa": "solucao elegante de organizacao e decoracao para deixar a casa mais bonita sem reforma",
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

function isProductStrategy(strategy) {
  return strategy === "product_full_bleed"
    || strategy === "product_in_environment"
    || strategy === "product_title_overlay"
    || strategy === "split_two_products";
}

function titleCaseFirst(text) {
  const value = String(text ?? "").trim();
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function productColorDetails(product) {
  const text = normalizeText(`${product.title} ${product.handle} ${product.image_url} ${product.tags}`);
  const details = [];
  const add = (value) => {
    if (!details.includes(value)) details.push(value);
  };

  if (text.includes("lorenzzo") || text.includes("wood") || text.includes("marrom")) add("branco com acabamento amadeirado/marrom");
  if (text.includes("preto") || text.includes("preta")) add("preto");
  if (text.includes("dourado") || text.includes("dourada")) add("dourado");
  if (text.includes("branco") || text.includes("branca")) add("branco");
  if (text.includes("bege areia")) add("bege areia");
  else if (text.includes("bege")) add("bege");
  if (text.includes("nude")) add("nude");
  if (text.includes("verde")) add("verde");
  if (text.includes("cinza") || text.includes("ciano")) add("cinza/ciano");

  return details.join(", ");
}

function productModelDetails(product) {
  const text = normalizeText(`${product.title} ${product.handle} ${product.tags}`);
  const details = [];
  const add = (value) => {
    if (!details.includes(value)) details.push(value);
  };

  if (text.includes("lorenzzo")) add("modelo Lorenzzo Wood");
  if (text.includes("espiral")) add("modelo espiral");
  if (text.includes("triangular")) add("modelo triangular");
  if (text.includes("redondo")) add("modelo redondo");
  if (text.includes("duplo")) add("modelo duplo");
  if (text.includes("quadrada") || text.includes("quadrado")) add("formato quadrado");
  if (text.includes("3 em 1")) add("modelo 3 em 1");

  return details.join(", ");
}

function productDetailsSentence(product) {
  const color = productColorDetails(product);
  const model = productModelDetails(product);
  const parts = [];
  if (model) parts.push(model);
  if (color) parts.push(`cor/acabamento ${color}`);
  return parts.length ? ` Destaque para ${parts.join(" e ")}.` : "";
}

function productPairCategory(product, product2) {
  const text = normalizeText(`${product.title} ${product.handle} ${product2?.title ?? ""} ${product2?.handle ?? ""} ${product.product_type} ${product2?.product_type ?? ""}`)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const has = (phrase) => text.includes(normalizeText(phrase).replace(/[^a-z0-9]+/g, " "));
  if (has("porta papel")) return "Porta-Papel Higiênico de Parede";
  if (has("tapete")) return "Tapete para Cozinha Antiderrapante Absorvente";
  if (has("relogio de parede")) return "Relógio de Parede";
  if (has("relogio") && (has("mesa") || has("despertador"))) return "Relógio de Mesa Digital";
  if (has("luminaria de teto")) return "Luminária de Teto LED";
  if (has("vaso")) return "Vaso Decorativo";
  if (has("organizador de maquiagem")) return "Organizador de Maquiagem";
  return product.product_type ? accentPortugueseText(product.product_type) : "Produtos Chique Home";
}

function productPairVariant(product) {
  const text = normalizeText(`${product.title} ${product.handle} ${product.tags}`)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const has = (phrase) => text.includes(normalizeText(phrase).replace(/[^a-z0-9]+/g, " "));
  const pieces = [];
  const add = (value) => {
    if (!pieces.includes(value)) pieces.push(value);
  };

  if (has("torino")) return "Torino Black";
  if (has("cremona")) return "Cremona Cream Wood";
  if (has("nordic")) return "Nordic branco";
  if (has("ceramica")) return "cerâmica 2 peças";
  if (has("porta pincel")) return "porta-pincel giratório preto";
  if (has("gavetas")) return "gavetas";

  if (has("papeleira")) add("papeleira");
  if (/\bmini\b/.test(text)) add("mini");
  if (has("triangular")) add("triangular");
  if (has("circular")) add("circular");
  if (has("espiral")) add("espiral");

  if (has("prateado") || has("prateada")) add("prateado");
  if (has("dourado") || has("dourada")) add("dourado");
  if (has("preto") || has("preta")) add("preto");
  if (has("branco") || has("branca")) add("branco");
  if (has("bege areia")) add("bege areia");
  else if (has("bege")) add("bege");
  if (has("cinza") || has("ciano")) add("cinza/ciano");
  if (has("verde")) add("verde");

  return pieces.length ? accentPortugueseText(pieces.join(" ")) : productShort(product.title);
}

function titleCaseProductVariant(value) {
  return String(value)
    .split(" ")
    .map((word) => {
      if (/^(e|de|da|do|dos|das|para|com|em)$/i.test(word)) return word.toLowerCase();
      return word
        .split("-")
        .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
        .join("-");
    })
    .join(" ")
    .replace(/\bLed\b/g, "LED");
}

function buildProductPairTitle(product, product2) {
  const category = productPairCategory(product, product2);
  const first = productPairVariant(product);
  const second = product2 ? productPairVariant(product2) : "";
  const rawTitle = second ? `${category} ${first} e ${second}` : `${category} ${first}`;
  const title = normalizeText(category).includes("luminaria")
    ? rawTitle.replace("circular preto", "circular preta").replace("espiral prateado", "espiral prateada")
    : rawTitle;
  return polishPortugueseTitle(truncateText(titleCaseProductVariant(title), 100));
}

function pairVariationPhrase(product, product2) {
  const category = normalizeText(productPairCategory(product, product2)).replace(/[^a-z0-9]+/g, " ");
  const first = productPairVariant(product);
  const second = product2 ? productPairVariant(product2) : "";
  const variants = second ? `${first} e ${second}` : first;

  if (category.includes("porta papel")) return `nos acabamentos ${variants.replace("papeleira ", "")}`;
  if (category.includes("tapete")) return `nas cores ${variants}`;
  if (category.includes("relogio")) return `nos modelos ${variants}`;
  if (category.includes("luminaria")) return `nos modelos ${variants.replace("preto", "preta").replace("prateado", "prateada")}`;
  if (category.includes("vaso")) return `nos modelos ${variants}`;
  if (category.includes("organizador")) return `nas versões ${variants}`;
  return `nas variações ${variants}`;
}

function buildPinterestTitle({ product, product2, productShortName, product2ShortName, keyword, boardName, strategy }) {
  const cleanKeyword = accentPortugueseText(keyword);
  const cleanProduct = accentPortugueseText(productShortName);
  const cleanBoard = accentPortugueseText(boardName);

  if (strategy === "split_two_products") {
    return buildProductPairTitle(product, product2);
  }

  const title = isProductStrategy(strategy)
    ? cleanProduct
    : cleanKeyword;
  return polishPortugueseTitle(truncateText(titleCaseFirst(title), 100));
}

function productDescriptionLead({ product, productShortName, keyword, boardName, id }) {
  const cleanKeyword = accentPortugueseText(keyword);
  const cleanProduct = accentPortugueseText(productShortName);
  const context = normalizeText(`${productShortName} ${product.product_type}`);
  const detail = productDetailsSentence(product);
  const variant = id % 3;

  if (context.includes("organizador") || context.includes("prateleira")) {
    const options = [
      `${cleanProduct} ajuda a organizar melhor o espaço sem abrir mão de um visual limpo e bonito.`,
      `${cleanProduct} deixa a bancada ou prateleira mais prática, com tudo à vista e bem apresentado.`,
      `${cleanProduct} une organização e estética para deixar o ambiente mais funcional e agradável.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("relogio") && (context.includes("parede") || context.includes("lorenzzo"))) {
    const options = [
      `${cleanProduct} cria um ponto de destaque na parede e combina com salas, cozinhas e ambientes integrados.`,
      `${cleanProduct} funciona como peça decorativa e utilitária para dar acabamento à parede sem exagero visual.`,
      `${cleanProduct} deixa a parede mais interessante e ajuda a completar uma composição elegante no ambiente.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("relogio") || context.includes("despertador") || context.includes("cabeceira")) {
    const options = [
      `${cleanProduct} deixa a mesa de cabeceira mais moderna e funcional, com presença discreta no quarto.`,
      `${cleanProduct} organiza a rotina e adiciona um detalhe tecnológico bonito para a cabeceira ou mesa lateral.`,
      `${cleanProduct} combina praticidade e visual minimalista para quem quer um quarto mais limpo e atual.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("porta papel")) {
    const options = [
      `${cleanProduct} organiza o banheiro com acabamento elegante e deixa o papel sempre à mão sem poluir a decoração.`,
      `${cleanProduct} é uma escolha prática para lavabo ou banheiro pequeno, criando um visual mais limpo e sofisticado.`,
      `${cleanProduct} valoriza o banheiro com um detalhe funcional, discreto e fácil de combinar com metais e revestimentos modernos.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("porta shampoo") || context.includes("suporte")) {
    const options = [
      `${cleanProduct} ajuda a manter shampoo, sabonete e itens de banho organizados com visual limpo no box.`,
      `${cleanProduct} deixa o banheiro mais funcional e sofisticado, com os produtos de uso diário sempre bem posicionados.`,
      `${cleanProduct} organiza o box sem pesar na decoração e combina com banheiros modernos e bem planejados.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("porta escova")) {
    const options = [
      `${cleanProduct} mantém escovas e itens de bancada organizados com um acabamento bonito para lavabo ou banheiro.`,
      `${cleanProduct} deixa a pia mais limpa visualmente e ajuda a compor um banheiro mais chique e funcional.`,
      `${cleanProduct} organiza a rotina do banheiro com presença discreta, prática e sofisticada na bancada.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("saboneteira") || context.includes("bandeja") || context.includes("banheiro") || context.includes("lavabo")) {
    const options = [
      `${cleanProduct} valoriza a bancada do banheiro com um detalhe funcional, discreto e fácil de combinar.`,
      `${cleanProduct} ajuda a organizar o lavabo ou banheiro com acabamento elegante e visual mais bem cuidado.`,
      `${cleanProduct} completa a decoração do banheiro com praticidade e aparência sofisticada no dia a dia.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("porta detergente") || context.includes("utensilio") || context.includes("utensilios") || context.includes("pratos")) {
    const options = [
      `${cleanProduct} mantém a pia e a bancada mais organizadas, com visual limpo e funcional para a rotina da cozinha.`,
      `${cleanProduct} ajuda a deixar os itens de uso diário bem posicionados e a cozinha com aparência mais planejada.`,
      `${cleanProduct} organiza a cozinha com praticidade e acabamento bonito, sem ocupar visualmente a bancada.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("tapete") || context.includes("cozinha") || context.includes("passadeira")) {
    const options = [
      `${cleanProduct} completa a cozinha com conforto, proteção e um visual mais alinhado para a rotina.`,
      `${cleanProduct} deixa a área da pia ou bancada mais aconchegante, sem abrir mão de praticidade no dia a dia.`,
      `${cleanProduct} ajuda a compor uma cozinha mais bonita e funcional, com presença discreta no piso.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("luminaria") || context.includes("iluminacao") || context.includes("lustre") || context.includes("arandela")) {
    const options = [
      `${cleanProduct} valoriza a iluminação do ambiente e cria uma sensação mais aconchegante na decoração.`,
      `${cleanProduct} ajuda a transformar sala, quarto ou cozinha com luz bonita e acabamento moderno.`,
      `${cleanProduct} traz presença elegante para o ambiente e deixa a composição mais atual sem perder sofisticação.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("vaso")) {
    const options = [
      `${cleanProduct} cria um ponto decorativo elegante para mesa, aparador ou estante sem pesar no ambiente.`,
      `${cleanProduct} adiciona forma e textura à decoração, deixando a composição mais sofisticada e bem finalizada.`,
      `${cleanProduct} é um detalhe versátil para valorizar salas, aparadores e cantinhos decorados com acabamento elegante.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("escultura") || context.includes("estatueta")) {
    const options = [
      `${cleanProduct} adiciona presença artística à decoração e deixa aparadores, estantes e mesas mais sofisticados.`,
      `${cleanProduct} funciona como peça de destaque para compor ambientes elegantes com personalidade.`,
      `${cleanProduct} completa a decoração com um toque escultórico, moderno e bem acabado para a sala.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("cesto")) {
    const options = [
      `${cleanProduct} organiza mantas, objetos e pequenos itens com textura natural e aparência sofisticada.`,
      `${cleanProduct} traz função e acabamento decorativo para deixar a sala mais organizada e acolhedora.`,
      `${cleanProduct} ajuda a compor uma decoração prática, bonita e com toque natural no ambiente.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("almofada") || context.includes("sofa")) {
    const options = [
      `${cleanProduct} renova o sofá com textura, conforto e acabamento elegante para uma sala mais acolhedora.`,
      `${cleanProduct} adiciona volume e sofisticação ao sofá, criando uma composição mais bem acabada.`,
      `${cleanProduct} é um detalhe elegante para mudar a sala e deixar o ambiente mais confortável visualmente.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("cadeira") || context.includes("jantar") || context.includes("mesa posta")) {
    const options = [
      `${cleanProduct} transforma a sala de jantar com acabamento bonito e uso prático na rotina.`,
      `${cleanProduct} deixa as cadeiras mais alinhadas e ajuda a criar uma mesa posta com aparência mais elegante.`,
      `${cleanProduct} protege e renova as cadeiras, deixando o conjunto de jantar mais sofisticado.`,
    ];
    return `${options[variant]}${detail}`;
  }
  if (context.includes("livro") || context.includes("decorativo")) {
    const options = [
      `${cleanProduct} é aquele detalhe decorativo que deixa mesas, aparadores e estantes com aparência mais produzida.`,
      `${cleanProduct} ajuda a criar uma composição elegante em bandejas, mesas de centro e prateleiras.`,
      `${cleanProduct} completa a decoração com um toque editorial e sofisticado, sem ocupar visualmente o ambiente.`,
    ];
    return `${options[variant]}${detail}`;
  }
  return `${cleanProduct} é uma escolha da Chique Home para quem busca ${cleanKeyword} com visual bonito, funcional e acabamento sofisticado.${detail}`;
}

function environmentDescriptionLead({ keyword, boardName, id }) {
  const cleanKeyword = accentPortugueseText(keyword);
  const cleanBoard = accentPortugueseText(boardName);
  const context = normalizeText(`${keyword} ${boardName}`);
  const variant = id % 3;

  if (context.includes("banheiro") || context.includes("lavabo")) {
    return [
      `Ideia de ${cleanKeyword} para deixar o banheiro mais organizado, bonito e com aparência de ambiente planejado.`,
      `Inspiração de ${cleanKeyword} para transformar o banheiro com poucos elementos e acabamento mais elegante.`,
      `${titleCaseFirst(cleanKeyword)} combina praticidade e estética para um banheiro mais limpo e sofisticado.`,
    ][variant];
  }
  if (context.includes("cozinha") || context.includes("tapete") || context.includes("passadeira")) {
    return [
      `Inspiração de ${cleanKeyword} para uma cozinha mais prática, clara e elegante, com detalhes que melhoram o uso diário.`,
      `Ideia de ${cleanKeyword} para deixar a cozinha mais confortável, organizada e visualmente bem resolvida.`,
      `${titleCaseFirst(cleanKeyword)} ajuda a criar uma cozinha bonita para usar todos os dias, sem perder funcionalidade.`,
    ][variant];
  }
  if (context.includes("jantar") || context.includes("mesa posta")) {
    return [
      `Inspiração de ${cleanKeyword} para deixar a sala de jantar mais elegante, bem composta e pronta para receber com sofisticação.`,
      `Ideia de ${cleanKeyword} para valorizar a mesa e deixar o ambiente de jantar mais acolhedor.`,
      `${titleCaseFirst(cleanKeyword)} cria uma composição mais alinhada para receber bem e decorar com intenção.`,
    ][variant];
  }
  if (context.includes("sala") || context.includes("sofa")) {
    return [
      `Inspiração de ${cleanKeyword} para compor uma sala mais acolhedora, sofisticada e pronta para receber bem.`,
      `Ideia de ${cleanKeyword} para deixar a sala mais elegante com detalhes certos e visual equilibrado.`,
      `${titleCaseFirst(cleanKeyword)} ajuda a renovar o ambiente com uma composição mais confortável e sofisticada.`,
    ][variant];
  }
  if (context.includes("quarto") || context.includes("cabeceira")) {
    return [
      `Ideia de ${cleanKeyword} para deixar o quarto mais confortável, organizado e visualmente sofisticado.`,
      `Inspiração de ${cleanKeyword} para uma cabeceira mais funcional, bonita e bem composta.`,
      `${titleCaseFirst(cleanKeyword)} deixa o quarto mais prático e elegante sem precisar mudar tudo.`,
    ][variant];
  }
  if (context.includes("iluminacao") || context.includes("luminaria") || context.includes("lustre")) {
    return [
      `Ideia de ${cleanKeyword} para transformar a sensação do ambiente com luz bonita, acabamento moderno e presença elegante.`,
      `Inspiração de ${cleanKeyword} para deixar sala, quarto ou cozinha com clima mais aconchegante.`,
      `${titleCaseFirst(cleanKeyword)} muda a percepção do ambiente e valoriza a decoração com mais sofisticação.`,
    ][variant];
  }
  if (context.includes("parede") || context.includes("relogio")) {
    return [
      `Inspiração de ${cleanKeyword} para valorizar a parede com um ponto visual elegante e fácil de aplicar na decoração.`,
      `Ideia de ${cleanKeyword} para completar a parede sem exagero e deixar o ambiente mais bem acabado.`,
      `${titleCaseFirst(cleanKeyword)} cria destaque na decoração e combina com ambientes modernos e sofisticados.`,
    ][variant];
  }
  return [
    `Inspiração de ${cleanKeyword} para deixar a casa mais bonita, organizada e sofisticada com ideias da coleção ${cleanBoard}.`,
    `Ideia de ${cleanKeyword} para renovar o ambiente com detalhes objetivos e visual Chique Home.`,
    `${titleCaseFirst(cleanKeyword)} é uma forma elegante de deixar o ambiente mais sofisticado e funcional.`,
  ][variant];
}

function splitProductsDescriptionLead({ product, product2, productShortName, product2ShortName, id }) {
  const category = productPairCategory(product, product2).toLowerCase();
  const variations = pairVariationPhrase(product, product2);
  const variant = id % 3;
  const options = [
    `Compare duas opções de ${category} ${variations} para escolher o acabamento que combina melhor com o seu ambiente.`,
    `Veja dois modelos de ${category} da mesma coleção, ${variations}, e encontre a opção ideal para sua casa.`,
    `Uma seleção com duas opções de ${category} ${variations}, pensada para facilitar a escolha de um visual mais sofisticado.`,
  ];
  return accentPortugueseText(options[variant]);
}

function buildPinterestDescription({ product, product2, productShortName, product2ShortName, keyword, boardName, strategy, id }) {
  const intro = strategy === "split_two_products"
    ? splitProductsDescriptionLead({ product, product2, productShortName, product2ShortName, id })
    : isProductStrategy(strategy)
    ? productDescriptionLead({ product, productShortName, keyword, boardName, id })
    : environmentDescriptionLead({ keyword, boardName, id });
  return addPinterestCoupon(`${intro} Clique no botão "Acessar o site" para ver detalhes, medidas, preço e comprar na Chique Home.`);
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
  return strategy === "product_full_bleed"
    || strategy === "product_in_environment"
    ? "product"
    : "collection";
}

function requiresAiImage(strategy) {
  return strategy !== "product_full_bleed" && strategy !== "split_two_products";
}

function termForCampaign(row) {
  const isProductPin = row.visual_strategy === "product_full_bleed"
    || row.visual_strategy === "product_in_environment";
  return {
    keyword: row.keyword,
    intent: row.intent || row.board_name,
    board: row.board_name,
    priority: "1",
    content_angle: isProductPin ? "produto" : "ambiente",
    monthly_change: "",
  };
}

function buildRow({ id, product, product2, term, strategy, scheduledAt }) {
  const room = roomByType[product.product_type] ?? term.intent;
  const short = productShort(product.title);
  const short2 = product2 ? productShort(product2.title) : "";
  const displayKeyword = accentPortugueseText(term.keyword);
  const title = buildPinterestTitle({
    product,
    product2,
    productShortName: short,
    product2ShortName: short2,
    keyword: displayKeyword,
    boardName: term.board,
    strategy,
  });
  const description = buildPinterestDescription({
    product,
    product2,
    productShortName: short,
    product2ShortName: short2,
    keyword: displayKeyword,
    boardName: term.board,
    strategy,
    id,
  });
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
    product_2_title: product2 ? accentPortugueseText(product2.title) : "",
    product_2_handle: product2?.handle ?? "",
    product_2_image_url: product2?.image_url ?? "",
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

  const weeklyCampaignFiles = readdirSync(path.join(ROOT, "data"))
    .filter((file) => /^weekly_campaign_\d{4}-\d{2}-\d{2}\.csv$/i.test(file))
    .sort();
  for (const weeklyCampaignFile of weeklyCampaignFiles) {
    const weeklyRows = parseCsv(readFileSync(path.join(ROOT, "data", weeklyCampaignFile), "utf8"));
    for (let i = 0; i < weeklyRows.length; i++) {
      const campaign = weeklyRows[i];
      const product = productsByHandle.get(campaign.product_handle);
      if (!product) throw new Error(`Produto nao encontrado no weekly campaign: ${campaign.product_handle}`);
      const product2 = campaign.product_2_handle ? productsByHandle.get(campaign.product_2_handle) : null;
      if (campaign.product_2_handle && !product2) throw new Error(`Produto 2 nao encontrado no weekly campaign: ${campaign.product_2_handle}`);
      const id = Number(campaign.id) || idx;
      idx = Math.max(idx, id + 1);
      const scheduled = new Date(`${campaign.date}T${String(slots[i % 5] ?? 9).padStart(2, "0")}:00:00-03:00`);
      rows.push(buildRow({
        id,
        product,
        product2,
        term: termForCampaign(campaign),
        strategy: campaign.visual_strategy,
        scheduledAt: scheduled,
      }));
    }
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
