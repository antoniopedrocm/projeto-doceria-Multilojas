import React, { useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarPlus,
  DollarSign,
  FileClock,
  Plus,
  X
} from 'lucide-react';
import { functions } from '../../firebaseConfig.js';
import AnnualCashFlowChart from './AnnualCashFlowChart.js';
import FinancialKpiCard from './FinancialKpiCard.js';
import FinancialRankings from './FinancialRankings.js';
import TransactionTable from './TransactionTable.js';
import { useFinancialComparison } from './useFinancialComparison.js';
import { useFinancialData } from './useFinancialData.js';
import {
  ALL_COST_CENTERS,
  currentMonthKey,
  DEFAULT_EXPENSE_CATEGORIES,
  EVENTS_COST_CENTER,
  EXPENSE_RECURRENCE_OPTIONS,
  expenseNeedsInvoice,
  formatCurrency,
  normalizeIncomeSource,
  periodDisplay,
  resolveExpenseMonth,
  resolveReceivableMonth,
  shiftMonthKey,
  toDateInput
} from './financialUtils.js';

const STORE_ALL_KEY = '__all__';
const tabs = [
  { id: 'dashboard', label: 'Raio-X' },
  { id: 'pagar', label: 'Despesas' },
  { id: 'receber', label: 'Entradas' },
  { id: 'fluxo', label: 'Fluxo' }
];

const usePersistedValue = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      return window.localStorage.getItem(key) || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Browser storage is optional; state remains available for this session.
    }
  }, [key, value]);

  return [value, setValue];
};

const Field = ({ label, children }) => (
  <label className="block space-y-1.5 text-sm font-medium text-gray-700">
    <span>{label}</span>
    {children}
  </label>
);

const inputClassName = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100';

const TextInput = (props) => <input {...props} className={`${inputClassName} ${props.className || ''}`} />;
const SelectInput = ({ children, ...props }) => (
  <select {...props} className={`${inputClassName} ${props.className || ''}`}>{children}</select>
);

const PanelModal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4 py-8">
    <section className="max-h-full w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button type="button" title="Fechar" onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
      </header>
      {children}
    </section>
  </div>
);

const buildDefaultDate = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const day = Math.min(new Date().getDate(), lastDayOfMonth);
  return `${monthKey}-${String(day).padStart(2, '0')}`;
};

const FinancialControlPanel = ({
  data: fallbackData,
  addItem,
  updateItem,
  deleteItem,
  setConfirmDelete,
  availableStores = [],
  storeInfoMap = {},
  selectedStoreId,
  user
}) => {
  const defaultMonth = currentMonthKey();
  const [selectedMonth, setSelectedMonth] = usePersistedValue('financeiro_month', defaultMonth);
  const [selectedCenter, setSelectedCenter] = usePersistedValue('financeiro_cost_center', ALL_COST_CENTERS);
  const [activeTab, setActiveTab] = usePersistedValue('financeiro_panel_tab', 'dashboard');
  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [rollingForward, setRollingForward] = useState(false);

  const storeIds = useMemo(() => {
    const knownStores = new Set(availableStores.filter(Boolean));
    if (selectedStoreId && selectedStoreId !== STORE_ALL_KEY) knownStores.add(selectedStoreId);
    if (user?.lojaId) knownStores.add(user.lojaId);
    (user?.lojaIds || []).forEach((storeId) => knownStores.add(storeId));
    Object.values(fallbackData || {}).forEach((items) => {
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        if (item.lojaId) knownStores.add(item.lojaId);
      });
    });
    return Array.from(knownStores);
  }, [availableStores, selectedStoreId, user, fallbackData]);

  const { data, loading, error } = useFinancialData({ storeIds, fallbackData });

  const centerOptions = useMemo(() => [
    { value: ALL_COST_CENTERS, label: 'Visão geral' },
    ...storeIds.map((storeId) => ({
      value: storeId,
      label: storeInfoMap[storeId]?.nome || storeInfoMap[storeId]?.razaoSocial || storeId
    })),
    { value: EVENTS_COST_CENTER, label: 'Festas/Eventos' }
  ], [storeIds, storeInfoMap]);

  useEffect(() => {
    if (!centerOptions.some((option) => option.value === selectedCenter)) {
      setSelectedCenter(ALL_COST_CENTERS);
    }
  }, [centerOptions, selectedCenter, setSelectedCenter]);

  const insights = useFinancialComparison({ data, selectedMonth, selectedCenter });

  const expenseCategories = useMemo(() => Array.from(new Set([
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...(data.contas_a_pagar || []).map((item) => item.categoria).filter(Boolean)
  ])), [data.contas_a_pagar]);

  const defaultWriteStoreId = () => {
    if (selectedCenter !== ALL_COST_CENTERS && selectedCenter !== EVENTS_COST_CENTER) return selectedCenter;
    if (selectedStoreId && selectedStoreId !== STORE_ALL_KEY) return selectedStoreId;
    return storeIds[0] || '';
  };

  const openNew = (type) => {
    const dateValue = buildDefaultDate(selectedMonth);
    const centroCusto = selectedCenter === ALL_COST_CENTERS
      ? (defaultWriteStoreId() || EVENTS_COST_CENTER)
      : selectedCenter;
    const base = {
      descricao: '',
      valor: '',
      status: 'Pendente',
      competencia: selectedMonth,
      centroCusto,
      lojaId: defaultWriteStoreId()
    };
    setFormData(type === 'pagar'
      ? { ...base, dataVencimento: dateValue, categoria: 'Fornecedores', tipoRecorrencia: 'avulsa' }
      : { ...base, dataRecebimento: dateValue, categoria: 'Outras entradas', metodo: 'Pix' });
    setModal({ type, item: null });
  };

  const openEdit = (type, item) => {
    setFormData({
      ...item,
      valor: String(item.valor ?? ''),
      competencia: type === 'pagar' ? resolveExpenseMonth(item) : resolveReceivableMonth(item),
      dataVencimento: toDateInput(item.dataVencimento),
      dataRecebimento: toDateInput(item.dataRecebimento),
      categoria: type === 'pagar' ? item.categoria : normalizeIncomeSource(item.categoria),
      centroCusto: item.centroCusto || item.lojaId,
      lojaId: item.lojaId || defaultWriteStoreId()
    });
    setModal({ type, item });
  };

  const closeModal = () => {
    setModal(null);
    setFormData({});
  };

  const saveTransaction = async (event) => {
    event.preventDefault();
    if (!modal) return;
    setFeedback(null);
    const isExpense = modal.type === 'pagar';
    const collectionName = isExpense ? 'contas_a_pagar' : 'contas_a_receber';
    const storeId = formData.lojaId || defaultWriteStoreId();

    if (!storeId) {
      setFeedback({ type: 'error', message: 'Selecione a unidade responsável pelo lançamento.' });
      return;
    }

    const value = Number(formData.valor || 0);
    const payload = {
      descricao: String(formData.descricao || '').trim(),
      valor: value,
      status: formData.status || 'Pendente',
      categoria: formData.categoria || '',
      competencia: formData.competencia || selectedMonth,
      centroCusto: formData.centroCusto || storeId,
      lojaId: storeId
    };

    if (isExpense) {
      payload.dataVencimento = formData.dataVencimento;
      payload.tipoRecorrencia = formData.tipoRecorrencia || 'avulsa';
      payload.recorrente = payload.tipoRecorrencia !== 'avulsa';
      payload.aguardandoFatura = payload.tipoRecorrencia === 'variavel' && value === 0;
    } else {
      payload.dataRecebimento = formData.dataRecebimento;
      payload.metodo = formData.metodo || 'Pix';
    }

    try {
      if (modal.item) {
        await updateItem(collectionName, modal.item.id, payload, modal.item.lojaId || storeId);
      } else {
        await addItem(collectionName, payload, storeId);
      }
      closeModal();
      setFeedback({ type: 'success', message: 'Lançamento salvo.' });
    } catch (saveError) {
      setFeedback({ type: 'error', message: saveError?.message || 'Não foi possível salvar o lançamento.' });
    }
  };

  const settleTransaction = async (type, item) => {
    if (type === 'pagar' && expenseNeedsInvoice(item)) {
      setFeedback({ type: 'error', message: 'Informe o valor da fatura antes de marcar esta despesa como paga.' });
      return;
    }
    const collectionName = type === 'pagar' ? 'contas_a_pagar' : 'contas_a_receber';
    const status = type === 'pagar' ? 'Pago' : 'Recebido';
    try {
      await updateItem(collectionName, item.id, {
        status,
        aguardandoFatura: type === 'pagar' ? false : item.aguardandoFatura
      }, item.lojaId);
    } catch (settleError) {
      setFeedback({ type: 'error', message: settleError?.message || 'Não foi possível atualizar o status.' });
    }
  };

  const removeTransaction = (type, item) => {
    const collectionName = type === 'pagar' ? 'contas_a_pagar' : 'contas_a_receber';
    setConfirmDelete({
      isOpen: true,
      onConfirm: () => deleteItem(collectionName, item.id, item.lojaId)
    });
  };

  const rollNextMonth = async () => {
    setRollingForward(true);
    setFeedback(null);
    const storesToPrepare = selectedCenter !== ALL_COST_CENTERS && selectedCenter !== EVENTS_COST_CENTER
      ? [selectedCenter]
      : storeIds;
    try {
      const prepareNextMonth = httpsCallable(functions, 'prepareNextFinancialMonth');
      const result = await prepareNextMonth({ sourceMonth: selectedMonth, storeIds: storesToPrepare });
      const createdCount = result.data?.createdCount || 0;
      const targetMonth = result.data?.targetMonth || shiftMonthKey(selectedMonth, 1);
      setFeedback({
        type: 'success',
        message: `${createdCount} conta(s) recorrente(s) preparada(s) para ${periodDisplay(targetMonth)}.`
      });
    } catch (rollError) {
      setFeedback({ type: 'error', message: rollError?.message || 'Não foi possível preparar o próximo mês.' });
    } finally {
      setRollingForward(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinancialKpiCard
          title="Entradas realizadas"
          value={insights.summary.actualIncome}
          previousValue={insights.summary.priorActualIncome}
          icon={ArrowUpCircle}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <FinancialKpiCard
          title="Saídas pagas"
          value={insights.summary.actualExpense}
          previousValue={insights.summary.priorActualExpense}
          favorableIncrease={false}
          icon={ArrowDownCircle}
          iconClassName="bg-red-50 text-red-600"
        />
        <FinancialKpiCard
          title="Resultado realizado"
          value={insights.summary.result}
          icon={DollarSign}
          iconClassName="bg-blue-50 text-blue-600"
          detail={`Projetado: ${formatCurrency(insights.summary.projectedResult)}`}
        />
        <FinancialKpiCard
          title="A pagar"
          value={insights.summary.payableAmount}
          icon={FileClock}
          iconClassName="bg-amber-50 text-amber-600"
          detail={`${insights.summary.awaitingInvoices} fatura(s) sem valor`}
        />
      </div>
      <AnnualCashFlowChart data={insights.yearlySeries} year={selectedMonth.split('-')[0]} />
      <FinancialRankings expenseRanking={insights.expenseRanking} incomeSources={insights.incomeSources} />
    </div>
  );

  const renderCashFlow = () => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase text-gray-500">Realizado</p>
        <p className={`mt-3 text-3xl font-bold ${insights.summary.result >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(insights.summary.result)}
        </p>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">Entradas</dt><dd className="font-semibold text-emerald-600">{formatCurrency(insights.summary.actualIncome)}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Saídas pagas</dt><dd className="font-semibold text-red-600">{formatCurrency(insights.summary.actualExpense)}</dd></div>
        </dl>
      </section>
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase text-gray-500">Previsão</p>
        <p className={`mt-3 text-3xl font-bold ${insights.summary.projectedResult >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(insights.summary.projectedResult)}
        </p>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">A receber</dt><dd className="font-semibold">{formatCurrency(insights.summary.receivableAmount)}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Despesas previstas</dt><dd className="font-semibold">{formatCurrency(insights.summary.expectedExpense)}</dd></div>
        </dl>
      </section>
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-semibold uppercase text-amber-700">Faturas pendentes</p>
        <p className="mt-3 text-3xl font-bold text-amber-800">{insights.summary.awaitingInvoices}</p>
        <p className="mt-5 text-sm text-amber-800">Contas variáveis aguardando valor para fechar a previsão do mês.</p>
      </section>
    </div>
  );

  return (
    <main className="min-h-full bg-gray-50 p-4 md:p-6">
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="mt-1 text-sm text-gray-500">Fluxo de caixa e compromissos recorrentes</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Competência">
            <TextInput type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          </Field>
          <Field label="Centro de custos">
            <SelectInput value={selectedCenter} onChange={(event) => setSelectedCenter(event.target.value)}>
              {centerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectInput>
          </Field>
          <button
            type="button"
            onClick={rollNextMonth}
            disabled={rollingForward || !storeIds.length}
            className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarPlus className="h-4 w-4" />
            {rollingForward ? 'Preparando...' : 'Preparar próximo mês'}
          </button>
        </div>
      </header>

      {feedback && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {feedback.message}
        </div>
      )}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível sincronizar os lançamentos financeiros.</div>}

      <nav className="mb-5 flex w-fit max-w-full overflow-x-auto rounded-lg border border-gray-200 bg-white p-1">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded px-4 py-2 text-sm font-semibold ${activeTab === tab.id ? 'bg-pink-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="flex h-52 items-center justify-center text-sm text-gray-500">Carregando financeiro...</div>
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'pagar' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Despesas de {periodDisplay(selectedMonth)}</h2>
                <button type="button" onClick={() => openNew('pagar')} className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-700">
                  <Plus className="h-4 w-4" /> Nova despesa
                </button>
              </div>
              <TransactionTable
                type="pagar"
                items={insights.currentExpenses}
                onEdit={(item) => openEdit('pagar', item)}
                onDelete={(item) => removeTransaction('pagar', item)}
                onSettle={(item) => settleTransaction('pagar', item)}
              />
            </section>
          )}
          {activeTab === 'receber' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Entradas de {periodDisplay(selectedMonth)}</h2>
                <button type="button" onClick={() => openNew('receber')} className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-700">
                  <Plus className="h-4 w-4" /> Nova Entrada
                </button>
              </div>
              <TransactionTable
                type="receber"
                items={insights.currentReceivables}
                onEdit={(item) => openEdit('receber', item)}
                onDelete={(item) => removeTransaction('receber', item)}
                onSettle={(item) => settleTransaction('receber', item)}
              />
            </section>
          )}
          {activeTab === 'fluxo' && renderCashFlow()}
        </>
      )}

      {modal && (
        <PanelModal title={modal.item ? 'Editar lançamento' : 'Novo lançamento'} onClose={closeModal}>
          <form className="space-y-4 p-5" onSubmit={saveTransaction}>
            <Field label="Descrição">
              <TextInput value={formData.descricao || ''} onChange={(event) => setFormData({ ...formData, descricao: event.target.value })} required />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Valor (R$)">
                <TextInput type="number" min="0" step="0.01" value={formData.valor || ''} onChange={(event) => setFormData({ ...formData, valor: event.target.value })} required />
              </Field>
              <Field label="Competência">
                <TextInput type="month" value={formData.competencia || selectedMonth} onChange={(event) => setFormData({ ...formData, competencia: event.target.value })} required />
              </Field>
            </div>
            {modal.type === 'pagar' ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Data de vencimento">
                    <TextInput type="date" value={formData.dataVencimento || ''} onChange={(event) => setFormData({ ...formData, dataVencimento: event.target.value })} required />
                  </Field>
                  <Field label="Recorrência">
                    <SelectInput value={formData.tipoRecorrencia || 'avulsa'} onChange={(event) => setFormData({ ...formData, tipoRecorrencia: event.target.value })}>
                      {EXPENSE_RECURRENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </SelectInput>
                  </Field>
                </div>
                <Field label="Categoria">
                  <TextInput list="financial-expense-categories" value={formData.categoria || ''} onChange={(event) => setFormData({ ...formData, categoria: event.target.value })} required />
                  <datalist id="financial-expense-categories">
                    {expenseCategories.map((category) => <option key={category} value={category} />)}
                  </datalist>
                </Field>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Data de recebimento">
                  <TextInput type="date" value={formData.dataRecebimento || ''} onChange={(event) => setFormData({ ...formData, dataRecebimento: event.target.value })} required />
                </Field>
                <Field label="Método">
                  <SelectInput value={formData.metodo || 'Pix'} onChange={(event) => setFormData({ ...formData, metodo: event.target.value })}>
                    <option value="Pix">Pix</option>
                    <option value="Cartao">Cartão</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Outro">Outro</option>
                  </SelectInput>
                </Field>
                <Field label="Fonte">
                  <TextInput value={formData.categoria || ''} onChange={(event) => setFormData({ ...formData, categoria: event.target.value })} required />
                </Field>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Centro de custos">
                <SelectInput value={formData.centroCusto || ''} onChange={(event) => setFormData({ ...formData, centroCusto: event.target.value })} required>
                  {centerOptions.filter((option) => option.value !== ALL_COST_CENTERS).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Unidade responsável">
                <SelectInput value={formData.lojaId || ''} onChange={(event) => setFormData({ ...formData, lojaId: event.target.value })} required>
                  {storeIds.map((storeId) => (
                    <option key={storeId} value={storeId}>{storeInfoMap[storeId]?.nome || storeId}</option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button type="button" onClick={closeModal} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-700">Salvar</button>
            </div>
          </form>
        </PanelModal>
      )}
    </main>
  );
};

export default FinancialControlPanel;
