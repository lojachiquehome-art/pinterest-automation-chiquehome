import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const analyticsPath = process.argv[2] ?? "C:/Users/Pichau/Downloads/Pinterest Analytics overview 20260522-20260621.csv";
const audiencePath = process.argv[3] ?? "C:/Users/Pichau/Downloads/audience-insights-pinterest-total-audience-2026-06-17.csv";

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
  return rows;
}

function tableAfter(lines, marker) {
  const index = lines.findIndex((line) => line[0] === marker);
  if (index < 0) return [];
  const header = lines[index + 1];
  const rows = [];
  for (let i = index + 2; i < lines.length; i++) {
    if (!lines[i].length || !lines[i][0] || lines[i][0].startsWith("Top ")) break;
    rows.push(Object.fromEntries(header.map((h, idx) => [h, lines[i][idx] ?? ""])));
  }
  return rows;
}

function percent(n) {
  return `${(Number(n) * 100).toFixed(1).replace(".", ",")}%`;
}

const analyticsLines = parseCsv(readFileSync(analyticsPath, "utf8"));
const audienceLines = parseCsv(readFileSync(audiencePath, "utf8"));
const dailyStart = analyticsLines.findIndex((line) => line[0] === "Date" && line[1] === "Impressions");
const daily = [];
for (let i = dailyStart + 1; i < analyticsLines.length; i++) {
  const [date, impressions] = analyticsLines[i];
  if (!date || date.startsWith("Top ")) break;
  if (impressions) daily.push({ date, impressions: Number(impressions) });
}
const totalImpressions = daily.reduce((sum, row) => sum + row.impressions, 0);
const peak = daily.reduce((best, row) => row.impressions > best.impressions ? row : best, daily[0]);
const boards = tableAfter(analyticsLines, "Top Boards 2026-05-22 - 2026-06-21")
  .map((row) => ({
    link: row["Pinterest Link"],
    impressions: Number(row.Impressions || 0),
    engagement: Number(row.Engagement || 0),
    pinClicks: Number(row["Pin clicks"] || 0),
    outboundClicks: Number(row["Outbound clicks"] || 0),
    saves: Number(row.Saves || 0),
  }));
const pins = tableAfter(analyticsLines, "Top Pins 2026-05-22 - 2026-06-21");

const audienceHeaderIndex = audienceLines.findIndex((line) => line[0] === "Category" && line[4] === "Interest");
const headers = audienceLines[audienceHeaderIndex];
const audienceRows = audienceLines.slice(audienceHeaderIndex + 1)
  .filter((line) => line.length >= 7 && line[0])
  .map((line) => Object.fromEntries(headers.map((h, idx) => [h, line[idx] ?? ""])));

const commercialCategories = ["Home Decor", "Architecture", "Gardening", "Wedding", "Event Planning", "Food and Drinks", "Beauty"];
const usefulInterests = audienceRows
  .filter((row) => commercialCategories.includes(row.Category))
  .map((row) => ({
    category: row.Category,
    interest: row.Interest,
    categoryPercent: Number(row["Percent of audience"] || 0),
    interestPercent: Number(row["Percent of audience_1"] || row["Percent of audience"] || 0),
  }))
  .slice(0, 60);

const outDir = path.join(ROOT, "output");
mkdirSync(outDir, { recursive: true });

const report = `# Diagnóstico Pinterest - Chique Home

Período analisado: 22/05/2026 a 21/06/2026

## Leitura executiva

O Pinterest da Chique Home já tem sinal de descoberta: aproximadamente ${totalImpressions.toLocaleString("pt-BR")} impressões no período exportado e pico diário em ${peak.date} com ${peak.impressions.toLocaleString("pt-BR")} impressões.

Pelas telas enviadas, o painel mostra 19,51 mil impressões (+33%), 631 engajamentos (+30%), 47 salvamentos (+62%), público total de 16,36 mil (+39%) e público engajado de 557 (+32%). O problema está no fundo do funil: apenas 7 cliques de saída (-46%), 6 visitas à página e R$ 0,00 de receita atribuída.

Conclusão: o Pinterest está funcionando como inspiração, mas ainda não como canal de tráfego qualificado. A automação precisa priorizar Pins com promessa clara de clique: produto, medida, transformação, antes/depois, "compre o visual" e página de destino específica.

## Boards atuais

${boards.map((board) => `- ${board.link}: ${board.impressions.toLocaleString("pt-BR")} impressões, ${board.engagement} engajamentos, ${board.pinClicks} cliques no Pin, ${board.outboundClicks} cliques de saída, ${board.saves} salvamentos.`).join("\n")}

## Audiência

A audiência total do Pinterest para a conta mostra forte aderência com casa/decoracao:

- Home Decor: ${percent(0.649)} da audiência.
- Principais interesses dentro de Home Decor: Wall, Room Decor, Home Decor Style, Lighting, Home Accessories, Storage and Organization, Furniture e Flooring.
- Architecture também aparece com força, especialmente Architectural Style e Residential Architecture.
- Nas telas, seu público próprio tem concentração em mulheres, principalmente 18 a 34 anos, com uso majoritário mobile.

## Direção da automação

1. Criar mais Pins de clique, menos Pins puramente inspiracionais.
2. Usar termos de Trends com crescimento, especialmente "design de interiores de residências", "projeto de cozinha", "truques de casa", "decoração hall de entrada", "sala de estar apartamento", "decoração cozinha" e "escritório em casa".
3. Separar boards por intenção comercial, não apenas por categoria.
4. Usar UTM por termo e produto para medir receita no Shopify/GA4.
5. Publicar com frequência, mas evitando repetir a mesma imagem/título sem variação.

## Próximo alvo

Meta inicial: sair de 7 para 50 cliques de saída/mês sem mídia paga. Para isso, a prioridade não é só aumentar impressão; é melhorar CTR de saída.
`;

writeFileSync(path.join(outDir, "pinterest_diagnostico.md"), report, "utf8");
writeFileSync(path.join(outDir, "audience_commercial_interests.json"), JSON.stringify(usefulInterests, null, 2), "utf8");
console.log(path.join(outDir, "pinterest_diagnostico.md"));
console.log(path.join(outDir, "audience_commercial_interests.json"));

