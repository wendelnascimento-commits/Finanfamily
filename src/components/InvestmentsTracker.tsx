import React, { useState } from 'react';
import { Investment } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Briefcase, Plus, TrendingUp, DollarSign, Percent, Trash2 } from 'lucide-react';

interface InvestmentsTrackerProps {
  investments: Investment[];
  onAddInvestment: (investment: Omit<Investment, 'id'>) => void;
  onRemoveInvestment: (id: string) => void;
}

export default function InvestmentsTracker({
  investments,
  onAddInvestment,
  onRemoveInvestment,
}: InvestmentsTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'CDB' | 'Tesouro' | 'Ações' | 'FIIs' | 'Cripto'>('CDB');
  const [amount, setAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentReturn, setCurrentReturn] = useState('10');
  const [notes, setNotes] = useState('');

  // Projections State
  const [years, setYears] = useState(5);
  const [annualAport, setAnnualAport] = useState(500);

  const totalInvested = investments.reduce((sum, inv) => sum + inv.initialAmount, 0);
  const currentTotalVal = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalReturnPercent = totalInvested > 0 ? ((currentTotalVal - totalInvested) / totalInvested) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    const initAmt = parseFloat(initialAmount);
    const ret = parseFloat(currentReturn);

    if (!name.trim() || isNaN(amt) || amt <= 0 || isNaN(initAmt) || initAmt <= 0) return;

    onAddInvestment({
      name: name.trim(),
      type,
      amount: amt,
      initialAmount: initAmt,
      purchaseDate,
      currentReturn: isNaN(ret) ? 0 : ret,
      notes: notes.trim() || undefined,
    });

    setName('');
    setAmount('');
    setInitialAmount('');
    setNotes('');
    setShowAddForm(false);
  };

  // Group allocations for charting
  const allocationData = investments.reduce((acc: Record<string, number>, inv) => {
    acc[inv.type] = (acc[inv.type] || 0) + inv.amount;
    return acc;
  }, {});

  const chartData = Object.keys(allocationData).map((type) => ({
    name: type,
    Valor: parseFloat(allocationData[type].toFixed(2)),
  }));

  // Simulate future investment progression
  const simulateProgression = () => {
    let balance = currentTotalVal;
    const rate = 11.5 / 100; // 11.5% moderate portfolio yield
    const data = [{ ano: 'Hoje', Montante: Math.round(balance) }];

    for (let i = 1; i <= years; i++) {
      // compound yield
      balance = balance * (1 + rate);
      // annual contributions
      balance += annualAport * 12;
      data.push({
        ano: `Ano ${i}`,
        Montante: Math.round(balance),
      });
    }

    return data;
  };

  const progressionData = simulateProgression();

  return (
    <div id="investments-tracker-section" className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <Briefcase size={18} id="investments-tracker-icon" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight uppercase tracking-wider">Sugestão & Controle de Investimentos</h2>
            <p className="text-[11px] text-slate-400 font-medium">Acompanhe ativos financeiros, aportes e simule o crescimento futuro</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-black tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
        >
          <Plus size={13} />
          {showAddForm ? 'Cancelar' : 'Adicionar Ativo'}
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl border border-emerald-500/10">
            <DollarSign size={16} />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Capital Investido</span>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">R$ {totalInvested.toLocaleString('pt-BR')}</h4>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl border border-emerald-500/10">
            <TrendingUp size={16} />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Valor Atual Portfolio</span>
            <h4 className="text-sm font-black text-emerald-500">R$ {currentTotalVal.toLocaleString('pt-BR')}</h4>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl border border-emerald-500/10">
            <Percent size={16} />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Rentabilidade Média</span>
            <h4 className="text-sm font-black text-emerald-500">+{totalReturnPercent.toFixed(1)}%</h4>
          </div>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Adicionar Novo Ativo ao Portfólio</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nome do Ativo</label>
              <input
                type="text"
                required
                placeholder="Ex: Tesouro Selic 2029"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Tipo de Investimento</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="CDB">Renda Fixa / CDB</option>
                <option value="Tesouro">Tesouro Direto</option>
                <option value="Ações">Ações (Bolsa de Valores)</option>
                <option value="FIIs">Fundos Imobiliários (FIIs)</option>
                <option value="Cripto">Criptomoedas</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Data da Compra</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Capital Inicial (Investido)</label>
              <input
                type="number"
                required
                placeholder="Ex: 5000"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Valor de Mercado Atual</label>
              <input
                type="number"
                required
                placeholder="Ex: 5450"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Rendimento Estimado (% a.a.)</label>
              <input
                type="number"
                placeholder="Ex: 11.5"
                value={currentReturn}
                onChange={(e) => setCurrentReturn(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Notas / Observações</label>
            <input
              type="text"
              placeholder="Ex: Corretora XP, liquidez diária"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-xs transition-colors"
          >
            Salvar Ativo
          </button>
        </form>
      )}

      {/* Charts & Simulation Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocations chart */}
        <div className="p-5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Divisão por Classes de Ativo</h3>
          {investments.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <span className="text-xs text-slate-450">Adicione investimentos para visualizar o gráfico.</span>
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip formatter={(v) => `R$ ${v}`} />
                  <Bar dataKey="Valor" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Future projection builder */}
        <div className="p-5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Simulador de Evolução (11.5% a.a.)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Prazo (Anos)</label>
              <select
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value={1}>1 Ano</option>
                <option value={5}>5 Anos</option>
                <option value={10}>10 Anos</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Aporte Mensal (R$)</label>
              <input
                type="number"
                value={annualAport}
                onChange={(e) => setAnnualAport(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressionData}>
                <XAxis dataKey="ano" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={9} />
                <Tooltip formatter={(v) => `R$ ${v}`} />
                <Line type="monotone" dataKey="Montante" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Asset Table */}
      <div className="overflow-x-auto scrollbar-none pt-2">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">
              <th className="py-2.5 px-1">Ativo</th>
              <th className="py-2.5 px-1">Tipo</th>
              <th className="py-2.5 px-1 text-right">Inicial</th>
              <th className="py-2.5 px-1 text-right">Valor Atual</th>
              <th className="py-2.5 px-1 text-right">Retorno</th>
              <th className="py-2.5 px-1 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {investments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  Nenhum ativo financeiro cadastrado.
                </td>
              </tr>
            ) : (
              investments.map((inv) => {
                const diff = inv.amount - inv.initialAmount;
                const sign = diff >= 0 ? '+' : '';

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                    <td className="py-3 px-1 font-bold text-slate-800 dark:text-white">
                      <div>
                        {inv.name}
                        {inv.notes && <span className="block text-[10px] text-slate-400 font-medium">{inv.notes}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-1">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350">
                        {inv.type}
                      </span>
                    </td>
                    <td className="py-3 px-1 text-right font-mono text-[11px] text-slate-500">
                      R$ {inv.initialAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-1 text-right font-black text-slate-850 dark:text-white">
                      R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 px-1 text-right font-black ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {sign}R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({inv.currentReturn}% a.a.)
                    </td>
                    <td className="py-3 px-1 text-center">
                      <button
                        onClick={() => onRemoveInvestment(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                        title="Remover ativo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
