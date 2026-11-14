# Preparação local DEV → PROD — Ana Guimarães Doceria

## 13/11/2026 — checkpoint de continuidade

[Checkpoint local atualizado](CHECKPOINT_DEV_TO_PROD_LOCAL.md). C15-E/G encerrados; C16 ainda aguarda revisão completa/recuperação do preflight, Fase10=93,75%, global97,00%,Fase9=100%,Fase13=0%,PRODREADY:NÃO. Teste de recompra reconciliado seletivamente24/24PASS; CIguard7/7PASS. Nenhum runtimePROD local ou configuração financeira foi alterado nesta continuação.13arquivosruntime recentes de Clientes/recebimento/conexões/Rules continuam pendentes de integração seletiva após selarDEV; fees/credenciais já equivalentes. TerminalAndroid/runtimefiscal/configurações/rollback preservam seus gates. WorkflowsGitHubPROD permanecem disabled_manually/filas0/hooks0, fonteslocaisCI-only preservadas. Sem FirebasePROD, commit/push/deploy ou cópia de credenciais.

## 12/11/2026 — bloqueio CI e credencial DEV conferidos

[Estado financeiro/CI/gates](INFINITEPAY_PREPROD_STATUS.md). Workflowsremotosmerge/PRdisabled_manually,filas0; somente arquivoslocaisforampreparadoscombuild/testessemdeploy/credenciais. GuardpredeployPRODpreservado. Tagsfuturasconfirmadas:Matrizana_guimares,Garaveloantoniopedrocm;nenhumSecretDEVcopiadoparaconfiguraçãoPROD. APIKeyopcionalnomodobásico. C15-G/C16echecklistfinalcontinuampendentes. SemFirebasePROD,pushoudeploy. Percentuaisformaispreservados.


## Escopo e estado

08/11/2026. **Nenhum deploy autorizado ou executado. Nenhum push de produção.** Trabalho somente no diretório local `C:/Users/antonio.pedro/Projeto/projeto-doceria-multiloja`, associado ao Firebase `ana-guimaraes` para identificação de ambiente, sem acessar dados/usuários reais. DEV consultado somente como origem de código. Pix-only não será implementado.

- PROD inicial: branch `codex/nota-fiscal-producao`, HEAD `662de0c28b7a0283d9dd22826560cf1e76d9c763`.
- DEV principal: branch de backup antiga `backup/dev-local-2026-09-30`, HEAD `797c2562`; **não é a origem funcional desta migração**.
- DEV efetivo: worktree `../projeto-doceria-main/infinitepay-auth-worktree`, branch `feature/infinitepay-customer-auth`, HEAD documental `65974d50`, runtime `c2a387e4df994e7dea6f5390f1068e9cbe4c9622` e seus 243 commits desde a base comum `7751ab46`.
- Branch local criada: **`codex/dev-to-prod-preparation-20261108`**. Branch inicial permanece no mesmo commit.
- Antes de integrar, 5 arquivos modificados e 9 arquivos untracked de frete em PROD foram preservados no commit local **`fecaee91`**, sem push. Não são alterações descartáveis.
- Mudanças tracked locais do DEV: documentação de planejamento Pix-only. Artefatos untracked de auditoria, helpers e pastas de deploy também existem; foram inventariados, preservados na origem e excluídos integralmente da promoção.

## Auditoria concluída antes da integração

[Inventário por arquivo/área e identidades iniciais](evidence/dev-to-prod-20261108/audit.json). Excluídos `node_modules` e arquivos sensíveis: 113 arquivos iguais, 110 diferentes, 653 somente DEV (inclui documentação/testes), 27 somente PROD. Há `crm/.env` rastreado: transferência explícita de dotenv/credenciais está proibida, inclusive por fetch do histórico completo DEV. Bibliotecas declaradas compatíveis entre os projetos; scripts e contratos diferem.

| Área | Diferença/dependência | Decisão de integração |
|---|---|---|
| Cardápio/rotas | DEV possui canônico compartilhado, slugs e origem pública por aba. PROD tem três HTML independentes. | Integrar canônico/aliases, manter IDs e validar Festa como canal Matriz sem migrar documentos antigos. |
| Checkout/frete | DEV tem valores server-side, ciclo de tentativa, múltiplos modos, reserva e readiness; frete PROD tem alterações locais próprias. | Integrar por três vias preservando regressões cobertas; não copiar tarifas/coordenadas/configuração real. |
| Customer/Auth | DEV contém Google/e-mail, Phone/Guest explícitos, Área Cliente, canonicalização, grants e preview. | Reutilizar código e testar com emuladores; dados/índices/grants e configuração Auth PROD são gates separados, não copiados do DEV. |
| Pagamento | DEV implementa InfinitePay e conciliação; configuração privada por loja é dado remoto. | Integrar código; não transferir merchant/segredos/configs reais. Guest permanece Combinar com Pix indisponível. |
| CRM/administrativo | DEV adiciona gestão exclusiva Dono, edição completa/auditoria de pedidos, disponibilidade, desempenho e integrações. | Integrar sem perder módulos/contratos existentes e sem promover papel Admin para Dono. |
| Fiscal | PROD possui promoção seletiva completa até 17h53 e comportamento exclusivo em componentes/serviço. DEV adiciona método fiscal/pagamento e precisão monetária. | Mesclar, preservando contratos fiscais de PROD e notas históricas. Nenhuma emissão real. |
| Ponto/caixa/remessas | PROD contém vigência/histórico Horista, allowlist/status, valores de caixa, relatórios e métricas de compras. | Preservar e executar seus testes junto aos novos; não substituir diretório inteiro. |
| Estoque | PROD possui `orderStock`, controle contra baixa duplicada; DEV tem ajustes administrativos/reserva. | Compatibilizar sem duplicidade, testar históricos/edição/pagamento. |
| FCM/Android | PROD possui plugins OrderPush/AlarmPause, dedupe e alarmes/iOS. | Preservar código nativo e adaptar somente lógica web compatível. |
| Configurações | Projetos, Firebase Web, Android, VAPID, `.env`, fiscal e CI possuem identidades de ambiente próprias. | Manter valores PROD, excluir credenciais/arquivos DEV, remover chamadas ativas indevidas ao DEV. |
| Rules/índices | DEV altera fronteira de Customer, pedidos pagos e gestão de loja; PROD contém regras de remessas/fiscal próprias. | Mesclar e validar em emuladores; segurança permanece pendente até revisão/testes integrais. |

## Backup recuperável

`_preservados/dev-to-prod-20261108-662de0c2/` (ignorado pelo Git):

- `source-before.zip`: **258 arquivos**, todos os hashes das entradas conferidos contra o workspace anterior.
- `local-changes.patch`: alterações preexistentes dos arquivos tracked.
- `manifest.json`: SHA inicial/branch, hashes do código e das configurações protegidas; sem valores de segredos.
- `files.json`: arquivos incluídos. Dotenv/segredos, dependências instaladas, builds e caches excluídos e mantidos no lugar original.

O Git original e o commit `fecaee91` também preservam o estado local. Para recuperação, usar o commit em uma nova branch/worktree e a cópia/patch do backup, conferindo o manifesto; **não usar reset/clean destrutivo nem sobrescrever dotenv**. Remotes serão comparados por hash, sem modificar URLs ou publicar.

## Método autorizado

Patch de código/testes sanitizado por três vias, da base comum até `c2a387e4`; não importar o histórico DEV que contém dotenv. Excluir arquivos de identidade Firebase/segredos e adaptá-los separadamente mantendo os valores PROD. Não copiar `node_modules`, builds, workflows DEV ou scripts de migração remota. Conflitos devem ser resolvidos preservando comportamento exclusivo PROD e testados; conflitos não resolvidos impedem conclusão.

## Gates e medição

- Auditoria: concluída.
- Backup/branch/preservação do estado: concluídos.
- Integração funcional de código: concluída na branch de preparação; validações atuais abaixo. **Preparação ainda não liberada para publicação.**
- O inventário de funcionalidades e testes terá evidências atuais; os 261 testes DEV são referência histórica.
- Configuração remota PROD, homologação manual, credenciais/merchants, canonical registry/índices de dados, SMS Enterprise e papéis Staff: **não verificados remotamente nesta missão**.
- Pix-only: dependência externa separada, sem bloquear integração do comportamento Guest homologado.
- Fase 9 formal 100%; Fase 10 formal 87,50%; global formal 97,00%; Fase 13 0%. Não reponderar por migração local.
- **Deploy PROD: NÃO EXECUTADO.** Nenhuma autorização implícita de publicação ao concluir a preparação local.

## Resultado da integração local

[Arquivos adicionados/modificados e inventário de preservação](evidence/dev-to-prod-20261108/migration-files.json). Todos os 27 arquivos exclusivos de PROD foram mantidos; 23 permanecem sem modificação e quatro testes foram adaptados aos contratos mesclados. A branch original continua intacta.

O delta funcional sanitizado entre `7751ab46` e `c2a387e4` foi integrado, sem importar o histórico Git DEV que contém dotenv. A lista dos 243 commits de origem avaliados está em [source-commits.json](evidence/dev-to-prod-20261108/source-commits.json). Não se trata de um merge integral desses commits: credenciais, configurações DEV, artefatos locais, dependências instaladas, workflows e alterações não homologadas ficaram excluídos.

Foram resolvidos 34 arquivos com conflitos, com revisão dos blocos e testes posteriores. O registro inicial de decisões está em [conflict-decisions.json](evidence/dev-to-prod-20261108/conflict-decisions.json); ajustes semânticos posteriores estão descritos aqui e no diff da branch.

| Área | Resultado local / preservação |
|---|---|
| Cardápio | Componente compartilhado, slugs Matriz/Garavelo, compatibilidade de URLs antigas, origem por aba e Festa como canal da Matriz. Sem alteração de IDs/documentos históricos. |
| Checkout | Guest somente Combinar funcional; Pix online Guest continua bloqueado. Google/e-mail/celular mantêm os fluxos autorizados. Valores/frete/cupom/estoque e idempotência continuam server-side. |
| Customer | Área do Cliente, login/logout, endereços legados, canonicalização, ownership, grants, recompra e preview integrados; testes sintéticos aprovados. Nenhum vínculo ou migração real. |
| InfinitePay | Criação de link, confirmação `/payment_check`, eventos informativos, conciliação, isolamento de merchant/loja e idempotência integrados. Nenhuma chamada financeira real. |
| CRM | Edição completa e status rápido separados, auditoria, gestão exclusiva Dono, disponibilidade por loja, rotas e desempenho integrados. |
| PROD exclusivo | Preservados confirmação de descarte de formulários, menu/atalho do sino e foco/fechamento do menu de usuário; Financeiro, CPF/CNPJ/endereço fiscal, métricas de compras, Ponto Horista/vigência/histórico, caixa, Entre Lojas/relatórios e plugins Android. |
| Estoque | Ledger `estoqueAplicado` histórico preservado nas edições; checkout rejeita linhas duplicadas e mantém reserva. Testes cobrem repetição sem segunda baixa. |
| Totais | Detalhe/impressão/resumo usam total final persistido; frete não é somado novamente. O painel Financeiro PROD reutiliza o contrato DEV de recebimentos: a combinar/online pendente não vira receita e alteração após pagamento usa o valor pago confirmado. |
| FCM | Trigger de criação original mantido; aprovação online tem trigger separado e usa o mesmo recibo/lease de entrega. Pedido online pendente não gera alerta antecipado. Worker e identidade Firebase PROD preservados. |
| Frete | Cotação pelo backend da própria loja, sem herdar tarifa Matriz. Dados/tarifas/coordenadas reais não foram copiados. |
| OTP/WhatsApp | Código adaptado ao projeto `ana-guimaraes`; não usa secrets DEV. Referências esperadas `whatsapp-prod-*` e chave OTP devem ser conferidas/provisionadas separadamente antes de qualquer habilitação. Configuração ausente/desabilitada falha fechada. Nenhum envio/configuração remota foi feito. |
| API/preview local | App, Customer e Admin Preview usam a mesma URL de API do ambiente. Localhost sempre usa emuladores `demo-*`, mesmo quando há API de produção no dotenv. |
| Hosting | Target `prod` preservado; rewrites de SPA/cardápios e política de cache adaptados. Configurado bloqueio local de predeploy. |

As regras foram mescladas preservando escopo Staff/loja, fiscal/contador e remessas. A combinação inicialmente excedia o orçamento de expressões em duas transições de remessas; a checagem repetida de perfil/role foi reduzida, mantendo as condições de autorização. Os testes reais de Rules passaram após o ajuste. Leitura de token FCM ficou limitada ao Staff titular, sem listagem, para limpeza idempotente do dispositivo.

## Evidências atuais

- **React: 618/618 PASS**, 61 suítes. [Resultado](evidence/dev-to-prod-20261108/crm-tests.json).
- **Node/HTTP/Rules/emuladores: 1069/1069 PASS**, 130 arquivos. [Resultado](evidence/dev-to-prod-20261108/local-tests.json). Inclui testes anteriores de PROD e DEV e quatro provas adicionais de compatibilidade de estoque/notificação/navegação/API local, além do teste do seletor Financeiro.
- **PHP: 12 verificações de payload PASS e sintaxe de 12 arquivos PASS**. [PHP portátil oficial 8.3.36](https://www.php.net/downloads.php?os=windows&version=8.3), checksum verificado; sem emissão/transmissão. [Resultado](evidence/dev-to-prod-20261108/php-tests.json).
- **Build web local de produção: PASS**, 59 artefatos; nenhuma URL HTTP(S) DEV encontrada no build. [Manifesto](evidence/dev-to-prod-20261108/build-manifest.json).
- **Lint: zero erros** em 161 arquivos frontend e 163 backend; 87 avisos frontend registrados, principalmente dívida de hooks/variáveis não usadas. [Resumo](evidence/dev-to-prod-20261108/lint-summary.json).
- **Diff-check: PASS**; nenhum conflito de merge pendente.
- Dependências declaradas e lockfiles existentes preservados; nenhuma atualização de bibliotecas. Dotenv de CRM/Functions, `.firebaserc`, worker FCM e identidade Android preservados. Defaults Firebase de PROD mantidos; o módulo público passa a ler a configuração do próprio Hosting. [Conferências](evidence/dev-to-prod-20261108/preservation-checks.json).
- Testes usam projetos `demo-*`, loopback e mocks. Processos de testes bloqueiam rede externa; o driver legado testado usa apenas adapter temporário de emulador. Não foram carregados usuários/dados de PROD.

Os testes antigos que extraíam handlers por texto foram atualizados para os contratos atuais: canonical Auth, estoque em array, helpers de frete e nome do botão de resumo. Controles negativos históricos de Rules/Hosting foram preservados como fixtures, sem importar histórico Git com dotenv. Não foram removidas as asserções de segurança ou alteradas as regras para satisfazer testes obsoletos.

## Pendências e riscos antes da liberação

1. **Runtime fiscal — bloqueio de validação local:** `FreightXmlTest.php` (XML/assinatura/DANFE) e build Docker não foram executados. Docker/NFePHP não estão instalados neste workspace; o lock/digest exato do runtime fiscal de PROD não está disponível localmente. O Dockerfile preserva a base/estrutura PROD e acrescenta `bcmath`/testes necessários, sem depender de imagem DEV. Não substituir por versões arbitrárias de NFePHP para obter um PASS artificial.
2. **Android — teste bloqueado:** tentativa `testDebugUnitTest --offline` não resolve plugins Android Gradle 8.7.2 / Google Services 4.4.2 ausentes no cache. Código/identidade Android não foram modificados. Teste instrumentado exige dispositivo/emulador e não foi executado; não houve instalação de aplicativo.
3. **Configuração remota PROD — não acessada:** conferir, com autorização posterior, Google/e-mail/domínios Auth, registry/índices/aliases/cobertura Customer, papéis Dono e valores/aliases legados dos perfis Staff, grants/SMS Enterprise e projeto separado de verificação, merchants/API keys por loja, Maps server-side, readiness/configuração das lojas, fiscal e índices. Não copiar estado READY, configuração ou permissões DEV.
4. **Filas/automação:** antes de publicar Functions, revisar jobs existentes e manter WhatsApp/SMS desabilitados até configuração e autorização próprias; verificar triggers/schedulers, reservas, conciliação e ausência de processamento indevido de backlog.
5. **Aceite e segurança:** revisão humana final do diff/Rules e homologação do candidato com configuração apropriada ainda são necessárias. Os 618+1069 testes não comprovam os dados reais de PROD.
6. **Gates formais:** C15/C16 da Fase 10 não são encerrados por esta migração. Fase 10 continua 87,50%; produção depende dos gates oficiais, backup/rollback e autorização explícita.
7. **Pix-only:** dependência externa separada. Não implementado; não impede homologar o Guest com Combinar Pagamento, mas não autoriza anunciar Pix Guest disponível.

## Percentual comprovado desta preparação

Medição local separada da ponderação histórica: **90% — 9/10 gates técnicos**.

| Gate | Estado |
|---|---|
| Auditoria de repositórios/worktrees/base | PASS |
| Backup/branch/preservação de trabalho anterior | PASS |
| Integração controlada do delta funcional | PASS |
| Checkout/pagamentos e invariantes financeiros em mocks | PASS |
| Auth/Customer/legado/preview em testes | PASS |
| CRM, estoque, ponto, caixa e permissões em testes | PASS |
| Multiloja, Rules e rotas/Hosting em emuladores | PASS |
| Build web/dependências/identidade de ambiente local | PASS |
| Lint/diff-check/artefatos/documentação | PASS |
| Validação completa dos runtimes fiscal e nativo | BLOQUEADA |

**Migração ainda não é 100% nem PROD READY.** Segurança automatizada e multiloja passaram; revisão final e configuração real permanecem pendentes. Global formal **97,00%**, Fase 9 **100%**, Fase 10 **87,50%**, Fase 13 **0%**, sem rebaseline.

## Próxima execução autorizável

Obter o runtime fiscal exato/lock para validar XML/DANFE e imagem; revisar o acoplamento entre o contrato monetário do backend e o serviço fiscal antes de publicar qualquer lado isoladamente; resolver os requisitos locais Android se esse artefato fizer parte da publicação. Depois revisar o diff e os gates de configuração sem copiar dados DEV. Somente após os gates formais e autorização explícita considerar publicação. `scripts/block-production-deploy.cjs` bloqueia predeploy de Hosting/Functions/Rules/Storage durante esta preparação; não removê-lo como parte de um build rotineiro.

**Commit de preparação: o commit local que contém este relatório. Push: NÃO. Deploy PROD: NÃO EXECUTADO. Dados, usuários, pagamentos, SMS e WhatsApp reais: NÃO ALTERADOS.**
