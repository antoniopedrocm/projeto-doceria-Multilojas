import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

const percentChange = (current, previous) => {
  if (!previous && !current) return 0;
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const TrendIndicator = ({ current = 0, previous = 0, favorableIncrease = true }) => {
  const change = percentChange(Number(current || 0), Number(previous || 0));

  if (change === null) {
    return <span className="text-xs font-medium text-gray-500">Novo no mês</span>;
  }

  if (Math.abs(change) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
        <Minus className="h-3.5 w-3.5" /> 0%
      </span>
    );
  }

  const increased = change > 0;
  const favorable = increased === favorableIncrease;
  const Icon = increased ? ArrowUp : ArrowDown;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${favorable ? 'text-emerald-600' : 'text-red-600'}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(1)}%
    </span>
  );
};

export default TrendIndicator;
