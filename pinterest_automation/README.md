# Automacao Pinterest - Chique Home

Este pacote cria uma esteira de Pinterest organico para a Chique Home.

Todas as legendas geradas incluem o cupom `PINTEREST10`, com 10% de desconto para clientes vindos do Pinterest.

Fluxo:

1. Ler produtos ativos da loja.
2. Cruzar produtos com termos de busca/intencao.
3. Gerar pins editoriais, nao apenas pins de catalogo.
4. Publicar no Pinterest via API oficial quando houver token OAuth.

## Diagnostico dos dados atuais

Rode:

```powershell
node .\pinterest_automation\scripts\analyze_pinterest.mjs
```

Saidas:

- `pinterest_automation/output/pinterest_diagnostico.md`
- `pinterest_automation/output/audience_commercial_interests.json`

## O que ainda precisa conectar

Para publicar automaticamente, o app no Pinterest Developers precisa estar liberado para OAuth/API com estas permissoes:

- `pins:write`
- `boards:write`
- `pins:read`
- `boards:read`
- `user_accounts:read`

O app atual e `Codex_automacao`, ID `1583315`.

Copie `.env.example` para `.env` e preencha o segredo do app somente no arquivo local:

```powershell
Copy-Item .\.env.example .\.env
notepad .\.env
```

Nao cole segredo, access token ou refresh token no chat.

Depois rode o callback local:

```powershell
node .\scripts\pinterest_oauth_callback.mjs
```

Abra o link mostrado no terminal, autorize o app e aguarde a pagina local confirmar. O token sera salvo em `secrets/pinterest_token.json`, que fica ignorado pelo Git.

Se o Pinterest mostrar erro de permissao, o app ainda esta em Trial ou sem escopos de escrita liberados.

## Como gerar o lote

```powershell
node .\scripts\generate_pin_batch.mjs
```

Saidas:

- `pinterest_automation/output/pins_batch.csv`
- `pinterest_automation/output/pins_batch.json`

## Como publicar

Primeiro rode em modo teste:

```powershell
node .\scripts\publish_pins.mjs --dry-run --limit 10
```

Para publicar:

```powershell
node .\scripts\publish_pins.mjs --limit 10
```

## Boards

Depois do OAuth, crie ou mapeie os boards reais:

```powershell
node .\scripts\setup_boards.mjs
```

## Observacao sobre Pinterest Trends

O Pinterest Trends e dinamico por pais, data e termo. Este pacote usa uma base inicial de termos fortes para decoracao/casa e esta preparado para receber uma exportacao manual de termos validados no Pinterest Trends.

Arquivo:

`pinterest_automation/data/pinterest_terms.csv`

Os termos extraidos manualmente das telas do Pinterest Trends ficam em:

`pinterest_automation/data/trends_terms_manual.csv`
