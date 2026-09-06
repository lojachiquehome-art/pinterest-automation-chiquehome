import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "tmp", "product_refs_2026-09-07");

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

const rows = [
  [9002, "relogio-de-parede-torino-green"],
  [9003, "relogio-de-parede-valentino-black-rose"],
  [9005, "relogio-de-parede-aurelio-silver-black", "relogio-de-parede-lorenzzo-white-gold"],
  [9007, "tapete-para-banheiro-antiderrapante-box-banho-chique-azul"],
  [9008, "tapete-para-banheiro-antiderrapante-box-banho-chique-marrom"],
  [9010, "tapete-capacho-de-natal-para-entrada-cozinha-banheiro-welcome", "tapete-capacho-de-natal-para-entrada-cozinha-banheiro-rena"],
  [9012, "vaso-decorativo-para-sala-de-ceramica-coracao-decoracao"],
  [9013, "vaso-decorativo-para-sala-cilindro-para-mesa-decoracao"],
  [9015, "vaso-decorativo-para-sala-de-ceramica-coracao-2-pecas", "porta-retrato-personalizado-de-madeira-em-c-10x15-13x18-e-15x21"],
  [9017, "jogo-americano-redondo-de-tecido-flor-2-pecas-decoracao-de-mesa"],
  [9018, "toalha-de-mesa-para-natal-retangular-impermeavel-quadriculada-xadrez"],
  [9020, "toalha-de-mesa-para-natal-retangular-impermeavel-quadriculada-vermelha", "toalha-de-mesa-para-natal-retangular-impermeavel-quadriculada-verde"],
  [9022, "guirlanda-de-natal-para-porta-parede-de-luxo-grande-vermelha"],
  [9023, "guirlanda-de-natal-para-porta-parede-de-luxo-grande-vermelha-verde"],
  [9025, "guirlanda-de-natal-de-luxo-para-porta-parede-grande-dourada", "tapete-capacho-de-natal-para-entrada-cozinha-banheiro-merry-christmas"],
  [9027, "casinha-decorada-de-natal-iluminada-decoracao-natalina-de-mesa"],
  [9028, "calendario-do-advento-de-natal-decoracao-natalina-de-mesa"],
  [9030, "trem-de-natal-iluminado-com-led-decoracao-de-mesa-natalina", "presepio-de-natal-completo-em-resina-decoracao-de-mesa-natalina"],
  [9032, "capa-para-almofada-de-natal-para-sofa-lisa-45x45-e-30x50"],
  [9033, "capa-para-almofada-de-natal-45x45-para-sofa-neve-bordado"],
  [9035, "capa-para-almofada-de-natal-45x45-para-sofa-bordado", "capa-de-cadeira-de-jantar-impermeavel-lisa-decorativa"],
];

function imageUrls(handle) {
  const product = byHandle.get(handle);
  if (!product) throw new Error(`Produto nao encontrado: ${handle}`);
  const urls = [];
  for (const image of product.images ?? []) {
    if (image?.src) urls.push(image.src);
  }
  if (!urls.length && product.image?.src) urls.push(product.image.src);
  if (!urls.length) throw new Error(`Produto sem imagem: ${handle}`);
  return [...new Set(urls)].map((url) => (url.startsWith("//") ? `https:${url}` : url));
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
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`Imagem ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

mkdirSync(OUT_DIR, { recursive: true });

for (const [id, handle, handle2] of rows) {
  for (const [suffix, currentHandle] of [["", handle], ["-b", handle2]]) {
    if (!currentHandle) continue;
    let input;
    let lastError;
    for (const url of [...imageUrls(currentHandle), ...(await liveImageUrls(currentHandle))]) {
      try {
        input = await fetchBuffer(url);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!input) throw lastError;
    const output = path.join(OUT_DIR, `pin-${id}${suffix}.png`);
    await sharp(input)
      .rotate()
      .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
      .png()
      .toFile(output);
    console.log(`${id}${suffix} | ${currentHandle} | ${output}`);
  }
}
