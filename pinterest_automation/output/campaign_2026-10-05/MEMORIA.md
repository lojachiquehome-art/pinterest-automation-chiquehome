# Pinterest Chique Home — prévia 05 a 11/10/2026

Criada em 04/10/2026. **Status: aprovada pelo usuário em 04/10/2026 e aplicada ao GitHub main para 05 a 11/10/2026.** O “sim” do usuário autorizou a exceção de seleção abaixo, não a publicação da campanha final.

## Pedido e exceção autorizada

35 pins, cinco por dia, de segunda-feira05/10 a domingo11/10; um dia exclusivo de Natal; mesmos estilos e regras das prévias anteriores.

Histórico remoto consultado em04/10:363 registros, incluindo35/35 pins12001–12035 da campanha28/09–04/10. Catálogo Shopify e buscas natalinas ao vivo mostraram somente três produtos natalinos sem registro de publicação:10426812170545,10426813972785,10077243212081. Perguntado ao usuário se podia completar Natal com três itens usados há mais tempo e manter exclusão das últimas cinco prévias nos demais dias. Resposta explícita: **sim**. Ver selection-exceptions.json e history-audit.json.

As únicas três repetições recentes autorizadas são:
- Guirlanda de Natal de Luxo Dourada, ID10063267561777, campanha11/09.
- Calendário do Advento, ID10069665120561, campanha12/09.
- Mini Árvore Iluminada, ID10069673836849, campanha12/09.

Todos os outros39 produtos estão fora das últimas cinco campanhas:31/08,07/09,14/09,21/09,28/09.42 produtos distintos dentro desta semana, nenhuma repetição adicional.10 produtos sem registro de publicação no histórico consultado, incluindo os três capachos inéditos. Não afirmar que os42 nunca foram publicados.

## Composição da semana

IDs13001–13035. Horários propostos09:30,09:31,09:32,09:33,09:34 America/Sao_Paulo. Uma coleção por dia:
- 05/10: relógios.
- 06/10: banheiro.
- 07/10: vasos decorativos.
- **08/10: Natal**, com três inéditos e três retomados conforme autorização.
- 09/10: iluminação.
- 10/10: organizadores.
- 11/10: quadros decorativos para sala.

14 fotos Shopify nas posições1e4;21 imagens de novos ambientes nas posições2,3e5. Pos.3 com headline em português. Pos.5 com dois produtos distintos do mesmo tipo/coleção, cada um em ambiente novo, metades superior/inferior de1000×750 na exportação final1000×1500. Produtos inteiros, proporções preservadas. Fontes e prompts em environment-generation.json,title-generation.json,split-generation-report.json. O módulo export-image.mjs iguala as metades na exportação sem esticar e remove a linha clara de aproximadamente1pixel no split dos vasos; PNGs nativos permanecem preservados.

## Arquivos finais

- index.html: galeria com35 imagens, legendas, palavras-chave, links e filtros por dia.
- review.json: fonte final de textos, produtos, horários, links e imagens.
- manifest.json: fonte final de seleção, produtos originais Shopify e referências.
- editorial.json:35 títulos, corpos de descrição e palavras-chave.
- legendas.md e weekly_campaign_2026-10-05.csv.
- final/pin-13001.jpg a final/pin-13035.jpg:1000×1500.
- previa-semana-5-a-11-outubro.jpg e dia-1.jpg a dia-7.jpg.
- validation.json,edge-validation.json,live-link-validation.json.

Trocas feitas na preparação: foto da bandeja oval substituída por papeleira branca para enquadrar o produto inteiro; organizador de madeira substituído por porta-canetas com divisórias pelo mesmo motivo. selection.json sincronizado, mas manifest/review continuam sendo as fontes finais. Não rodar prepare.mjs novamente sem atualizar product-details.json com essas substituições.

## Validação

35 pins,42 IDs e handles únicos,35 arquivos distintos1000×1500,7 coleções,5 horários por dia,42 produtos disponíveis na loja pública. Zero sobreposição não autorizada com as últimas cinco campanhas.35 descrições com frase exata **Enviamos para todo o Brasil. 🇧🇷**, CTA “Acessar o site”, cupomPINTEREST10 e10% de desconto conforme Yever. Hashtags temáticas seguidas de#Brasil. Títulos/descrições/palavras-chave públicos em português brasileiro, com originais Shopify preservados nos metadados. Máximos:66 caracteres no título e388 na descrição. Verificador de faixas pretas sem alertas nos35 arquivos.

Os splits levam à coleção; demais pins ao produto; UTMs pinterest_2026_10_05. A coleçãoNatal continua usando o handle real decoracao-de-natal-2025. Não mudar esse endereço por causa do ano. Não foram consultadas vendas atuais nesta criação; não apresentar os produtos como os mais vendidos.

## Próxima etapa após aprovação do conteúdo

Aplicar somente os IDs13001–13035 ao GitHub após aprovação específica desta prévia. Em04/10, lote remoto sem esses IDs e sem outros pins programados05–11/10. Sincronizar novamente antes de aplicar. Preservar histórico publicado. Conferir autenticação real do Pinterest, sete dry-runs e validador de imagens em produção; não confundir simulação com publicação. Registrar commit e comprovante remoto. Autorização permanente permite os comandos GitHub de campanhas aprovadas sem nova confirmação.

## Aplicação ao GitHub em 04/10/2026

Aprovação explícita: “pode publicar no github”. Commit 09813c4bbba363457402728bae5b2026ef2114ae — https://github.com/lojachiquehome-art/pinterest-automation-chiquehome/commit/09813c4bbba363457402728bae5b2026ef2114ae. 35 pins13001–13035, cinco por dia de05 a11/10,09:30–09:34 America/Sao_Paulo; Natal em08/10. As35 imagens e metadados remotos foram conferidos e sete simulações diárias passaram. Histórico anterior preservado; workflow ativo e autenticação Pinterest chiquehome HTTP200. Mantida a exceção autorizada de três produtos natalinos. Não houve disparo antecipado; as publicações estão programadas. Ver staged-validation.json e github-publication-receipt.json.
