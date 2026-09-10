export const groupOrderStockItems = (items = []) => {
  const quantities = {};
  items.forEach((item) => {
    const id = item?.produtoId || item?.productId || item?.id;
    const quantity = Number(item?.quantity ?? item?.quantidade ?? 0);
    if (id && Number.isFinite(quantity) && quantity > 0) {
      quantities[id] = (quantities[id] || 0) + quantity;
    }
  });
  return quantities;
};

export const getAppliedOrderStock = (order) => {
  if (!order) return {};
  if (order.estoqueAplicado) return order.estoqueAplicado;
  // Compatibility with orders written before the transactional stock ledger.
  const checkoutOrder = ['Cardapio Online', 'Plataforma'].includes(order.origem);
  return order.status === 'Finalizado' || order.estoqueMovimentacaoId || checkoutOrder
    ? groupOrderStockItems(order.itens) : {};
};

export const planOrderStock = (previousOrder, nextOrder) => {
  const previous = getAppliedOrderStock(previousOrder);
  const keepReserved = previousOrder && previousOrder.status !== 'Finalizado'
    && nextOrder.status !== 'Cancelado' && Object.keys(previous).length > 0;
  const applied = nextOrder.status === 'Finalizado' || keepReserved
    ? groupOrderStockItems(nextOrder.itens) : {};
  const delta = {};
  new Set([...Object.keys(previous), ...Object.keys(applied)]).forEach((id) => {
    const quantity = (applied[id] || 0) - (previous[id] || 0);
    if (quantity) delta[id] = quantity;
  });
  return { applied, delta };
};
