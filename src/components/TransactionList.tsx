import React, { useState } from 'react';
import { Transaction, FamilyMember } from '../types';
import { Search, Filter, Plus, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Printer, RefreshCw, Trash2, Edit2, X } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  members: FamilyMember[];
  activeMemberId: string;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'bankSynced'>) => void;
  onEditTransaction: (id: string, transaction: Omit<Transaction, 'id' | 'bankSynced'>) => void;
  onDeleteTransaction: (id: string) => void;
  onTriggerBankSyncWidget: () => void;
  onClearAllTransactions?: () => void;
}

export default function TransactionList({
  transactions,
  members,
  activeMemberId,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onTriggerBankSyncWidget,
  onClearAllTransactions,
}: TransactionListProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');

  // New Transaction Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [userRef, setUserRef] = useState(activeMemberId);

  // Edit Transaction State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editDate, setEditDate] = useState('');
  const [editUserRef, setEditUserRef] = useState('');

  // Categories list
  const categories = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Investimentos', 'Salário', 'Saúde', 'Compras', 'Assinaturas', 'Outros'];

  // Apply filters
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesMember = memberFilter === 'all' || t.userRef === memberFilter;

    return matchesSearch && matchesType && matchesCategory && matchesMember;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAddTransaction({
      description: description.trim(),
      amount: parsedAmount,
      category,
      type,
      date,
      userRef,
    });

    // Reset Form
    setDescription('');
    setAmount('');
    setShowAddForm(false);
  };

  const handleStartEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditDescription(t.description);
    setEditAmount(t.amount.toString());
    setEditCategory(t.category);
    setEditType(t.type);
    setEditDate(t.date);
    setEditUserRef(t.userRef);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(editAmount);
    if (!editDescription.trim() || isNaN(parsedAmount) || parsedAmount <= 0 || !editingId) return;

    onEditTransaction(editingId, {
      description: editDescription.trim(),
      amount: parsedAmount,
      category: editCategory,
      type: editType,
      date: editDate,
      userRef: editUserRef,
    });

    setEditingId(null);
  };

  // Export to Excel / CSV
  const exportToCSV = () => {
    // UTF-8 BOM to open correctly in Excel
    let csvContent = '\uFEFF';
    csvContent += 'Data;Descrição;Categoria;Valor (R$);Tipo;Membro;Origem\n';

    filteredTransactions.forEach((t) => {
      const memberName = members.find((m) => m.id === t.userRef)?.name || 'Desconhecido';
      const formattedAmount = t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const row = [
        t.date,
        t.description.replace(/;/g, ','),
        t.category,
        formattedAmount,
        t.type === 'income' ? 'Receita' : 'Despesa',
        memberName,
        t.bankSynced ? `Simulado (${t.bankName || 'Banco'})` : 'Manual',
      ].join(';');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Financas_Relatorio_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print PDF
  const triggerPrint = () => {
    window.print();
  };

  return (
    <div id="transaction-list-section" className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight uppercase tracking-wider">Transações e Lançamentos</h2>
          <p className="text-[11px] text-slate-400 font-medium">Gerencie, filtre e controle todas as despesas e receitas familiares</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Export spreadsheet */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all border border-slate-200/40 dark:border-slate-700/50"
            title="Exportar planilha para Excel"
          >
            <FileSpreadsheet size={13} />
            Excel
          </button>

          {/* Export PDF */}
          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all border border-slate-200/40 dark:border-slate-700/50"
            title="Exportar PDF / Imprimir"
          >
            <Printer size={13} />
            PDF
          </button>

          {onClearAllTransactions && transactions.length > 0 && (
            <button
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-black bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all shadow-sm"
              title="Limpar todos os dados de simulação"
            >
              <Trash2 size={13} />
              Iniciar do Zero
            </button>
          )}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            id="open-transaction-form-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-sm transition-all"
          >
            <Plus size={13} />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Manual Add Transaction Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Adicionar Transação Manual</span>
            <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`px-3 py-1 rounded-md transition-colors uppercase font-black tracking-wider ${type === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-600 dark:text-slate-450'}`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`px-3 py-1 rounded-md transition-colors uppercase font-black tracking-wider ${type === 'income' ? 'bg-emerald-500 text-slate-950' : 'text-slate-600 dark:text-slate-455'}`}
              >
                Receita
              </button>
            </div>
          </div>

          {/* Quick-fill / preenchimento prático templates */}
          <div className="bg-slate-100/80 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200/40 dark:border-slate-800">
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Preenchimento Rápido com 1-Clique (Lançamentos Freqüentes):</span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '🍔 iFood', desc: 'iFood Jantar', amt: '85.00', cat: 'Alimentação', t: 'expense' },
                { label: '🛒 Supermercado', desc: 'Rancho do Mês', amt: '350.00', cat: 'Alimentação', t: 'expense' },
                { label: '🚗 Uber', desc: 'Corrida Uber', amt: '24.50', cat: 'Transporte', t: 'expense' },
                { label: '⛽ Posto Shell', desc: 'Combustível Carro', amt: '180.00', cat: 'Transporte', t: 'expense' },
                { label: '🍿 Lazer / Bar', desc: 'Lazer Fim de Semana', amt: '75.00', cat: 'Lazer', t: 'expense' },
                { label: '🎬 Netflix / Prime', desc: 'Assinaturas de Stream', amt: '44.90', cat: 'Assinaturas', t: 'expense' },
                { label: '💊 Drogaria', desc: 'Remédios e Farmácia', amt: '50.00', cat: 'Saúde', t: 'expense' },
                { label: '💰 Pix Helena', desc: 'Transferência Helena', amt: '120.00', cat: 'Outros', t: 'expense' },
                { label: '💼 Salário Mensal', desc: 'Salário Wendel', amt: '8500.00', cat: 'Salário', t: 'income' },
                { label: '📈 Rendimento CDB', desc: 'Rendimento CDB Inter', amt: '150.00', cat: 'Investimentos', t: 'income' },
              ].map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    setDescription(tpl.desc);
                    setAmount(tpl.amt);
                    setCategory(tpl.cat);
                    setType(tpl.t as 'income' | 'expense');
                    setDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded-xl shadow-3xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Descrição</label>
              <input
                type="text"
                required
                placeholder="Ex: Supermercado Pão de Açúcar"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Ex: 149,90"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Quem realizou?</label>
              <select
                value={userRef}
                onChange={(e) => setUserRef(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-xs transition-colors"
          >
            Salvar Transação
          </button>
        </form>
      )}

      {/* Advanced Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 p-4 rounded-2xl bg-slate-50/65 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5 md:w-96 shrink-0">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-[10px] uppercase font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 focus:outline-none"
          >
            <option value="all">Tipo (Todos)</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-[10px] uppercase font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 focus:outline-none"
          >
            <option value="all">Categoria</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Member Filter */}
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="px-2.5 py-1.5 text-[10px] uppercase font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 focus:outline-none"
          >
            <option value="all">Membro</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Grid */}
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">
              <th className="py-3 px-2">Data</th>
              <th className="py-3 px-2">Descrição</th>
              <th className="py-3 px-2">Categoria</th>
              <th className="py-3 px-2 text-right">Valor</th>
              <th className="py-3 px-2">Responsável</th>
              <th className="py-3 px-2">Origem</th>
              <th className="py-3 px-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  Nenhuma transação encontrada correspondente aos filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((t) => {
                const member = members.find((m) => m.id === t.userRef);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition-colors">
                    <td className="py-3 px-2 font-mono text-[11px] text-slate-500">
                      {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-2 font-bold text-slate-800 dark:text-slate-100">
                      {t.description}
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350">
                        {t.category}
                      </span>
                    </td>
                    <td className={`py-3 px-2 text-right font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full ${member?.avatarColor || 'bg-slate-500'} text-white flex items-center justify-center font-black text-[9px]`}>
                          {member?.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-slate-600 dark:text-slate-300 font-bold">{member?.name || 'Comum'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {t.bankSynced ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
                          Sinc. {t.bankName?.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(t)}
                          className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded transition-colors"
                          title="Editar transação"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-55 dark:hover:bg-rose-950/20 rounded transition-colors"
                          title="Deletar transação"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
        <span>Exibindo <strong>{filteredTransactions.length}</strong> de <strong>{transactions.length}</strong> transações registradas</span>
        <button
          onClick={onTriggerBankSyncWidget}
          className="flex items-center gap-1 text-emerald-500 font-bold hover:underline"
        >
          <RefreshCw size={10} /> Sincronizar contas bancárias
        </button>
      </div>

      {/* Modal de Edição de Transação */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-2xl animate-scale-up space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Editar Lançamento
              </h3>
              <button
                onClick={() => setEditingId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 rounded-xl transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Tipo
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as 'income' | 'expense')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="expense">Despesa (Débito)</option>
                    <option value="income">Receita (Crédito)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Categoria
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Membro Responsável
                </label>
                <select
                  value={editUserRef}
                  onChange={(e) => setEditUserRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Limpeza (Substitui confirm bloqueado em iframes) */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-2xl space-y-4 text-center animate-scale-up">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 mb-2">
              <Trash2 size={24} />
            </div>
            
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Iniciar do Zero?
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Deseja realmente limpar todo o histórico de lançamentos para iniciar do zero com seus dados reais? Esta ação não pode ser desfeita.
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllTransactions) {
                    onClearAllTransactions();
                  }
                  setShowConfirmClear(false);
                }}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all shadow-sm"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
