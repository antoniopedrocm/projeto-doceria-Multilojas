# Histórico fiscal da nota clonada — produção

## Diagnóstico

Workspace de produção: `C:\Users\antonio.pedro\Projeto\projeto-doceria-multiloja`. Checkout fiscal isolado: `C:\Users\antonio.pedro\.codex\worktrees\fiscal-manual-freight-producao\projeto-doceria-multiloja`. Firebase: **ana-guimaraes**. Branch: `codex/fiscal-clone-history-producao`, baseada em `ec716100`.

O backend `fiscalCloneInvoice` já cria histórico novo: um evento de criação por clonagem. Não copia o histórico original. A NF-e 8, série 1, modelo 55, tem seus próprios eventos `cloned`, três `edited`, `validated`, `issued`, rejeição e consultas. Os rascunhos da captura são registros da preparação desta nova nota, renderizados sem filtro pelo detalhe fiscal.

## Correção

- O detalhe passa a mostrar somente eventos fiscais: transmissão, retorno, autorização/rejeição, cancelamento e consulta. Criação, clonagem, edição, validação de rascunho e eventos com status `draft` não aparecem nesse histórico.
- Consulta ganha o rótulo **Consulta SEFAZ**, código e mensagem `xMotivo`. Ela não aparece como uma nova rejeição sem descrição.
- A auditoria armazenada permanece íntegra, incluindo autoria e vínculo com a origem. Não se modifica a nota original, o fluxo de clonagem, seu novo ID, os dados editáveis, a emissão, nem os contadores.
- A alteração visual também se aplica às notas já existentes, sem migração ou exclusão de dados.

## Duplicidade 539

A resposta informada pela SEFAZ referencia a chave `52240937185245000140550010000000081981418896`, que identifica modelo 55, série 1, número 8 e período setembro/2024. A nova tentativa tem número 8 e data outubro/2026. O contador local `production_55_1` estava em **9** na consulta de leitura desta tarefa.

A reserva atual atribui um novo número pelo contador durante a emissão; a clonagem não copia o número 7 da origem e não reserva numeração. A colisão é entre a sequência local e uma numeração já registrada na SEFAZ, conforme a resposta 539. O histórico de rascunho não causa essa rejeição.

A regra oficial considera emitente, modelo, série e número para a duplicidade com chave diferente: [MOC, Anexo I](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf).

Solicitada ao usuário a última NF-e utilizada na série 1, inclusive em outros emissores, ou confirmação contábil do próximo número disponível. O usuário informou a nota autorizada nº 26, de 30/09/2026; a conferência no Firestore e no modelo da chave mostrou que ela é **NFC-e (65)**, documento `XwA2YbUYqyjzojOiQrb8`, e portanto não estabelece o próximo número da NF-e (55). Foi solicitada a confirmação específica do modelo 55. Não se escolheu outra série, não se saltou numeração e não se retransmitiu uma nota para testar. Nenhuma emissão ou evento fiscal real foi realizado.

## Escopo de publicação

Somente Hosting. Functions, Cloud Run, Firestore, Rules, documentos fiscais e configuração/numeração não são alterados.

```powershell
firebase deploy --project ana-guimaraes --only hosting:prod --non-interactive
```

O build deve ser recém-gerado desta branch. Clonar Nota Fiscal e DOCUMENTO NÃO EMITIDO continuam no source. iFood Hub e 99Food Hub não existem na base de produção utilizada, conforme já documentado na correção de frete; esta tarefa não remove nem importa esses módulos do DEV.

## Verificação

Testes de interface cobrem omissão dos rascunhos, preservação dos retornos/protocolos, consulta 217 separada da rejeição 539 e auditoria imutável. O teste do backend foi reforçado com histórico de preparação na origem, verificando que NF-e/NFC-e recebem somente seu novo evento de clonagem.

- Frontend: **24 suítes / 271 testes aprovados**, incluindo confirmação, idempotência de clonagem e novo histórico.
- Backend fiscal: **41 testes aprovados**, incluindo isolamento por loja e clonagem sem identidade/histórico herdados.
- Lint de Functions e lint dos arquivos frontend alterados: aprovados.
- Build novo: `main.ee2b1af3.js`. Apenas avisos preexistentes de sourcemaps do native-audio e bases Browserslist/Baseline antigas.
- `git diff --check`: aprovado. Revisão limitada ao detalhe do histórico, seu componente/testes e teste de clonagem do backend. Nenhuma alteração no código das Functions ou da clonagem.
- Não houve teste interativo no navegador nem emissão real; a interface foi verificada com testes DOM e a publicação será conferida por hash HTTP.
