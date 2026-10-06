# Horista — release de produção com allowlist

Data: 06/10/2026. Projeto exclusivo: ana-guimaraes.
Worktree: C:/wt/ponto-horista-release. Branch: codex/ponto-horista-producao-release.
Repositório: https://github.com/antoniopedrocm/projeto-doceria-Multilojas.git.

## Base efetivamente publicada

O commit 83f8f0e0de314824644fa0e425a54add53600245 foi revisado: seu diff contém somente Ponto e dependências. Entretanto, a base daquele worktree contém arquivos de frete em andamento no checkout original. A comparação com Hosting confirmou que esse frete não está no bundle servido. Aquele build não foi publicado.

Esta release parte diretamente de d8635a6a6927ed96fe90be291ddbc2f6b6cefee6, base de produção verificada: os 40 arquivos de código da aplicação encontrados no source map servido correspondem a essa base. Foi aplicado somente o diff de Ponto de 83f8f0e0, sem merge amplo, sem promover a branch DEV ou o frete pendente, sem copiar um projeto DEV. O cadastro CPF/CNPJ já publicado permanece. Checkout original e primeiro worktree de Ponto intactos.

Hosting anterior: main.a68bfe74.js, SHA-256 b3917bf1bb3243c45c24963930eb0f73f0192e4f406db26f07fead33df65b43f, release sites/ana-guimaraes/versions/a402af7b33994971. Os 21 assets públicos fora de index/manifest/bundles têm hashes gzip SHA-256 idênticos aos arquivos locais desta base: três cardápios, service worker, configuração pública, áudio e imagens. /__/firebase/init.js e init.json são endpoints reservados do Firebase.

O usuário confirmou que a ausência de iFood Hub e 99Food Hub é o estado esperado. Nenhuma integração, rota, permissão, componente ou Function desses Hubs é adicionada. Não existe AGENTS.md no repositório/ancestrais verificados. Worktree fiscal não utilizado.

## Problema e correção

Produção convertia horista em seg-sex na normalização, pois aceitava apenas três escalas. handleExportPointSheet carregava incondicionalmente saldo anterior via getPreviousBankHoursBalance e somava movimentos mensais. O backend publicado também não possuía política Horista. Foram necessárias a política/vigências iniciais e a correção mensal validada em DEV (5cfc3fdf e 0759f5e31a5b08bb95538151a51ea354f3c63957).

- Diário frontend: calculatePointDayCore; intervalos reais, almoço e períodos complementares existentes.
- Política canônica: functions/point-schedule-core.js, cópia ESM gerada/verificada por scripts/sync-point-schedule.cjs.
- Mensal/PDF/Meu Espaço: summarizePointMonth. Trabalho real preservado; carga, créditos/débitos automáticos, movimento, saldo anterior operacional, banco final e extras automáticas zero. Banco/extras apresentados como —. Sem clamp.
- PDF Horista não reconstrói saldo anterior nem em transição. Mantém folha, marcações, intervalos e horas diárias. Meu Espaço usa o mesmo totalizador.
- Login, cache/restauração e listener preservam escala/vigências; erro de listener não reseta Horista.
- Backend: createUser, updateUser, listAllUsers e registerEmployeePoint. Os quatro handlers efetivamente publicados foram comparados com a base local, confirmando equivalência antes de Ponto.

## Histórico e outras escalas

Snapshots dos pontos continuam prioritários. Mudanças futuras envolvendo Horista registram escala anterior e nova vigência com data do servidor em São Paulo. Cliente não substitui histórico. Não há migração, exclusão, atualização em massa, zeragem de pointBankBalances ou regravação de snapshots. Dias fixos de transição e meses fixos anteriores mantêm as regras. Dias Horistas sem ponto não geram falta virtual/débito; ponto incompleto não presume saída.

Limitação identificada antes de implementar: não há fechamento imutável de Ponto. Configurações antigas nunca armazenadas em snapshot/vigência não podem ser recuperadas. A primeira mudança envolvendo Horista preserva a configuração então conhecida.

## Validação da release

- Frontend: 18 suítes, 213 testes aprovados; 88 de Ponto. Inclui 4h/0h/87h35/10h, ausência, almoço, pendências, PDF -213h sem consulta histórica, transição, meses fixos, três escalas, sessão/cache/formulário.
- Backend: 76 testes aprovados, incluindo 12 Horista executando handlers/transação reais com Auth/Firestore I/O simulados.
- Comparação diferencial anterior das regras fixas: 1.008 cenários frontend e 252 backend idênticos; código de Ponto e base fixa são os mesmos desta release.
- Lint frontend: zero erros, 61 avisos preexistentes em App.js. Lint Functions: zero erros/avisos de código.
- Sintaxe backend, paridade canônica/ESM e git diff --check aprovados.
- Build gerado neste worktree com Project ID/auth domain/storage bucket explicitamente ana-guimaraes. Avisos conhecidos de Browserslist/Baseline e source maps ausentes de native-audio.

Nenhum teste anterior alterou usuários/pontos/saldos/snapshots reais. Persistência/login/formulário/PDF usam I/O simulado. Verificação somente de permissão IAM para autenticação isolada de teste retornou 403 (iam.serviceAccounts.signJwt); nenhuma conta/documento criado, nenhuma permissão alterada. IAM não será alterado. Validação autenticada real será registrada separadamente se houver sessão acessível.

## Publicação seletiva

.firebaserc: ana-guimaraes, hosting target prod -> site ana-guimaraes; confirmado pela CLI/API. Hosting necessário para interface e totalizador. Quatro Functions necessárias porque as versões publicadas não possuem Horista.

Comando autorizado:

firebase deploy --project ana-guimaraes --only 'hosting:prod,functions:createUser,functions:updateUser,functions:listAllUsers,functions:registerEmployeePoint' --non-interactive

Executado com NODE_USE_SYSTEM_CA=1 e FUNCTIONS_DISCOVERY_TIMEOUT=60. Sem dotenv DEV; CLI preserva as variáveis das Functions existentes quando não se fornece dotenv.

Não são promovidos checkout/frete, InfinitePay, WhatsApp, Caixa, Entre Lojas, fiscais, Hubs, Rules, índices ou Storage.

## Arquivos da correção

- crm/src/App.js
- crm/src/meuEspaco/PointWorkScheduleFields.js
- crm/src/meuEspaco/pointCalculationCore.js
- crm/src/meuEspaco/pointScheduleCore.js
- crm/src/meuEspaco/pointMonthSummary.js
- crm/src/meuEspaco/pointHourly.test.js
- functions/index.js
- functions/point-schedule-core.js
- functions/point-hourly.test.js
- scripts/sync-point-schedule.cjs
- crm/package.json
- functions/package.json
- docs/ponto-horista-producao.md

## Resultado efetivamente publicado

Commit de runtime publicado: bed6cc89e635b318945c3689016ada7821336186. O diff de Ponto de 83f8f0e0 foi reaplicado sobre a base efetivamente servida de produção, sem os arquivos de frete pendentes. O commit posterior deste relatório apenas registra evidências; não altera runtime nem exige outro deploy.

Comando acima executado uma vez neste worktree de release, com saída 0 e mensagem Deploy complete. Hosting target prod/site ana-guimaraes liberado com sucesso. Functions createUser, updateUser, listAllUsers e registerEmployeePoint atualizadas com sucesso, Node.js 22/2ª geração/us-central1. Nenhuma outra Function publicada.

Hosting: sites/ana-guimaraes/versions/ff96cb49eedd198b. Bundle servido /static/js/main.f078c822.js, SHA-256 b6f85013fac530bb5744e9f8e897bb76f958c3f6d41501036f4b1e7030ace495. Os bytes baixados via HTTPS são idênticos ao build local. Source maps servidos de App.js, pointScheduleCore.js e pointMonthSummary.js correspondem aos fontes da release. Política Horista presente; nenhum iFood Hub/99Food Hub, destino DEV ou frete pendente no bundle. Os 39 fontes da aplicação fora dos caminhos alterados de Ponto e os 21 assets públicos comparados continuam idênticos à publicação anterior. Página raiz respondeu HTTP 200.

As quatro Functions foram auditadas após publicar: index.js e point-schedule-core.js dos arquivos de fonte efetivamente publicados correspondem aos locais. As outras 60 Functions preservam fonte e configuração. Configurações e variáveis existentes das quatro selecionadas preservadas; Firebase acrescentou somente FUNCTION_REGION=us-central1. Não foram alteradas permissões IAM.

Pós-deploy: 12/12 testes backend Horista aprovados usando index.js/política baixados do pacote publicado, com I/O Firebase simulado, e política browser extraída do source map servido. 31/31 testes frontend Horista aprovados novamente após confirmar igualdade com os fontes servidos; incluem formulário, salvar/reabrir/sessão/cache, PDF com -213h, 4h/0h/87h35/10h, almoço, pendências, transição e regressão fixa. Os endpoints reais listAllUsers e registerEmployeePoint responderam HTTP 401/UNAUTHENTICATED à chamada sem autenticação, como esperado, sem escrita de dados.

Os 14 arquivos de alterações pendentes do checkout original foram reconferidos por SHA-256 e permanecem intactos; sua branch não foi trocada. Não houve migração nem escrita em usuários reais, marcações, pointBankBalances, snapshots ou saldos históricos durante validação/publicação.

Limitação pós-deploy: cadastro/edição/persistência/login/PDF foram verificados com os fontes efetivamente publicados e I/O simulado, sem sessão autenticada real de produção. A credencial CLI não tem iam.serviceAccounts.signJwt (403), e a automação de navegador não conseguiu abrir a página (erro de certificado no endereço www apresentado pelo navegador); esse bloqueio não foi contornado. Portanto, o teste manual autenticado com usuário real continua pendente; não se declara esse fluxo como validado ponta a ponta no serviço real. Essa limitação não afetou o deploy nem a conferência HTTP/API dos artefatos.

Não foi promovida funcionalidade além de Horista e suas dependências indispensáveis. Ausência de iFood Hub e 99Food Hub preservada.
