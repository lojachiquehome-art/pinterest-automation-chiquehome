# Prévia Pinterest — 28/09 a 04/10/2026

Criada em 27/09/2026 a pedido do usuário. A data de domingo veio repetida como 28/09; foi interpretada e informada como 04/10/2026, que é o domingo seguinte à segunda-feira 28/09.

**Status: aprovada pelo usuário em 27/09 e aplicada ao GitHub main. Programada para 28/09 a 04/10/2026; publicação futura ainda não executada.** Autorização permanente de comandos GitHub vale para campanhas aprovadas; não equivale a aprovar esta nova seleção.

## Fontes finais

- `manifest.json`: produtos originais Shopify, IDs, fotos de referência, imagens e estilos.
- `review.json`: 35 pins finais com títulos, descrições, palavras-chave, links, horários e alt text.
- `index.html`: galeria completa com filtros diários, imagens, legendas e links.
- `legendas.md`, `weekly_campaign_2026-09-28.csv`: textos e planilha da campanha.
- `final/pin-12001.jpg` a `final/pin-12035.jpg`: arquivos 1000×1500.
- `previa-semana-28-setembro-a-4-outubro.jpg` e `dia-1.jpg` a `dia-7.jpg`: mosaicos para revisão.
- `validation.json`, `live-link-validation.json`: conferências técnicas e disponibilidade.

## Composição

35 pins / 42 produtos distintos; 5 pins por dia, 09:30–09:34 America/Sao_Paulo. Ordem diária: foto Shopify, produto em ambiente novo, produto em ambiente novo com texto, foto Shopify, dois produtos da mesma coleção em metades superior e inferior com ambientes novos. 14 fotos originais e 21 imagens geradas com referências reais, mantendo proporções, cores e estampas. Fontes e prompts em environment-generation.json, title-generation.json, split-generation-report.json.

- 28/09: relógios.
- 29/09: banheiro.
- 30/09: sala de estar e novas bandejas folha vazada.
- 01/10: exclusivamente Natal.
- 02/10: iluminação.
- 03/10: cozinha.
- 04/10: quarto e decoração afetiva.

Excluídos 210 handles das últimas cinco campanhas: 24/08, 31/08, 07/09, 14/09 e 21/09. Consulta ao lote remoto e aos manifests finais das duas últimas campanhas, incluindo produtos de pins divididos e conteúdo aprovado mesmo quando não publicado. Zero sobreposição nos handles e títulos originais. A campanha 21–27/09 foi integralmente recuperada/publicada em 27/09: seus 42 produtos foram excluídos.

Catálogo, detalhes de produtos, coleções e vendas consultados ao vivo na Shopify em 27/09. Os 42 produtos estão disponíveis pela loja pública. Oito produtos escolhidos têm pedidos nos últimos 60 dias; os demais entram por variedade e adequação visual. Não apresentar todos como mais vendidos. Três bandejas folha vazada são novidades cadastradas em 23/09.

## Texto Brasil e SEO

35 descrições contêm exatamente `Enviamos para todo o Brasil. 🇧🇷`, CTA “Acessar o site”, cupom PINTEREST10 (Yever) com 10% e terminam com #Brasil. Títulos e palavras-chave baseados nos nomes dos produtos Shopify, traduzindo termos ingleses descritivos. Metadados preservam títulos e identificadores comerciais originais. Máximos validados: 70 caracteres no título, 350 na descrição por pontos de código (também dentro de 500 em UTF-16). As estampas originais dos produtos permanecem fiéis às referências.

Coleção Natal mantém o handle real `decoracao-de-natal-2025`; é a URL atual da Shopify, não um erro de data da campanha. Os pins divididos levam à coleção correspondente; demais levam ao produto. UTMs da campanha `pinterest_2026_09_28`.

## Correções durante a criação

Fotos de esculturas horizontais foram substituídas por casal e cachorro balão para mostrar a peça inteira no recorte vertical. Porta-escova inicial foi trocado pelo modelo Elegante para não cortar as laterais. Natal usa fotos oficiais dos conjuntos de bolas nas posições 1 e 4; capacho em ambiente novo na posição 2. Toalha de Natal com texto, tapetes divididos e organizadores de roupas receberam segunda geração para garantir produtos inteiros. `selection.json` foi sincronizado com essas trocas; manifest/review continuam sendo a fonte final.

## Após eventual aprovação

Sincronizar remoto, conferir deduplicação e autenticação real do Pinterest antes de aplicar. Não republicar os pins 11001–11035 recuperados em 27/09. Aplicar somente os novos IDs 12001–12035, com datas 28/09–04/10, e registrar commit/validação remota. Não afirmar que houve publicação futura apenas porque o workflow está ativo.

## Aplicação ao GitHub em 27/09/2026

Aprovação explícita: “FICOU PERFEITO! SENSACIONAL. AGORA APLIQUE ESSA PRÉVIA NO GITHUB PARA COMEÇAR A SEREM POSTADOS AMANHÃ DIA 28, 5 pins por dia”. Commit 115ee64aeab07ae70c8f1c7591bdb6606ef2b577 — https://github.com/lojachiquehome-art/pinterest-automation-chiquehome/commit/115ee64aeab07ae70c8f1c7591bdb6606ef2b577. 35 imagens e metadados remotos conferidos, workflow ativo, sete simulações com cinco pins/dia aprovadas. Conta Pinterest chiquehome respondeu HTTP200 em verificação autenticada. Histórico anterior preservado. Não houve disparo de postagem antecipada.

O verificador de bordas sinalizou falso positivo no fundo preto natural da foto Shopify12026. Exceção de revisão visual restrita ao SHA256 exato dessa imagem e estilo product_full_bleed registrada em data/reviewed_dark_photos.json; mudar o hash mantém o bloqueio, testado. Imagem aprovada preservada. Ver staged-validation.json e github-publication-receipt.json.
