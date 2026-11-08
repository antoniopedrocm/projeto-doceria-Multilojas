# Checkpoint — frete em produção

Workspace: `C:\Users\antonio.pedro\Projeto\projeto-doceria-multiloja`
Firebase exclusivo: `ana-guimaraes`.

## Plano e progresso

1. Inspeção de Git, instruções e comparação seletiva DEV/produção: concluída.
2. Adaptação do frete, isolamento por loja e histórico: implementada e revisada.
3. Testes dos cenários solicitados, lint e build: concluídos.
4. Deploy seletivo de `hosting:prod,functions:api` e verificação: concluídos.

Conclusão do ajuste de frete: 100% (implementação, validações automatizadas e publicação).
Configuração de frete da loja Festa permanece pendente de ação do proprietário.

## Preservação e dados

- Alteração preexistente de `cardapio-festa.html` para `ana-guimaraes-festa` preservada.
- Google Maps Distance Matrix continua responsável pela distância dos cardápios.
- Leitura de configurações antigas permanece dentro da loja, sem migração automática.
- Coordenadas de produção inspecionadas somente por leitura em 25/09/2026:
  Matriz (-16.640155651697988, -49.32479688255422) e Garavelo
  (-16.77047933415206, -49.34012444750272), ambas válidas.
- Nenhuma coordenada, tarifa ou configuração foi copiada de DEV ou gravada no Firestore.
- Festa: documentos `configuracoes/config`, `configuracoes/frete` e `info/dados`
  não encontrados. Não foram criados; configurar o frete dessa loja exige ação do proprietário.
- Não há envio automático de resumos WhatsApp implementado no código atual de produção;
  a infraestrutura específica de WhatsApp presente apenas em DEV não pertence a esta promoção.
  O resumo manual usa os valores confirmados/salvos no pedido.

## Validação

- Sintaxe de `functions/index.js` e `functions/freight-core.js`: aprovada.
- Frontend: 18 suítes, 192 testes aprovados.
- Functions: 64 testes existentes e 31 testes específicos de frete aprovados.
- Casos de mínimo, a combinar, total, isolamento, histórico, coordenadas e scripts
  de cliente cadastrado/visitante cobertos por testes automatizados com mocks.
- Lint frontend: zero erros, 65 avisos preexistentes. Lint Functions: aprovado.
- Build frontend: aprovado; avisos de source maps ausentes na dependência native-audio
  e bases Browserslist/Baseline desatualizadas.
- Sintaxe dos scripts inline dos três cardápios e `git diff --check`: aprovados.
- Não foram criados pedidos reais ou alteradas configurações de produção para testar.

## Publicação e verificação final — 25/09/2026

- Comando executado no workspace acima:
  `firebase deploy --project ana-guimaraes --only "hosting:prod,functions:api" --non-interactive`.
- Firebase confirmou `Successful update operation` para `api(us-central1)`,
  `release complete` para Hosting e `Deploy complete` (exit code 0).
- URL: https://ana-guimaraes.web.app
- Nenhuma outra Function, regra, índice ou dado foi publicado/alterado.
- SHA-256 remoto do asset-manifest e dos três cardápios igual ao build local (HTTP 200).
- Cotação real de 2 km, sem criar pedidos: Matriz R$ 4,00; Garavelo R$ 3,00 (HTTP 200).
  Tarifas consultadas somente por leitura: R$ 2,00/km e R$ 1,50/km, respectivamente.
- Não houve validação visual autenticada nem criação de pedidos reais. Os cenários
  de checkout e Google Maps foram exercitados com mocks nos testes automatizados.
- Branch: `codex/fechamentos-destinos-remessas-producao`.
- Alterações mantidas no workspace; nenhum commit/push realizado nesta etapa.

## Arquivos deste ajuste

- `crm/src/App.js`
- `crm/src/services/freightConfigService.js`
- `crm/src/services/freightConfigService.test.js`
- `crm/src/utils/orderFreight.js`
- `crm/src/utils/orderFreight.test.js`
- `crm/public/cardapio-matriz.html`
- `crm/public/cardapio-garavelo.html`
- `crm/public/cardapio-festa.html` (inclui a mudança preexistente de loja padrão preservada)
- `functions/index.js`
- `functions/freight-core.js`
- `functions/freight-core.test.js`
- `functions/freight-pages.test.js`
- `functions/freight-checkout.test.js`
- `docs/checkpoint-frete-producao.md`
