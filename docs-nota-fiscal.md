# Módulo Nota Fiscal

O menu **Nota Fiscal** fica entre Financeiro e Configurações e usa a loja selecionada no topo do painel.

## Dados usados

- Pedidos: `lojas/{lojaId}/pedidos`
- Notas: `lojas/{lojaId}/invoices`
- Produtos fiscais: `lojas/{lojaId}/fiscalProducts`
- Configuração do emitente: `lojas/{lojaId}/fiscalConfig/issuer`
- Configuração de emissão da loja: `lojas/{lojaId}/fiscalConfig/settings`
- Metadados do certificado: `lojas/{lojaId}/fiscalConfig/certificate`
- Segredos por loja: Google Secret Manager (`fiscal_{lojaId}_cert_pfx_base64`, senha e CSC)
- Numeração: `lojas/{lojaId}/fiscalCounters`

## Cloud Functions

- `fiscalValidateOrder`
- `fiscalIssueInvoice`
- `fiscalCancelInvoice`
- `fiscalGetInvoice`
- `fiscalUploadCertificate`

Enquanto a URL única do serviço fiscal não estiver configurada, a validação roda localmente e a emissão real fica bloqueada. Para emitir de fato, publique `fiscal-service/` no Cloud Run e salve a URL em **Nota Fiscal > Configuração > Emissão > URL única do serviço fiscal** com um usuário **Dono** que tenha acesso a todas as lojas. Como fallback técnico, `FISCAL_SERVICE_URL` nas Cloud Functions também é aceito. Essa URL é global da plataforma, não pertence a cada loja. O certificado A1, senha e CSC são enviados pela tela **Nota Fiscal > Configuração > Certificado digital A1** e ficam no Secret Manager por loja.

O papel **Contador** pode receber acesso de consulta aos módulos selecionados pelo administrador. Em **Nota Fiscal**, ele visualiza dados fiscais e notas da loja vinculada sem poder emitir, cancelar, editar produtos fiscais ou substituir o certificado.

## Operações da nota

- Antes da emissão, o operador pode informar observações da nota; o texto é transmitido como informação complementar e armazenado junto à nota para consulta.
- Notas autorizadas exibem a ação de cancelamento. A justificativa é obrigatória, tem no mínimo 15 caracteres e é gravada no histórico fiscal.
- No cadastro de produtos fiscais, a aplicação oferece seleção de NCM com padrão `1905.90.90` para itens típicos de confeitaria/pastelaria, além de opções para doces/confeitos sem cacau e produtos de chocolate/cacau. O CFOP é selecionado na operação de emissão, com padrão `5101 - Produção própria dentro de GO`, e ambos devem ser validados pelo responsável fiscal.

## Cadastro fiscal em massa de produtos

A tela **Nota Fiscal > Produtos fiscais > Produto fiscal** permite cadastrar a classificação fiscal de vários produtos da loja em uma única operação.

### Regras funcionais

- O campo **Produto vinculado** é uma seleção múltipla com busca por nome, código, categoria e ID.
- A opção **Selecionar todos** marca todos os produtos visíveis no filtro atual.
- Os campos fiscais comuns aplicados ao lote são: NCM, unidade, origem, ICMS/CST, CEST, PIS CST, COFINS CST e código de benefício.
- Quando mais de um produto é selecionado, o código e a descrição fiscal são preenchidos automaticamente por produto, usando o código e o nome cadastrados na loja.
- Ao salvar, o sistema pede confirmação com a quantidade de produtos afetados.
- Se algum produto já possuir cadastro fiscal, o usuário escolhe uma das políticas:
  - **Atualizar campos vazios**: preserva dados existentes e completa somente campos em branco.
  - **Ignorar existentes**: cadastra apenas produtos sem classificação fiscal.
  - **Sobrescrever existentes**: substitui os campos fiscais dos produtos selecionados.
- A gravação usa o ID do produto como ID do documento em `lojas/{lojaId}/fiscalProducts/{produtoId}`, evitando duplicidade para o mesmo produto.
- Ao final, a tela mostra o resumo de cadastrados, atualizados, ignorados e erros.

### Critérios de aceite

- Selecionar vários produtos e salvar cria um cadastro fiscal para cada produto selecionado.
- Selecionar todos com a busca vazia afeta todos os produtos da loja.
- Selecionar todos com busca preenchida afeta somente os produtos filtrados.
- Um produto já cadastrado não gera documento duplicado.
- A política **Ignorar existentes** não altera cadastros fiscais já existentes.
- A política **Atualizar campos vazios** não sobrescreve campos já preenchidos.
- A política **Sobrescrever existentes** atualiza os campos fiscais dos produtos já cadastrados.
- O resumo final informa quantos produtos foram cadastrados, atualizados, ignorados e quantos falharam.

## Atenção operacional

Antes de produção, cadastre os dados fiscais dos produtos, configure o certificado A1 no Cloud Run, homologue NF-e/NFC-e na SEFAZ GO e confira série/numeração com o contador.
