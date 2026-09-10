import { getAppliedOrderStock, groupOrderStockItems, planOrderStock } from './orderStock';
import fs from 'fs';
import path from 'path';

const item = (id, quantity) => ({ produtoId: id, quantity });
const sale = (quantity, status = 'Finalizado') => ({ status, itens: [item('morango', quantity)] });
const apply = (stock, previous, next) => {
  const plan = planOrderStock(previous, next);
  Object.entries(plan.delta).forEach(([id, quantity]) => { stock[id] -= quantity; });
  return { ...next, estoqueAplicado: plan.applied };
};

test.each([[2, 2, 0], [10, 3, 7], [0, 2, -2], [-2, 1, -3]])(
  'venda física: %s - %s = %s, sem bloqueio', (initial, quantity, expected) => {
    const stock = { morango: initial };
    const order = apply(stock, null, sale(quantity));
    expect(stock.morango).toBe(expected);
    apply(stock, order, sale(quantity));
    expect(stock.morango).toBe(expected);
  }
);

test('checkout já descontado não baixa na finalização nem nas atualizações seguintes', () => {
  const stock = { morango: 0 };
  let order = { ...sale(2, 'Pendente'), estoqueAplicado: { morango: 2 } };
  for (const status of ['Em Produção', 'Pronto para Entrega', 'Finalizado', 'Finalizado']) {
    order = apply(stock, order, sale(2, status));
    expect(stock.morango).toBe(0);
  }
});

test.each(['Cardapio Online', 'Plataforma'])('compatibilidade com checkout antigo: %s', origem => {
  expect(planOrderStock({ ...sale(2, 'Pendente'), origem }, sale(2)).delta).toEqual({});
});

test('venda rápida e pedido finalizado antigos não baixam novamente', () => {
  expect(getAppliedOrderStock({ ...sale(2), estoqueMovimentacaoId: 'kardex-1' })).toEqual({ morango: 2 });
  expect(planOrderStock(sale(2), sale(2)).delta).toEqual({});
});

test('múltiplos produtos, linhas repetidas e quantidade 2 não duplicam', () => {
  const stock = { morango: 2, bolo: 10 };
  const order = apply(stock, null, { status: 'Finalizado', itens: [item('morango', 2), item('bolo', 1), item('bolo', 2)] });
  expect(stock).toEqual({ morango: 0, bolo: 7 });
  apply(stock, order, order);
  expect(stock).toEqual({ morango: 0, bolo: 7 });
  expect(groupOrderStockItems([{ id: 'morango', quantidade: 2 }])).toEqual({ morango: 2 });
});

test('cancelamento repõe uma vez; reabertura e edição preservam diferenças', () => {
  const stock = { morango: 2, bolo: 10 };
  let order = apply(stock, null, sale(2));
  order = apply(stock, order, sale(2, 'Cancelado'));
  expect(stock.morango).toBe(2);
  order = apply(stock, order, order);
  expect(stock.morango).toBe(2);
  order = apply(stock, order, sale(2));
  expect(stock.morango).toBe(0);
  order = apply(stock, order, { status: 'Finalizado', itens: [item('bolo', 3)] });
  expect(stock).toEqual({ morango: 2, bolo: 7 });
  apply(stock, order, { ...order, status: 'Pendente' });
  expect(stock).toEqual({ morango: 2, bolo: 10 });
});

test.each(['matriz', 'garavelo', 'festa'])('cardápio %s mantém indisponibilidade em zero e negativo', store => {
  const source = fs.readFileSync(path.join(__dirname, '../../public', `cardapio-${store}.html`), 'utf8');
  expect(source).toContain('product.estoque !== null && product.estoque <= 0');
});

test('transação de criação repetida lê pedido persistido e retorna sem segunda gravação', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');
  const start = source.indexOf('            const orderSnap = await transaction.get(orderRef);', source.indexOf('const persistOrderWithTransaction'));
  const end = source.indexOf('            const productSnapMap', start);
  const execute = new Function('transaction', 'orderRef', 'editingOrder', 'orderData', 'getOrderItemProductId', 'getAppliedOrderStock',
    `return (async () => { ${source.slice(start, end)}; return productIds; })();`);
  const transaction = { get: jest.fn(async () => ({ exists: () => true, data: () => sale(2) })) };
  expect(await execute(transaction, { id: 'pedido-1' }, null, sale(2), i => i.produtoId, getAppliedOrderStock)).toBeUndefined();
  expect(transaction.get).toHaveBeenCalledWith({ id: 'pedido-1' });
  const ids = await execute(transaction, { id: 'pedido-1' }, {}, { itens: [item('bolo', 3)] }, i => i.produtoId, getAppliedOrderStock);
  expect(ids).toEqual(['bolo', 'morango']);
});

test.each([
  [[item('morango', 2)], 2, 0],
  [[item('morango', 1), item('morango', 1)], 2, 0],
  [[item('morango', 3)], 10, 7]
])('checkout persiste quantidade exata inclusive linhas repetidas', async (itens, initial, expected) => {
  const source = fs.readFileSync(path.join(__dirname, '../../../functions/index.js'), 'utf8');
  const start = source.indexOf('      const stockUpdates = new Map();');
  const end = source.indexOf('      const subtotalFinal', start);
  const execute = new Function('itens', 'transaction', 'db', 'lojaId', 'createHttpError',
    `return (async () => { ${source.slice(start, end)}; return stockUpdates; })();`);
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: id => ({ id }) }) }) }) };
  const transaction = { get: async () => ({ exists: true, data: () => ({ estoque: initial, preco: 0, status: 'Ativo' }) }) };
  const updates = await execute(itens, transaction, db, 'loja-1', (_code, message) => new Error(message));
  expect(updates.size).toBe(1);
  expect(updates.get('morango').newStock).toBe(expected);
  expect(updates.get('morango').quantity).toBe(initial - expected);
});
