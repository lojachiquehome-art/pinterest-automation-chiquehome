# Guia visual dos Pins Chique Home

Este projeto nao deve publicar imagens com cara de card, moldura pesada ou template interno.

O padrao aprovado e:

- imagem vertical 2:3;
- foto ou cenario full-bleed, preenchendo o Pin;
- paleta Chique Home: off-white, bege, madeira clara, taupe suave, preto fosco e luz quente;
- texto apenas quando ajudar o clique;
- cupom `PINTEREST10` discreto, nunca como elemento principal;
- link sempre para produto ou colecao da Chique Home com UTM.

## Variações obrigatorias

Cada tema deve alternar entre cinco estilos:

1. `environment_full_bleed`: cenario bonito sem texto, estilo busca do Pinterest.
2. `product_full_bleed`: foto do produto em vertical cheia, foco no produto.
3. `environment_title_overlay`: cenario com titulo chamativo e limpo.
4. `product_in_environment`: produto aplicado em ambiente diferente e realista.
5. `listicle_idea_overlay`: imagem com titulo de lista/ideia clicavel, tipo "3 ideias...".

## Regra de seguranca

Pins com `requires_ai_image = yes` so podem ser publicados quando `generated_image_url` estiver preenchido com uma imagem final aprovada.

Se a imagem final ainda nao existir, `publish_pins.mjs` pula o Pin e nao usa fallback feio.

## Arquivos importantes

- `output/image_generation_queue.csv`: fila de imagens que precisam ser geradas.
- `output/image_generation_queue.json`: mesma fila em JSON.
- `public/pinterest/approved-samples`: imagens aprovadas como referencia de estilo.
- `public/pinterest/final`: imagens finais usadas pelos Pins.

Quando uma imagem final for aprovada, ela deve ser salva como:

```text
public/pinterest/final/pin-0003.png
```

Depois rode `node scripts/apply_image_assets.mjs` com `PIN_IMAGE_BASE_URL` configurado para preencher a URL publica no lote.

## Padrao aprovado para campanhas diarias

Cada dia deve ter exatamente 5 Pins, sempre nesta ordem:

1. `product_full_bleed`: foto original da Shopify, sem texto, com o produto centralizado, inteiro e preenchendo a imagem vertical.
2. `product_in_environment`: somente o produto da Shopify aplicado em um novo ambiente realista e sofisticado, sem texto.
3. `environment_title_overlay`: ambiente gerado com produtos correlatos e texto centralizado usando uma palavra-chave de ambiente validada.
4. `product_full_bleed`: outra foto original da Shopify, sem texto, com outro produto da mesma colecao do dia.
5. `split_two_products`: imagem vertical dividida em duas grades iguais, com dois produtos diferentes do mesmo tipo e da mesma colecao, sempre centralizados e totalmente visiveis.

Regras fixas:

- Nao repetir produto na semana.
- Nao usar produtos de tipos diferentes no `split_two_products`.
- Titulos e descricoes dos estilos 1, 2, 4 e 5 devem falar do produto, modelo, cor e acabamento.
- Apenas o estilo 3 deve usar palavras-chave de ambiente no titulo, descricao e texto da imagem.
- O estilo 5 (`split_two_products`) deve sempre direcionar para a colecao correspondente aos produtos exibidos, nao para produto individual.
- Nao usar termos como "simples", "cozinha americana" ou "closet de gesso".
- Textos em imagem, titulos e descricoes devem estar com ortografia e acentuacao corretas em portugues.
