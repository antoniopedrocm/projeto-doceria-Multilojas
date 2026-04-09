# Convenção de modelagem Firestore: global vs por loja

Este projeto usa **duas estratégias de modelagem** e elas devem ser explícitas em qualquer funcionalidade nova.

## 1) Dados globais (escopo único)
Use coleção global quando o dado pertence ao cliente independentemente da unidade.

- `clientes/{clienteId}`

Regras:
- Não usar `storeId` nulo para "cair" em global.
- O acesso global deve ser intencional no código (ex.: `collection(db, 'clientes')`).

## 2) Dados por loja (escopo multiunidade)
Use sempre caminho com `lojas/{storeId}/...` para qualquer dado operacional da unidade.

Exemplos:
- `lojas/{storeId}/produtos/{produtoId}`
- `lojas/{storeId}/pedidos/{pedidoId}`
- `lojas/{storeId}/meuEspaco/{docId}`
- `lojas/{storeId}/pontos/{registroId}`
- `lojas/{storeId}/configuracoes/config` (documento agregador)
- `lojas/{storeId}/configuracoes/config/{cupons|logs}/{docId}`

Regras:
- `storeId` deve ser válido antes de qualquer leitura/escrita.
- `storeId = '__all__'` (STORE_ALL_KEY) **não** pode ser usado em escrita e nem em leitura direta por loja.
- `null`/vazio **não** pode acionar fallback silencioso para coleções globais.

## 3) Helpers oficiais
Para evitar caminhos montados manualmente, usar os helpers:

- Frontend (CRM): `crm/src/utils/storeFirestoreRefs.js`
- Cardápios públicos: `crm/public/storeFirestoreRefs.js`
- Backend (Functions): helpers em `functions/index.js` (`assertValidStoreId`, `getStoreRef`, `getStoreCollection`)

## 4) Migração legada
Dados legados continuam sendo lidos de forma explícita apenas quando necessário:
- `lojas/{storeId}/configuracoes/frete`
- `lojas/{storeId}/info/dados`

Qualquer fallback legado deve registrar aviso de observabilidade (`console.warn`/`logger.warn`) e nunca cair em configuração global sem decisão explícita.
