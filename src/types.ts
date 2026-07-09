export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  paymentMethod?: 'pix' | 'card-debit';
  bankSynced: boolean;
  bankName?: string;
  userRef: string; // The family member ID who made this transaction
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
}

export interface Investment {
  id: string;
  name: string;
  type: 'CDB' | 'Tesouro' | 'Ações' | 'FIIs' | 'Cripto';
  amount: number;
  initialAmount: number;
  purchaseDate: string;
  currentReturn: number; // percentage (e.g. 12.5 means +12.5%)
  notes?: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
  notes?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  avatarColor: string;
  role: 'Administrador' | 'Membro' | 'Dependente';
}

export interface BankConnection {
  bankId: string;
  bankName: string;
  logoColor: string;
  isConnected: boolean;
  lastSynced?: string;
  accountNumber?: string;
}

export interface SmartNotification {
  id: string;
  date: string;
  title: string;
  message: string;
  type: 'warning' | 'tip' | 'success';
  read: boolean;
}

export interface PendingBankTx {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  paymentMethod?: 'pix' | 'card-debit';
  date: string;
  bankId: string;
}
