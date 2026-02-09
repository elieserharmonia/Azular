
import React from 'react';

export const CATEGORY_GROUPS = [
  'Habitação',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Higiene',
  'Educação',
  'Lazer',
  'Assinaturas',
  'Impostos/Taxas',
  'Trabalho/Renda',
  'Reserva',
  'Dívidas',
  'Outros'
];

export const DEFAULT_CATEGORIES = [
  { name: 'Aluguel', direction: 'debit', group: 'Habitação' },
  { name: 'Supermercado', direction: 'debit', group: 'Alimentação' },
  { name: 'Salário', direction: 'credit', group: 'Trabalho/Renda' },
  { name: 'Internet', direction: 'debit', group: 'Assinaturas' },
];

export const COLORS = {
  primary: '#2563EB',
  secondary: '#E6F0FA',
  danger: '#F87171',
  success: '#34D399',
  neutral: '#94A3B8',
};
