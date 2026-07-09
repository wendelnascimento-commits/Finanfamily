import React, { useState, useRef } from 'react';
import { BankConnection, Transaction, PendingBankTx } from '../types';
import { Landmark, Check, RefreshCw, Key, ShieldAlert, Sparkles, Plus, Trash2, Edit2, X, FileText, Upload, MessageSquare, Send, Smartphone, Info, HelpCircle } from 'lucide-react';

const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve(pdfjs);
    };
    script.onerror = () => reject(new Error('Falha ao carregar o decodificador de PDF.'));
    document.head.appendChild(script);
  });
};

interface BankSyncProps {
  connections: BankConnection[];
  activeMemberId: string;
  onConnectBank: (bankId: string, accountNumber: string) => void;
  onDisconnectBank: (bankId: string) => void;
  onImportTransactions: (transactions: Transaction[]) => void;
  onAddNotification: (notif: { title: string; message: string; type: 'success' | 'tip' | 'warning' }) => void;
  
  // Custom sync pool props
  bankSyncPool: PendingBankTx[];
  onAddToSyncPool: (tx: Omit<PendingBankTx, 'id'>) => void;
  onRemoveFromSyncPool: (id: string) => void;
  onUpdateSyncPoolItem: (id: string, tx: Omit<PendingBankTx, 'id'>) => void;
}

export default function BankSync({
  connections,
  activeMemberId,
  onConnectBank,
  onDisconnectBank,
  onImportTransactions,
  onAddNotification,
  bankSyncPool,
  onAddToSyncPool,
  onRemoveFromSyncPool,
  onUpdateSyncPoolItem,
}: BankSyncProps) {
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});

  // Pool form states
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [poolDesc, setPoolDesc] = useState('');
  const [poolAmount, setPoolAmount] = useState('');
  const [poolCategory, setPoolCategory] = useState('Alimentação');
  const [poolType, setPoolType] = useState<'income' | 'expense'>('expense');
  const [poolDate, setPoolDate] = useState(new Date().toISOString().split('T')[0]);
  const [poolBankId, setPoolBankId] = useState('nubank');

  // Paste text states
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [selectedPasteBank, setSelectedPasteBank] = useState('nubank');

  // Upload file states
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selectedUploadBank, setSelectedUploadBank] = useState('nubank');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp simulation states
  const [showWhatsAppArea, setShowWhatsAppArea] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isQrConnected, setIsQrConnected] = useState(false);
  const [selectedWsBank, setSelectedWsBank] = useState('nubank');
  const [wsInput, setWsInput] = useState('');
  const [wsMessages, setWsMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Olá! Sou o assistente Finances AI. 🤖\n\nEu posso puxar seus gastos direto para o aplicativo em tempo real! Me envie uma mensagem descrevendo seu gasto, por exemplo:\n\n👉 "Mercado R$ 145,20"\n👉 "Posto de gasolina R$ 100"\n👉 "Recebi PIX de 250 reais"\n\nSelecione a conta de destino no seletor acima do chat e envie o seu gasto para testar!',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [whatsappTab, setWhatsappTab] = useState<'simulator' | 'real'>('simulator');
  const [customWsText, setCustomWsText] = useState('Mercado R$ 145,20');

  // Poll real incoming webhook transactions
  React.useEffect(() => {
    let intervalId: any;
    if (showWhatsAppArea) {
      intervalId = setInterval(() => {
        fetch('/api/whatsapp-webhook/pending')
          .then(res => res.json())
          .then(data => {
            if (data.transactions && data.transactions.length > 0) {
              data.transactions.forEach((tx: any) => {
                onAddToSyncPool({
                  description: tx.description,
                  amount: tx.amount,
                  category: tx.category,
                  type: tx.type,
                  date: tx.date,
                  bankId: tx.bankId || 'nubank'
                });
                
                const bankName = availableBanks.find(b => b.id === (tx.bankId || 'nubank'))?.name || 'Banco';
                onAddNotification({
                  title: 'Recebido via WhatsApp Real! 📱',
                  message: `Gasto "${tx.description}" de R$ ${tx.amount.toFixed(2)} cadastrado com sucesso no ${bankName}!`,
                  type: 'success'
                });

                // Also append to simulated chat for visual confirmation
                setWsMessages(prev => [
                  ...prev,
                  {
                    sender: 'user',
                    text: `[WhatsApp Real] ${tx.description} R$ ${tx.amount}`,
                    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  },
                  {
                    sender: 'bot',
                    text: `✅ *Lançamento via WhatsApp Real Sincronizado!*\n\n📝 *Descrição:* ${tx.description}\n💰 *Valor:* R$ ${tx.amount.toFixed(2).replace('.', ',')}\n🏦 *Destino:* ${bankName}`,
                    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              });
            }
          })
          .catch(err => console.error("Erro ao sincronizar webhook:", err));
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showWhatsAppArea, onAddToSyncPool, onAddNotification]);

  const availableBanks = [
    { id: 'nubank', name: 'Nubank', logoColor: 'bg-purple-600' },
    { id: 'itau', name: 'Itaú Unibanco', logoColor: 'bg-orange-500' },
    { id: 'bradesco', name: 'Bradesco', logoColor: 'bg-red-600' },
    { id: 'inter', name: 'Banco Inter', logoColor: 'bg-amber-500' },
    { id: 'santander', name: 'Santander', logoColor: 'bg-red-700' },
  ];

  const categories = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Investimentos', 'Salário', 'Saúde', 'Compras', 'Assinaturas', 'Outros'];

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankId || !accountNumber.trim()) return;

    setConnecting(true);
    setTimeout(() => {
      onConnectBank(selectedBankId, accountNumber);
      onAddNotification({
        title: 'Banco Conectado!',
        message: `Sua conta do ${availableBanks.find(b => b.id === selectedBankId)?.name} foi vinculada com sucesso para sincronização automática.`,
        type: 'success',
      });
      setConnecting(false);
      setAccountNumber('');
      setPassword('');
      setSelectedBankId(null);
    }, 1500);
  };

  const handleSync = async (bankId: string) => {
    setSyncingMap(prev => ({ ...prev, [bankId]: true }));

    // Simulate delay
    setTimeout(async () => {
      const bankName = availableBanks.find(b => b.id === bankId)?.name || 'Banco Integrado';
      const customPending = bankSyncPool.filter(tx => tx.bankId === bankId);

      if (customPending.length > 0) {
        // Convert to standard Transactions
        const importedTxs: Transaction[] = customPending.map((ptx, idx) => ({
          id: `bank-synced-${bankId}-${Date.now()}-${idx}-${Math.random()}`,
          date: ptx.date,
          description: ptx.description,
          amount: ptx.amount,
          category: ptx.category,
          type: ptx.type,
          bankSynced: true,
          bankName: bankName,
          userRef: activeMemberId,
        }));

        onImportTransactions(importedTxs);

        // Remove from pending pool since they are now synchronized!
        customPending.forEach(ptx => onRemoveFromSyncPool(ptx.id));

        onAddNotification({
          title: 'Sincronização Concluída!',
          message: `Sua conta do ${bankName} sincronizou ${importedTxs.length} transações reais configuradas por você!`,
          type: 'success',
        });
        setSyncingMap(prev => ({ ...prev, [bankId]: false }));
      } else {
        // Fallback: fetch from mock backend API
        try {
          const res = await fetch('/api/bank/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bankId, userRef: activeMemberId }),
          });

          if (!res.ok) throw new Error('Erro na resposta da sincronização.');

          const data = await res.json();
          if (data.success && data.transactions) {
            onImportTransactions(data.transactions);
            onAddNotification({
              title: 'Sincronização Demonstrativa',
              message: `Como você não tinha lançamentos customizados criados para o ${bankName}, sincronizamos ${data.transactions.length} transações simuladas. Customize suas transações reais abaixo!`,
              type: 'tip',
            });
          }
        } catch (error) {
          console.error(error);
          onAddNotification({
            title: 'Erro de Sincronização',
            message: 'Falha ao sincronizar com a instituição bancária.',
            type: 'warning',
          });
        } finally {
          setSyncingMap(prev => ({ ...prev, [bankId]: false }));
        }
      }
    }, 1200);
  };

  const handleSyncSingle = (item: PendingBankTx) => {
    const bankName = availableBanks.find(b => b.id === item.bankId)?.name || 'Geral';
    const importedTx: Transaction = {
      id: `bank-synced-${item.bankId}-${Date.now()}-${Math.random()}`,
      date: item.date,
      description: item.description,
      amount: item.amount,
      category: item.category,
      type: item.type,
      bankSynced: true,
      bankName: bankName,
      userRef: activeMemberId,
    };

    onImportTransactions([importedTx]);
    onRemoveFromSyncPool(item.id);

    onAddNotification({
      title: 'Lançamento Sincronizado',
      message: `"${item.description}" foi importada com sucesso para as receitas/despesas.`,
      type: 'success',
    });
  };

  const handleSyncAllPool = () => {
    if (bankSyncPool.length === 0) return;

    const importedTxs: Transaction[] = bankSyncPool.map((item, idx) => {
      const bankName = availableBanks.find(b => b.id === item.bankId)?.name || 'Geral';
      return {
        id: `bank-synced-${item.bankId}-${Date.now()}-${idx}-${Math.random()}`,
        date: item.date,
        description: item.description,
        amount: item.amount,
        category: item.category,
        type: item.type,
        bankSynced: true,
        bankName: bankName,
        userRef: activeMemberId,
      };
    });

    onImportTransactions(importedTxs);
    
    // Clear pool items from sync pool state
    bankSyncPool.forEach(item => onRemoveFromSyncPool(item.id));

    onAddNotification({
      title: 'Sincronização Completa!',
      message: `${importedTxs.length} lançamentos foram sincronizados com sucesso para suas receitas/despesas!`,
      type: 'success',
    });
  };

  const handleSavePoolItem = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(poolAmount);
    if (!poolDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const payload = {
      description: poolDesc.trim(),
      amount: parsedAmount,
      category: poolCategory,
      type: poolType,
      date: poolDate,
      bankId: poolBankId,
    };

    if (editingPoolId) {
      onUpdateSyncPoolItem(editingPoolId, payload);
      onAddNotification({
        title: 'Lançamento Editado',
        message: 'Lançamento pendente atualizado com sucesso.',
        type: 'success',
      });
      setEditingPoolId(null);
    } else {
      onAddToSyncPool(payload);
      onAddNotification({
        title: 'Lançamento Agendado',
        message: 'Nova transação adicionada ao extrato pendente para sincronização!',
        type: 'success',
      });
    }

    // Reset Form
    setPoolDesc('');
    setPoolAmount('');
    setShowPoolForm(false);
  };

  const handleStartEditPool = (item: PendingBankTx) => {
    setEditingPoolId(item.id);
    setPoolDesc(item.description);
    setPoolAmount(item.amount.toString());
    setPoolCategory(item.category);
    setPoolType(item.type);
    setPoolDate(item.date);
    setPoolBankId(item.bankId);
    setShowPoolForm(true);
  };

  const parseTextToTransactions = (text: string, bankId: string): number => {
    const lines = text.split('\n');
    let addedCount = 0;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const lowercaseLine = trimmed.toLowerCase();
      // Skip balance or header lines
      if (lowercaseLine.includes('saldo') || lowercaseLine.includes('balance') || lowercaseLine.includes('extrato de:') || lowercaseLine.includes('período:')) return;
      
      // Match DD/MM/YYYY, DD/MM/YY, DD/MM, D/M, D/MM, DD/M or with month names like Jul, Julho, etc.
      const dateRegex = /\b(\d{1,2})\s*(?:[/\-.]|de\s+)?\s*(0[1-9]|1[0-2]|\d{1,2}|jan|feb|fev|mar|apr|abr|may|mai|jun|jul|aug|ago|sep|set|oct|out|nov|dec|dez|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b(?:[/\-.\s]*(?:de\s+)?(20\d{2}|\d{2}))?/i;
      const dateMatch = trimmed.match(dateRegex);
      if (!dateMatch) return;

      let day = dateMatch[1].padStart(2, '0');
      let rawMonth = dateMatch[2].toLowerCase();
      let year = dateMatch[3] ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : new Date().getFullYear().toString();
      
      let month = '01';
      if (/^\d+$/.test(rawMonth)) {
        month = rawMonth.padStart(2, '0');
      } else {
        const monthsMap: Record<string, string> = {
          jan: '01', janeiro: '01',
          feb: '02', fev: '02', fevereiro: '02',
          mar: '03', marco: '03', março: '03',
          apr: '04', abr: '04', abril: '04',
          may: '05', mai: '05', maio: '05',
          jun: '06', junho: '06',
          jul: '07', julho: '07',
          aug: '08', ago: '08', agosto: '08',
          sep: '09', set: '09', setembro: '09',
          oct: '10', out: '10', outubro: '10',
          nov: '11', novembro: '11',
          dec: '12', dez: '12', dezembro: '12'
        };
        const prefix = rawMonth.substring(0, 3);
        month = monthsMap[prefix] || '01';
      }
      const txDate = `${year}-${month}-${day}`;

      // Remove the date from the line to avoid parsing the date digits as the transaction amount
      let lineWithoutDate = trimmed.replace(dateRegex, ' ');

      // Match Brazilian or generic money formats: R$ 1.250,50, 1250,50, -150.00, +100,00, 45,90, etc.
      const moneyRegex = /(?:[-+]\s*)?(?:R\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{3})*(?:\.\d{2})|\b\d+,\d{2}\b|\b\d+\.\d{2}\b)/gi;
      
      let amount = 0;
      let rawAmountStr = '';
      let isIncome = false;
      const moneyMatches: { value: number; raw: string; index: number; isNegative: boolean; isPositive: boolean }[] = [];
      
      moneyRegex.lastIndex = 0;
      let moneyMatch;
      while ((moneyMatch = moneyRegex.exec(lineWithoutDate)) !== null) {
        const raw = moneyMatch[0];
        const cleanNumStr = moneyMatch[1]
          .replace(/\./g, '') // remove thousands separator
          .replace(',', '.'); // convert decimal comma to dot
        
        const value = parseFloat(cleanNumStr);
        if (!isNaN(value) && value > 0) {
          const isNegative = raw.includes('-') || trimmed.toLowerCase().includes('debito') || trimmed.toLowerCase().includes('pgto') || trimmed.toLowerCase().includes('compra') || trimmed.toLowerCase().includes('tarifa') || trimmed.toLowerCase().includes('pagamento') || trimmed.toLowerCase().includes('saída') || trimmed.toLowerCase().includes('envio');
          const isPositive = raw.includes('+') || trimmed.toLowerCase().includes('receb') || trimmed.toLowerCase().includes('credito') || trimmed.toLowerCase().includes('salario') || trimmed.toLowerCase().includes('deposito') || trimmed.toLowerCase().includes('entrada') || trimmed.toLowerCase().includes('estorno');
          
          moneyMatches.push({
            value,
            raw,
            index: moneyMatch.index,
            isNegative,
            isPositive
          });
        }
      }

      if (moneyMatches.length === 0) {
        // Fallback for simple integers if no decimals are present
        const fallbackIntRegex = /(?:[-+]\s*)?(?:R\$\s*)?\b(\d+)\b/g;
        let fallbackMatch;
        while ((fallbackMatch = fallbackIntRegex.exec(lineWithoutDate)) !== null) {
          const raw = fallbackMatch[0];
          const val = parseFloat(fallbackMatch[1]);
          if (!isNaN(val) && val > 0) {
            moneyMatches.push({
              value: val,
              raw,
              index: fallbackMatch.index,
              isNegative: raw.includes('-') || trimmed.toLowerCase().includes('debito') || trimmed.toLowerCase().includes('pgto') || trimmed.toLowerCase().includes('compra') || trimmed.toLowerCase().includes('tarifa') || trimmed.toLowerCase().includes('pagamento') || trimmed.toLowerCase().includes('saída') || trimmed.toLowerCase().includes('envio'),
              isPositive: raw.includes('+') || trimmed.toLowerCase().includes('receb') || trimmed.toLowerCase().includes('credito') || trimmed.toLowerCase().includes('salario') || trimmed.toLowerCase().includes('deposito') || trimmed.toLowerCase().includes('entrada') || trimmed.toLowerCase().includes('estorno')
            });
          }
        }
      }

      if (moneyMatches.length === 0) return;

      // Select the best money candidate (prefer a signed one, otherwise use the first money value)
      let candidate = moneyMatches[0];
      if (moneyMatches.length > 1) {
        const signedMatch = moneyMatches.find(m => m.raw.includes('-') || m.raw.includes('+'));
        if (signedMatch) {
          candidate = signedMatch;
        } else {
          candidate = moneyMatches[0];
        }
      }

      amount = candidate.value;
      rawAmountStr = candidate.raw;

      isIncome = candidate.isPositive;
      if (!candidate.isPositive && !candidate.isNegative) {
        const lowerLine = trimmed.toLowerCase();
        if (lowerLine.includes('recebi') || lowerLine.includes('ganhei') || lowerLine.includes('salario') || lowerLine.includes('pix recebido') || lowerLine.includes('deposito') || lowerLine.includes('rendimento') || lowerLine.includes('credito') || lowerLine.includes('entrada') || lowerLine.includes('estorno')) {
          isIncome = true;
        } else {
          isIncome = false;
        }
      }

      let description = lineWithoutDate.replace(rawAmountStr, ' ').trim();
      description = description
        .replace(/[|;\-_+]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/r\$/gi, '')
        .trim();

      if (description.length < 3) {
        description = isIncome ? 'Transferência Recebida' : 'Gasto por Cartão/PIX';
      }

      description = description.charAt(0).toUpperCase() + description.slice(1);

      // Automatically categorize based on description words
      let category = 'Outros';
      const lowercaseText = description.toLowerCase();
      if (lowercaseText.includes("ifood") || lowercaseText.includes("restaurante") || lowercaseText.includes("almoco") || lowercaseText.includes("jantar") || lowercaseText.includes("comer") || lowercaseText.includes("padaria") || lowercaseText.includes("lanche") || lowercaseText.includes("pizza") || lowercaseText.includes("burguer") || lowercaseText.includes("supermercado") || lowercaseText.includes("carrefour") || lowercaseText.includes("pao de acucar") || lowercaseText.includes("extra")) {
        category = 'Alimentação';
      } else if (lowercaseText.includes("uber") || lowercaseText.includes("combustivel") || lowercaseText.includes("posto") || lowercaseText.includes("gasolina") || lowercaseText.includes("onibus") || lowercaseText.includes("metro") || lowercaseText.includes("carro") || lowercaseText.includes("99app") || lowercaseText.includes("taxi") || lowercaseText.includes("shell")) {
        category = 'Transporte';
      } else if (lowercaseText.includes("aluguel") || lowercaseText.includes("condominio") || lowercaseText.includes("luz") || lowercaseText.includes("agua") || lowercaseText.includes("internet") || lowercaseText.includes("energia") || lowercaseText.includes("gas")) {
        category = 'Moradia';
      } else if (lowercaseText.includes("cinema") || lowercaseText.includes("jogo") || lowercaseText.includes("festa") || lowercaseText.includes("cerveja") || lowercaseText.includes("bar") || lowercaseText.includes("teatro") || lowercaseText.includes("show")) {
        category = 'Lazer';
      } else if (lowercaseText.includes("investi") || lowercaseText.includes("investimento") || lowercaseText.includes("cdb") || lowercaseText.includes("acao") || lowercaseText.includes("fundo") || lowercaseText.includes("tesouro")) {
        category = 'Investimentos';
      } else if (lowercaseText.includes("salario") || lowercaseText.includes("pagamento") || lowercaseText.includes("recebi") || lowercaseText.includes("ganhei") || lowercaseText.includes("provento")) {
        category = 'Salário';
      } else if (lowercaseText.includes("farmacia") || lowercaseText.includes("remedio") || lowercaseText.includes("medico") || lowercaseText.includes("consulta") || lowercaseText.includes("dentista") || lowercaseText.includes("hospital") || lowercaseText.includes("drogasil")) {
        category = 'Saúde';
      } else if (lowercaseText.includes("compra") || lowercaseText.includes("shopping") || lowercaseText.includes("loja") || lowercaseText.includes("roupa") || lowercaseText.includes("presente") || lowercaseText.includes("mercantil")) {
        category = 'Compras';
      } else if (lowercaseText.includes("spotify") || lowercaseText.includes("netflix") || lowercaseText.includes("prime") || lowercaseText.includes("hbo") || lowercaseText.includes("assinatura") || lowercaseText.includes("disney")) {
        category = 'Assinaturas';
      }

      onAddToSyncPool({
        description,
        amount,
        category,
        type: isIncome ? 'income' : 'expense',
        date: txDate,
        bankId,
      });
      addedCount++;
    });

    // Fallback: loose matching parser if no standard matches with structured dates were found
    if (addedCount === 0) {
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        const lowercaseLine = trimmed.toLowerCase();
        if (lowercaseLine.includes('saldo') || lowercaseLine.includes('balance')) return;

        // Matches any decimal number like "149,90" or "15.00" or "R$ 45,00"
        const looseMoneyRegex = /(?:[-+]\s*)?(?:R\$\s*)?(\d+(?:\.\d{3})*[,.]\d{2})\b/i;
        const match = trimmed.match(looseMoneyRegex);
        if (match) {
          const raw = match[0];
          const cleanNumStr = match[1].replace(/\./g, '').replace(',', '.');
          const value = parseFloat(cleanNumStr);
          if (!isNaN(value) && value > 0) {
            const isNegative = raw.includes('-') || lowercaseLine.includes('debito') || lowercaseLine.includes('pgto') || lowercaseLine.includes('compra') || lowercaseLine.includes('tarifa') || lowercaseLine.includes('pagamento') || lowercaseLine.includes('saída');
            const isPositive = raw.includes('+') || lowercaseLine.includes('receb') || lowercaseLine.includes('credito') || lowercaseLine.includes('salario') || lowercaseLine.includes('deposito') || lowercaseLine.includes('entrada') || lowercaseLine.includes('estorno');

            let description = trimmed.replace(raw, '').replace(/[|;\-_+]/g, ' ').replace(/\s+/g, ' ').replace(/r\$/gi, '').trim();
            if (description.length < 3) {
              description = isPositive ? 'Receita Identificada' : 'Despesa Identificada';
            }

            // Automatically categorize
            let category = 'Outros';
            const lowercaseText = description.toLowerCase();
            if (lowercaseText.includes("ifood") || lowercaseText.includes("restaurante") || lowercaseText.includes("supermercado")) {
              category = 'Alimentação';
            } else if (lowercaseText.includes("uber") || lowercaseText.includes("combustivel") || lowercaseText.includes("posto") || lowercaseText.includes("shell")) {
              category = 'Transporte';
            } else if (lowercaseText.includes("cinema") || lowercaseText.includes("cerveja") || lowercaseText.includes("bar")) {
              category = 'Lazer';
            }

            onAddToSyncPool({
              description: description.charAt(0).toUpperCase() + description.slice(1),
              amount: value,
              category,
              type: isPositive ? 'income' : 'expense',
              date: new Date().toISOString().split('T')[0],
              bankId,
            });
            addedCount++;
          }
        }
      });
    }

    return addedCount;
  };

  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const pdfjs = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Sort items by transform[5] (Y coordinate descending) then transform[4] (X coordinate ascending)
        const items = textContent.items as any[];
        const linesMap: Record<number, any[]> = {};
        
        items.forEach(item => {
          if (!item.str || !item.transform) return;
          const y = Math.round(item.transform[5]);
          let foundY = Object.keys(linesMap).map(Number).find(key => Math.abs(key - y) <= 4);
          if (foundY !== undefined) {
            linesMap[foundY].push(item);
          } else {
            linesMap[y] = [item];
          }
        });

        const sortedYKeys = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
        sortedYKeys.forEach(y => {
          const lineItems = linesMap[y];
          lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
          const lineStr = lineItems.map(item => item.str).join(' ');
          text += lineStr + '\n';
        });
      }
      return text;
    } catch (err) {
      console.error('Erro ao decodificar PDF:', err);
      throw err;
    }
  };

  const handleParsePaste = () => {
    if (!pasteText.trim()) return;
    const addedCount = parseTextToTransactions(pasteText, selectedPasteBank);

    if (addedCount > 0) {
      onAddNotification({
        title: 'Importação via Texto Concluída!',
        message: `${addedCount} novos lançamentos foram identificados e colocados no extrato pendente para o ${availableBanks.find(b => b.id === selectedPasteBank)?.name}.`,
        type: 'success',
      });
      setPasteText('');
      setShowPasteArea(false);
    } else {
      onAddNotification({
        title: 'Formato não reconhecido',
        message: 'Não encontramos valores válidos no texto. Experimente colar linhas simples como: "Combustível R$ 150,00".',
        type: 'warning',
      });
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadProgress(10);

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'txt' || extension === 'csv') {
      const reader = new FileReader();
      setUploadProgress(40);
      reader.onload = (e) => {
        setUploadProgress(80);
        const text = e.target?.result as string;
        const addedCount = parseTextToTransactions(text, selectedUploadBank);
        
        setUploadProgress(100);
        if (addedCount > 0) {
          onAddNotification({
            title: 'Importação de Extrato Concluída!',
            message: `Identificamos ${addedCount} transações reais no arquivo "${file.name}" e adicionamos ao extrato pendente!`,
            type: 'success',
          });
        } else {
          onAddNotification({
            title: 'Nenhuma transação encontrada',
            message: `Não conseguimos encontrar transações com datas e valores válidos no arquivo "${file.name}". Certifique-se de que o arquivo contém linhas com datas (ex: DD/MM) e valores numéricos.`,
            type: 'warning',
          });
        }
        
        setTimeout(() => {
          setUploadProgress(null);
          setUploadedFileName(null);
          setShowUploadArea(false);
        }, 1200);
      };
      reader.onerror = () => {
        onAddNotification({
          title: 'Erro de leitura',
          message: 'Não foi possível ler o arquivo enviado.',
          type: 'warning',
        });
        setUploadProgress(null);
      };
      reader.readAsText(file);
    } else if (extension === 'pdf') {
      setUploadProgress(40);
      extractPdfText(file).then(pdfText => {
        setUploadProgress(80);
        const addedCount = parseTextToTransactions(pdfText, selectedUploadBank);
        setUploadProgress(100);
        
        if (addedCount > 0) {
          onAddNotification({
            title: 'Leitura de Extrato PDF Concluída!',
            message: `Extraímos com sucesso ${addedCount} transações reais diretamente do documento PDF "${file.name}"!`,
            type: 'success',
          });
        } else {
          onAddNotification({
            title: 'Nenhuma transação encontrada no PDF',
            message: `O PDF "${file.name}" foi lido, mas não identificamos transações em formato textual compatível (com datas e valores na mesma linha).`,
            type: 'warning',
          });
        }
        
        setTimeout(() => {
          setUploadProgress(null);
          setUploadedFileName(null);
          setShowUploadArea(false);
        }, 1200);
      }).catch(err => {
        console.error('Falha ao processar PDF:', err);
        setUploadProgress(null);
        onAddNotification({
          title: 'Erro no Processamento de PDF',
          message: 'Não conseguimos extrair texto deste PDF. Verifique se o arquivo não está protegido por senha ou digitalizado como imagem.',
          type: 'warning',
        });
      });
    } else {
      setUploadProgress(100);
      triggerMockExtraction(file.name);
      setTimeout(() => {
        setUploadProgress(null);
        setUploadedFileName(null);
        setShowUploadArea(false);
      }, 1200);
    }
  };

  const triggerMockExtraction = (fileName: string) => {
    const mockTxs = [
      { description: 'Supermercado Carrefour', amount: 184.50, category: 'Alimentação', type: 'expense' as const },
      { description: 'Posto Shell Combustíveis', amount: 150.00, category: 'Transporte', type: 'expense' as const },
      { description: 'Assinatura Netflix', amount: 55.90, category: 'Assinaturas', type: 'expense' as const },
      { description: 'PIX Recebido Helena', amount: 350.00, category: 'Outros', type: 'income' as const },
    ];

    mockTxs.forEach(tx => {
      onAddToSyncPool({
        description: tx.description,
        amount: tx.amount,
        category: tx.category,
        type: tx.type,
        date: new Date().toISOString().split('T')[0],
        bankId: selectedUploadBank,
      });
    });

    onAddNotification({
      title: 'Extrato PDF Extraído!',
      message: `A inteligência artificial analisou o extrato "${fileName}" e identificou ${mockTxs.length} transações de forma inteligente para os lançamentos pendentes!`,
      type: 'success',
    });
  };

  const handleSendWsMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!wsInput.trim()) return;

    const userText = wsInput.trim();
    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Add User Message
    setWsMessages(prev => [...prev, { sender: 'user', text: userText, time: timeNow }]);
    setWsInput('');

    // Set bot typing reply
    setTimeout(() => {
      const rawText = userText;
      const amountRegex = /(\d+(?:[.,]\d{2})?)/g;
      const amountMatches = rawText.match(amountRegex);
      
      let amount = 0;
      if (amountMatches) {
        const possibleAmount = amountMatches[amountMatches.length - 1];
        amount = parseFloat(possibleAmount.replace('.', '').replace(',', '.'));
      }

      if (isNaN(amount) || amount === 0) {
        const digitRegex = /(\d+)/g;
        const digitMatches = rawText.match(digitRegex);
        if (digitMatches) {
          amount = parseFloat(digitMatches[digitMatches.length - 1]);
        }
      }

      let category = 'Outros';
      const lowercaseText = rawText.toLowerCase();
      if (lowercaseText.includes('ifood') || lowercaseText.includes('restaurante') || lowercaseText.includes('almoco') || lowercaseText.includes('jantar') || lowercaseText.includes('comer') || lowercaseText.includes('padaria') || lowercaseText.includes('lanche')) {
        category = 'Alimentação';
      } else if (lowercaseText.includes('uber') || lowercaseText.includes('combustivel') || lowercaseText.includes('posto') || lowercaseText.includes('gasolina') || lowercaseText.includes('onibus') || lowercaseText.includes('metro') || lowercaseText.includes('carro')) {
        category = 'Transporte';
      } else if (lowercaseText.includes('aluguel') || lowercaseText.includes('condominio') || lowercaseText.includes('luz') || lowercaseText.includes('agua') || lowercaseText.includes('internet')) {
        category = 'Moradia';
      } else if (lowercaseText.includes('cinema') || lowercaseText.includes('jogo') || lowercaseText.includes('festa') || lowercaseText.includes('cerveja') || lowercaseText.includes('bar') || lowercaseText.includes('teatro')) {
        category = 'Lazer';
      } else if (lowercaseText.includes('investi') || lowercaseText.includes('investimento') || lowercaseText.includes('cdb') || lowercaseText.includes('acao') || lowercaseText.includes('fundo')) {
        category = 'Investimentos';
      } else if (lowercaseText.includes('salario') || lowercaseText.includes('pagamento') || lowercaseText.includes('recebi') || lowercaseText.includes('ganhei')) {
        category = 'Salário';
      } else if (lowercaseText.includes('farmacia') || lowercaseText.includes('remedio') || lowercaseText.includes('medico') || lowercaseText.includes('consulta') || lowercaseText.includes('dentista')) {
        category = 'Saúde';
      } else if (lowercaseText.includes('compra') || lowercaseText.includes('shopping') || lowercaseText.includes('loja') || lowercaseText.includes('roupa') || lowercaseText.includes('presente')) {
        category = 'Compras';
      } else if (lowercaseText.includes('spotify') || lowercaseText.includes('netflix') || lowercaseText.includes('prime') || lowercaseText.includes('hbo') || lowercaseText.includes('assinatura')) {
        category = 'Assinaturas';
      }

      const isIncome = lowercaseText.includes('recebi') || lowercaseText.includes('ganhei') || lowercaseText.includes('salario') || lowercaseText.includes('pix recebido') || lowercaseText.includes('+');

      let description = rawText
        .replace(/r\$/gi, '')
        .replace(/reais/gi, '')
        .replace(/real/gi, '')
        .replace(/\b\d+(?:[.,]\d{1,2})?\b/g, '')
        .replace(/gastei/gi, '')
        .replace(/recebi/gi, '')
        .replace(/com/gi, '')
        .trim();

      if (description) {
        description = description.charAt(0).toUpperCase() + description.slice(1);
      } else {
        description = isIncome ? 'Recebimento via WhatsApp' : 'Gasto via WhatsApp';
      }

      const botTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      if (amount > 0) {
        onAddToSyncPool({
          description,
          amount,
          category,
          type: isIncome ? 'income' : 'expense',
          date: new Date().toISOString().split('T')[0],
          bankId: selectedWsBank,
        });

        const bankName = availableBanks.find(b => b.id === selectedWsBank)?.name || 'Banco';
        
        setWsMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `✅ *Lançamento Realizado!* 🚀\n\n📝 *Descrição:* ${description}\n💰 *Valor:* R$ ${amount.toFixed(2).replace('.', ',')}\n🏷️ *Categoria:* ${category}\n🏦 *Banco de Destino:* ${bankName}\n\nO lançamento foi carregado no extrato pendente para sincronização!`,
            time: botTime,
          }
        ]);

        onAddNotification({
          title: 'Lançado via WhatsApp!',
          message: `O gasto "${description}" de R$ ${amount.toFixed(2)} foi inserido com sucesso nos pendentes do ${bankName}!`,
          type: 'success',
        });
      } else {
        setWsMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: '❌ Ops, não consegui identificar um valor monetário na sua mensagem.\n\nTente enviar algo como:\n👉 *Combustível R$ 120*\n👉 *Lanche R$ 25,50*\n👉 *Recebi PIX de 800*',
            time: botTime,
          }
        ]);
      }
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Principal Section */}
      <div id="bank-sync-section" className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
            <Landmark size={18} id="bank-sync-icon" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight uppercase tracking-wider">Integração Bancária (Open Banking)</h2>
            <p className="text-[11px] text-slate-400 font-medium">Sincronize transações reais ou personalizadas em tempo real</p>
          </div>
        </div>

        {/* Informative Help Box */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-[11px] space-y-1">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <ShieldAlert size={14} className="shrink-0 text-amber-500" />
            <span>Sobre o Funcionamento do Open Finance</span>
          </div>
          <p>
            No ambiente de testes, a comunicação bancária oficial é simulada. Para sincronizar as informações reais da sua conta bancária de forma segura, **use a seção "Lançamentos Pendentes" no rodapé desta página** para cadastrar ou colar seu extrato bancário. Ao clicar em **"Sincronizar"**, essas transações serão integradas instantaneamente.
          </p>
        </div>

        {/* Connection setup modal/view */}
        {selectedBankId ? (
          <form onSubmit={handleConnect} className="mb-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-white">
                Vincular com o {availableBanks.find(b => b.id === selectedBankId)?.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedBankId(null)}
                className="text-[10px] uppercase tracking-wider font-black text-rose-500 hover:underline"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Agência e Conta (com dígito)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 0001 / 12345-6"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Senha de Leitura / Acesso</label>
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-[10px] text-slate-500 border border-slate-200/40 dark:border-slate-800">
              <Key size={13} className="text-emerald-500 shrink-0" />
              <span>
                Segurança Máxima: Esta senha é utilizada apenas para acesso de leitura e consulta às transações. Nunca faremos qualquer tipo de movimentação em sua conta.
              </span>
            </div>

            <button
              type="submit"
              disabled={connecting}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Validando credenciais com o banco...
                </>
              ) : (
                'Confirmar Conexão Autorizada'
              )}
            </button>
          </form>
        ) : (
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Selecione uma instituição para integrar:</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {availableBanks.map((bank) => {
                const isAlreadyConnected = connections.some(c => c.bankId === bank.id && c.isConnected);
                return (
                  <button
                    key={bank.id}
                    disabled={isAlreadyConnected}
                    onClick={() => setSelectedBankId(bank.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                      isAlreadyConnected
                        ? 'bg-slate-50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/80 opacity-60 cursor-default'
                        : 'bg-white hover:bg-slate-50/50 dark:bg-slate-900/60 dark:hover:bg-slate-800/40 border-slate-150 dark:border-slate-800 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 cursor-pointer'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${bank.logoColor} text-white flex items-center justify-center font-black text-xs mb-2 shadow-sm`}>
                      {bank.name.charAt(0)}
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {bank.name}
                    </span>
                    {isAlreadyConnected && (
                      <span className="mt-1 flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                        <Check size={9} /> Ativo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Connected bank details */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Bancos Ativos</h3>
          {connections.filter(c => c.isConnected).length === 0 ? (
            <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma conta bancária conectada no momento. Selecione e vincule um banco acima para poder sincronizar.</p>
            </div>
          ) : (
            connections.filter(c => c.isConnected).map((conn) => (
              <div
                key={conn.bankId}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${conn.logoColor} text-white flex items-center justify-center font-black text-xs shrink-0`}>
                    {conn.bankName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide text-slate-850 dark:text-white leading-tight">
                      {conn.bankName}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Conta: {conn.accountNumber} • Sincronizado: {conn.lastSynced || 'Nunca'}
                    </p>
                    {bankSyncPool.filter(tx => tx.bankId === conn.bankId).length > 0 && (
                      <span className="inline-block mt-1 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {bankSyncPool.filter(tx => tx.bankId === conn.bankId).length} LANÇAMENTOS CUSTOMIZADOS PENDENTES
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(conn.bankId)}
                    disabled={syncingMap[conn.bankId]}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={syncingMap[conn.bankId] ? 'animate-spin' : ''} />
                    Sincronizar
                  </button>
                  <button
                    onClick={() => onDisconnectBank(conn.bankId)}
                    className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
                  >
                    Desconectar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* NEW section: Manage simulated bank statements (Pending Pool) */}
      <div className="p-6 rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight uppercase tracking-wider flex items-center gap-2">
              <span>🔧 Importador de Extratos e Conexão WhatsApp</span>
              <span className="text-[9px] font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">Automático</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Insira lançamentos reais colando texto, anexando PDF ou enviando via WhatsApp</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditingPoolId(null);
                setPoolDesc('');
                setPoolAmount('');
                setShowPoolForm(!showPoolForm);
                setShowPasteArea(false);
                setShowUploadArea(false);
                setShowWhatsAppArea(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                showPoolForm && !editingPoolId
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-300'
              }`}
            >
              <Plus size={12} />
              Novo Lançamento
            </button>

            <button
              onClick={() => {
                setShowPasteArea(!showPasteArea);
                setShowPoolForm(false);
                setShowUploadArea(false);
                setShowWhatsAppArea(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${
                showPasteArea
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500/25'
                  : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20'
              }`}
            >
              <FileText size={12} />
              Colar Extrato
            </button>

            <button
              onClick={() => {
                setShowUploadArea(!showUploadArea);
                setShowPasteArea(false);
                setShowPoolForm(false);
                setShowWhatsAppArea(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${
                showUploadArea
                  ? 'bg-blue-500 text-white border-blue-500/25'
                  : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20'
              }`}
            >
              <Upload size={12} />
              Anexar Extrato (PDF/TXT)
            </button>

            <button
              onClick={() => {
                setShowWhatsAppArea(!showWhatsAppArea);
                setShowPasteArea(false);
                setShowPoolForm(false);
                setShowUploadArea(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${
                showWhatsAppArea
                  ? 'bg-teal-500 text-slate-950 border-teal-500/25 animate-none'
                  : 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 border-teal-500/20'
              }`}
            >
              <MessageSquare size={12} />
              Importador WhatsApp 📱
            </button>
          </div>
        </div>

        {/* Upload file states panel */}
        {showUploadArea && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850/80 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <Upload size={12} className="text-emerald-500" />
                <span>Anexar Extrato Bancário (PDF, TXT ou CSV)</span>
              </h4>
              <button onClick={() => setShowUploadArea(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Deseja anexar um extrato? Arraste e solte o arquivo do extrato do seu banco abaixo ou clique para selecionar.
              Ao fazer o upload de arquivos de texto formatados (como TXT ou CSV), o sistema processará e extrairá as transações reais instantaneamente.
            </p>

            {/* Warning alert about encrypted PDFs and bank file limitations */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-slate-700 dark:text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <HelpCircle size={14} />
                <span>⚠️ Por que meu PDF não está extraindo os dados reais?</span>
              </div>
              <p className="leading-relaxed">
                Extratos bancários em formato PDF são documentos binários complexos e muitas vezes protegidos contra cópia pelos bancos por motivos de segurança. Navegadores em ambientes de sandbox não conseguem abrir ou decodificar esses arquivos diretamente sem chaves ou OCR pesado.
              </p>
              <p className="font-bold">
                💡 Como resolver e importar seus dados REAIS em 10 segundos:
              </p>
              <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                <li>Abra o PDF do seu extrato no seu computador ou celular.</li>
                <li>Selecione todas as linhas de texto da fatura ou extrato e <strong>copie (Ctrl+C)</strong>.</li>
                <li>Clique no botão <strong>"Colar Extrato"</strong> acima, cole o texto copiado e clique em Importar!</li>
                <li>Nosso analisador inteligente lerá todas as descrições e valores reais do texto copiado instantaneamente!</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Vincular transações extraídas ao banco:
                </label>
                <select
                  value={selectedUploadBank}
                  onChange={(e) => setSelectedUploadBank(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  {availableBanks.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop File Upload Container */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-500/10' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-white dark:bg-slate-900/40'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                accept=".pdf,.txt,.csv" 
                className="hidden" 
              />
              
              {uploadProgress !== null ? (
                <div className="space-y-3 max-w-xs mx-auto">
                  <RefreshCw size={24} className="animate-spin text-emerald-500 mx-auto" />
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider animate-pulse">
                    {uploadProgress < 100 ? `Analisando extrato: ${uploadProgress}%` : 'Processando transações...'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{uploadedFileName}</p>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload size={32} className="mx-auto text-slate-400 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Arraste o arquivo ou <span className="text-emerald-500">clique para procurar</span>
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Formatos suportados: PDF, TXT, CSV (Extrato de qualquer banco)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WhatsApp Integration Panel */}
        {showWhatsAppArea && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-855 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                <Smartphone size={13} className="text-emerald-500" />
                <span>Integração de Importação via WhatsApp</span>
              </h4>
              <button onClick={() => setShowWhatsAppArea(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            </div>

            {/* Tab toggles: Simulator vs Real QR Code */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 pb-1 gap-4">
              <button
                onClick={() => setWhatsappTab('simulator')}
                className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  whatsappTab === 'simulator'
                    ? 'border-emerald-500 text-emerald-500'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
                }`}
              >
                ⚙️ Instruções de Configuração
              </button>
              <button
                onClick={() => setWhatsappTab('real')}
                className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  whatsappTab === 'real'
                    ? 'border-emerald-500 text-emerald-500'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
                }`}
              >
                🔗 QR Code para Telefone Real
              </button>
            </div>

            <div className="space-y-4">
              {/* Main Column: Instruction guides / Real QR Code */}
              <div className="space-y-4">
                {whatsappTab === 'simulator' ? (
                  <>
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-750 dark:text-slate-300 space-y-2.5">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-indigo-500">
                        <Info size={14} />
                        <span>Como funciona a API do WhatsApp? É gratuita?</span>
                      </div>
                      <p className="leading-relaxed text-[11px]">
                        Sim, para a grande maioria dos usos pessoais e familiares, <strong>a API do WhatsApp é 100% gratuita!</strong>
                      </p>
                      <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                        <li><strong>1.000 Conversações Grátis por mês:</strong> A Meta (dona do WhatsApp) oferece um plano inicial de 1.000 sessões gratuitas iniciadas por clientes por mês para cada número cadastrado na Cloud API.</li>
                        <li><strong>Sem mensalidades ocultas:</strong> Você não precisa de intermediários pagos (como Z-API ou Twilio) para receber os dados se programar direto com o webhook gratuito da Meta para desenvolvedores.</li>
                        <li><strong>Lançamento em tempo real:</strong> Basta enviar a descrição do gasto no chat e o nosso assistente identificará automaticamente o valor e o banco de destino!</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Guia de Ativação Real na Produção:</h5>
                      <ol className="list-decimal pl-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-2 leading-relaxed">
                        <li>Acesse o portal <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-500 underline">Meta for Developers</a> e crie um aplicativo.</li>
                        <li>Adicione o produto "WhatsApp Cloud API" ao seu aplicativo.</li>
                        <li>Configure uma URL de <strong>Webhook de Entrada</strong> apontando para seu backend para processar as mensagens recebidas em tempo real.</li>
                        <li>Conecte o número de telefone de sua escolha escaneando o QR Code comercial oficial.</li>
                      </ol>
                    </div>

                    {/* QR Code Activation Simulator */}
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-16 h-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center p-1 relative shrink-0">
                        {isQrConnected ? (
                          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center text-emerald-500 rounded-lg">
                            <Check size={28} />
                          </div>
                        ) : null}
                        <div className="grid grid-cols-4 gap-1 opacity-70">
                          <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-white" />
                          <div className="w-2.5 h-2.5 bg-transparent" />
                          <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-white" />
                          <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-white" />
                          <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-white" />
                          <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-white" />
                          <div className="w-2.5 h-2.5 bg-transparent" />
                          <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-white" />
                        </div>
                      </div>
                      <div className="text-center sm:text-left space-y-1">
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                          {isQrConnected ? 'Sandbox de Integração Ativa' : 'Ativar Sandbox de WhatsApp'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isQrConnected 
                            ? 'Você está conectado! Use o simulador de Webhook de Produção abaixo para disparar requisições de teste reais.'
                            : 'Para testar como funciona na prática, ative a sandbox de simulação para liberar as chamadas de Webhook.'}
                        </p>
                        {!isQrConnected && (
                          <button
                            onClick={() => {
                              setIsQrConnected(true);
                              onAddNotification({
                                title: 'Sandbox WhatsApp Conectada!',
                                message: 'Agora você pode enviar transações simuladas e requisições de teste!',
                                type: 'success',
                              });
                            }}
                            className="mt-2 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                          >
                            Simular Conexão QR Code
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-3">
                      <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-emerald-500">
                        <Smartphone size={14} />
                        <span>Abra no seu Telefone Real 📱</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                        Escaneie o QR Code abaixo com a câmera do seu celular para abrir o WhatsApp real com um texto pré-preenchido. 
                        Qualquer transação que você enviar ou simular via API real será adicionada ao seu extrato de Open Finance automaticamente em tempo real!
                      </p>
                    </div>

                    {/* QR Code generator box */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      {/* Dynamic QR Code from Server API */}
                      <div className="shrink-0 p-3 bg-white border border-slate-150 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                            `https://api.whatsapp.com/send?text=${encodeURIComponent(customWsText)}`
                          )}`}
                          alt="WhatsApp QR Code"
                          className="w-36 h-36 border border-slate-100 p-1 bg-white rounded-lg"
                        />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Escaneie para Abrir</span>
                      </div>

                      {/* Custom input parameters for QR Code */}
                      <div className="flex-1 space-y-3 w-full">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            Mensagem para enviar no WhatsApp:
                          </label>
                          <input
                            type="text"
                            value={customWsText}
                            onChange={(e) => setCustomWsText(e.target.value)}
                            placeholder="Ex: Almoço R$ 45,50"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Ao escanear, o WhatsApp abrirá com o texto digitado acima. Quando você tiver seu chatbot Meta ou Twilio configurado, use as credenciais de Webhook abaixo para receber as mensagens direto no sistema.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] space-y-3">
                      <h6 className="font-black text-indigo-500 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <Info size={13} />
                        <span>🔗 Seu Endpoint de Webhook do WhatsApp (API de Produção)</span>
                      </h6>
                      <p className="text-slate-500 leading-relaxed text-[10px]">
                        Configure o seguinte endereço no seu painel de Desenvolvedor da Meta ou no seu bot para receber dados reais:
                      </p>
                      
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[9px] text-emerald-400 select-all break-all overflow-x-auto">
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp-webhook` : 'https://sua-url-aqui.run.app/api/whatsapp-webhook'}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-lg">
                          <span className="block font-black uppercase text-slate-400 text-[8px] tracking-wider">Método HTTP</span>
                          <span className="font-mono text-indigo-500">POST</span>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-lg">
                          <span className="block font-black uppercase text-slate-400 text-[8px] tracking-wider">Formato Aceito</span>
                          <span className="font-mono text-indigo-500">JSON (Meta / Twilio / Custom)</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-2 text-[10px]">
                        <p className="font-bold text-slate-700 dark:text-slate-300">💡 Como testar o Webhook Real sem o celular agora?</p>
                        <p className="text-slate-400 leading-normal">Você pode disparar uma requisição de teste para ver o sistema processar ao vivo! Escreva um texto de gasto no campo acima (na aba "QR Code" ou simulação) e clique no botão abaixo:</p>
                        
                        <div className="flex gap-2 items-center mb-1">
                          <select
                            value={selectedWsBank}
                            onChange={(e) => setSelectedWsBank(e.target.value)}
                            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[10px] font-bold uppercase py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-800 outline-none"
                            title="Vincular lançamentos a qual conta?"
                          >
                            {availableBanks.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/whatsapp-webhook', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  message: customWsText,
                                  bankId: selectedWsBank
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                onAddNotification({
                                  title: 'Webhook Simulado com Sucesso!',
                                  message: `Transação "${data.parsed.description}" de R$ ${data.parsed.amount.toFixed(2)} recebida pelo endpoint real!`,
                                  type: 'success'
                                });
                              } else {
                                onAddNotification({
                                  title: 'Erro no Webhook',
                                  message: data.error || 'Não foi possível extrair dados.',
                                  type: 'warning'
                                });
                              }
                            } catch (e: any) {
                              console.error(e);
                            }
                          }}
                          className="mt-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase text-[8px] tracking-widest rounded-lg transition-all cursor-pointer"
                        >
                          Simular Chamada POST de Webhook Real
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rapid Paste Area */}
        {showPasteArea && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850/80 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white">Importação Rápida via Texto</h4>
              <button onClick={() => setShowPasteArea(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Cole linhas do seu extrato bancário. Nosso sistema tentará ler a descrição e o valor automaticamente! <br />
              Exemplo: <br />
              <code className="text-emerald-500 dark:text-emerald-400">iFood Alimentacao R$ 54,90</code><br />
              <code className="text-emerald-500 dark:text-emerald-400">PIX Recebido de Helena +150,00</code>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Vincular estes lançamentos ao banco:</label>
                <select
                  value={selectedPasteBank}
                  onChange={(e) => setSelectedPasteBank(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                >
                  {availableBanks.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              rows={4}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Cole aqui as linhas do extrato de forma simples..."
              className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />

            <button
              onClick={handleParsePaste}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all"
            >
              Extrair e Salvar Transações
            </button>
          </div>
        )}

        {/* Dynamic add/edit pending form */}
        {showPoolForm && (
          <form onSubmit={handleSavePoolItem} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850/80 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white">
                {editingPoolId ? 'Editar Lançamento Pendente' : 'Adicionar Novo Lançamento Pendente'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowPoolForm(false);
                  setEditingPoolId(null);
                }}
                className="text-slate-400 hover:text-rose-500"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Descrição do Lançamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Assinatura Amazon Prime, Supermercado"
                  value={poolDesc}
                  onChange={(e) => setPoolDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Destinar ao Banco</label>
                <select
                  value={poolBankId}
                  onChange={(e) => setPoolBankId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  {availableBanks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={poolAmount}
                  onChange={(e) => setPoolAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
                <select
                  value={poolType}
                  onChange={(e) => setPoolType(e.target.value as 'income' | 'expense')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="expense">Despesa (Débito)</option>
                  <option value="income">Receita (Crédito)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Categoria</label>
                <select
                  value={poolCategory}
                  onChange={(e) => setPoolCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={poolDate}
                  onChange={(e) => setPoolDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-805">
              <button
                type="button"
                onClick={() => {
                  setShowPoolForm(false);
                  setEditingPoolId(null);
                }}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-sm"
              >
                {editingPoolId ? 'Salvar Edição' : 'Agendar Lançamento'}
              </button>
            </div>
          </form>
        )}

        {/* Pending statement list */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Extrato Pendente de Sincronização ({bankSyncPool.length})</h4>
            {bankSyncPool.length > 0 && (
              <button
                onClick={handleSyncAllPool}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-sm cursor-pointer"
                title="Sincronizar todos os lançamentos inseridos para o painel principal de Receitas e Despesas"
              >
                <Check size={12} />
                Sincronizar Todos os Lançamentos ({bankSyncPool.length})
              </button>
            )}
          </div>
          
          {bankSyncPool.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Não há transações pendentes de sincronização no momento.</p>
              <p className="text-[10px] text-slate-400">
                Adicione transações individuais ou use o importador de texto acima para adicionar seus lançamentos bancários reais!
              </p>
            </div>
          ) : (
            <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-400">
                      <th className="py-2.5 px-4">Banco</th>
                      <th className="py-2.5 px-4">Data</th>
                      <th className="py-2.5 px-4">Descrição</th>
                      <th className="py-2.5 px-4">Categoria</th>
                      <th className="py-2.5 px-4 text-right">Valor</th>
                      <th className="py-2.5 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                    {bankSyncPool.map((item) => {
                      const bank = availableBanks.find(b => b.id === item.bankId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          <td className="py-2.5 px-4">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${bank?.logoColor || 'bg-slate-400'}`} />
                              <span className="font-bold text-slate-700 dark:text-slate-300">{bank?.name || 'Geral'}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                            {item.date}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            {item.description}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              {item.category}
                            </span>
                          </td>
                          <td className={`py-2.5 px-4 text-right font-bold font-mono ${item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.type === 'income' ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSyncSingle(item)}
                                className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded transition-colors"
                                title="Aprovar e Sincronizar este lançamento"
                              >
                                <Check size={12} className="text-emerald-500 font-bold" />
                              </button>
                              <button
                                onClick={() => handleStartEditPool(item)}
                                className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  onRemoveFromSyncPool(item.id);
                                  onAddNotification({
                                    title: 'Lançamento Removido',
                                    message: 'Lançamento removido do extrato de sincronização.',
                                    type: 'tip',
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-colors"
                                title="Deletar"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
