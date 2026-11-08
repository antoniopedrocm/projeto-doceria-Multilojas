import {useFinancialComparison} from './useFinancialComparison';
import {ALL_COST_CENTERS} from './financialUtils';
jest.mock('react',()=>({useMemo:callback=>callback()}));

test('production financial panel recognizes paid values and preserves historical orders without treating pending orders as receipts',()=>{
  const date='2026-11-08T12:00:00-03:00';
  const order=(id,extra)=>({id,status:'Finalizado',createdAt:date,total:999,...extra});
  const data={pedidos:[
    order('historical',{total:20}),
    order('paid',{paymentMode:'ONLINE_NOW',payment_status:'PAID',total:70,adminPaymentAdjustment:{paidCents:5000}}),
    order('agreed',{paymentMode:'AGREED_LATER',paymentStatus:'PENDING'}),
    order('online-pending',{paymentMode:'ONLINE_NOW',payment_status:'PENDING'}),
    order('review',{paymentMode:'ONLINE_NOW',payment_status:'PAID',requiresReview:true}),
    order('refunded',{paymentMode:'ONLINE_NOW',payment_status:'REFUNDED'}),
  ],contas_a_pagar:[],contas_a_receber:[]};
  const before=JSON.stringify(data);
  const result=useFinancialComparison({data,selectedMonth:'2026-11',selectedCenter:ALL_COST_CENTERS});
  expect(result.summary.actualIncome).toBe(70);
  expect(result.completedOrders.map(o=>o.id)).toEqual(['historical','paid']);
  expect(result.yearlySeries[10].receita).toBe(70);
  expect(JSON.stringify(data)).toBe(before);
});
