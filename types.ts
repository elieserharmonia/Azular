
export type TransactionType = 'pagar' | 'receber' | 'credit' | 'debit';
export type TransactionStatus = 'previsto' | 'pago' | 'recebido' | 'atrasado' | 'cancelado' | 'planned' | 'done';

export interface RecurrenceConfig {
  frequencia: 'semanal' | 'quinzenal' | 'mensal' | 'anual';
  intervalo: number;
  inicio: string; // YYYY-MM-DD
  fim?: string | null;
}

export interface Transaction {
  id?: string;
  userId: string;
  perfilId?: string; // ID que vincula ocorrências de uma mesma recorrência
  tipo: TransactionType;
  // Aliases for compatibility
  type?: TransactionType;
  descricao: string;
  description?: string;
  categoriaId: string;
  categoryId?: string;
  accountId: string;
  valor: number;
  amount?: number;
  plannedAmount?: number;
  vencimento: string; // YYYY-MM-DD (Data base para o fluxo)
  dueDate?: string;
  receiveDate?: string;
  competenceMonth?: string;
  status: TransactionStatus;
  
  recorrente: boolean;
  recorrencia?: RecurrenceConfig;
  
  // Extended fields
  isFixed?: boolean;
  isRecurring?: boolean;
  recurrenceGroupId?: string;
  recurrenceMode?: 'none' | 'until' | 'count';
  recurrence?: {
    enabled: boolean;
    frequency: 'monthly' | 'weekly' | 'none';
    interval: number;
    startMonth: string;
    endMonth: string | null;
    parentId: string | null;
    pattern?: string;
  };
  costType?: 'variable' | 'fixed';

  notas?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Category {
  id?: string;
  userId: string;
  name: string;
  direction: 'credit' | 'debit' | 'both';
  createdAt: any;
}

export interface Account {
  id?: string;
  userId: string;
  name: string;
  initialBalance: number;
  active: boolean;
  // Extended fields
  kind: 'checking' | 'savings' | 'investment';
  hasCreditCard?: boolean;
  creditLimit?: number;
  closingDay?: number;
  isInvestment?: boolean;
  investmentType?: 'poupança' | 'tesouro' | 'fundo' | 'outros';
  investedAmount?: number;
  createdAt?: any;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  fullName?: string;
  currency: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  avatarUrl?: string;
  address?: {
    logradouro: string;
  };
  marketingOptIn?: boolean;
  marketingOptInAt?: any;
  marketingOptInText?: string;
}

export interface Goal {
  id?: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: number;
  description?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Debt {
  id?: string;
  userId: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  interestRate: number;
  priority?: string;
  createdAt: any;
}
