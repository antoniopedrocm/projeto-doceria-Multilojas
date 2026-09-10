const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { transformSync } = require('@babel/core');

// Executa o JSX real do modal e o handler real do botão, sem carregar Firebase
// nem abrir/enviar mensagens para clientes durante os testes.
const source = fs.readFileSync(path.join(__dirname, '../src/App.js'), 'utf8');
const modalStart = source.indexOf('title="Detalhes do Pedido"');
const start = source.indexOf('(() => {', modalStart);
const end = source.indexOf('})()}', start) + '})()'.length;
assert.ok(modalStart >= 0 && start > modalStart && end > start);
const { code } = transformSync(`const renderDetails = ${source.slice(start, end)};`, {
  configFile: false,
  babelrc: false,
  plugins: [require.resolve('@babel/plugin-transform-react-jsx')],
});
const render = new Function('React', 'viewingOrder', 'data', 'window',
  'Button', 'Printer', 'MessageCircle', 'Truck', 'getStatusClass',
  'canSendToDeliverer', `${code}\nreturn renderDetails;`);

const children = node => React.Children.toArray(node?.props?.children);
const textOf = node => typeof node === 'string' || typeof node === 'number'
  ? String(node) : children(node).map(textOf).join('');
const flatten = node => [node, ...children(node).flatMap(flatten)];

const cases = [
  ['sem desconto + frete', { total: 66, valorFrete: 4.52 }, '70.52'],
  ['cupom + frete (exemplo)', { total: 59.4, valorFrete: 4.52, cupom: { codigo: 'BRIG10', valorDesconto: 6.6 } }, '63.92'],
  ['frete zero', { total: 59.4, valorFrete: 0, cupom: { codigo: 'BRIG10', valorDesconto: 6.6 } }, '59.40'],
  ['desconto manual sem cupom', { total: 59.4, valorFrete: 4.52, desconto: 6.6 }, '63.92'],
  ['campo legado frete', { total: 66, frete: 4.52 }, '70.52'],
  ['frete ausente', { total: 66 }, '66.00'],
  ['frete zero prevalece sobre legado', { total: 66, valorFrete: 0, frete: 4.52 }, '66.00'],
];

for (const [label, values, expected] of cases) {
  test(`total na tela e no resumo: ${label}`, () => {
    const order = {
      clienteNome: 'Cliente Teste', telefone: '62999999999',
      status: 'Finalizado', formaPagamento: 'Pix', origem: 'Plataforma',
      itens: [{ nome: 'Doce', preco: 22, quantity: 3 }], ...values,
    };
    const before = JSON.stringify(order);
    const opened = [];
    const tree = render(React, order, { clientes: [] },
      { open: (...args) => opened.push(args) }, 'button', 'i', 'i', 'i',
      () => '', () => false);
    const nodes = flatten(tree);
    const total = nodes.find(node => node?.type === 'p' && textOf(node).startsWith('Total:'));
    assert.equal(textOf(total), `Total: R$ ${expected}`);
    const button = nodes.find(node => node?.type === 'button' && textOf(node).includes('Enviar Resumo Cliente'));
    assert.equal(button.props.disabled, false);
    button.props.onClick();
    assert.equal(opened.length, 1);
    const url = new URL(opened[0][0]);
    assert.equal(url.pathname, '/5562999999999');
    const message = url.searchParams.get('text');
    assert.ok(message.includes(`*Total:* R$ ${expected}\n`));
    assert.ok(message.includes('*Pagamento:* Pix\n'));
    assert.ok(message.includes('3x Doce\n'));
    if (values.cupom || values.desconto) {
      assert.ok(message.includes('*Subtotal:* R$ 66.00\n'));
      assert.ok(message.includes('- R$ 6.60\n'));
    }
    assert.equal(JSON.stringify(order), before, 'pedido deve permanecer intacto');
  });
}
