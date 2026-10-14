# Controle manual da próxima numeração fiscal — produção

## 1. Base e escopo

- Repositório: `C:\Users\antonio.pedro\Projeto\projeto-doceria-multiloja`.
- Checkout fiscal limpo utilizado: `C:\Users\antonio.pedro\.codex\worktrees\fiscal-manual-freight-producao\projeto-doceria-multiloja`.
- Remote: `https://github.com/antoniopedrocm/projeto-doceria-Multilojas.git`.
- Branch exclusiva: `codex/fiscal-numbering-controls-producao`, base `90a20e28`.
- Firebase allowlist: **ana-guimaraes**. Nenhuma escrita/deploy no DEV `crmdoceria-9959e`.
- Base de Hosting conferida antes da edição: `main.ee2b1af3.js`. As duas mudanças posteriores de Git dessa base eram testes/documentação; o frontend da branch correspondia à versão publicada.
- Configuração fiscal consultada: loja `ana-guimaraes-matriz`, Produção (`tpAmb=1`), série 1 dos dois modelos; próximos números 55=67 e 65=27. Não se altera esses valores nem o ambiente por implantação da funcionalidade.
- Checkout principal de produção possui alterações pendentes de outros módulos; elas não foram utilizadas, publicadas, removidas ou alteradas.

## 2. Arquitetura encontrada e fluxo final

O controle existente é `lojas/{lojaId}/fiscalCounters/{environment}_{model}_{series}`. NF-e e NFC-e já usam documentos separados. Não foi criado outro contador.

Fluxo: formulário/rascunho → Functions (`fiscalCheckDraft`, `fiscalValidateOrder`) → contador consultado sem reserva → confirmação → transação de reserva (`fiscalIssueDraft` ou emissão legada `fiscalIssueInvoice`) → payload com `invoice.number` → fiscal-service → `InvoiceXmlBuilder.tagIde` (`nNF`, série, modelo, `tpAmb`, cNF) → NFePHP (chave/DV/assinatura) → SEFAZ → resultado e arquivos na tentativa original.

O builder existente calcula cNF a partir do novo nNF; não importa cNF, chave, assinatura ou XML de outra nota. O fluxo de geração não foi alterado nesta tarefa. Cloud Run/NFePHP não requerem publicação.

## 3. Persistência e dimensões

- Contador: caminho existente, com `nextNumber`, ambiente, modelo, série, `issuerCnpj`, `updatedAt`, `updatedByUid` quando alterado manualmente.
- Loja isola emitentes; o contador é vinculado ao CNPJ salvo da loja. Se o CNPJ vinculado divergir, bloquear e exigir conferência do emitente/loja. Não migrar silenciosamente um contador para outro CNPJ.
- Ambientes `production` e `homologation`, modelos 55/65 e séries 0–999 têm IDs separados. A série 0 deixa de ser substituída silenciosamente por 1; séries vazias, fracionárias ou fora da faixa são rejeitadas na configuração.
- Histórico administrativo protegido: `lojas/{lojaId}/fiscalCounters/{counterId}/manualChanges/{operationId}`. As Rules atuais já impedem acesso/escrita direta nessa árvore.
- Espelho na auditoria existente: `auditLogs/manual_numbering_{operationId}`. UID, usuário, perfil, loja/CNPJ, modelo, série, ambiente, anterior/novo e timestamp. Esse espelho não é usado como comprovante para retry; a área protegida do contador é a fonte autoritativa.
- Reservas reutilizam `fiscalNumberBlocks/{environment}_{model}_{series}_{number}`, agora também com status `reserved`, ID da tentativa, UID e timestamp. Os blocos existentes de inutilização permanecem válidos.

## 4. Interface e confirmação

`Nota Fiscal > Configuração > Numeração fiscal` tem dois cartões: NF-e 55 e NFC-e 65, emitente, série, ambiente real salvo e Próximo número. Cada cartão possui seu próprio botão de salvar. Editar o campo não envia mutação.

Confirmação mostra modelo, série, ambiente, emitente, número atual e proposto. Cancelar não modifica o contador. Redução tem alerta forte; aumento tem aviso de possível lacuna e de eventual necessidade de inutilização. A interface informa que ausência local não comprova disponibilidade na SEFAZ. O valor é **próximo nNF**, não último número emitido.

As callables específicas `fiscalGetNumbering` e `fiscalSetNextNumber` consideram a configuração salva. Alterar ambiente/série no formulário requer salvar a configuração e recarregar os números. Nenhum ambiente é alterado automaticamente. Mudança de loja desmonta o controle anterior; respostas de carregamento antigas são descartadas.

## 5. Validações, concorrência e idempotência

- Autenticação/usuário ativo via wrapper existente de `functions/index.js`. Administração fiscal via política existente: Dono, Gerente com acesso à loja e Contador com módulo fiscal habilitado. Usuário que apenas emite/consulta não ganha administração.
- Backend revalida confirmação explícita, inteiro 1–999999999, loja, CNPJ, ambiente, série, número esperado e revisão precisa do contador (`seconds:nanoseconds`).
- Alteração manual e auditoria protegida/espelho são atômicas. Concorrência/alteração de configuração ou contador invalida a confirmação antiga. Emissão pendente nessa sequência bloqueia alteração manual.
- Identificador por confirmação e comprovante protegido deduplicam retry/clique duplo da alteração.
- Números presentes em autorizadas/rejeitadas/canceladas/denegadas/reservas, histórico explícito, chaves e mensagens de duplicidade são bloqueados. Faixas de inutilização e blocos também são conferidos.
- Consultas usam projeção de campos fiscais de identidade/estado, sem itens, clientes, XML ou certificado. Não há inferência `max(local)+1` para informar disponibilidade.
- Emissão reserva número + avanço do contador + bloco + associação à tentativa na mesma transação, antes do envio ao provedor. Duas novas tentativas concorrentes têm números diferentes.
- Criar/salvar/clonar/editar/visualizar/checar não reserva nem incrementa número. Checagem também detecta alvo conhecido localmente como usado, sem transmissão.
- Retry da mesma tentativa retorna/reconhece a reserva existente. Na API legada, replay após rejeição comum reutiliza o registro; uma operação fiscal nova deve seguir o fluxo de novo rascunho. Rejeições, chaves e protocolos antigos permanecem íntegros.
- O mecanismo legado de procurar automaticamente outro número após duplicidade/falha de digest foi removido. Rejeição 539 é preservada e a interface orienta revisão da configuração.
- Inutilização continua operação separada, nunca chamada pelo controle manual.

## 6. Arquivos permitidos

- `crm/src/App.js`: somente ligação da seção, recarga após salvar configuração e tratamento da série.
- `crm/src/components/FiscalNumberingControls.js` e `.test.js`.
- `functions/fiscal.js`: APIs, reserva/checagem, auditoria e retirada do retry de numeração.
- `functions/fiscal-numbering.js` e `.test.js`.
- `functions/fiscal-flow.test.js` e `fiscal-flow.integration.test.js`.
- `functions/package.json`: inclusão dos testes do helper de numeração.
- Este relatório.

Nenhuma Rule, índice, Storage, arquivo de outro módulo, configuração de ambiente, certificado ou fiscal-service foi modificado. iFood Hub/99Food Hub continuam ausentes na base de produção e não são importados do DEV.

## 7. Verificação

- Backend: testes automatizados do fluxo com Firestore/provedor em memória, inclusive permissões, dimensões, histórico/539, concorrência, retry, reservas, auditoria atômica e proteção do comprovante.
- Frontend: testes DOM de edição sem salvar, cancelamento, confirmação de cada modelo, avisos de redução/lacuna, entradas inválidas, permissões, clique duplo e recarga após concorrência/alteração de escopo.
- Integração real com emulador foi adicionada para transações concorrentes e auditoria, mas não executou neste host: Java 25 e Java 21 temporário verificado por SHA-256 falharam em `UnixDomainSockets.connect0` / `Invalid argument: connect`, antes dos testes. Docker não está disponível. Não houve mudança de configuração do sistema nem substituição por testes de emissão real. Essa limitação é explícita; os testes com mocks passaram.
- Build/lint/diff e publicação final são registrados após execução.

## 8. Publicação autorizada

Somente Hosting e Functions fiscais afetadas, inclusive dependências de leitura da série/configuração. Nenhuma Function de outro módulo.

```powershell
firebase deploy --project ana-guimaraes --only 'functions:fiscalGetNumbering,functions:fiscalSetNextNumber,functions:fiscalGetConfiguration,functions:fiscalSaveConfiguration,functions:fiscalCheckDraft,functions:fiscalValidateOrder,functions:fiscalIssueDraft,functions:fiscalIssueInvoice,functions:fiscalInutilizeNumbering' --non-interactive
firebase deploy --project ana-guimaraes --only hosting:prod --non-interactive
```

Validar depois por integridade do bundle publicado, estado das Functions, rejeição de chamadas não autenticadas e leitura dos contadores/configuração. Não confirmar alteração de número nem emitir nota real para testar.
