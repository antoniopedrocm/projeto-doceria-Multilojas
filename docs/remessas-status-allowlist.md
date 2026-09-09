# Allowlist de status das remessas

## Escopo

Correção promovida seletivamente dos commits de desenvolvimento `70f3fca0` e
`9eb252f5`, adaptada à estrutura atual do repositório de produção. Nenhum arquivo
do ambiente de desenvolvimento foi copiado integralmente.

## Regra de autorização

Para usuários sujeitos às permissões granulares, a leitura de uma remessa exige:

- acesso ao módulo `entre-lojas`;
- vínculo com a loja de origem ou, fora de `rascunho`, com a loja de destino;
- presença explícita do status em
  `users/{uid}.permissionDetails['entre-lojas'].statuses`.

Lista ausente, vazia, inválida ou com identificadores desconhecidos não concede
acesso. O perfil Dono mantém acesso administrativo integral.

Os identificadores canônicos preservados são:

- `rascunho`;
- `aguardando_conferencia`;
- `conferencia_sem_divergencia`;
- `conferencia_com_divergencia`;
- `pagamento_informado`;
- `pagamento_confirmado`;
- `pagamento_contestado`;
- `cancelado`;
- `cancelada`.

`cancelado` e `cancelada` continuam distintos e não houve migração de dados.

## Aplicação no frontend

A mesma allowlist é aplicada às consultas, abas Todas/Enviadas/Recebidas/Histórico,
filtros, busca, dropdown, cards, contadores e totais. Acesso direto, detalhes e
edição voltam a verificar a autorização. Mudanças de status ou permissão em tempo
real removem dados que deixaram de ser autorizados e fecham modais abertos.

## Firestore Rules

Antes da alteração, as Rules ativas do projeto `ana-guimaraes` eram idênticas à
versão local, com SHA-256
`114d561818ac3cf86d4782a85ae2b01d02e55aba7da0f3826c1baa1c0008d2a2`.
A regra de leitura foi ajustada para exigir status explícito e evitar reavaliações
redundantes, preservando as demais proteções de produção.

## Validação pré-deploy

- Frontend: 14 suítes e 160 testes aprovados.
- Functions: 64 testes aprovados.
- Lint do frontend: sem erros; 63 avisos preexistentes.
- Lint das Functions: aprovado.
- Build de produção: aprovado, com avisos preexistentes de source map.
- Firestore Emulator: bloqueado antes de executar testes por falha de loopback do
  host Windows (`Unable to establish loopback connection`), inclusive com JDK 21.

O deploy previsto é restrito a `hosting:prod` e `firestore:rules` no projeto
`ana-guimaraes`. Nenhuma Cloud Function faz parte desta correção.
