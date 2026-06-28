# Automacao Pinterest 100%

Objetivo: rodar diariamente sem ligar o PC, criando Pins organicos com produtos da Shopify, termos comerciais, imagens editoriais e publicacao no Pinterest.

## Como fica o fluxo diario

1. GitHub Actions acorda todo dia.
2. O script gera um lote de Pins.
3. O script cria imagens PNG verticais 2:3 para os Pins que nao usam foto pura da Shopify.
4. As imagens sao salvas em `public/pinterest/YYYY-MM-DD/`.
5. O publicador usa a imagem gerada quando houver `generated_image_url`; caso contrario usa a imagem original da Shopify.
6. A API do Pinterest publica os Pins nos boards corretos.
7. O workflow salva historico e imagens no repositorio.

## Sem pagar por geracao de imagem

Sem custo recorrente, o caminho realista e usar templates automaticos:

- foto do produto da Shopify;
- layout vertical 1000x1500;
- fundo editorial por ambiente;
- texto curto na imagem;
- cupom `PINTEREST10`;
- variacao de paleta por board.

Isso nao e a mesma coisa que IA criando uma cozinha fotorealista nova do zero. Para isso, normalmente seria preciso pagar uma API de imagem ou manter um servidor com GPU. O caminho gratis e robusto e: imagens editoriais compostas automaticamente.

## O que precisa configurar uma vez

### Pinterest

- App com acesso Standard.
- Redirect URI: `http://localhost:8787/oauth/pinterest/callback`.
- Escopos:
  - `pins:read`
  - `pins:write`
  - `boards:read`
  - `boards:write`
  - `user_accounts:read`
- Rodar OAuth uma vez e salvar o conteudo de `secrets/pinterest_token.json` como secret no GitHub.

### GitHub

Criar estes Secrets no repositorio:

- `PINTEREST_CLIENT_ID`
- `PINTEREST_CLIENT_SECRET`
- `PINTEREST_REDIRECT_URI`
- `PINTEREST_TOKEN_JSON`

Criar esta variable:

- `PIN_IMAGE_BASE_URL`

Exemplo se o repositorio for publico e usar raw GitHub:

```text
https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPO/main/pinterest_automation/public/pinterest
```

Se o repositorio for privado, use GitHub Pages publico ou outro CDN gratuito, porque o Pinterest precisa acessar a imagem por URL publica HTTPS.

### Shopify

Ainda falta trocar a base `products_seed.csv` por uma rotina que puxa automaticamente:

- produtos ativos;
- imagens principais;
- preco;
- tags;
- colecoes;
- produtos mais vendidos.

Isso exige token Admin da Shopify ou conector/secret equivalente.

## O que ainda falta implementar para ficar sem toque humano

1. Conectar Shopify Admin API para substituir `products_seed.csv`.
2. Criar/atualizar colecoes automaticamente na Shopify.
3. Criar rotina de selecao dos 10 Pins diarios sem repetir os ja publicados.
4. Hospedar as imagens geradas antes da publicacao.
5. Salvar historico de publicados em arquivo/DB.
6. Criar relatorio semanal automatico.

## Primeiro modo de producao recomendado

- 10 Pins por dia.
- 3 fotos originais da Shopify.
- 3 imagens editoriais com produto.
- 2 imagens de ambiente com texto.
- 2 Pins de colecao/ambiente.

Depois de 14 dias, medir cliques, salvamentos e uso do cupom `PINTEREST10`.
