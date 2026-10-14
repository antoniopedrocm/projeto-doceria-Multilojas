# NF-e Manual / Avulsa — correção do frete em produção

Entrega de 13/10/2026, atendendo à instrução final de ajuste diretamente em produção.

## Ambiente, base e preservação

- Repositório: `C:\Users\antonio.pedro\Projeto\projeto-doceria-multiloja`. O caminho sem `Projeto` é uma junction desse diretório, confirmada antes das alterações.
- Origin: `https://github.com/antoniopedrocm/projeto-doceria-Multilojas.git`.
- Base: `662de0c2`, branch original `codex/nota-fiscal-producao`.
- Worktree exclusivo: `C:\Users\antonio.pedro\.codex\worktrees\fiscal-manual-freight-producao\projeto-doceria-multiloja`.
- Branch: `codex/fiscal-manual-freight-producao`.
- Firebase: **ana-guimaraes**. Não houve publicação em DEV.
- O source map publicado antes da correção, `main.c3870a4c.js`, foi comparado com o App.js do commit-base: igualdade confirmada.
- As 14 alterações locais preexistentes de frete/Festa na raiz foram preservadas. Não entraram nesta publicação.
- Clonagem, confirmação de emissão, cancelamento e fluxo fiscal atual foram preservados e testados. Nenhuma regra de autenticação, Firestore Rules ou configuração tributária foi alterada.
- **iFood Hub e 99Food Hub não existem na base publicada de produção**, confirmado no source publicado e local. Não foram removidos por esta correção nem importados de DEV.

Para próximas publicações, usar este worktree/branch ou integrar seus commits preservando as alterações pendentes da raiz. O checkout principal foi mantido na sua branch original.

## 1. Causa exata, confirmada com o XML real

Consulta somente de leitura aos registros e artefatos de produção:

| Documento | Resultado encontrado |
| --- | --- |
| NF-e manual nº 6 do exemplo | Rejeição **535**. `ICMSTot.vFrete = 15.00`; soma de `det[].prod.vFrete = 0`; `vNF = 2040.00`. |
| NF-e manual nº 7 do exemplo | Frete persistido zero. O retorno original da emissão, ainda preservado em `serviceResult.duplicateIssueResult`, é **539 — duplicidade de NF-e com diferença na chave de acesso**. O retorno da consulta posterior foi **217**. |

São dois documentos diferentes. A rejeição 535 vem do frete presente no total e ausente nos produtos. O código que montava incorretamente o XML é `InvoiceXmlBuilder::tagItems`: não preenchia `vFrete`, enquanto `tagTotals` preenchia o total corretamente.

Isso corresponde à regra de negócio SEFAZ **W08-10**, rejeição 535. A soma também é validada agora antes da transmissão; validar apenas a estrutura XSD não basta para comprovar essa igualdade. [MOC / leiaute e regras de validação](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=J%2BI%2Bv4eN00E%3D).

O NFePHP recebe o frete do produto em `tagprod($std)` por `$std->vFrete`. [API Make do NFePHP](https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md).

## 2. Fluxo encontrado e corrigido

`App.js / manualInvoiceForm.freight`
→ `fiscalSaveDraft / manualInvoice / totals`
→ `fiscalCheckDraft` ou `fiscalIssueDraft`
→ `buildManualPreparedPayload`
→ `/validate` ou `/issue` do serviço PHP
→ `PayloadValidator / ItemCharges / InvoiceXmlBuilder`
→ `NFePhpGateway / Tools::signNFe / SEFAZ`
→ artefatos e totais persistidos
→ detalhe, prévia e DANFE.

Também foi contemplado o endpoint legado `fiscalIssueManualInvoice`. A nota manual continua sem precisar de pedido vinculado.

## 3. Formulário, cálculos e persistência

- O campo já existia e passou a ter o rótulo **Frete (R$)**, com valor monetário, mínimo zero e centavos.
- O valor continua editável no rascunho e é preservado ao salvar/reabrir.
- A regra de totais foi centralizada em `functions/fiscal-money.js`. A cópia para navegador é gerada e conferida pelo mesmo padrão de sincronização já usado no projeto; o prebuild bloqueia divergência.
- Produtos e descontos são somados em centavos; o total é produtos − descontos + frete + seguro + outras despesas.
- Frete entra **uma única vez** no total e no pagamento.
- Dados de rascunho incompletos ou inválidos continuam salváveis; a checagem impede emissão.
- Detalhe e DANFE da interface leem `totals.freight`, com fallback para o snapshot manual e dados históricos. Um zero persistido tem prioridade sobre valores de um cadastro/pedido.
- A modalidade é persistida e mostrada sem inferi-la a partir do valor de frete.

Não existe criação de produto Frete, NCM fictício, proporcionalização de pedido externo ou modificação automática da observação de faturamento parcial. O valor informado corresponde integralmente a esta nota.

## 4. Rateio e centavos

Peso de cada item = valor bruto dos produtos daquele item, antes do desconto.

1. Converter valor de frete e pesos para centavos.
2. Calcular proporcionalmente usando divisão inteira: BigInt no JavaScript e bcmath no PHP.
3. Para os itens anteriores ao último elegível, usar a parte inteira da proporção.
4. Atribuir todos os centavos restantes ao último item de valor positivo.
5. Itens com valor zero não recebem frete.

Exemplo de centavos: três itens de R$ 1,00 e frete de R$ 0,02 recebem 0,00 + 0,00 + 0,02. A soma é sempre exatamente o frete informado.

Um único item recebe todo o frete. Frete zero omite o campo opcional do produto e mantém `ICMSTot.vFrete = 0.00`.

Seguro e outras despesas, que já existiam no formulário e nos totais, recebem o mesmo tratamento de consistência com os itens, nos campos `vSeg` e `vOutro`.

O serviço mantém compatibilidade com payloads antigos de pedidos: quando não há rateio por item, prepara os campos a partir do total. Quando o payload já informa valores por item inconsistentes, **rejeita a divergência** em vez de repará-la silenciosamente.

## 5. Resultado XML, prévia e DANFE

Caso testado, sem SEFAZ:

```xml
<!-- Produto: 2.025,00; um único item -->
<prod> ... <vProd>2025.00</vProd><vFrete>300.00</vFrete> ... </prod>
<ICMSTot> ... <vProd>2025.00</vProd><vFrete>300.00</vFrete><vNF>2325.00</vNF> ... </ICMSTot>
```

A prévia continua **DOCUMENTO NÃO EMITIDO**, exibindo produtos, desconto, frete, seguro, outras despesas e total. O DANFE gerado localmente pelo NFePHP foi verificado quanto ao frete de R$ 300,00 e ao total de R$ 2.325,00.

## 6. Checar requisitos e backend

- Número finito e não negativo para frete, seguro e outras despesas.
- Base de produtos válida para rateio quando há cobrança.
- Produtos, descontos e total consistentes.
- Soma dos acréscimos por item igual ao total da nota.
- Modelo explícito e modalidade válida.
- Revalidação no backend antes de reservar número e transmitir.
- Totais e rateio enviados arbitrariamente no formulário não são usados como verdade: são recalculados dos campos editáveis.

NF-e transmite a modalidade escolhida entre os valores suportados pelo schema atual: 0, 1, 2, 3, 4 ou 9. NFC-e mantém a restrição de modalidade 9 existente no fluxo do projeto.

Modalidade 9 significa sem ocorrência de transporte. Se há frete cobrado, a checagem apresenta **aviso para revisão fiscal**, sem trocar a modalidade e sem inventar uma rejeição legal por essa combinação. Valores fora do enum são erros bloqueantes.

## 7. Consulta SEFAZ e rejeição original

Foram corrigidos dois caminhos:

- **Consulta acionada pelo usuário:** retorno sem autorização/cancelamento fica em `lastConsultation` e no histórico, com código, mensagem, data e usuário. Preserva rejeição, XML, chave, protocolo, data da emissão e tentativa original.
- **Consulta automática após duplicidade:** anteriormente retornava `consultResult` como resultado principal, mascarando a rejeição da emissão. Agora mantém o retorno original e registra a consulta separadamente quando ela não confirma autorização/cancelamento.

Novas rejeições têm `issuanceRejection`, com código, motivo, timestamp, UID e ID da tentativa. O histórico registra também o código fiscal.

A interface apresenta a rejeição original quando ela está disponível no snapshot, inclusive para registros antigos já mascarados, e mostra a consulta como informação adicional. Não foi feita migração ou edição das notas históricas no banco.

**A nota 7 possui um problema de numeração/duplicidade independente do frete.** Conferir série e sequência com o responsável fiscal e o histórico efetivo antes de nova emissão. Não foi escolhido número, avançado contador ou reutilizada identidade fiscal para contornar a rejeição. A correção do frete não converte notas antigas em autorizadas.

## 8. Testes e qualidade

- Frontend completo: **23 suites, 260 testes aprovados**.
- Backend fiscal: **41 testes aprovados**, incluindo reabertura/edição, centavos, frete zero/negativo, totais manipulados, notas sem pedido, preservação de consulta manual e automática, clonagem, pedidos antigos, NFC-e, permissões e multiloja.
- PHP: 12 verificações preexistentes e suite adicional de XML/frete aprovadas no Cloud Build.
- Suite PHP usa certificado **efêmero de teste**, `tpAmb=2`, modelo 55, série 1, sem endpoint de transmissão. Assinatura e schema locais do NFePHP foram exercitados. Também foram construídos XMLs de pedido antigo e NFC-e.
- DANFE local gerado e conteúdo de valores conferido.
- Lint Functions completo: aprovado. Lint dos arquivos frontend alterados: sem erros.
- Build: aprovado; avisos preexistentes de source maps native-audio e bases de navegadores.
- `git diff --check`: aprovado; diff revisado e escopo fiscal confirmado.

Nenhuma NF-e/NFC-e real foi emitida, consultada na SEFAZ ou cancelada para testar. Não houve inutilização, criação de rascunho real nem consumo de número fiscal. As leituras de notas/configuração/XML em produção não alteraram documentos.

## 9. Publicação em produção

Configuração de Matriz conferida por leitura: Firebase `ana-guimaraes`, ambiente fiscal `production` (`tpAmb=1`), NF-e modelo 55 série 1 e NFC-e série 1. Serviço configurado: `https://ana-guimaraes-fiscal-service-847824537421.us-central1.run.app`.

O runtime PHP/NFePHP foi preservado a partir da imagem instalada por digest, adicionando bcmath e o código/testes da correção. Não houve atualização implícita das bibliotecas fiscais.

Cloud Build aprovado: `e073f39d-4e9c-4582-9eb4-4e6af877f093`. Imagem testada: `sha256:e217f48000276b9fbef33c5cdb0ae3e1550a7dfd8008fca731d54ac1fc5386ff`.

Revisão Cloud Run `ana-guimaraes-fiscal-service-00005-voc`: Ready/ContainerHealthy, **100% do tráfego**. Foi criada sem tráfego inicialmente e promovida depois; tag temporária removida.

```powershell
gcloud builds submit fiscal-service --tag us-central1-docker.pkg.dev/ana-guimaraes/cloud-run-source-deploy/ana-guimaraes-fiscal-service:freight-20261013 --project ana-guimaraes --region us-central1 --async
gcloud run deploy ana-guimaraes-fiscal-service --image us-central1-docker.pkg.dev/ana-guimaraes/cloud-run-source-deploy/ana-guimaraes-fiscal-service@sha256:e217f48000276b9fbef33c5cdb0ae3e1550a7dfd8008fca731d54ac1fc5386ff --project ana-guimaraes --region us-central1 --no-traffic --tag freight-check --quiet
gcloud run services update-traffic ana-guimaraes-fiscal-service --project ana-guimaraes --region us-central1 --to-revisions ana-guimaraes-fiscal-service-00005-voc=100 --remove-tags freight-check --quiet

firebase deploy --project ana-guimaraes --only 'functions:fiscalSaveDraft,functions:fiscalCheckDraft,functions:fiscalIssueDraft,functions:fiscalIssueManualInvoice,functions:fiscalRefreshInvoice,functions:fiscalCloneInvoice' --non-interactive
# Complemento da proteção da consulta automática:
firebase deploy --project ana-guimaraes --only 'functions:fiscalIssueDraft,functions:fiscalIssueManualInvoice' --non-interactive
firebase deploy --project ana-guimaraes --only hosting:prod --non-interactive
```

Deploys concluídos. Nenhuma outra Function, Rule, índice, API de pedidos/cardápios ou configuração de loja foi publicada/alterada. A descoberta local de Functions precisou de `FUNCTIONS_DISCOVERY_TIMEOUT=120`; não houve mudança de runtime por isso.

Hosting: https://ana-guimaraes.web.app. Bundle recém-gerado da branch desta tarefa: `main.c117c32d.js`, comparado com o source atual. SHA-256 local e publicado iguais: `3BFBB60F825FBA9CA163607A0C7730B9196D00664C002E28C19434B8D17EE8C8`.

## 10. Git, arquivos e limitações

Commits enviados para origin:

- `42b5e060`: frete, rateio, schema/validação, persistência e consulta manual.
- `c9965641`: proteção da rejeição na consulta automática.
- `1782fa64`: apresentação da rejeição original e da consulta adicional.

Arquivos de código/testes alterados:

- `crm/package.json`
- `crm/src/App.js`
- `crm/src/fiscalEmitHandlers.test.js`
- `crm/src/utils/fiscalMoney.js` e `fiscalMoney.test.js`
- `functions/fiscal.js`
- `functions/fiscal-clone.js` (somente centralização da função de totais)
- `functions/fiscal-flow.test.js`
- `functions/fiscal-money.js` e `fiscal-money.test.js`
- `functions/package.json`
- `scripts/sync-fiscal-money.cjs`
- `fiscal-service/Dockerfile`
- `fiscal-service/src/Service/ItemCharges.php`
- `fiscal-service/src/Service/PayloadValidator.php`
- `fiscal-service/src/Service/NFe/InvoiceXmlBuilder.php`
- `fiscal-service/tests/PayloadValidatorTest.php`
- `fiscal-service/tests/FreightXmlTest.php`
- Este relatório.

Limitações:

- Não houve autorização de teste pela SEFAZ: a homologação foi local, com assinatura/schema e provedor simulado.
- A conferência visual pela skill computer-use foi interrompida pela ferramenta por não conseguir identificar com segurança a URL do navegador. Nenhuma ação de interface foi realizada; publicação e integridade do bundle foram verificadas por HTTP.
- Probes HTTP diretos do Cloud Run com identidade pessoal retornaram 404 também na revisão anterior. A identidade do runtime não pôde ser impersonada por falta de permissão existente. IAM não foi alterado. As evidências de saúde são os testes completos na imagem e as condições Ready/ContainerHealthy do Cloud Run.
- Seleção da modalidade de transporte e alinhamento da série/numeração são decisões do responsável fiscal. Não se modificaram NCM, CFOP, CST/CSOSN, alíquotas ou tributação por suposição.
