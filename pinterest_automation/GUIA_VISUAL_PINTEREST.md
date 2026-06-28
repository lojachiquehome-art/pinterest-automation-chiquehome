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
