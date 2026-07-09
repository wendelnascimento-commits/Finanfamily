import React, { useState } from 'react';
import { Transaction, Budget } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, Settings, Plus, Edit2 } from 'lucide-react';

interface BudgetOverviewProps {
  transactions: Transaction[];
  budgets: Budget[];
  onUpdateBudgetLimit: (category: string, limit: number) => void;
  activeMemberId: string;
  memberNamesMap: Record<string, string>;
}

export default function BudgetOverview({
  transactions,
  budgets,
  onUpdateBudgetLimit,
  activeMemberId,
  memberNamesMap,
}: BudgetOverviewProps) {
  const [chartType, setChartType] = useState<'flow' | 'pie'>('flow');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState('');

  // Filter transactions for calculations based on active view
  // Let's look at expenses and incomes
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Group expenses by category
  const expensesByCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  // Prepare data for the Category Pie Chart
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6'];
  const pieChartData = Object.keys(expensesByCategory).map((cat) => ({
    name: cat,
    value: parseFloat(expensesByCategory[cat].toFixed(2)),
  }));

  // Prepare data for Monthly Flow (grouped by date)
  // Let's simulate a 5-day flow data based on transactions or a standard mock history
  const lastDaysData = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (5 - idx));
    const dateStr = d.toISOString().split('T')[0];
    const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

    const income = transactions
      .filter((t) => t.date === dateStr && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter((t) => t.date === dateStr && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      date: displayDate,
      Receitas: parseFloat(income.toFixed(2)),
      Despesas: parseFloat(expense.toFixed(2)),
    };
  });

  const handleEditBudget = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setNewLimit(currentLimit.toString());
  };

  const handleSaveBudget = (category: string) => {
    const parsedLimit = parseFloat(newLimit);
    if (!isNaN(parsedLimit) && parsedLimit >= 0) {
      onUpdateBudgetLimit(category, parsedLimit);
      setEditingCategory(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Saldo Total */}
        <div className="p-6 rounded-3xl bg-emerald-500 text-slate-950 flex flex-col justify-between shadow-sm relative overflow-hidden min-h-[140px]">
          <div className="space-y-1 z-10">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950/75 block">Saldo Consolidado</span>
            <h3 className="text-3xl font-black tracking-tight text-slate-950">
              R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="flex justify-between items-end z-10 mt-4">
            <div>
              <p className="text-[9px] font-bold text-emerald-950/60 uppercase">ESTE MÊS</p>
              <p className="text-xs font-black text-slate-950">
                {netBalance >= 0 ? '+' : ''} R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center border border-emerald-600/15">
              <DollarSign size={18} className="text-emerald-950" />
            </div>
          </div>
          {/* Geometric design accent */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-400/20 rounded-full"></div>
        </div>

        {/* Receitas */}
        <div className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Receitas</span>
            <h3 className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="flex justify-between items-end mt-4">
            <div>
              <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase">ENTRADAS</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Sincronizado</p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20">
              <ArrowUpRight size={18} />
            </div>
          </div>
        </div>

        {/* Despesas */}
        <div className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Despesas</span>
            <h3 className="text-2xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
              R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="flex justify-between items-end mt-4">
            <div>
              <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase">SAÍDAS</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {totalIncome > 0 ? `${((totalExpense / totalIncome) * 100).toFixed(0)}% das entradas` : 'Sem entradas'}
              </p>
            </div>
            <div className="w-10 h-10 bg-rose-500/10 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center border border-rose-500/20">
              <ArrowDownRight size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos de Desempenho */}
      <div className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
              <TrendingUp size={16} className="text-emerald-500" />
              Análise de Desempenho Financeiro
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Acompanhamento visual de fluxos de caixa e saídas</p>
          </div>

          <div className="flex gap-1.5 self-start">
            <button
              onClick={() => setChartType('flow')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                chartType === 'flow'
                  ? 'bg-slate-950 text-white dark:bg-emerald-500 dark:text-slate-950'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Fluxo Diário
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                chartType === 'pie'
                  ? 'bg-slate-950 text-white dark:bg-emerald-500 dark:text-slate-950'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Divisão de Despesas
            </button>
          </div>
        </div>

        <div className="h-64">
          {chartType === 'flow' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lastDaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                  itemStyle={{ color: '#f8fafc', fontSize: '11px' }}
                  labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', marginTop: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : pieChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma despesa para exibir no gráfico de pizza.</p>
            </div>
          ) : (
            <div className="h-full grid grid-cols-1 md:grid-cols-2 items-center">
              <div className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `R$ ${value}`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                      }}
                      itemStyle={{ color: '#f8fafc', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-2 scrollbar-none">
                {pieChartData.map((data, index) => (
                  <div key={data.name} className="flex items-center justify-between text-[11px] border-b border-slate-50 dark:border-slate-800/50 pb-1.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="font-bold text-slate-500 dark:text-slate-400">{data.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tetos de Orçamento por Categoria */}
      <div className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-5 flex items-center gap-2 uppercase tracking-wide">
          <Settings size={16} className="text-emerald-500" />
          Limites de Orçamento Familiar
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {budgets.map((b) => {
            // Get current expense amount in this category
            const spent = transactions
              .filter((t) => t.category === b.category && t.type === 'expense')
              .reduce((sum, t) => sum + t.amount, 0);

            const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            const isOverLimit = spent > b.limit;
            const isNearLimit = spent >= b.limit * 0.8 && spent <= b.limit;

            return (
              <div
                key={b.category}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{b.category}</span>
                    <div className="flex items-center gap-1.5">
                      {editingCategory === b.category ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">R$</span>
                          <input
                            type="number"
                            value={newLimit}
                            onChange={(e) => setNewLimit(e.target.value)}
                            className="w-16 px-1.5 py-0.5 text-[10px] border border-slate-300 dark:border-slate-700 rounded dark:bg-slate-900 dark:text-white font-extrabold"
                          />
                          <button
                            onClick={() => handleSaveBudget(b.category)}
                            className="text-[10px] font-black uppercase text-emerald-500 hover:text-emerald-400"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Teto: R$ {b.limit.toLocaleString('pt-BR')}
                          </span>
                          <button
                            onClick={() => handleEditBudget(b.category, b.limit)}
                            className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Editar Limite"
                          >
                            <Edit2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between text-xs mt-1 mb-2">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Gasto: <strong className="text-slate-700 dark:text-slate-200">R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </span>
                    <span className={`text-xs font-black ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverLimit ? 'bg-rose-500' : isNearLimit ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  ></div>
                </div>

                {/* Badges of alerts */}
                {isOverLimit && (
                  <span className="text-[9px] text-rose-500 font-extrabold uppercase mt-2.5 flex items-center gap-1">
                    🚨 Orçamento Estourado nesta Categoria!
                  </span>
                )}
                {!isOverLimit && isNearLimit && (
                  <span className="text-[9px] text-amber-500 font-extrabold uppercase mt-2.5 flex items-center gap-1">
                    ⚠️ Próximo de atingir o limite estipulado.
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
