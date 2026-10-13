/* eslint-disable no-new-func */
import { findOrderDraft, validateFiscalOrder } from './fiscalOrderActions';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const source = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');
const ast = parser.parse(source, {sourceType: 'module', plugins: ['jsx']});
const functionsByName = new Map();
const visit = (node) => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'VariableDeclarator' && node.init?.type === 'ArrowFunctionExpression') {
    functionsByName.set(node.id.name, source.slice(node.init.start, node.init.end));
  }
  Object.values(node).forEach((value) => Array.isArray(value) ? value.forEach(visit) : visit(value));
};
visit(ast);
const setup = (name, overrides = {}) => {
  const code = functionsByName.get(name);
  const calls = [];
  const context = {isReadOnly: false, busyOrderId: '', effectiveStoreId: 'loja-a', functions: {}, modelOverride: '55', operationCfop: '5101',
    findOrderDraft, validateFiscalOrder, invoices: [], getPreInvoiceLockedReason: () => '',
    invoicesByOrderId: new Map(), callablePayload: (payload) => ({lojaId: 'loja-a', ...payload}),
    httpsCallable: (_, callable) => async (payload) => {
      calls.push({callable, payload});
      return {data: callable === 'fiscalSaveDraft' ? {draftId: 'draft-1'}
        : callable === 'fiscalIssueDraft' ? {status: 'authorized', invoiceId: 'draft-1', danfePdfReady: true}
          : {ok: false, errors: ['CEP inválido']}};
    }, downloadInvoiceArtifact: jest.fn(), ...overrides};
  for (const setter of [...code.matchAll(/\b(set[A-Z]\w*)\(/g)].map((m) => m[1])) context[setter] ||= jest.fn();
  if (name === 'handleCheckOrderRequirements') {
    context.requestOrderValidation = async (order, save) => validateFiscalOrder({order,
      draft: findOrderDraft(context.invoices, order.id), model: context.modelOverride,
      operationCfop: context.operationCfop, save,
      call: async (callable, payload) => (await context.httpsCallable(context.functions, callable)(context.callablePayload(payload))).data});
  }
  const handler = new Function(...Object.keys(context), `return (${code});`)(...Object.values(context));
  return {handler, calls, context};
};

test('Salvar e Validar salva antes da checagem e conserva rascunho com pendências', async () => {
  const {handler, calls} = setup('requestOrderValidation');
  const result = await handler({id: 'pedido-1'});
  expect(calls.map((c) => c.callable)).toEqual(['fiscalSaveDraft', 'fiscalCheckDraft']);
  expect(result).toMatchObject({draftId: 'draft-1', ok: false});
});

test.each([null, {id: 'draft-65', status: 'draft', model: 65, operationCfop: '5102'}])('setas checam sem criar ou emitir e respeitam o rascunho existente: %p', async (invoice) => {
  const {handler, calls} = setup('handleCheckOrderRequirements', {modelOverride: invoice ? String(invoice.model) : '55', invoices: invoice ? [{...invoice, orderId: 'pedido-1'}] : []});
  await handler({id: 'pedido-1'});
  expect(calls).toHaveLength(1);
  expect(calls[0].callable).toBe(invoice ? 'fiscalCheckDraft' : 'fiscalValidateOrder');
  expect(calls[0].payload).toMatchObject(invoice ? {draftId: 'draft-65'} : {orderId: 'pedido-1', modelOverride: 55});
});

test('cancelar confirmação não transmite documento', async () => {
  const {handler, calls} = setup('handleConfirmIssue', {orderToIssue: null});
  await handler({preventDefault: jest.fn()});
  expect(calls).toEqual([]);
});

test.each(['55', '65'])('confirmação transmite somente o modelo escolhido %s e baixa DANFE autorizado', async (modelOverride) => {
  const {handler, calls, context} = setup('handleConfirmIssue', {orderToIssue: {id: 'pedido-1'}, orderDraftId: 'draft-1', modelOverride});
  await handler({preventDefault: jest.fn()});
  expect(calls).toEqual([{callable: 'fiscalIssueDraft', payload: {lojaId: 'loja-a', draftId: 'draft-1', model: Number(modelOverride)}}]);
  expect(context.downloadInvoiceArtifact).toHaveBeenCalledWith('draft-1', 'danfePdf');
});

test('rascunho manual reabre com snapshot e sem emitir', async () => {
  const {handler, calls, context} = setup('handleEditManualDraft');
  await handler({id: 'clone-1', status: 'draft', model: 65, manualInvoice: {customer: {name: 'Nome histórico'}, items: [{description: 'Item histórico'}]}});
  expect(calls).toEqual([]);
  expect(context.setManualInvoiceForm).toHaveBeenCalledWith(expect.objectContaining({modelOverride: '65', customer: {name: 'Nome histórico'}}));
});
