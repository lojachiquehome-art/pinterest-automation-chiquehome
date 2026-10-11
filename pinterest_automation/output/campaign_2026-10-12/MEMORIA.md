# Pinterest Chique Home — prévia 12 a 18/10/2026

Criada em 11/10/2026. **Status: aprovada em 11/10/2026 e aplicada ao GitHub main para 12 a 18/10/2026.**

## Pedido e autorização específica

Usuário pediu 35 pins, cinco por dia de segunda-feira 12/10 a domingo 18/10, mesmos estilos, exclusão das últimas cinco prévias e um dia somente de Natal. Horários propostos:09:30–09:34 America/Sao_Paulo.

Consulta Shopify ao vivo encontrou 43 produtos ativos na coleção natalina e apenas dois fora das cinco campanhas de07/09,14/09,21/09,28/09 e05/10. O usuário respondeu **“Sim, permitir essa exceção no Natal”** à proposta de completar os dois com quatro natalinos das prévias mais antigas, mantendo os demais dias sem repetição. Isso autoriza a exceção de seleção, não a aplicação desta campanha final no GitHub.

Natal na quinta-feira15/10. As quatro retomadas são carrossel10062519763249 e casinha iluminada10069599322417 (última prévia12/09), capacho de boas-vindas10062921072945 (08/09), toalha xadrez10428030091569 (10/09). As guirlandas10424203084081 e10063290073393 ficam fora das últimas cinco. A seleção inicial de fotos foi refinada para permitir o enquadramento vertical dos produtos inteiros; manifest.json/review.json definem os produtos finais.

## Arquivos finais

- index.html: galeria35pins, filtros por dia, legendas, palavras-chave, links e botão copiar.
- previa-semana-12-a-18-outubro.jpg e dia-1.jpg a dia-7.jpg: mosaicos.
- final/pin-14001.jpg a pin-14035.jpg:35 imagens1000×1500 prontas para aplicação após aprovação.
- manifest.json,review.json,selection.json: seleção e metadados finais.
- editorial.json,legendas.md,weekly_campaign_2026-10-12.csv: textos públicos em português brasileiro, status pendente.
- validation.json,live-link-validation.json,edge-validation.json,history-audit.json: verificações.
- selection-exceptions.json: autorização e quatro IDs natalinos.
- environment-generation.json,title-generation.json,split-generation-report.json: referências, prompts e inspeções.

## Validação

35pins,42IDs e42handles diferentes.38produtos fora das últimas cinco campanhas; quatro retomadas autorizadas somente no Natal. Nenhuma outra repetição por handle, título ou IDs recuperados. Histórico remoto consultado tem398publicações e confirma35/35pins13001–13035 da semana05–11/10. Não reenviar esses pins.

Todos42produtos disponíveis na loja ao conferir os links públicos. Sete coleções distintas, uma/dia: relógios, tapetes de cozinha, quarto, Natal, iluminação, banheiro, cozinha. Coleção natalina mudou para **decoracao-de-natal-2026**, confirmada no Shopify e usada no link do pin14020.

14fotos Shopify,21imagens novas geradas com ImageGen nativo. Produtos, quantidades, imagens com texto e todos os resultados inspecionados. Fotos originais receberam apenas recorte e redimensionamento; os ambientes dos pins2,3e5 são novos. Sete imagens divididas exportadas em metades exatamente1000×750; faixas brancas nativas removidas pelos limites visuais registrados em export-image.mjs. Não regenerar fotos ou fontes iniciais sem preservar as substituições finais de photos.mjs.

Máximos63caracteres nos títulos e361nas descrições. Todas as35descrições contêm “Enviamos para todo o Brasil. 🇧🇷”,PINTEREST10,10%,CTA“Acessar o site” e hashtags finais incluindo#Brasil. Cupom mantido conforme confirmação anterior do usuário sobre Yever. Palavras-chave baseadas nos nomes e atributos reais dos produtos; termos ingleses descritivos traduzidos. Links individuais1–4,coleção no5,UTMs da campanha2026_10_12. Não foi feita consulta de vendas nesta campanha; não afirmar que são os mais vendidos.

Verificador de imagens35/35sem alertas de bordas. Galeria35imagens,sete datas corretas e arquivos presentes. Não houve alteração em GitHub, lote de produção, credenciais ou disparo de pins nesta criação. Aprovação final deve ser específica desta campanha.

## Para aplicação após aprovação

Sincronizar a cópia isolada existente .codex-pinterest-sep14 com o GitHub atual. Verificar autenticação real Pinterest. Adaptar stage_week_2026_10_05.mjs para12–18/10 e IDs14001–14035, lendo review.json e final/. Preservar histórico e campanhas anteriores. Executar sete simulações e validação das35imagens; enviar somente arquivos desta campanha e verificar35imagens/metadados remotos e workflow ativo. Usuário já autoriza os comandos GitHub de campanhas aprovadas sem nova pergunta.

## Aplicação ao GitHub em 11/10/2026

Aprovação explícita: “Ficou perfeita, prévia aprovada! Pode aplicar no GitHub para começar amanhã dia 12/10, 5 pins por dia até domingo dia 18/10.” Commit 4c51ce4a6e12161d0a78492d839008e5a87d951a — https://github.com/lojachiquehome-art/pinterest-automation-chiquehome/commit/4c51ce4a6e12161d0a78492d839008e5a87d951a. 35 pins14001–14035, cinco por dia12–18/10,09:30–09:34 America/Sao_Paulo; Natal em15/10. As35imagens e metadados remotos foram conferidos; sete simulações diárias passaram, histórico anterior preservado, workflow ativo e autenticação real Pinterest chiquehome HTTP200. Mantidas as quatro retomadas natalinas autorizadas. Nenhum disparo antecipado. As referências anteriores a pendência nesta memória descrevem o estado antes desta aprovação; esta seção as substitui. Ver staged-validation.json e github-publication-receipt.json.
