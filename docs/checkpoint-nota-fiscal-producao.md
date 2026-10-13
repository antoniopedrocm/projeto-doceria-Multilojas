# Promoção seletiva de Nota Fiscal — produção

Data: 13/10/2026. Workspace: `C:\Users\antonio.pedro\Projeto\projeto-doceria-multiloja`.
Firebase exclusivo: `ana-guimaraes`. Branch: `codex/nota-fiscal-producao`.

## Referência e escopo

Chat consultado: **Nota Fiscal**, iniciado em 30/09/2026 às 12:12.
Referência funcional até 07/10/2026 às 17:53, conforme horário corrigido pelo usuário.
Promoção inicial até `2e4b57fb` (15:53), complementada seletivamente por `408a0911`.
Inclui os ajustes fiscais de `4b62eb3b`, `9d4ed46b`, `aafd0cca`, `cb06d4ff`,
`784423d5`, `c4756a30`, `3a116fa2` e `37f67715`, reaplicados por trechos.
Não foi feito merge de branch DEV nem usado bundle como fonte de implementação.

- Rascunhos persistentes, edição, prévia, Salvar e Validar mesmo com pendências.
- NF-e/NFC-e explícitas, confirmação, revalidação e emissão transacional/idempotente.
- Cancelamento com retorno/evento e operação independente de inutilização.
- Catálogos NCM/CFOP por loja, validação e proteção contra duplicatas.
- Clonagem com novo ID, snapshot histórico, sem identidade/numeração autorizada.
- Históricos, isolamento por loja e proteções de escrita via backend.
- Administração fiscal do Contador já existente em produção preservada.
- URL global exclusiva do Dono, auditoria, consulta de duplicidades e DANFE A4 preservados.
- Complemento `408a0911`: Editar pedido/rascunho, checagem independente pelas setas,
  Salvar e Validar e confirmação de emissão coexistem na aba Emitir.
- Edição reutiliza o rascunho do pedido, conserva modelo/CFOP/observações e invalida
  a checagem anterior. Modelo diferente não cria um segundo rascunho.

## Base publicada e alterações preexistentes

O workspace original estava em `0b68ce82`, atrás do Hosting publicado.
A comparação de fontes/hashes de verificação confirmou a release de produção
`e5d96574` e o bundle `main.64df38b6.js`. A branch desta promoção parte dessa
release de produção, preservando CPF/CNPJ e Horista já publicados.
As Rules publicadas também correspondem à base local antes do ajuste fiscal.

As 14 alterações preexistentes de frete/Festa foram preservadas no snapshot
Git `1b36f7373a8df3cf1915e6601a9c9551d0b37d1d` e restauradas após a publicação.
Não fazem parte do build nem do commit fiscal. A cópia recuperável não será removida.

O fallback local de URL fiscal em `functions/.env` foi alinhado à URL de produção
já armazenada em `integrations/fiscal` (consulta somente leitura). Nenhuma
configuração/credencial DEV foi copiada e nenhum documento real foi alterado.

## Validação e progresso

Promoção inicial concluída e publicação comprovada abaixo. Complemento até 17:53:
implementação e revisão concluídas; build, publicação e restauração em andamento.

- Frontend: 225 testes existentes/clone e 7 testes dos handlers reais aprovados.
- Functions: 82 testes de regressão e 33 testes fiscais aprovados.
- Emulador Firestore `demo-fiscal-flow`: 7 testes de integração/Rules aprovados.
- Lint: zero erros. Frontend conserva avisos de hooks/variáveis; Functions sem avisos.
- Sintaxe JavaScript e `git diff --check`: aprovados.
- PHP não está instalado no host. A validação PHP foi executada no Docker build fiscal
  antes de liberar a revisão Cloud Run.
- Cloud Build `bf99b30c-bf0e-45ba-b674-e928f3b9aff6`: SUCCESS. Lint PHP sem erros
  nos 10 arquivos examinados; 12 verificações PHP aprovadas.
- Cloud Run publicado: revisão `ana-guimaraes-fiscal-service-00004-5m7`, 100% do tráfego.
- Build frontend aprovado: `main.748c8604.js`, com avisos existentes de native-audio
  e bases de navegadores. Dos 44 módulos anteriores, só App.js mudou; foi acrescentado
  `components/FiscalCloneConfirmation.js`. AST de código não fiscal inalterada.
- Nenhuma emissão, cancelamento ou inutilização real foi executada nos testes.
- TLS utiliza a confiança válida do Windows; nenhuma validação TLS desativada.

## Recursos necessários

- `hosting:prod`.
- Somente os handlers `fiscal*` afetados pelas regras comuns/fluxo fiscal.
- `firestore:rules`: somente 36 linhas de proteção fiscal alteradas.
- Cloud Run `ana-guimaraes-fiscal-service`, `us-central1`, projeto `ana-guimaraes`.
- Sem índices, Storage Rules, dados, API do cardápio ou Functions de outros módulos.

## Limites

Emissão/cancelamento/inutilização são testados com provedor simulado. Não houve
transmissão real à SEFAZ nem alteração tributária por suposição. Campos históricos
não suportados pela integração (CEST/benefício/IPI/modalidade) bloqueiam a checagem
do clone conforme a referência DEV. Validação visual autenticada ainda pendente.

## Publicação comprovada

Firebase confirmou `Deploy complete`, saída 0, Hosting liberado e 21 operações
fiscais de criação/atualização concluídas. A API Cloud Functions confirmou as 21
Functions fiscais `ACTIVE`, todas com URL do serviço no projeto de produção.

URL: https://ana-guimaraes.web.app
Bundle publicado: `main.748c8604.js`; bytes SHA-256 iguais ao build local (HTTP 200).
Os três cardápios também correspondem ao build e permanecem na versão anterior.
Rules publicadas iguais ao arquivo local, ruleset
`projects/ana-guimaraes/rulesets/d1500e72-dc01-4c92-b68a-6c3126603869`.
Endpoints novos de rascunho, checagem, emissão, clone e inutilização responderam
HTTP 401/UNAUTHENTICATED sem credencial; nenhum documento real criado.

Comando Firebase executado:

```powershell
firebase deploy --project ana-guimaraes --only 'hosting:prod,firestore:rules,functions:fiscalCloneInvoice,functions:fiscalSaveDraft,functions:fiscalCheckDraft,functions:fiscalIssueDraft,functions:fiscalInutilizeNumbering,functions:fiscalSaveNcmOption,functions:fiscalSaveCfopOption,functions:fiscalListCfopOptions,functions:fiscalGetConfiguration,functions:fiscalSaveConfiguration,functions:fiscalSaveProducts,functions:fiscalDeleteProduct,functions:fiscalUpdatePreInvoiceOrder,functions:fiscalValidateOrder,functions:fiscalUploadCertificate,functions:fiscalIssueInvoice,functions:fiscalIssueManualInvoice,functions:fiscalCancelInvoice,functions:fiscalRefreshInvoice,functions:fiscalGetInvoice,functions:fiscalGetInvoiceArtifact' --non-interactive
```

Comando do serviço fiscal executado no mesmo workspace:

```powershell
gcloud run deploy ana-guimaraes-fiscal-service --source fiscal-service --project ana-guimaraes --region us-central1 --quiet
```

## Arquivos fiscais

- `crm/src/App.js`
- `crm/src/components/FiscalCloneConfirmation.js` e seu teste
- `crm/src/fiscalProductionFlow.test.js`
- `crm/src/fiscalOrderActions.js` e seu teste
- `crm/src/fiscalEmitHandlers.test.js`
- `functions/fiscal.js`
- `functions/fiscal-core.js` e seu teste
- `functions/fiscal-clone.js` e seu teste
- `functions/fiscal-flow.test.js`, `functions/fiscal-flow.integration.test.js`
- `functions/fiscal-clone.rules.test.js`, `functions/fiscal-ncm-options.test.js`
- `functions/fixtures/fiscal-clone.xml`
- `functions/package.json`, `functions/package-lock.json`
- `firestore.rules`
- `fiscal-service/public/index.php`
- `fiscal-service/src/Service/FiscalService.php`
- `fiscal-service/src/Service/NFe/NFePhpGateway.php`
- `fiscal-service/src/Service/PayloadValidator.php`
- `fiscal-service/Dockerfile`, `fiscal-service/tests/PayloadValidatorTest.php`
- Este checkpoint.
- `functions/.env` (ignorado pelo Git, somente fallback de URL alinhado a produção).

## Git e estado final

Commit exclusivo de implementação: `c99a0a5e5ae06ae38e94dacbc2e08d434b7f11d2`.
Push concluído para `origin/codex/nota-fiscal-producao` no repositório
`antoniopedrocm/projeto-doceria-Multilojas`. Este registro final apenas documenta
o deploy já realizado e não exige nova publicação de runtime.

As 12 cópias recuperadas (cardápios e arquivos novos) correspondem ao snapshot,
desconsiderando somente CRLF/LF. Os trechos alterados anteriormente em App.js e
index.js também correspondem ao diff original. CPF/CNPJ, Horista e código fiscal
novo permanecem presentes no workspace. O snapshot de recuperação foi mantido.

O working tree contém novamente as mesmas 14 alterações preexistentes de frete/Festa,
não commitadas, excluídas do build publicado. Nenhuma alteração fiscal ficou pendente.
Não executar um deploy amplo a partir desse working tree sem separar esse estado
preexistente: o commit fiscal identifica exatamente o código publicado nesta tarefa.

## Complemento do horário corrigido — 07/10 às 17:53

Fonte funcional: commit DEV `408a091137b31627d9f1fc8d6ef30b749e25b6a2`.
Somente os trechos da aba Emitir e seus testes foram adaptados; nenhuma alteração
das Functions, Rules ou do serviço PHP neste complemento.

- Frontend completo: 22 suítes, 253 testes aprovados.
- Functions fiscais: 33 testes aprovados; backend não modificado.
- Lint dos arquivos frontend do complemento: zero erros.
- Build aprovado: `main.c3870a4c.js`, com os avisos preexistentes de sourcemaps
  native-audio e bases de navegadores. Verificação do source map contra a versão
  publicada confirmou somente App.js alterado e fiscalOrderActions.js acrescentado;
  nenhuma fonte publicada foi usada como implementação.
- `git diff --check` aprovado; diff revisado arquivo por arquivo, somente fiscal.
- Comparação AST: 12 fluxos de Notas emitidas/clone/cancelamento/inutilização
  permaneceram idênticos ao commit anterior de produção.
- Alterações de frete/Festa temporariamente separadas no snapshot recuperável
  `ee131b44a3e1c93e1cd45829bbbda1e42398103d`, sem incluí-las no build fiscal.
- Publicação deste complemento: somente `hosting:prod` em `ana-guimaraes`.
- Não transmitir documentos fiscais reais durante as verificações.
