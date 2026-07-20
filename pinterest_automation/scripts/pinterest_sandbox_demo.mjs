import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const API_BASE = "https://api-sandbox.pinterest.com/v5";
const token = process.env.PINTEREST_SANDBOX_TOKEN;

if (!token) {
  console.error("Defina PINTEREST_SANDBOX_TOKEN no terminal antes de rodar este demo.");
  process.exit(1);
}

async function pinterest(pathname, options = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Pinterest Sandbox API ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

const rows = JSON.parse(readFileSync(path.join(ROOT, "output", "pins_batch.json"), "utf8"));
const row =
  rows.find((item) => item.status === "ready" && item.generated_image_url?.includes("raw.githubusercontent.com") && item.generated_image_url.endsWith(".png")) ||
  rows.find((item) => item.status === "ready" && (item.generated_image_url || item.image_url));

if (!row) {
  console.error("Nenhum Pin pronto com imagem publica foi encontrado em output/pins_batch.json.");
  process.exit(1);
}

console.log("1) Lendo conta via Sandbox API...");
const account = await pinterest("/user_account");
console.log(`Conta Sandbox: ${account.username ?? account.account_type ?? "ok"}`);

console.log("2) Criando pasta Sandbox...");
const uniqueStamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const board = await pinterest("/boards", {
  method: "POST",
  body: JSON.stringify({
    name: `Chique Home Sandbox Demo ${uniqueStamp}`,
    description: "Pasta de teste para demonstracao de API Sandbox da Chique Home.",
    privacy: "PUBLIC",
  }),
});
console.log(`Pasta criada no Sandbox: ${board.name} (${board.id})`);

console.log("3) Criando Pin Sandbox...");
const imageUrl = row.generated_image_url || row.image_url;
const pin = await pinterest("/pins", {
  method: "POST",
  body: JSON.stringify({
    board_id: board.id,
    title: row.title,
    description: row.description,
    link: row.link,
    alt_text: row.alt_text,
    media_source: {
      source_type: "image_url",
      url: imageUrl,
    },
  }),
});

console.log(`Pin criado no Sandbox: ${pin.id}`);
console.log(`Abra o Pin no Pinterest: https://www.pinterest.com/pin/${pin.id}/`);
console.log("Demo concluido: OAuth/Token Sandbox + leitura de conta + criacao de pasta + criacao de Pin.");
