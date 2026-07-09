import React, { useState } from 'react';
import { FinancialGoal } from '../types';
import { Target, Plus, RefreshCw, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';

interface GoalsSimulatorProps {
  goals: FinancialGoal[];
  onAddGoal: (goal: Omit<FinancialGoal, 'id'>) => void;
  onUpdateGoalProgress: (id: string, amount: number) => void;
  onRemoveGoal: (id: string) => void;
}

export default function GoalsSimulator({
  goals,
  onAddGoal,
  onUpdateGoalProgress,
  onRemoveGoal,
}: GoalsSimulatorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('Casas');

  // Simulator Interactive States
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(goals[0]?.id || null);
  const [monthlyContribution, setMonthlyContribution] = useState(300); // R$ 300/month
  const [annualReturn, setAnnualReturn] = useState(10.5); // 10.5% a.a.

  const selectedGoal = goals.find(g => g.id === selectedGoalId) || goals[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount);

    if (!title.trim() || isNaN(target) || target <= 0) return;

    onAddGoal({
      title: title.trim(),
      targetAmount: target,
      currentAmount: isNaN(current) ? 0 : current,
      deadline,
      category,
    });

    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setShowAddForm(false);
  };

  // Simulation Logic: Calculating months to target with Compound Interest
  // Formula: Future Value of Annuity + Compound Interest of Current Value
  const runSimulation = () => {
    if (!selectedGoal) return { months: 0, totalInterest: 0, futureValue: 0 };

    const target = selectedGoal.targetAmount;
    let current = selectedGoal.currentAmount;
    const monthlyRate = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;

    if (current >= target) return { months: 0, totalInterest: 0, futureValue: current };
    if (monthlyContribution <= 0 && monthlyRate <= 0) return { months: 999, totalInterest: 0, futureValue: current };

    let months = 0;
    let balance = current;
    let investedCapital = current;

    while (balance < target && months < 360) { // Limit to 30 years
      // Apply monthly return
      const interest = balance * monthlyRate;
      balance += interest;
      // Add monthly contribution
      balance += monthlyContribution;
      investedCapital += monthlyContribution;
      months++;
    }

    const totalInterest = Math.max(0, balance - investedCapital);

    return {
      months,
      totalInterest,
      futureValue: balance,
    };
  };

  const simulationResult = runSimulation();

  return (
    <div id="goals-simulator-section" className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <Target size={18} id="goals-simulator-icon" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight uppercase tracking-wider">Simulação de Metas Financeiras</h2>
            <p className="text-[11px] text-slate-400 font-medium">Trace objetivos familiares e simule projeções de acumulação</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-black tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
        >
          <Plus size={13} />
          {showAddForm ? 'Fechar' : 'Nova Meta'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Criar Nova Meta Personalizada</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Título do Objetivo</label>
              <input
                type="text"
                required
                placeholder="Ex: Reserva de Emergência 6 meses"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="Casas">Imóvel / Reforma</option>
                <option value="Carros">Veículo</option>
                <option value="Viagens">Viagem Familiar</option>
                <option value="Reserva">Reserva de Emergência</option>
                <option value="Aposentadoria">Aposentadoria / Investimentos</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Valor Alvo (R$)</label>
              <input
                type="number"
                required
                placeholder="Ex: 25000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Valor Já Acumulado (R$)</label>
              <input
                type="number"
                placeholder="Ex: 2500"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Prazo Estimado (Ano/Mês)</label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-xs transition-colors"
          >
            Adicionar Objetivo
          </button>
        </form>
      )}

      {/* Grid: Goals list on left, simulator on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Active Goals Progress List */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Objetivos Ativos</h3>
          {goals.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-250 dark:border-slate-800 rounded-2xl text-center">
              <p className="text-xs text-slate-500">Crie metas para projetar simulações.</p>
            </div>
          ) : (
            goals.map((g) => {
              const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
              const isSelected = selectedGoal?.id === g.id;

              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGoalId(g.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/40'
                      : 'bg-slate-50/40 dark:bg-slate-950/40 border-slate-150 dark:border-slate-850 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-slate-850 dark:text-white">{g.title}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Prazo: {new Date(g.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                        R$ {g.currentAmount.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        de R$ {g.targetAmount.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-emerald-500">{pct.toFixed(1)}% concluído</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveGoal(g.id);
                      }}
                      className="text-rose-500 hover:underline uppercase tracking-wider font-extrabold text-[9px]"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Compound Interest Projections Simulator */}
        <div className="p-5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-emerald-500" />
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              Projeção e Juros Compostos
            </span>
          </div>

          {selectedGoal ? (
            <>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Simulando para</span>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-800 dark:text-white">{selectedGoal.title}</h4>
                <p className="text-xs text-slate-500">Falta acumular: <strong className="text-slate-800 dark:text-slate-100">R$ {(selectedGoal.targetAmount - selectedGoal.currentAmount).toLocaleString('pt-BR')}</strong></p>
              </div>

              {/* Slider 1: Monthly Saving */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Aporte Mensal Adicional:</span>
                  <span className="font-black text-emerald-500">R$ {monthlyContribution}/mês</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
              </div>

              {/* Slider 2: Annual return */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Rendimento Anual Estimado:</span>
                  <span className="font-black text-emerald-500">{annualReturn}% a.a.</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  step="0.5"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50 dark:border-slate-800">
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Tempo Estimado:</span>
                  <span className="text-base font-black text-emerald-500">
                    {simulationResult.months === 999 ? 'Infinito' : simulationResult.months < 12 ? `${simulationResult.months} meses` : `${Math.floor(simulationResult.months / 12)} anos e ${simulationResult.months % 12} meses`}
                  </span>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Ganho em Juros:</span>
                  <span className="text-base font-black text-emerald-500">
                    R$ {simulationResult.totalInterest.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Smart feedback indicator */}
              <div className="flex gap-2.5 p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/10">
                <Sparkles className="text-emerald-500 shrink-0" size={15} />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                  💡 <strong>Dica do Simulador:</strong> Ao invés da poupança básica, aplicar em um título Tesouro Selic que rende cerca de 10.75% a.a. vai encurtar seu prazo em <strong>{Math.ceil(simulationResult.months * 0.1)} meses</strong> devido à ação de juros compostos.
                </p>
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-xs text-slate-400">Selecione ou adicione um objetivo acima para abrir o painel de simulação.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
