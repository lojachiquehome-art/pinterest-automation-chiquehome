import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getPinterestAccessToken, ROOT } from "./pinterest_auth.mjs";
import { accentPortugueseText, polishPortugueseTitle } from "./portuguese_text.mjs";

const API_BASE = "https://api.pinterest.com/v5";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
  };
}

async function pinterestPatch(pathname, token, payload) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Pinterest API ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function correctedPinText(pin) {
  return {
    title: polishPortugueseTitle(pin.title),
    description: accentPortugueseText(pin.description),
    alt_text: accentPortugueseText(pin.alt_text),
  };
}

function hasChanges(pin, correction) {
  return pin.title !== correction.title
    || pin.description !== correction.description
    || pin.alt_text !== correction.alt_text;
}

const { dryRun } = parseArgs();
const file = path.join(ROOT, "output", "published_pins.json");
const published = JSON.parse(readFileSync(file, "utf8"));
const token = dryRun ? "" : await getPinterestAccessToken();
let changed = 0;

for (const item of published) {
  const pin = item.pin;
  if (!pin?.id) continue;

  const correction = correctedPinText(pin);
  if (!hasChanges(pin, correction)) continue;

  changed += 1;
  console.log(`${dryRun ? "WOULD UPDATE" : "UPDATE"} row ${item.row_id} pin ${pin.id}`);
  console.log(`  title: ${pin.title} -> ${correction.title}`);
  console.log(`  description: ${pin.description} -> ${correction.description}`);
  if (pin.alt_text !== correction.alt_text) console.log(`  alt_text: ${pin.alt_text} -> ${correction.alt_text}`);

  if (!dryRun) {
    const updated = await pinterestPatch(`/pins/${pin.id}`, token, correction);
    item.pin = { ...pin, ...updated, ...correction };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

if (!dryRun && changed > 0) {
  writeFileSync(file, JSON.stringify(published, null, 2), "utf8");
}

console.log(`${changed} published pins ${dryRun ? "would be" : "were"} updated.`);
