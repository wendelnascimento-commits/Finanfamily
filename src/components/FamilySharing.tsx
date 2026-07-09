import React, { useState } from 'react';
import { FamilyMember } from '../types';
import { Users, Plus, Trash2, Check } from 'lucide-react';

interface FamilySharingProps {
  members: FamilyMember[];
  activeMemberId: string;
  onSelectMember: (id: string) => void;
  onAddMember: (member: Omit<FamilyMember, 'id'>) => void;
  onRemoveMember: (id: string) => void;
}

export default function FamilySharing({
  members,
  activeMemberId,
  onSelectMember,
  onAddMember,
  onRemoveMember,
}: FamilySharingProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Administrador' | 'Membro' | 'Dependente'>('Membro');
  const [color, setColor] = useState('bg-blue-500');

  const colorOptions = [
    { class: 'bg-emerald-500', name: 'Verde' },
    { class: 'bg-blue-500', name: 'Azul' },
    { class: 'bg-indigo-500', name: 'Roxo' },
    { class: 'bg-rose-500', name: 'Rosa' },
    { class: 'bg-amber-500', name: 'Laranja' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddMember({
      name: name.trim(),
      avatarColor: color,
      role,
    });
    setName('');
    setShowAddForm(false);
  };

  const activeMember = members.find(m => m.id === activeMemberId);

  return (
    <div id="family-sharing-section" className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <Users size={18} id="family-sharing-icon" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight uppercase tracking-wider">Orçamento Compartilhado</h2>
            <p className="text-[11px] text-slate-400 font-medium">Gerencie os membros da sua família</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          id="add-family-member-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-black tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
        >
          <Plus size={13} />
          {showAddForm ? 'Cancelar' : 'Convidar'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nome do Membro</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mãe, Filho, Helena"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Papel / Função</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="Administrador">Administrador</option>
                <option value="Membro">Membro</option>
                <option value="Dependente">Dependente</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Cor do Avatar</label>
              <div className="flex gap-1.5 mt-1">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.class}
                    type="button"
                    onClick={() => setColor(opt.class)}
                    className={`w-6 h-6 rounded-full ${opt.class} flex items-center justify-center text-white transition-transform ${
                      color === opt.class ? 'scale-110 ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {color === opt.class && <Check size={11} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-xs transition-colors"
          >
            Adicionar à Família
          </button>
        </form>
      )}

      {/* Members profiles grid */}
      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            onClick={() => onSelectMember(member.id)}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
              activeMemberId === member.id
                ? 'bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/40'
                : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-150 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full ${member.avatarColor} text-white flex items-center justify-center font-black text-sm shadow-inner`}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-850 dark:text-white">
                    {member.name}
                  </span>
                  {activeMemberId === member.id && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 rounded-md">
                      Ativo
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {member.role}
                </span>
              </div>
            </div>

            {/* Remove button (keep at least 1 member) */}
            {members.length > 1 && member.role !== 'Administrador' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveMember(member.id);
                }}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                title="Remover membro"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-4.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          Você está visualizando as finanças de: <span className="font-black text-emerald-500">{activeMember?.name}</span>
        </p>
      </div>
    </div>
  );
}
