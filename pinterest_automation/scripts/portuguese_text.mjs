const REPLACEMENTS = [
  ["voce", "você"],
  ["esta", "está"],
  ["opcao", "opção"],
  ["opcoes", "opções"],
  ["preco", "preço"],
  ["sugestao", "sugestão"],
  ["sugestoes", "sugestões"],
  ["inspiracao", "inspiração"],
  ["inspiracoes", "inspirações"],
  ["pratica", "prática"],
  ["praticas", "práticas"],
  ["seguranca", "segurança"],
  ["variacao", "variação"],
  ["variacoes", "variações"],
  ["informacao", "informação"],
  ["informacoes", "informações"],
  ["decoracao", "decoração"],
  ["decoracoes", "decorações"],
  ["organizacao", "organização"],
  ["organizacoes", "organizações"],
  ["composicao", "composição"],
  ["composicoes", "composições"],
  ["iluminacao", "iluminação"],
  ["iluminacoes", "iluminações"],
  ["luminaria", "luminária"],
  ["luminarias", "luminárias"],
  ["relogio", "relógio"],
  ["relogios", "relógios"],
  ["higienico", "higiênico"],
  ["higienicos", "higiênicos"],
  ["acrilico", "acrílico"],
  ["giratorio", "giratório"],
  ["sofa", "sofá"],
  ["trico", "tricô"],
  ["moveis", "móveis"],
  ["util", "útil"],
  ["uteis", "úteis"],
  ["area", "área"],
  ["servico", "serviço"],
  ["harmonica", "harmônica"],
  ["harmonico", "harmônico"],
  ["cenario", "cenário"],
  ["cenarios", "cenários"],
  ["titulo", "título"],
  ["titulos", "títulos"],
  ["clicavel", "clicável"],
  ["portugues", "português"],
  ["armario", "armário"],
  ["armarios", "armários"],
  ["cabeceira", "cabeceira"],
  ["impermeavel", "impermeável"],
];

function preserveCase(original, replacement) {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0]?.toUpperCase()) {
    return `${replacement[0].toUpperCase()}${replacement.slice(1)}`;
  }
  return replacement;
}

export function accentPortugueseText(value) {
  let text = String(value ?? "");
  for (const [plain, accented] of REPLACEMENTS) {
    text = text.replace(new RegExp(`\\b${plain}\\b`, "gi"), (match) => preserveCase(match, accented));
  }
  return text;
}

export function polishPortugueseTitle(value) {
  let text = accentPortugueseText(value).replace(/\s+/g, " ").trim();
  text = text.replace(/\s+(em|de|do|da|dos|das|para|com|e)$/i, "");
  text = text.replace(/^(Veja como usar .+?) em [a-záéíóúâêôãõç ]{1,45}$/i, "$1");
  return text.trim();
}
