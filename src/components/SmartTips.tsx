import React, { useState, useEffect } from 'react';
import { Transaction, FinancialGoal, Investment, FamilyMember, SmartNotification } from '../types';
import { Sparkles, RefreshCw, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';

interface SmartTipsProps {
  transactions: Transaction[];
  goals: FinancialGoal[];
  investments: Investment[];
  familyMembers: FamilyMember[];
  onAddNotification: (notif: Omit<SmartNotification, 'id' | 'date' | 'read'>) => void;
}

export default function SmartTips({
  transactions,
  goals,
  investments,
  familyMembers,
  onAddNotification,
}: SmartTipsProps) {
  const [tips, setTips] = useState<{ title: string; message: string; type: 'tip' | 'warning' }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  const fetchSmartTips = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          goals,
          investments,
          familyMembers,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao obter conselhos do servidor.');
      }

      const data = await response.json();
      if (data.tips) {
        setTips(data.tips);
        setIsSimulated(data.isSimulated || false);
        setErrorInfo(data.errorInfo || null);

        // Feed newly generated tips as smart notifications
        data.tips.forEach((tip: any) => {
          onAddNotification({
            title: `IA: ${tip.title}`,
            message: tip.message,
            type: tip.type === 'warning' ? 'warning' : 'tip',
          });
        });
      }
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível conectar ao consultor de IA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial tips once
    fetchSmartTips();
  }, []);

  return (
    <div id="smart-tips-section" className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <Sparkles size={18} id="smart-tips-sparkles-icon" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight uppercase tracking-wider">Conselhos Inteligentes (IA)</h2>
            <p className="text-[11px] text-slate-400 font-medium">Dicas e análises baseadas na saúde financeira</p>
          </div>
        </div>

        <button
          onClick={fetchSmartTips}
          disabled={loading}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
          title="Atualizar dicas"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-450 animate-pulse font-medium">
            O Gemini está analisando suas receitas, despesas e metas...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-center">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchSmartTips}
            className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300 underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tips.map((tip, idx) => (
            <div
              key={idx}
              className={`flex gap-3.5 p-4 rounded-2xl border transition-all ${
                tip.type === 'warning'
                  ? 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-500/20'
                  : 'bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/20'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {tip.type === 'warning' ? (
                  <AlertTriangle className="text-amber-500" size={16} />
                ) : (
                  <Lightbulb className="text-emerald-500" size={16} />
                )}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
                  {tip.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                  {tip.message}
                </p>
              </div>
            </div>
          ))}

          {isSimulated && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
              <span className="block text-[10px] text-emerald-500 font-black uppercase tracking-wider">
                💡 Dicas de Contingência Inteligente Ativas
              </span>
              <p className="text-[10px] text-slate-400 leading-normal max-w-md mx-auto">
                {errorInfo ? (
                  <>
                    O limite da chave de API gratuita do Gemini foi temporariamente excedido no servidor (ou o modelo está sob alta demanda: Erros 429/503). Ativamos as dicas financeiras locais personalizadas para garantir sua experiência!
                  </>
                ) : (
                  <>
                    Para habilitar conselhos reais gerados dinamicamente via IA, insira sua chave API do Gemini nas Configurações da plataforma.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
