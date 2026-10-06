# Horista: recálculo histórico em produção

Data: 06/10/2026. Projeto exclusivo: ana-guimaraes. Worktree: C:/wt/ponto-horista-release; branch codex/ponto-horista-producao-release; repositório https://github.com/antoniopedrocm/projeto-doceria-Multilojas.git. Partida: d6f865a1568a86aae59b22e7acfd0648db90ddcd, runtime anterior bed6cc89e635b318945c3689016ada7821336186. AGENTS.md não encontrado nos diretórios pertinentes/ancestrais. Checkout original e worktree fiscal não utilizados.

## Origem e período confirmado

O cadastro Horista encontrado em produção tem histórico seg-sex sem início e Horista desde 06/10/2026. Setembro possui 21 registros ativos com dados brutos, todos com snapshot seg-sex. A prioridade do snapshot em getRecordWorkSchedule mantinha a política fixa; a resolução mensal anterior também tratava setembro como fixo e então consultava saldo anterior. registerEmployeePoint igualmente mantinha existingData.jornadaTrabalho fixa mesmo quando a vigência do dia já era Horista.

Perguntado sobre o início real, o usuário confirmou: **Setembro/2026 em diante**. A política POINT_HOURLY_HISTORY_CORRECTIONS registra 01/09/2026 exclusivamente para o UID do cadastro auditado. Nenhum outro cadastro recebe retroatividade. O ID não é credencial. A correção está na fonte canônica do Ponto e na cópia browser gerada pelo script existente; não se altera o documento de usuário nem suas vigências armazenadas. Uma vigência fixa explícita posterior continua respeitada.

## Consulta, PDF e backend

applyPointHourlyHistoryCorrection cria uma vigência de cálculo somente em memória. resolvePointRecordWorkSchedule dá prioridade a uma vigência Horista confirmada sobre o snapshot fixo antigo. Desde setembro, folha, linhas diárias, Meu Espaço e PDF recalculam pelos horários/eventos/períodos consolidados existentes, considerando ajustes válidos e deduplicação. O totalizador summarizePointMonth continua compartilhado: trabalho real é normal; banco, extras, carga, créditos, débitos, saldo do mês e saldo anterior operacional são zero por não aplicabilidade, sem clamp.

Na apresentação Horista, banco, extras e irregularidade baseada em jornada mostram '-'. O resumo mantém somente Horas trabalhadas no mês / Banco de horas / Horas extras; campos de créditos, débitos e saldos da escala fixa não são exibidos. O PDF Horista não chama getPreviousBankHoursBalance nem consulta/reconstrói pointBankBalances.

Jornada aberta no almoço não é confundida com almoço inválido em período encerrado. Ela permanece Em andamento e soma apenas os intervalos já fechados, sem presumir retorno ou saída. Um período encerrado com almoço incompleto permanece Pendente de ajuste e não inventa trabalho. A mudança dessa distinção afeta somente a política Horista; regras das outras escalas preservadas.

registerEmployeePoint usa a mesma política ao calcular e persistir uma nova batida. Um snapshot fixo legado não reativa banco na vigência Horista. Essa persistência ocorre apenas ao usuário registrar uma nova batida, preservando auditoria existente; o deploy e o recálculo histórico não fazem writes ou migrações.

## Investigação de dados reais, somente leitura

Firestore ana-guimaraes foi consultado via API autenticada da CLI, somente com consultas de leitura. Duas lojas inspecionadas para o cadastro identificado. Dados brutos ficaram em arquivos temporários locais, fora do repositório/build e do relatório.

- Setembro/2026: 21 documentos ativos, todos com marcações; 20 com eventos/períodos de trabalho, 11 com quatro marcações, 3 com auditoria de alteração embutida. Quatro dias permanecem pendentes. Recálculo frontend e backend concordam: **7.093 minutos = 118h13**, banco/extras/carga/créditos/débitos zero. O total inclui somente trechos fechados dos dias pendentes. Movimentos diários legados somavam -2.464 minutos de banco e 207 minutos de extras; não são usados como trabalho nem obrigação Horista.
- Outubro/2026, dados disponíveis na investigação: 4 documentos ativos com snapshot fixo legado. **1.276 minutos = 21h16**, banco/extras/carga/créditos/débitos zero.
- Não foram encontrados pontos anteriores a setembro para esse cadastro nas lojas consultadas. Agosto e competências anteriores não recebem a correção solicitada.

Não é necessário reescrever marcações, ajustes, snapshots, historicoAlteracoes, pontosAuditoria ou pointBankBalances. Nada foi apagado ou zerado. Totais representam os dados lidos neste momento; novas marcações/ajustes válidos serão refletidos na próxima consulta/PDF. Pendências não foram completadas artificialmente.

## Validação e escopo

- Frontend: 18 suítes, **217 testes aprovados**, incluindo 35 Horista. Casos 4h/0h/87h35/10h, sem ponto, almoço, pendência aberta, formulário/cache/login, transição, seletor real da aplicação, recálculo de setembro com snapshots fixos, PDF real com I/O simulado e regressão das três escalas existentes.
- Backend: **79 testes aprovados**, incluindo 15 Horista, handlers reais com Firebase I/O simulado, recálculo histórico sem mutação, nova batida sobre snapshot fixo legado e preservação de auditoria.
- Lint frontend: zero erros, 61 avisos preexistentes em App.js. Lint backend: zero erros/avisos de código. Avisos de dependências Browserslist/Baseline antigos.
- node --check functions/index.js, paridade canônica/ESM e git diff --check aprovados.

Antes do novo build/deploy, Hosting continuava na versão ff96cb49eedd198b/main.f078c822.js da release anterior. Nenhuma atualização concorrente identificada nessa conferência. O diff desta correção contém somente Ponto, seus testes e este relatório. Nenhum checkout/frete, InfinitePay, WhatsApp, Caixa, Entre Lojas, fiscalização ou integração promovido. iFood Hub e 99Food Hub continuam ausentes.

Arquivos alterados nesta etapa:

- crm/src/App.js
- crm/src/meuEspaco/pointScheduleCore.js
- crm/src/meuEspaco/pointHourly.test.js
- functions/index.js
- functions/point-schedule-core.js
- functions/point-hourly.test.js
- docs/ponto-horista-historico-producao.md

## Publicação seletiva

Componentes necessários: hosting:prod e functions:registerEmployeePoint. createUser, updateUser e listAllUsers não precisam republicação: suas regras de cadastro/listagem permanecem iguais. Nenhuma Function adicional necessária para recálculo, executado sob demanda na consulta e PDF com política compartilhada.

Comando efetivamente executado após testes, lint, build e revisão:

firebase deploy --project ana-guimaraes --only 'hosting:prod,functions:registerEmployeePoint' --non-interactive

Executado com NODE_USE_SYSTEM_CA=1 e FUNCTIONS_DISCOVERY_TIMEOUT=60, saída 0 e Deploy complete. Sem deploy genérico.

Commit de runtime efetivamente publicado: **2b9d49098b15e9cfb619895507d2d26385b51d90**, nesta branch/worktree de Ponto. O commit posterior deste relatório apenas registra o resultado.

Build aprovado, gerado no worktree de produção com Project ID/auth domain/storage bucket ana-guimaraes explicitamente definidos. Apenas avisos preexistentes de source maps ausentes de native-audio, Browserslist/Baseline e lint. Main JS: /static/js/main.8047860d.js; SHA-256 **b48f8178f0dd1a40dfa1f90d8e3f858d580a4f35eaaebad539c95b31c20797da**. CSS/chunk secundário não mudaram. A análise do source map antes de publicar confirmou os 42 fontes de runtime não alterados nesta etapa e os 21 assets públicos iguais à release anterior.

Hosting ana-guimaraes liberado com sucesso: **sites/ana-guimaraes/versions/150e6ea5d34851d6**. Após publicar, manifest/bundle foram baixados via HTTPS; o JS servido é idêntico byte a byte ao build local. App.js, política de escala e totalizador mensal do source map servido correspondem aos fontes locais. Correção desde setembro presente; iFood Hub, 99Food Hub, destino DEV e frete pendente ausentes. Assets públicos preservados.

Function registerEmployeePoint atualizada com sucesso, us-central1/Node.js 22/2ª geração. Fonte do pacote efetivamente publicado baixada via API: index.js e point-schedule-core.js correspondem à release. Configuração, runtime, conta de serviço e variáveis existentes preservados. As outras **63 Functions** mantiveram fonte/configuração; createUser, updateUser e listAllUsers não foram republicadas.

Pós-deploy: **15/15 testes backend Horista aprovados novamente utilizando o index.js/política baixados do pacote publicado e política browser extraída do source map servido**, com Firebase I/O simulado. Endpoint real registerEmployeePoint respondeu 401/UNAUTHENTICATED à chamada sem autenticação, sem escrita de dados.

As consultas Firestore somente de leitura foram repetidas depois da publicação. Os **25 documentos de ponto** e o cadastro/vigências armazenados são iguais aos lidos antes do deploy, incluindo os ajustes/auditorias embutidos disponíveis. Nenhuma regravação, migração ou zeragem foi executada. Os 14 arquivos pendentes do checkout original também permaneceram intactos.

Limitação: não foi feita uma nova batida nem um teste manual autenticado com funcionária real; a credencial CLI usada para leitura não é uma sessão Firebase Auth da aplicação. Persistência e PDF foram exercitados com handlers/exportador reais e I/O simulado. A investigação e o recálculo usaram dados brutos reais de produção. Os quatro dias incompletos de setembro continuam pendentes, e não há pontos anteriores a setembro para esse cadastro nas lojas inspecionadas.

Nenhuma funcionalidade fora de Ponto/Horista promovida. Ausência dos dois Hubs preservada.
