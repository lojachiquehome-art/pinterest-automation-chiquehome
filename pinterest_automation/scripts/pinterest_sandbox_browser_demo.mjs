import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const API_BASE = "https://api-sandbox.pinterest.com/v5";
const PORT = 8790;

function html(body) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Demo API Sandbox Pinterest - Chique Home</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f1f1f; background: #faf8f4; }
    main { max-width: 980px; margin: 0 auto; background: #fff; padding: 28px; border: 1px solid #e4dfd6; }
    h1 { margin-top: 0; }
    label { display: block; font-weight: 700; margin: 18px 0 8px; }
    input { width: 100%; padding: 12px; font-size: 16px; border: 1px solid #aaa; }
    button, a.button { display: inline-block; margin-top: 16px; padding: 12px 18px; background: #bd081c; color: #fff; border: 0; text-decoration: none; font-weight: 700; cursor: pointer; }
    .ok { background: #eef8ef; border-left: 4px solid #22863a; padding: 12px 16px; margin: 12px 0; }
    .err { background: #fff0f0; border-left: 4px solid #bd081c; padding: 12px 16px; margin: 12px 0; white-space: pre-wrap; }
    code { background: #f1eee8; padding: 2px 5px; }
    .muted { color: #666; }
    ul { line-height: 1.65; }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function pinterest(pathname, token, options = {}) {
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

function getDemoPin() {
  const rows = JSON.parse(readFileSync(path.join(ROOT, "output", "pins_batch.json"), "utf8"));
  const row =
    rows.find((item) => item.status === "ready" && item.generated_image_url?.includes("raw.githubusercontent.com") && item.generated_image_url.endsWith(".png")) ||
    rows.find((item) => item.status === "ready" && (item.generated_image_url || item.image_url));
  if (!row) throw new Error("Nenhum Pin pronto com imagem publica foi encontrado em output/pins_batch.json.");
  return row;
}

async function runDemo(token) {
  const row = getDemoPin();
  const account = await pinterest("/user_account", token);

  const uniqueStamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const board = await pinterest("/boards", token, {
    method: "POST",
    body: JSON.stringify({
      name: `Chique Home Sandbox Demo ${uniqueStamp}`,
      description: "Pasta de teste para demonstracao de API Sandbox da Chique Home.",
      privacy: "PUBLIC",
    }),
  });

  const imageUrl = row.generated_image_url || row.image_url;
  const pin = await pinterest("/pins", token, {
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

  const pinDetails = await pinterest(`/pins/${pin.id}`, token);

  return { account, board, pin, pinDetails, row };
}

function renderForm() {
  return html(`
    <h1>Demo API Sandbox Pinterest - Chique Home</h1>
    <p>Esta tela demonstra a integracao completa solicitada pelo Pinterest: token Sandbox, chamada para <code>api-sandbox.pinterest.com</code>, criacao de pasta e criacao de Pin.</p>
    <p class="muted">O token nao sera salvo. Use apenas durante a gravacao e nao mostre o token inteiro no video.</p>
    <form method="post" action="/run">
      <label for="token">Token Sandbox</label>
      <input id="token" name="token" type="password" autocomplete="off" placeholder="Cole aqui o token Sandbox" />
      <button type="submit">Rodar demo da API Sandbox</button>
    </form>
  `);
}

function renderResult(result) {
  const pinUrl = `https://www.pinterest.com/pin/${result.pin.id}/`;
  const boardUrl = result.board.url ? `https://www.pinterest.com${result.board.url}` : "";
  return html(`
    <h1>Integracao API Sandbox concluida</h1>
    <div class="ok">1) Conta lida via API Sandbox: <strong>${result.account.username ?? result.account.account_type ?? "ok"}</strong></div>
    <div class="ok">2) Pasta criada via API Sandbox: <strong>${result.board.name}</strong> - ID ${result.board.id}</div>
    <div class="ok">3) Pin criado via API Sandbox: <strong>${result.pin.id}</strong></div>
    <h2>Pin criado</h2>
    <ul>
      <li><strong>Titulo:</strong> ${result.row.title}</li>
      <li><strong>Imagem:</strong> ${result.row.generated_image_url || result.row.image_url}</li>
      <li><strong>Link de destino:</strong> ${result.row.link}</li>
    </ul>
    <a class="button" href="${pinUrl}" target="_blank" rel="noreferrer">Abrir Pin recem-criado no Pinterest</a>
    ${boardUrl ? `<a class="button" href="${boardUrl}" target="_blank" rel="noreferrer">Abrir pasta no Pinterest</a>` : ""}
    <p class="muted">Mostre esta tela e depois abra o Pin no Pinterest para provar o resultado.</p>
  `);
}

function renderError(error) {
  return html(`
    <h1>Erro na demo Sandbox</h1>
    <div class="err">${String(error.stack || error.message || error)}</div>
    <a class="button" href="/">Voltar</a>
  `);
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderForm());
      return;
    }

    if (request.method === "POST" && request.url === "/run") {
      const body = await readRequestBody(request);
      const params = new URLSearchParams(body);
      const token = String(params.get("token") || "").trim();
      if (!token) throw new Error("Cole o token Sandbox antes de rodar a demo.");
      const result = await runDemo(token);
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderResult(result));
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Nao encontrado.");
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    response.end(renderError(error));
  }
});

server.listen(PORT, () => {
  console.log(`Demo no navegador: http://localhost:${PORT}`);
});
