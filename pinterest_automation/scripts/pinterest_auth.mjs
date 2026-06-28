import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

const API_BASE = "https://api.pinterest.com/v5";
const TOKEN_PATH = path.join(ROOT, "secrets", "pinterest_token.json");
const DEFAULT_REDIRECT_URI = "http://localhost:8787/oauth/pinterest/callback";
const DEFAULT_SCOPES = [
  "pins:read",
  "pins:write",
  "boards:read",
  "boards:write",
  "user_accounts:read",
];

export function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function getOAuthConfig() {
  loadLocalEnv();
  const clientId = process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
  const redirectUri = process.env.PINTEREST_REDIRECT_URI || DEFAULT_REDIRECT_URI;
  if (!clientId) throw new Error("Configure PINTEREST_CLIENT_ID no arquivo .env.");
  if (!clientSecret) throw new Error("Configure PINTEREST_CLIENT_SECRET no arquivo .env.");
  return { clientId, clientSecret, redirectUri };
}

function authHeader(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function buildPinterestAuthUrl(scopes = DEFAULT_SCOPES) {
  const { clientId, redirectUri } = getOAuthConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(","),
  });
  return `https://www.pinterest.com/oauth/?${params.toString()}`;
}

async function tokenRequest(params) {
  const { clientId, clientSecret } = getOAuthConfig();
  const response = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: authHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Pinterest OAuth ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function normalizeToken(data) {
  const expiresIn = Number(data.expires_in || 0);
  return {
    ...data,
    created_at: new Date().toISOString(),
    expires_at: expiresIn ? Date.now() + expiresIn * 1000 : null,
  };
}

export function savePinterestToken(data) {
  mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  writeFileSync(TOKEN_PATH, JSON.stringify(normalizeToken(data), null, 2), "utf8");
}

export function readPinterestToken() {
  if (!existsSync(TOKEN_PATH)) return null;
  return JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
}

export async function exchangePinterestCode(code) {
  const { redirectUri } = getOAuthConfig();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const data = await tokenRequest(params);
  savePinterestToken(data);
  return data;
}

export async function refreshPinterestToken(refreshToken) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const data = await tokenRequest(params);
  savePinterestToken(data);
  return data;
}

export async function getPinterestAccessToken() {
  loadLocalEnv();
  if (process.env.PINTEREST_ACCESS_TOKEN) return process.env.PINTEREST_ACCESS_TOKEN;

  const token = readPinterestToken();
  if (!token) {
    throw new Error("Token OAuth nao encontrado. Rode: node .\\scripts\\pinterest_oauth_callback.mjs");
  }

  const expiresAt = Number(token.expires_at || 0);
  const hasValidAccessToken = token.access_token && (!expiresAt || expiresAt - Date.now() > 5 * 60 * 1000);
  if (hasValidAccessToken) return token.access_token;

  if (!token.refresh_token) {
    throw new Error("Token expirado e sem refresh_token. Rode o fluxo OAuth novamente.");
  }

  const refreshed = await refreshPinterestToken(token.refresh_token);
  return refreshed.access_token;
}
