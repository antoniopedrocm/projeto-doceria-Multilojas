# Ajuste administrativo da próxima NF-e para 67

## Escopo autorizado

Em 13/10/2026, o usuário solicitou usar os números 67 a 70 na sequência de NF-e da plataforma antiga. Ao conferir a referência, informou **NF-e nº 62, série 1** (corrigindo a referência inicial a 66). O início em **67** foi mantido conforme a solicitação expressa. Essa declaração não constitui consulta/validação de disponibilidade dos números na SEFAZ.

Produção: `C:\Users\antonio.pedro\Projeto\projeto-doceria-multiloja`, Firebase **ana-guimaraes**. Checkout fiscal isolado: `C:\Users\antonio.pedro\.codex\worktrees\fiscal-manual-freight-producao\projeto-doceria-multiloja`. Branch: `codex/fiscal-counter-67-producao`.

Loja: `ana-guimaraes-matriz`. Emitente: `37185245000140`. Modelo: **55**. Série: **1**. Ambiente fiscal: **production / tpAmb=1**. Documento do contador existente: `lojas/ana-guimaraes-matriz/fiscalCounters/production_55_1`.

## Plano e verificações

- Ajustar somente `nextNumber`, com timestamp e auditoria atômicos no Firestore. Plano inicial: **10 → 67**. Durante a conferência, uma nova tentativa nº 10 foi registrada pelo usuário e rejeitada; o contador mudou para 11. A primeira transação abortou sem escrita ao detectar a divergência. Após nova conferência, o ajuste efetivamente aplicado foi **11 → 67**.
- Manter os campos de ambiente/modelo/série existentes. Manter o contador NFC-e (65) e o Firebase DEV.
- Conferência de leitura nos dois Firebase: nenhum documento com modelo 55, série 1, ambiente production, números 67–70; nenhuma emissão em andamento desse modelo/série; nenhum bloco de numeração/inutilização registrado nas coleções `fiscalNumberBlocks`.
- Antes do commit, conferir novamente emitente, configuração, contador, notas e blocos da loja de produção dentro de uma transação Firestore. Usar precondição de versão no contador. Se os dados divergirem, abortar.
- Registrar operação em `auditLogs`, identificando o operador CLI, solicitação do usuário, referência declarada 62, valores anterior/novo e faixa pretendida.
- O ajuste não cria notas, não reserva os quatro números, não exclui/inutiliza faixas anteriores, não retransmite as rejeitadas e não executa eventos fiscais.

## Fluxo após ajuste

O backend atual atribui numeração somente ao iniciar uma emissão confirmada. Salvar, clonar, editar e checar não avançam o contador. A primeira nova emissão usa 67; novas emissões confirmadas seguem 68, 69 e 70. O contador continua após 70 segundo o comportamento existente; não foi criado um limite artificial de quatro notas.

Uma nota já rejeitada permanece com sua identidade/histórico. Para outra operação, clonar/preparar um novo rascunho, revisar, validar e confirmar a emissão. O ajuste administrativo não promete autorização: a SEFAZ ainda pode rejeitar por numeração ou por outros requisitos.

## Teste

Teste adicionado ao fluxo fiscal existente, com Firestore e provedor em memória: origem 62, contador 67, quatro clones independentes; salvar/checar sem consumir número; emissões simuladas 67–70; retry não duplica; contador NFC-e e nota original intactos. Nenhuma emissão real é feita pelos testes.

Somente teste e documentação mudam no Git; nenhuma alteração de runtime, build ou deploy Firebase é necessária para esse ajuste de dado.

## Resultado

- Operação concluída em **13/10/2026, 23:29:50 (UTC−3)**, commit Firestore `2026-10-14T02:29:50.405866Z`.
- Contador de NF-e produção, modelo 55, série 1: **67**, confirmado por leitura após commit.
- Contador de NFC-e produção, modelo 65, série 1: **27** antes/depois.
- Auditoria criada atomicamente: `auditLogs/fiscal_counter_alignment_20261013_nfe_67`. Referência declarada pelo usuário: 62; início solicitado: 67; disponibilidade na SEFAZ não verificada.
- Nenhuma nota/evento fiscal foi criado/transmitido. Nenhum documento anterior, coleção DEV, Rule, Function, Hosting ou Cloud Run foi alterado.
- **42 testes fiscais aprovados**, incluindo sequência 67–70 com provedor simulado. Lint de `fiscal-flow.test.js` aprovado; `git diff --check` aprovado. Não foi necessário build/deploy: o runtime permanece igual e já lê o contador existente.
