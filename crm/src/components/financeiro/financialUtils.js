export const ALL_COST_CENTERS = '__all__';
export const EVENTS_COST_CENTER = 'festas_eventos';

export const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const EXPENSE_RECURRENCE_OPTIONS = [
  { value: 'avulsa', label: 'Avulsa' },
  { value: 'fixa', label: 'Fixa mensal' },
  { value: 'variavel', label: 'Variável mensal' }
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Aluguel',
  'Salários',
  'Internet',
  'Energia elétrica',
  'Água',
  'Fornecedores',
  'Marketing',
  'Impostos',
  'Outros'
];

export const formatCurrency = (value) => (
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
);

export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const monthKeyFromDate = (value) => {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const currentMonthKey = () => monthKeyFromDate(new Date());

export const shiftMonthKey = (monthKey, delta) => {
  const [year, month] = String(monthKey || currentMonthKey()).split('-').map(Number);
  const shifted = new Date(year, (month || 1) - 1 + delta, 1);
  return monthKeyFromDate(shifted);
};

export const resolveExpenseMonth = (item) => (
  item.competencia || monthKeyFromDate(item.dataVencimento || item.createdAt)
);

export const resolveReceivableMonth = (item) => (
  item.competencia || monthKeyFromDate(item.dataRecebimento || item.createdAt)
);

export const resolveOrderMonth = (item) => (
  monthKeyFromDate(item.createdAt || item.dataPedido || item.data)
);

export const isEventsRecord = (item = {}) => {
  const text = `${item.centroCusto || ''} ${item.categoria || ''} ${item.origem || ''}`.toLowerCase();
  return item.centroCusto === EVENTS_COST_CENTER || text.includes('festa') || text.includes('evento');
};

export const matchesCostCenter = (item, centerId) => {
  if (!centerId || centerId === ALL_COST_CENTERS) return true;
  if (centerId === EVENTS_COST_CENTER) return isEventsRecord(item);
  if (isEventsRecord(item)) return false;
  return (item.centroCusto || item.lojaId) === centerId;
};

export const getExpenseRecurrence = (item = {}) => {
  const configured = item.tipoRecorrencia || item.recorrenciaTipo;
  if (['fixa', 'variavel', 'avulsa'].includes(configured)) return configured;
  if (item.categoria === 'Despesa Fixa') return 'fixa';
  if (item.categoria === 'Despesa Variavel' || item.categoria === 'Despesa Variável') return 'variavel';
  return 'avulsa';
};

export const expenseNeedsInvoice = (item = {}) => (
  getExpenseRecurrence(item) === 'variavel'
  && (item.aguardandoFatura === true || Number(item.valor || 0) === 0)
);

export const normalizeIncomeSource = (source) => (
  source === 'Outras receitas' ? 'Outras entradas' : source
);

export const getIncomeSource = (item, kind) => {
  if (kind === 'pedido') {
    if (isEventsRecord(item)) return 'Festas/Eventos';
    if (['Cardapio Online', 'Plataforma'].includes(item.origem)) return 'Cardapio online';
    return 'Venda presencial';
  }
  return normalizeIncomeSource(item.categoria || item.descricao || 'Outras entradas');
};

export const toDateInput = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
};

export const periodDisplay = (monthKey) => {
  const [year, month] = String(monthKey || currentMonthKey()).split('-').map(Number);
  return `${MONTH_LABELS[(month || 1) - 1]} ${year}`;
};
