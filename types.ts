

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
  perfilId?: string; 
  tipo: TransactionType;
  type?: TransactionType; // Alias
  descricao: string;
  description?: string; // Alias
  valor: number;
  amount?: number; // Alias
  plannedAmount?: number; // Alias
  vencimento: string; // YYYY-MM-DD
  dueDate?: string; // Alias
  receiveDate?: string; // Added to fix missing property errors in Transactions.tsx and Reports.tsx
  competenceMonth: string; // YYYY-MM
  status: TransactionStatus;
  
  // Categorização
  categoryGroup: string; // Grupo fixo (Habitação, Alimentação, etc)
  categoriaId?: string; // Categoria detalhada (opcional)
  categoryId?: string; // Alias
  accountId: string;
  
  // Recorrência
  recorrente: boolean;
  isRecurring?: boolean;
  // Fix: Added isFixed property to resolve missing property errors in Transactions.tsx and Provision.tsx
  isFixed?: boolean;
  recurrenceGroupId?: string;
  recurrenceMode?: 'none' | 'until' | 'count';
  recurrenceEndMonth?: string;
  recurrenceCount?: number;

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
  kind: 'checking' | 'savings' | 'investment';
  createdAt?: any;
  
  // Added properties to fix missing property errors in Accounts.tsx and localDbClient.ts
  hasCreditCard?: boolean;
  creditLimit?: number;
  closingDay?: number;
  isInvestment?: boolean;
  investmentType?: 'poupança' | 'tesouro' | 'fundo' | 'outros';
  investedAmount?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  currency: string;
  
  // Added properties to fix missing property errors in Profile.tsx and AdminUsers.tsx
  fullName?: string;
  phone?: string;
  birthDate?: string;
  address?: {
    logradouro?: string;
  };
  marketingOptIn?: boolean;
  marketingOptInAt?: any;
  marketingOptInText?: string;
  avatarUrl?: string;
  email?: string;
}

export interface Goal {
  id?: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: number;
  createdAt: any;
  
  // Added property to fix missing property error in Goals.tsx
  description?: string;
}

export interface Debt {
  id?: string;
  userId: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  interestRate: number;
  createdAt: any;
}