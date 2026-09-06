import { getExplicitTransferStatuses } from './transferStatusVisibility';
import { canViewEntreLojasTransfer, filterEntreLojasTransfers, summarizeEntreLojasTransfers } from './entreLojasPermissions';

const statuses = ['rascunho', 'aguardando_conferencia', 'conferencia_sem_divergencia', 'conferencia_com_divergencia', 'pagamento_informado', 'pagamento_confirmado', 'pagamento_contestado', 'cancelado', 'cancelada'];
const user = { role: 'gerente', lojaIds: ['a'], permissions: { 'entre-lojas': true } };

test.each(statuses)('allowlist explicita para %s', (status) => {
  const transfer = { lojaOrigemId: 'a', lojaDestinoId: 'b', status };
  const allowedStatuses = getExplicitTransferStatuses({ 'entre-lojas': { statuses: [status] } }, statuses);
  expect(allowedStatuses).toEqual([status]);
  expect(canViewEntreLojasTransfer({ user, transfer, allowedStatuses })).toBe(true);
  expect(canViewEntreLojasTransfer({ user, transfer, allowedStatuses: statuses.filter(s => s !== status) })).toBe(false);
  expect(canViewEntreLojasTransfer({ user: { ...user, lojaIds: ['c'] }, transfer, allowedStatuses })).toBe(false);
  expect(canViewEntreLojasTransfer({ user: { role: 'dono' }, transfer, allowedStatuses: [] })).toBe(true);
});

test.each([undefined, {}, { 'entre-lojas': {} }, { 'entre-lojas': { statuses: [] } }, { 'entre-lojas': { statuses: 'pagamento_confirmado' } }])('configuracao incompleta nega acesso %#', details => {
  expect(getExplicitTransferStatuses(details, statuses)).toEqual([]);
});

test('legado preserva cancelado e cancelada separadamente', () => {
  expect(getExplicitTransferStatuses({ entreLojas: { status: ['cancelada'] } }, statuses)).toEqual(['cancelada']);
});

test('concessao, revogacao e transicao atualizam filtros e totais', () => {
  const rows = [{ id: '1', lojaOrigemId: 'a', lojaDestinoId: 'b', status: 'aguardando_conferencia', totalRepasse: 10, totalRevenda: 20 }, { id: '2', lojaOrigemId: 'a', lojaDestinoId: 'b', status: 'pagamento_confirmado', totalRepasse: 90, totalRevenda: 180 }];
  const visible = allowedStatuses => filterEntreLojasTransfers({ transfers: rows, user, allowedStatuses });
  expect(summarizeEntreLojasTransfers(visible(['aguardando_conferencia']))).toMatchObject({ total: 1, totalRepasse: 10, totalRevenda: 20 });
  expect(visible(statuses)).toHaveLength(2);
  expect(visible([])).toEqual([]);
  rows[0].status = 'pagamento_confirmado';
  expect(visible(['aguardando_conferencia'])).toEqual([]);
  expect(visible(['pagamento_confirmado'])).toHaveLength(2);
  expect(canViewEntreLojasTransfer({ user: { ...user, permissions: { 'entre-lojas': false } }, transfer: rows[0], allowedStatuses: statuses })).toBe(false);
});
