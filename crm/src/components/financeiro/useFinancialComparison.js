import { useMemo } from 'react';
import {
  expenseNeedsInvoice,
  getIncomeSource,
  matchesCostCenter,
  MONTH_LABELS,
  resolveExpenseMonth,
  resolveOrderMonth,
  resolveReceivableMonth,
  shiftMonthKey
} from './financialUtils.js';

const valueOf = (item) => Number(item.valor ?? item.total ?? 0) || 0;

const aggregate = (items, labelFn) => Object.values(items.reduce((groups, item) => {
  const label = labelFn(item) || 'Sem categoria';
  if (!groups[label]) groups[label] = { label, value: 0, count: 0 };
  groups[label].value += valueOf(item);
  groups[label].count += 1;
  return groups;
}, {}));

const mergeComparison = (currentItems, previousItems) => {
  const previousByLabel = Object.fromEntries(previousItems.map((entry) => [entry.label, entry.value]));
  return currentItems.map((entry) => ({ ...entry, previousValue: previousByLabel[entry.label] || 0 }));
};

export const useFinancialComparison = ({ data, selectedMonth, selectedCenter }) => useMemo(() => {
  const previousMonth = shiftMonthKey(selectedMonth, -1);
  const selectedYear = Number(selectedMonth.split('-')[0]);

  const expenses = (data.contas_a_pagar || []).filter((item) => matchesCostCenter(item, selectedCenter));
  const receivables = (data.contas_a_receber || []).filter((item) => matchesCostCenter(item, selectedCenter));
  const orders = (data.pedidos || []).filter((item) => matchesCostCenter(item, selectedCenter));

  const currentExpenses = expenses.filter((item) => resolveExpenseMonth(item) === selectedMonth);
  const priorExpenses = expenses.filter((item) => resolveExpenseMonth(item) === previousMonth);
  const paidExpenses = currentExpenses.filter((item) => item.status === 'Pago');
  const pendingExpenses = currentExpenses.filter((item) => item.status !== 'Pago');

  const currentReceivables = receivables.filter((item) => resolveReceivableMonth(item) === selectedMonth);
  const paidReceivables = currentReceivables.filter((item) => item.status === 'Recebido');
  const priorPaidReceivables = receivables.filter(
    (item) => resolveReceivableMonth(item) === previousMonth && item.status === 'Recebido'
  );
  const completedOrders = orders.filter(
    (item) => resolveOrderMonth(item) === selectedMonth && item.status === 'Finalizado'
  );
  const priorCompletedOrders = orders.filter(
    (item) => resolveOrderMonth(item) === previousMonth && item.status === 'Finalizado'
  );

  const actualIncome = [...completedOrders, ...paidReceivables].reduce((sum, item) => sum + valueOf(item), 0);
  const priorActualIncome = [...priorCompletedOrders, ...priorPaidReceivables].reduce((sum, item) => sum + valueOf(item), 0);
  const actualExpense = paidExpenses.reduce((sum, item) => sum + valueOf(item), 0);
  const priorActualExpense = priorExpenses
    .filter((item) => item.status === 'Pago')
    .reduce((sum, item) => sum + valueOf(item), 0);
  const expectedExpense = currentExpenses.reduce((sum, item) => sum + valueOf(item), 0);
  const receivableAmount = currentReceivables
    .filter((item) => item.status !== 'Recebido')
    .reduce((sum, item) => sum + valueOf(item), 0);

  const expenseRanking = mergeComparison(
    aggregate(currentExpenses, (item) => item.categoria || 'Sem categoria')
      .sort((first, second) => second.value - first.value),
    aggregate(priorExpenses, (item) => item.categoria || 'Sem categoria')
  );

  const currentIncomeEntries = [
    ...completedOrders.map((item) => ({ ...item, source: getIncomeSource(item, 'pedido') })),
    ...paidReceivables.map((item) => ({ ...item, source: getIncomeSource(item, 'receber') }))
  ];
  const previousIncomeEntries = [
    ...priorCompletedOrders.map((item) => ({ ...item, source: getIncomeSource(item, 'pedido') })),
    ...priorPaidReceivables.map((item) => ({ ...item, source: getIncomeSource(item, 'receber') }))
  ];
  const incomeSources = mergeComparison(
    aggregate(currentIncomeEntries, (item) => item.source).sort((first, second) => second.value - first.value),
    aggregate(previousIncomeEntries, (item) => item.source)
  );

  const yearlySeries = MONTH_LABELS.map((month, index) => {
    const monthKey = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
    const revenue = orders
      .filter((item) => item.status === 'Finalizado' && resolveOrderMonth(item) === monthKey)
      .concat(receivables.filter((item) => item.status === 'Recebido' && resolveReceivableMonth(item) === monthKey))
      .reduce((sum, item) => sum + valueOf(item), 0);
    const expense = expenses
      .filter((item) => item.status === 'Pago' && resolveExpenseMonth(item) === monthKey)
      .reduce((sum, item) => sum + valueOf(item), 0);
    return { month, receita: revenue, despesa: expense };
  });

  return {
    summary: {
      actualIncome,
      priorActualIncome,
      actualExpense,
      priorActualExpense,
      expectedExpense,
      payableAmount: pendingExpenses.reduce((sum, item) => sum + valueOf(item), 0),
      receivableAmount,
      result: actualIncome - actualExpense,
      projectedResult: actualIncome + receivableAmount - expectedExpense,
      awaitingInvoices: currentExpenses.filter(expenseNeedsInvoice).length
    },
    currentExpenses,
    currentReceivables,
    paidExpenses,
    completedOrders,
    expenseRanking,
    incomeSources,
    yearlySeries
  };
}, [data, selectedMonth, selectedCenter]);
