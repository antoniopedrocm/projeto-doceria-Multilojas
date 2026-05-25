import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatCurrency } from './financialUtils.js';

const AnnualCashFlowChart = ({ data, year }) => (
  <section className="rounded-lg border border-gray-200 bg-white p-5">
    <div className="mb-5">
      <h2 className="text-base font-semibold text-gray-900">Receita x despesa em {year}</h2>
      <p className="text-sm text-gray-500">Valores realizados por mês</p>
    </div>
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="24%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend iconType="circle" />
          <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export default AnnualCashFlowChart;
