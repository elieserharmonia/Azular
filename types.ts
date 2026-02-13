
export type TransactionType = 'pagar' | 'receber' | 'credit' | 'debit';
export type TransactionStatus = 'previsto' | 'pago' | 'recebido' | 'atrasado' | 'cancelado' | 'planned' | 'done';

export interface Transaction {
  id?: string;
  userId: string;
  perfilId?: string; 
  tipo: TransactionType;
  type?: TransactionType; 
  descricao: string;
  description?: string; 
  valor: number;
  amount?: number; 
  plannedAmount?: number; 
  vencimento: string; 
  dueDate?: string; 
  receiveDate?: string; 
  competenceMonth: string; 
  status: TransactionStatus;
  
  // Categorização
  categoryGroup: string; 
  categoriaId?: string; 
  categoryId?: string; 
  subcategoryId?: string; // Novo: Suporte a subcategorias
  accountId: string;
  
  // Recorrência
  recorrente: boolean;
  isRecurring?: boolean;
  isFixed?: boolean;
  recurrenceGroupId?: string;
  recurrenceMode?: 'none' | 'until' | 'count';
  recurrenceEndMonth?: string;
  recurrenceCount?: number;
  recurrence?: any;

  notas?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Category {
  id?: string;
  userId: string;
  name: string;
  direction: 'credit' | 'debit' | 'both';
  iconKey: string;     // Ex: 'home', 'shopping-cart'
  colorKey: string;    // Ex: 'emerald', 'blue'
  sortOrder: number;
  isSystem: boolean;   // Define se é uma categoria padrão
  createdAt: any;
  updatedAt?: any;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  userId: string;
  name: string;
  sortOrder: number;
  isSystem: boolean;
}

export interface Account {
  id?: string;
  userId: string;
  name: string;
  initialBalance: number;
  active: boolean;
  kind: 'checking' | 'savings' | 'investment';
  createdAt?: any;
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
