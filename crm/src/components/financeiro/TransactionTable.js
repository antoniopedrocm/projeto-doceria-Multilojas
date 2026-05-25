import React from 'react';
import { Banknote, Edit, FileClock, Repeat, Trash2 } from 'lucide-react';
import { expenseNeedsInvoice, formatCurrency, getExpenseRecurrence, toDate } from './financialUtils.js';

const statusClass = {
  Pendente: 'bg-amber-50 text-amber-700',
  Pago: 'bg-emerald-50 text-emerald-700',
  Recebido: 'bg-emerald-50 text-emerald-700',
  Atrasado: 'bg-red-50 text-red-700'
};

const recurrenceLabel = {
  fixa: 'Fixa mensal',
  variavel: 'Variável mensal'
};

const formatDate = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString('pt-BR') : '-';
};

const TransactionTable = ({ type, items, onEdit, onDelete, onSettle }) => {
  const isExpense = type === 'pagar';

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">{isExpense ? 'Vencimento' : 'Recebimento'}</th>
              <th className="px-4 py-3">{isExpense ? 'Categoria' : 'Fonte'}</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={6}>
                  Nenhum lançamento neste período.
                </td>
              </tr>
            )}
            {items.map((item) => {
              const awaitingInvoice = isExpense && expenseNeedsInvoice(item);
              const recurrence = isExpense ? getExpenseRecurrence(item) : null;
              return (
                <tr key={`${item.lojaId || ''}-${item.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.descricao || '-'}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {awaitingInvoice && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          <FileClock className="h-3 w-3" /> Aguardando fatura
                        </span>
                      )}
                      {recurrenceLabel[recurrence] && (
                        <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          <Repeat className="h-3 w-3" /> {recurrenceLabel[recurrence]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">{formatCurrency(item.valor)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {formatDate(isExpense ? item.dataVencimento : item.dataRecebimento)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.categoria || item.metodo || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass[item.status] || 'bg-gray-100 text-gray-700'}`}>
                      {item.status || 'Pendente'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {item.status !== (isExpense ? 'Pago' : 'Recebido') && !awaitingInvoice && (
                      <button
                        type="button"
                        title={isExpense ? 'Marcar como pago' : 'Marcar como recebido'}
                        onClick={() => onSettle(item)}
                        className="mr-1 rounded p-2 text-emerald-600 hover:bg-emerald-50"
                      >
                        <Banknote className="h-4 w-4" />
                      </button>
                    )}
                    <button type="button" title="Editar" onClick={() => onEdit(item)} className="mr-1 rounded p-2 text-blue-600 hover:bg-blue-50">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button type="button" title="Excluir" onClick={() => onDelete(item)} className="rounded p-2 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
