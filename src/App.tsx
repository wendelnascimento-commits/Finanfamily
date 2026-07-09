import React, { useState, useEffect } from 'react';
import { Transaction, Budget, FinancialGoal, FamilyMember, BankConnection, SmartNotification, Investment, PendingBankTx } from './types';
import BudgetOverview from './components/BudgetOverview';
import TransactionList from './components/TransactionList';
import GoalsSimulator from './components/GoalsSimulator';
import InvestmentsTracker from './components/InvestmentsTracker';
import BankSync from './components/BankSync';
import FamilySharing from './components/FamilySharing';
import { Landmark, Bell, Sun, Moon, ArrowUpRight, ArrowDownRight, Printer, CheckCircle2, AlertTriangle, Lightbulb, RotateCcw } from 'lucide-react';

// Seed Initial Data if nothing is saved in LocalStorage
const INITIAL_MEMBERS: FamilyMember[] = [
  { id: '1', name: 'Wendel', avatarColor: 'bg-indigo-600', role: 'Administrador' },
  { id: '2', name: 'Helena', avatarColor: 'bg-emerald-500', role: 'Membro' },
  { id: '3', name: 'Arthur', avatarColor: 'bg-amber-500', role: 'Dependente' },
];

const INITIAL_BUDGETS: Budget[] = [
  { category: 'Alimentação', limit: 1500, spent: 0 },
  { category: 'Transporte', limit: 800, spent: 0 },
  { category: 'Moradia', limit: 3000, spent: 0 },
  { category: 'Lazer', limit: 600, spent: 0 },
  { category: 'Investimentos', limit: 2000, spent: 0 },
  { category: 'Saúde', limit: 500, spent: 0 },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2026-07-05', description: 'Supermercado Extra', amount: 350.20, category: 'Alimentação', type: 'expense', bankSynced: false, userRef: '2' },
  { id: 't2', date: '2026-07-06', description: 'Salário Mensal', amount: 8500.00, category: 'Salário', type: 'income', bankSynced: false, userRef: '1' },
  { id: 't3', date: '2026-07-06', description: 'Combustível Posto Shell', amount: 180.00, category: 'Transporte', type: 'expense', bankSynced: false, userRef: '1' },
  { id: 't4', date: '2026-07-07', description: 'Rendimento CDB', amount: 120.50, category: 'Investimentos', type: 'income', bankSynced: false, userRef: '1' },
  { id: 't5', date: '2026-07-08', description: 'Aluguel + Condomínio', amount: 2600.00, category: 'Moradia', type: 'expense', bankSynced: false, userRef: '1' },
  { id: 't6', date: '2026-07-08', description: 'iFood Jantar', amount: 94.50, category: 'Alimentação', type: 'expense', bankSynced: false, userRef: '2' },
];

const INITIAL_GOALS: FinancialGoal[] = [
  { id: 'g1', title: 'Viagem de Férias Familiar', targetAmount: 15000, currentAmount: 4200, deadline: '2027-01-15', category: 'Viagens' },
  { id: 'g2', title: 'Reserva de Emergência (6 meses)', targetAmount: 25000, currentAmount: 12000, deadline: '2026-12-31', category: 'Reserva' },
  { id: 'g3', title: 'Aposentadoria Independente', targetAmount: 500000, currentAmount: 25000, deadline: '2040-06-01', category: 'Aposentadoria' },
];

const INITIAL_INVESTMENTS: Investment[] = [
  { id: 'inv1', name: 'Tesouro Selic 2029', type: 'Tesouro', amount: 12450.00, initialAmount: 11000.00, purchaseDate: '2025-01-10', currentReturn: 10.75, notes: 'Conta XP Investimentos' },
  { id: 'inv2', name: 'CDB 110% CDI Inter', type: 'CDB', amount: 8500.00, initialAmount: 8000.00, purchaseDate: '2025-06-15', currentReturn: 11.2, notes: 'Fundo de liquidez' },
  { id: 'inv3', name: 'Ações Itaú (ITUB4)', type: 'Ações', amount: 4100.00, initialAmount: 3500.00, purchaseDate: '2024-11-20', currentReturn: 14.5, notes: 'Dividendos recorrentes' },
];

const INITIAL_CONNECTIONS: BankConnection[] = [
  { bankId: 'nubank', bankName: 'Nubank', logoColor: 'bg-purple-600', isConnected: false },
  { bankId: 'itau', bankName: 'Itaú Unibanco', logoColor: 'bg-orange-500', isConnected: false },
  { bankId: 'bradesco', bankName: 'Bradesco', logoColor: 'bg-red-600', isConnected: false },
  { bankId: 'inter', bankName: 'Banco Inter', logoColor: 'bg-amber-500', isConnected: false },
  { bankId: 'santander', bankName: 'Santander', logoColor: 'bg-red-700', isConnected: false },
];

const INITIAL_PENDING_TXS: PendingBankTx[] = [
  { id: 'pt1', description: 'Supermercado Pão de Açúcar', amount: 189.90, category: 'Alimentação', type: 'expense', date: new Date().toISOString().split('T')[0], bankId: 'itau' },
  { id: 'pt2', description: 'Transferência Recebida PIX', amount: 1500.00, category: 'Salário', type: 'income', date: new Date().toISOString().split('T')[0], bankId: 'nubank' },
  { id: 'pt3', description: 'Assinatura Spotify Premium', amount: 34.90, category: 'Assinaturas', type: 'expense', date: new Date().toISOString().split('T')[0], bankId: 'inter' },
  { id: 'pt4', description: 'Farmácia Drogasil', amount: 65.40, category: 'Saúde', type: 'expense', date: new Date().toISOString().split('T')[0], bankId: 'bradesco' },
  { id: 'pt5', description: 'iFood Jantar Delivery', amount: 52.80, category: 'Alimentação', type: 'expense', date: new Date().toISOString().split('T')[0], bankId: 'nubank' },
];

export default function App() {
  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // Active view tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'goals' | 'investments' | 'banks'>('overview');

  // Master State Managers
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem('familyMembers');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    return members[0]?.id || '1';
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('budgets');
    return saved ? JSON.parse(saved) : INITIAL_BUDGETS;
  });

  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    const saved = localStorage.getItem('goals');
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  const [investments, setInvestments] = useState<Investment[]>(() => {
    const saved = localStorage.getItem('investments');
    return saved ? JSON.parse(saved) : INITIAL_INVESTMENTS;
  });

  const [bankConnections, setBankConnections] = useState<BankConnection[]>(() => {
    const saved = localStorage.getItem('bankConnections');
    return saved ? JSON.parse(saved) : INITIAL_CONNECTIONS;
  });

  const [bankSyncPool, setBankSyncPool] = useState<PendingBankTx[]>(() => {
    const saved = localStorage.getItem('bankSyncPool');
    return saved ? JSON.parse(saved) : INITIAL_PENDING_TXS;
  });

  const [notifications, setNotifications] = useState<SmartNotification[]>([]);

  // Toggle Dark Mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Sync state changes with localStorage for persistent offline experience
  useEffect(() => {
    localStorage.setItem('familyMembers', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('investments', JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    localStorage.setItem('bankConnections', JSON.stringify(bankConnections));
  }, [bankConnections]);

  useEffect(() => {
    localStorage.setItem('bankSyncPool', JSON.stringify(bankSyncPool));
  }, [bankSyncPool]);

  // Helpers to adjust state
  const handleAddTransaction = (t: Omit<Transaction, 'id' | 'bankSynced'>) => {
    const newTx: Transaction = {
      ...t,
      id: `tx-${Date.now()}`,
      bankSynced: false,
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Push notification trigger
    addNotification({
      title: 'Transação Registrada',
      message: `R$ ${t.amount.toLocaleString('pt-BR')} adicionado em ${t.category}.`,
      type: 'success',
    });
  };

  const handleEditTransaction = (id: string, updated: Omit<Transaction, 'id' | 'bankSynced'>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
    );
    addNotification({
      title: 'Transação Atualizada',
      message: `A transação "${updated.description}" foi modificada com sucesso.`,
      type: 'tip',
    });
  };

  const handleClearAllTransactions = () => {
    setTransactions([]);
    setBankConnections(INITIAL_CONNECTIONS);
    addNotification({
      title: 'Histórico Reiniciado',
      message: 'Todas as transações foram removidas. Você agora possui uma conta limpa!',
      type: 'tip',
    });
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleImportBankTransactions = (newTxs: Transaction[]) => {
    setTransactions((prev) => [...newTxs, ...prev]);
  };

  const handleUpdateBudgetLimit = (category: string, limit: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.category === category ? { ...b, limit } : b))
    );
  };

  const handleAddGoal = (goal: Omit<FinancialGoal, 'id'>) => {
    const newGoal: FinancialGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
    };
    setGoals((prev) => [...prev, newGoal]);
  };

  const handleRemoveGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleAddInvestment = (inv: Omit<Investment, 'id'>) => {
    const newInv: Investment = {
      ...inv,
      id: `inv-${Date.now()}`,
    };
    setInvestments((prev) => [...prev, newInv]);
  };

  const handleRemoveInvestment = (id: string) => {
    setInvestments((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddMember = (member: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = {
      ...member,
      id: `member-${Date.now()}`,
    };
    setMembers((prev) => [...prev, newMember]);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleConnectBank = (bankId: string, accountNumber: string) => {
    setBankConnections((prev) =>
      prev.map((c) =>
        c.bankId === bankId
          ? { ...c, isConnected: true, accountNumber, lastSynced: new Date().toLocaleDateString('pt-BR') }
          : c
      )
    );
  };

  const handleDisconnectBank = (bankId: string) => {
    setBankConnections((prev) =>
      prev.map((c) => (c.bankId === bankId ? { ...c, isConnected: false, accountNumber: undefined } : c))
    );
  };

  const handleAddToSyncPool = (tx: Omit<PendingBankTx, 'id'>) => {
    const newItem: PendingBankTx = {
      ...tx,
      id: `pending-tx-${Date.now()}-${Math.random()}`,
    };
    setBankSyncPool((prev) => [newItem, ...prev]);
  };

  const handleRemoveFromSyncPool = (id: string) => {
    setBankSyncPool((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateSyncPoolItem = (id: string, updated: Omit<PendingBankTx, 'id'>) => {
    setBankSyncPool((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
  };

  const addNotification = (notif: Omit<SmartNotification, 'id' | 'date' | 'read'>) => {
    const newNotif: SmartNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random()}`,
      date: new Date().toLocaleTimeString('pt-BR'),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 10)); // Limit to last 10 notifications
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleResetAllData = () => {
    if (window.confirm("Atenção: Deseja realmente LIMPAR COMPLETAMENTE todos os dados do aplicativo (transações, investimentos, metas, etc.) para começar do zero com uma conta limpa? Esta ação não pode ser desfeita.")) {
      const cleanMembers = [{ id: '1', name: 'Wendel', avatarColor: 'bg-indigo-600', role: 'Administrador' }];
      const cleanBudgets = INITIAL_BUDGETS.map(b => ({ ...b, spent: 0 }));
      const cleanConnections = INITIAL_CONNECTIONS.map(c => ({ ...c, isConnected: false }));

      setTransactions([]);
      setMembers(cleanMembers);
      setBudgets(cleanBudgets);
      setGoals([]);
      setInvestments([]);
      setBankConnections(cleanConnections);
      setBankSyncPool([]);
      setNotifications([]);
      setActiveMemberId('1');
      
      // Force update localStorage keys
      localStorage.setItem('familyMembers', JSON.stringify(cleanMembers));
      localStorage.setItem('transactions', JSON.stringify([]));
      localStorage.setItem('budgets', JSON.stringify(cleanBudgets));
      localStorage.setItem('goals', JSON.stringify([]));
      localStorage.setItem('investments', JSON.stringify([]));
      localStorage.setItem('bankConnections', JSON.stringify(cleanConnections));
      localStorage.setItem('bankSyncPool', JSON.stringify([]));
      
      addNotification({
        title: 'Aplicativo Resetado',
        message: 'Todos os dados foram limpos! Agora você tem um painel 100% em branco para preencher.',
        type: 'success',
      });
    }
  };

  const activeMember = members.find((m) => m.id === activeMemberId);

  // Map member IDs to names for quick lookup in budgets/tables
  const memberNamesMap: Record<string, string> = members.reduce((acc, m) => {
    acc[m.id] = m.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200`}>
      
      {/* Printable Financial Report Layout */}
      <div className="hidden print:block p-10 bg-white text-slate-900">
        <div className="border-b border-slate-300 pb-5 mb-6">
          <h1 className="text-2xl font-bold">Relatório Mensal de Orçamento Familiar</h1>
          <p className="text-sm text-slate-500 mt-1">Gerado em: {new Date().toLocaleDateString('pt-BR')} • Finances</p>
        </div>

        <div className="grid grid-cols-2 gap-5 mb-8 text-xs">
          <div>
            <h3 className="font-bold text-sm mb-2">Resumo Financeiro</h3>
            <p>Total de Receitas: R$ {transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toLocaleString('pt-BR')}</p>
            <p>Total de Despesas: R$ {transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toLocaleString('pt-BR')}</p>
            <p className="font-bold">Saldo do Período: R$ {(transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) - transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)).toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-2">Composição Familiar</h3>
            <p>Membros Ativos: {members.map(m => `${m.name} (${m.role})`).join(', ')}</p>
            <p>Total Alocado em Investimentos: R$ {investments.reduce((sum, i) => sum + i.amount, 0).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm mb-3">Histórico de Transações</h3>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-slate-600 font-bold">
                <th className="py-2">Data</th>
                <th className="py-2">Descrição</th>
                <th className="py-2">Categoria</th>
                <th className="py-2 text-right">Valor</th>
                <th className="py-2">Membro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="py-2">{t.date}</td>
                  <td className="py-2">{t.description}</td>
                  <td className="py-2">{t.category}</td>
                  <td className={`py-2 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                    R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2">{members.find(m => m.id === t.userRef)?.name || 'Geral'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main UI Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-150 dark:border-slate-850 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl transition-colors duration-200 print:hidden shadow-sm">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500 text-slate-950 rounded-2xl shadow-xs">
              <Landmark size={20} />
            </div>
            <div>
              <span className="text-base font-black text-slate-900 dark:text-white tracking-widest leading-tight block uppercase">FinanFamily</span>
              <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">Orçamento Familiar & Investimentos</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Reset App Data Button */}
            <button
              onClick={handleResetAllData}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all border border-rose-150 dark:border-rose-900/30 cursor-pointer"
              title="Resetar todos os dados para o padrão de demonstração"
            >
              <RotateCcw size={12} />
              Resetar Dados
            </button>

            {/* Dark Mode Switch */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-xl transition-all"
              title={darkMode ? "Ativar Modo Claro" : "Ativar Modo Noturno"}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notification Drawer Popover Toggle */}
            <div className="relative group">
              <button
                onClick={markNotificationsAsRead}
                className="p-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-xl transition-all relative"
              >
                <Bell size={16} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
                )}
              </button>

              {/* Simple dropdown overlay on hover */}
              <div className="absolute right-0 mt-2 w-72 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl hidden group-hover:block z-50">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-3">Alertas Recentes</h4>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2 uppercase tracking-wide font-bold">Nenhum alerta recente.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="flex gap-2 text-[10px] border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                        {n.type === 'success' ? (
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        ) : n.type === 'warning' ? (
                          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                        ) : (
                          <Lightbulb size={12} className="text-emerald-500 shrink-0" />
                        )}
                        <div>
                          <p className="font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">{n.title}</p>
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{n.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Profile Avatar switcher info */}
            <div className="flex items-center gap-2 border-l border-slate-150 dark:border-slate-800 pl-3">
              <div className={`w-8 h-8 rounded-full ${activeMember?.avatarColor} text-white flex items-center justify-center font-black text-xs shadow-inner`}>
                {activeMember?.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-200 block leading-tight">{activeMember?.name}</span>
                <span className="text-[10px] text-slate-450 uppercase tracking-wider font-bold block leading-none">{activeMember?.role}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-10 py-10 transition-all print:hidden">
        
        {/* Layout Grid: Content Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-10">
          
          {/* Left Sidebar: Controls family members & fast profile settings */}
          <div className="lg:col-span-4 space-y-6">
            <FamilySharing
              members={members}
              activeMemberId={activeMemberId}
              onSelectMember={setActiveMemberId}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
            />
          </div>

          {/* Right Area: Interactive Tabs & Charts */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Visual Tab Buttons */}
            <div className="flex flex-wrap border-b border-slate-150 dark:border-slate-800/80 overflow-x-auto gap-4 scrollbar-none pb-3">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 text-[12px] font-black uppercase tracking-widest transition-all border-b-2 shrink-0 rounded-t-2xl ${
                  activeTab === 'overview'
                    ? 'border-emerald-500 text-emerald-500 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Visão Geral (Gráficos)
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                  activeTab === 'transactions'
                    ? 'border-emerald-500 text-emerald-500 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Transações & Lançamentos
              </button>
              <button
                onClick={() => setActiveTab('goals')}
                className={`py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                  activeTab === 'goals'
                    ? 'border-emerald-500 text-emerald-500 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Metas & Projeções
              </button>
              <button
                onClick={() => setActiveTab('investments')}
                className={`py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 shrink-0 ${
                  activeTab === 'investments'
                    ? 'border-emerald-500 text-emerald-500 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Investimentos
              </button>
              <button
                onClick={() => setActiveTab('banks')}
                className={`py-3 px-4 text-[12px] font-black uppercase tracking-widest transition-all border-b-2 shrink-0 rounded-t-2xl ${
                  activeTab === 'banks'
                    ? 'border-emerald-500 text-emerald-500 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Contas Integradas
              </button>
            </div>

            {/* Dynamic Active Views */}
            <div className="space-y-6">
              {activeTab === 'overview' && (
                <BudgetOverview
                  transactions={transactions}
                  budgets={budgets}
                  onUpdateBudgetLimit={handleUpdateBudgetLimit}
                  activeMemberId={activeMemberId}
                  memberNamesMap={memberNamesMap}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionList
                  transactions={transactions}
                  members={members}
                  activeMemberId={activeMemberId}
                  onAddTransaction={handleAddTransaction}
                  onEditTransaction={handleEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onClearAllTransactions={handleClearAllTransactions}
                  onTriggerBankSyncWidget={() => setActiveTab('banks')}
                />
              )}

              {activeTab === 'goals' && (
                <GoalsSimulator
                  goals={goals}
                  onAddGoal={handleAddGoal}
                  onUpdateGoalProgress={(id, amt) => {
                    setGoals(prev => prev.map(g => g.id === id ? { ...g, currentAmount: amt } : g));
                  }}
                  onRemoveGoal={handleRemoveGoal}
                />
              )}

              {activeTab === 'investments' && (
                <InvestmentsTracker
                  investments={investments}
                  onAddInvestment={handleAddInvestment}
                  onRemoveInvestment={handleRemoveInvestment}
                />
              )}

              {activeTab === 'banks' && (
                <BankSync
                  connections={bankConnections}
                  activeMemberId={activeMemberId}
                  onConnectBank={handleConnectBank}
                  onDisconnectBank={handleDisconnectBank}
                  onImportTransactions={handleImportBankTransactions}
                  onAddNotification={addNotification}
                  bankSyncPool={bankSyncPool}
                  onAddToSyncPool={handleAddToSyncPool}
                  onRemoveFromSyncPool={handleRemoveFromSyncPool}
                  onUpdateSyncPoolItem={handleUpdateSyncPoolItem}
                />
              )}
            </div>

          </div>

        </div>

      </main>

      <footer className="py-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 text-center transition-all print:hidden">
        <p className="text-[11px] text-slate-400 font-medium">
          © 2026 Finances - Gestão de Orçamento Familiar e Investimentos Inteligentes. Construído com Inteligência Artificial.
        </p>
      </footer>
    </div>
  );
}
