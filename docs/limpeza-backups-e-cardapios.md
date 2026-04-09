# Limpeza de backups/legado e preparação para consolidação de cardápios

## 1) Mapeamento de arquivos de backup/legado (`rg --files`)

Comando usado:

```bash
rg --files | rg '(\\.bak$|\\.bkp$|Copia)'
```

Resultado encontrado:

- `functions/index - Copia.js.bkp`
- `crm/src/App - Copia.js.bkp`

## 2) Verificação de ausência de referência no build/deploy

Comandos usados para verificação de referências em scripts/imports:

```bash
rg -n "index - Copia\\.js\\.bkp|App - Copia\\.js\\.bkp|Copia|\\.bkp|\\.bak" --glob '!**/node_modules/**' .
```

Além disso, foram conferidos os scripts de build/deploy em:

- `package.json`
- `crm/package.json`
- `functions/package.json`

Não há referência ativa aos arquivos de backup removidos.

## 3) Ação de limpeza aplicada

- Backups removidos do versionamento:
  - `functions/index - Copia.js.bkp`
  - `crm/src/App - Copia.js.bkp`
- Padrões adicionados ao `.gitignore` (raiz) para impedir retorno:
  - `*.bak`
  - `*.bkp`
  - `*Copia*`

## 4) Cardápios duplicados: diferenças reais e extração de base comum

Arquivos analisados:

- `crm/public/cardapio-matriz.html`
- `crm/public/cardapio-garavelo.html`
- `crm/public/cardapio-festa.html`

Diferenças reais identificadas:

1. **Loja padrão** entre Matriz e Garavelo:
   - Matriz usa `ana-guimaraes-matriz`
   - Garavelo usa `ana-guimaraes-garavelo`
2. **Filtro de categoria** no cardápio Festa:
   - Festa filtra produtos pela categoria `Festa`
   - Mensagem de vazio específica para Festa

Extração de base comum realizada:

- Todo CSS compartilhado entre os três cardápios foi extraído para:
  - `crm/public/cardapio-base.css`
- Os três HTMLs passaram a referenciar o CSS comum com:
  - `<link rel="stylesheet" href="/cardapio-base.css" />`

Com isso, a próxima etapa de consolidação (template único com parâmetros por loja/categoria) fica mais segura e incremental.

## 5) Checklist de verificação pós-limpeza

Use este checklist antes de concluir a limpeza em produção:

- [ ] Executar `rg --files | rg '(\\.bak$|\\.bkp$|Copia)'` e confirmar ausência de arquivos versionados indesejados.
- [ ] Executar `rg -n "\\.bak|\\.bkp|Copia" --glob '!**/node_modules/**' .` e confirmar ausência de referências em código/scripts.
- [ ] Revisar `package.json` (raiz, `crm/`, `functions/`) para validar scripts de build/deploy sem dependência de legado.
- [ ] Validar carregamento visual de `cardapio-matriz.html`, `cardapio-garavelo.html` e `cardapio-festa.html` após extração do CSS comum.
- [ ] Executar build local dos apps (`npm run build` e `npm --prefix crm run build`) e corrigir regressões.
- [ ] Confirmar em PR que backups não retornam ao diff e que `.gitignore` contém os padrões preventivos.

