# Correção da baixa de estoque por pedido

## Diagnóstico

- `functions/index.js`, POST `/checkout/confirmar`: descontava o estoque na criação do pedido, normalmente Pendente.
- `crm/src/App.js`, `persistOrderWithTransaction`: descontava todos os itens ao passar de não Finalizado para Finalizado, sem reconhecer a baixa do checkout. Isso reproduz 2 -> 0 -> -2 para duas unidades.
- A criação manual reutilizava a referência do pedido no `runWithRetry`, mas só lia o documento em edição. Se o commit concluísse e a resposta falhasse, uma nova tentativa podia sobrescrever o mesmo pedido e descontar novamente.
- Os triggers encontrados tratam notificações, caixa e métricas; não foi encontrada uma segunda Function de baixa de estoque.
- O serviço de movimentação rápida já escreve estoque e pedido atomicamente. Agora também registra a quantidade aplicada no pedido.
- O checkout tratava linhas repetidas do mesmo produto a partir do mesmo saldo original. Agora acumula suas quantidades antes de persistir.

O pedido específico de Morango cravejado G e os logs de produção não foram consultados. Os caminhos acima foram confirmados no código e reproduzidos nos testes; não é possível atribuir o incidente histórico a um deles sem esses registros. Saldos históricos não foram alterados.

## Persistência e compatibilidade

`estoqueAplicado` guarda o mapa produto -> quantidade já descontada, junto com o pedido e os saldos na mesma transação. O CRM calcula a diferença entre o mapa persistido e o novo estado. Repetir o mesmo pedido ou avançar um checkout já baixado para Finalizado não desconta novamente. A criação manual lê o pedido pelo ID também nas tentativas de criação e retorna se ele já existe.

Pedidos legados sem mapa: Finalizado e venda rápida são reconhecidos como já descontados; as origens Cardapio Online e Plataforma são reconhecidas como checkout já descontado. Essa compatibilidade pressupõe as origens usadas pelo checkout atual; não faz auditoria nem reparação de dados históricos.

Retirar um pedido de Finalizado preserva a reversão existente; finalizá-lo novamente reaplica a quantidade anteriormente devolvida. Cancelamento de estoque aplicado devolve uma vez e grava mapa vazio. Edição calcula somente diferenças, incluindo produtos removidos. O mesmo pedido reprocessado não repete a devolução.

Venda física segue aceitando saldo zero e negativo. Nenhum cardápio foi modificado: saldo <= 0 continua indisponível. Preços, descontos, frete, pagamento e cupons não foram modificados.

## Validação

- 19 testes direcionados aprovados em orderStock.test.js e stockService.test.js: os dez cenários solicitados, compatibilidade legada, retry da criação, produtos removidos, linhas repetidas no checkout e idempotência de compra.
- Suite do CRM: 30 testes aprovados antes da adição de três casos direcionados do checkout (executados depois na rodada acima).
- Backend: 64 testes aprovados.
- `node --check functions/index.js` e `git diff --check` aprovados.
- `npm --prefix crm run build`: sucesso, com avisos de source maps ausentes do native-audio e bases Browserslist antigas.
- Validação local por testes automatizados; não foram realizadas vendas reais nem testes no emulador Firestore.

## Publicação

Base: codex/total-pedido-frete-producao, commit 3294104a. Correção publicada em branch própria, mantendo a base de produção deste workspace. O push em main dispara Hosting automaticamente; esta entrega deixa a execução Firebase com o usuário conforme solicitado.

Na raiz do projeto, depois de selecionar a branch da correção:

```powershell
npm --prefix crm run build
firebase deploy --project ana-guimaraes --only "functions:api,hosting:prod"
```

Deploy Firebase não executado pelo agente. Após publicar, recarregar o CRM para que as sessões usem a nova lógica.
