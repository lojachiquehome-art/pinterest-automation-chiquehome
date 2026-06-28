import http from "node:http";
import { URL } from "node:url";
import { buildPinterestAuthUrl, exchangePinterestCode, loadLocalEnv } from "./pinterest_auth.mjs";

loadLocalEnv();

const redirectUri = process.env.PINTEREST_REDIRECT_URI || "http://localhost:8787/oauth/pinterest/callback";
const callbackUrl = new URL(redirectUri);
const port = Number(callbackUrl.port || 8787);
const pathname = callbackUrl.pathname;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, redirectUri);
    if (url.pathname !== pathname) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Callback OAuth nao encontrado.");
      return;
    }

    const error = url.searchParams.get("error");
    if (error) throw new Error(`${error}: ${url.searchParams.get("error_description") || "sem detalhes"}`);

    const code = url.searchParams.get("code");
    if (!code) throw new Error("Pinterest nao retornou o parametro code.");

    await exchangePinterestCode(code);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Token salvo com sucesso.</h1><p>Voce ja pode voltar para o Codex.</p>");
    console.log("Token salvo em secrets/pinterest_token.json");
    server.close();
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Erro no OAuth: ${error.message}`);
    console.error(error.message);
    server.close();
  }
});

server.listen(port, () => {
  console.log(`Callback local aguardando em ${redirectUri}`);
  console.log("");
  console.log("Abra este link no navegador, autorize o app e aguarde o retorno local:");
  console.log(buildPinterestAuthUrl());
});
