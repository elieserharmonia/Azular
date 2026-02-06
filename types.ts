
export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'planned' | 'done' | 'late';
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly' | 'everyXMonths' | 'workingDays';
export type AccountKind = 'checking' | 'savings' | 'investment' | 'individual';
export type CostType = 'fixed' | 'variable';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  fullName?: string;
  email: string | null;
  phone?: string;
  birthDate?: string;
  address?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  };
  currency: string;
  locale: string;
  timezone: string;
  avatarUrl?: string;
  monthStartDay: number;
  
  // LGPD Consent
  marketingOptIn: boolean;
  marketingOptInAt?: any; // Timestamp
  marketingOptInText?: string;
  
  createdAt: any;
  updatedAt?: any;
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
  isFixed: boolean;
  linkedProvisionId?: string | null;
  
  // Novos campos de recorrência fixos
  isRecurring: boolean;
  recurrenceGroupId?: string;
  recurrenceMode?: 'none' | 'until' | 'count';
  recurrenceEndMonth?: string;
  recurrenceCount?: number;
  recurrenceStartMonth?: string;

  recurrence: {
    enabled: boolean;
    frequency: RecurrenceFrequency;
    interval: number | null;
    startMonth: string;
    endMonth: string | null;
    parentId: string | null;
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
