import React from 'react';
import TrendIndicator from './TrendIndicator.js';
import { formatCurrency } from './financialUtils.js';

const RankingPanel = ({ title, rows, favorableIncrease, emptyText }) => {
  const highest = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.slice(0, 6).map((row, index) => (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-gray-700">{index + 1}. {row.label}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold text-gray-900">{formatCurrency(row.value)}</span>
                  <TrendIndicator
                    current={row.value}
                    previous={row.previousValue}
                    favorableIncrease={favorableIncrease}
                  />
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full ${favorableIncrease ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max((row.value / highest) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const FinancialRankings = ({ expenseRanking, incomeSources }) => (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
    <RankingPanel
      title="Ranking de saídas por categoria"
      rows={expenseRanking}
      favorableIncrease={false}
      emptyText="Nenhuma despesa registrada no periodo."
    />
    <RankingPanel
      title="Fontes de entrada"
      rows={incomeSources}
      favorableIncrease
      emptyText="Nenhuma entrada realizada no periodo."
    />
  </div>
);

export default FinancialRankings;
