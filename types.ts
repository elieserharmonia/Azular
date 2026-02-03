
export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'planned' | 'done' | 'late';
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly' | 'everyXMonths' | 'workingDays';
export type AccountKind = 'checking' | 'savings' | 'investment' | 'individual';
export type CostType = 'fixed' | 'variable';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  currency: string;
  locale: string;
  timezone: string;
  avatarUrl?: string;
  monthStartDay: number;
}

export interface Account {
  id?: string;
  userId: string;
  name: string;
  kind: AccountKind;
  initialBalance: number;
  active: boolean;
  hasCreditCard: boolean;
  creditLimit?: number;
  closingDay?: number;
  isInvestment: boolean;
  investmentType?: 'poupança' | 'tesouro' | 'fundo' | 'outros';
  investedAmount?: number;
  createdAt: any;
}

export interface Category {
  id?: string;
  userId: string;
  name: string;
  direction: 'credit' | 'debit' | 'both';
  createdAt: any;
}

export interface Debt {
  id?: string;
  userId: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  interestRate?: number;
  dueDate?: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: any;
}

export interface Transaction {
  id?: string;
  userId: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  costType: CostType;
  description: string;
  plannedAmount: number; 
  amount: number;        
  competenceMonth: string; 
  dueDate?: string; 
  receiveDate?: string; 
  status: TransactionStatus;
  isFixed: boolean; // Flag de Recorrência
  linkedProvisionId?: string | null;
  recurrence: {
    enabled: boolean;
    frequency: RecurrenceFrequency;
    interval: number | null;
    startMonth: string;
    endMonth: string | null; // NULL = Sem fim
    parentId: string | null; // ID da série
  };
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Goal {
  id?: string;
  userId: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  priority: number;
  description?: string;
  currentAmount: number;
  createdAt: any;
  updatedAt: any;
}
