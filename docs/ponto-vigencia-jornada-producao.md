# Data de vigência ao mudar a jornada

06/10/2026 — ana-guimaraes. Worktree C:/wt/ponto-horista-release, branch codex/ponto-horista-producao-release. Base e5ec67d0a672fd649846943c7b1c889fdadb8250; runtime anterior 2b9d49098b15e9cfb619895507d2d26385b51d90. Nenhum AGENTS.md encontrado nos caminhos pertinentes já auditados. Checkout original/fiscal não utilizados.

## Uso

Configurações > Usuários > editar funcionária > Jornada de trabalho > Tipo de escala: Horista. Ao alterar a jornada, aparece **Aplicar nova jornada a partir de**, preenchida inicialmente com o dia atual em São Paulo. Escolher a data e salvar. A jornada anterior vale até a véspera; a nova jornada vale na data escolhida, inclusive. Pode ser data passada ou futura. Ao reabrir, aparece Vigência registrada da jornada com a data salva.

O campo aparece para alterações envolvendo Horista ou um cadastro que já tem histórico de jornadas. Não é editado ao apenas alterar nome/permissões, e não cria uma vigência nova nesses casos. Cadastro de novo usuário e demais escalas sem histórico mantêm o comportamento existente. Não se alterou nenhum perfil real nesta tarefa; a mudança será feita pela usuária no formulário.

## Lógica

O formulário transmite dataInicioJornada ao updateUser quando há uma alteração de jornada que exige vigência. Cliente e servidor validam uma data real ISO, incluindo mês/dia e ano bissexto. A API rejeita vazio, formato inválido e datas impossíveis antes de atualizar Auth ou gravar usuário. Clientes antigos sem esse campo mantêm o fallback anterior: data atual em São Paulo.

O servidor constrói jornadaTrabalho.historicoEscalas a partir do cadastro existente e da data escolhida; histórico enviado pelo cliente não substitui histórico do servidor. A regra é resolvida pela data do ponto/competência no frontend e registerEmployeePoint já publicado. Alterar cadastro para Horista com data futura preserva carga/banco da jornada antiga antes dessa data; desde a vigência, trabalho é real, banco/extras/carga/créditos/débitos Horista zero e apresentação '-'. PDF e Meu Espaço continuam usando a resolução/totalizador compartilhados. Marcações, ajustes, auditoria e pointBankBalances não são migrados nem regravados.

Também foi corrigido buildPointScheduleUpdate: edição sem alteração de jornada preserva a vigência existente, inclusive quando futura. Antes, uma edição de nome/permissões podia acrescentar outra entrada datada de hoje e antecipar a mudança. As fórmulas das escalas fixas não foram alteradas. A correção histórica datada de setembro para o cadastro previamente auditado permanece igual.

## Arquivos

- crm/src/App.js
- crm/src/meuEspaco/PointWorkScheduleFields.js
- crm/src/meuEspaco/pointScheduleCore.js (gerado da fonte canônica)
- crm/src/meuEspaco/pointHourly.test.js
- functions/index.js (somente updateUser e import da política)
- functions/point-schedule-core.js
- functions/point-hourly.test.js
- docs/ponto-vigencia-jornada-producao.md

## Verificação

Frontend: 18 suítes/219 testes aprovados na execução global; 39 testes Horista aprovados na execução direcionada, incluindo dois casos adicionais do submit real da aplicação. Testes de campo/data, reabertura, início inclusivo, carga/banco antes/depois, PDF, saldo anterior, outras escalas e sessão. Backend: 82 testes aprovados, incluindo 18 de Ponto; updateUser real com I/O simulado, data passada/futura, reabertura/listAllUsers, preservação da vigência em edição de nome e rejeição de datas inválidas sem writes Auth/Firestore.

Frontend/backend reais são executados nos testes, substituindo apenas I/O e helpers não relacionados. Não há teste manual autenticado com uma funcionária real. Nenhum documento real foi alterado para testar.

Lint frontend aprovado com 0 erros e 61 avisos preexistentes; lint backend aprovado sem erros. Build de produção aprovado neste worktree, com avisos preexistentes de source maps de native-audio e bases Browserslist/Baseline desatualizadas. Verificações de sintaxe, sincronização da política e git diff --check aprovadas.

## Publicação concluída

Commit efetivamente publicado: **bd4b246f24ade8b85e13c06b72349d7bfc775942**, branch **codex/ponto-horista-producao-release**, worktree **C:/wt/ponto-horista-release**. Projeto confirmado **ana-guimaraes**; target Hosting **prod -> ana-guimaraes**.

Comando exato, executado nesse worktree:

```powershell
$env:NODE_USE_SYSTEM_CA='1'
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --project ana-guimaraes --only 'hosting:prod,functions:updateUser' --non-interactive
```

Deploy concluído com sucesso: Hosting publicado e somente **updateUser (us-central1)** atualizado. As outras **63 Functions** permaneceram inalteradas. registerEmployeePoint e listAllUsers já resolvem/preservam as vigências; createUser não mudou e não foi publicado.

Versão Hosting: **sites/ana-guimaraes/versions/31ad8b062e1c38e9**. Bundle servido **/static/js/main.64df38b6.js**, idêntico ao build local, SHA256 **b240fddfd67c3a8777a58ab8ad5ce25a272f2797fec7c80971750725c2f41f3b**. App.js, formulário e política extraídos do source map publicado correspondem às fontes locais. Os 41 arquivos de runtime sem alterações nesta etapa e os 21 assets públicos foram preservados na comparação com a versão anterior. Hubs iFood/99Food e alterações pendentes de frete continuam ausentes do bundle.

O pacote efetivamente publicado de updateUser foi baixado; index.js e point-schedule-core.js correspondem às fontes locais. Os **18 testes de Ponto passaram novamente com esse pacote e a política extraída do bundle servido**. Os 14 arquivos de alterações pendentes no checkout original de produção permanecem intactos, conferidos por SHA256. Nenhuma funcionalidade além da vigência da jornada Horista e suas dependências indispensáveis foi promovida. A documentação posterior ao deploy não exige nova publicação.
