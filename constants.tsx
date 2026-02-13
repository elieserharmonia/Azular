
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
  { name: 'Alimentação', direction: 'debit' },
  { name: 'Assinaturas (Netflix, Google)', direction: 'debit' },
  { name: 'Aulas', direction: 'debit' },
  { name: 'Coleta (Doação)', direction: 'debit' },
  { name: 'Comissões', direction: 'credit' },
  { name: 'Cursos', direction: 'debit' },
  { name: 'Educação', direction: 'debit' },
  { name: 'Higiene', direction: 'debit' },
  { name: 'Impostos', direction: 'debit' },
  { name: 'Lanche (Pizza, Sorvete)', direction: 'debit' },
  { name: 'Lazer', direction: 'debit' },
  { name: 'Moradia', direction: 'debit' },
  { name: 'Refeição', direction: 'debit' },
  { name: 'Reserva', direction: 'debit' },
  { name: 'Salário', direction: 'credit' },
  { name: 'Saúde', direction: 'debit' },
  { name: 'Serviços (Água, Luz, Internet)', direction: 'debit' },
  { name: 'Transporte', direction: 'debit' },
  { name: 'Outros', direction: 'both' },
];

export const COLORS = {
  primary: '#2563EB',
  secondary: '#E6F0FA',
  danger: '#F87171',
  success: '#34D399',
  neutral: '#94A3B8',
};
