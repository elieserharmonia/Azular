
export const OFFICIAL_SEEDS = [
  { name: 'Alimentação', direction: 'debit', iconKey: 'shopping-cart', colorKey: 'emerald', subcategories: ['Mercado', 'Feira', 'Açougue', 'Padaria'] },
  { name: 'Assinaturas (Netflix, Google)', direction: 'debit', iconKey: 'tv', colorKey: 'indigo', subcategories: ['Streaming', 'Apps', 'Armazenamento', 'Música'] },
  { name: 'Aulas', direction: 'debit', iconKey: 'book-open', colorKey: 'blue', subcategories: [] },
  { name: 'Coleta (Doação)', direction: 'debit', iconKey: 'heart-handshake', colorKey: 'pink', subcategories: ['Igreja', 'Campanhas', 'Ajuda familiar'] },
  { name: 'Comissões', direction: 'credit', iconKey: 'badge-dollar-sign', colorKey: 'green', subcategories: [] },
  { name: 'Cursos', direction: 'debit', iconKey: 'graduation-cap', colorKey: 'blue', subcategories: ['Online', 'Presencial', 'Certificações'] },
  { name: 'Educação', direction: 'debit', iconKey: 'school', colorKey: 'blue', subcategories: ['Escola', 'Material', 'Mensalidade'] },
  { name: 'Higiene', direction: 'debit', iconKey: 'sparkles', colorKey: 'sky', subcategories: ['Cosméticos', 'Produtos limpeza'] },
  { name: 'Impostos', direction: 'debit', iconKey: 'receipt', colorKey: 'amber', subcategories: ['IPVA', 'IPTU', 'IR', 'Taxas'] },
  { name: 'Lanche (Pizza, Sorvete)', direction: 'debit', iconKey: 'pizza', colorKey: 'orange', subcategories: ['Pizza', 'Sorvete', 'Café', 'Doces'] },
  { name: 'Lazer', direction: 'debit', iconKey: 'party-popper', colorKey: 'purple', subcategories: ['Cinema', 'Viagem', 'Passeios'] },
  { name: 'Moradia', direction: 'debit', iconKey: 'home', colorKey: 'slate', subcategories: ['Aluguel', 'Condomínio', 'Manutenção', 'Móveis', 'Reforma'] },
  { name: 'Refeição', direction: 'debit', iconKey: 'utensils', colorKey: 'orange', subcategories: ['Restaurante', 'Delivery', 'Marmita'] },
  { name: 'Reserva', direction: 'debit', iconKey: 'shield', colorKey: 'teal', subcategories: ['Emergência', 'Objetivos', 'Investimentos'] },
  { name: 'Salário', direction: 'credit', iconKey: 'wallet', colorKey: 'green', subcategories: [] },
  { name: 'Saúde', direction: 'debit', iconKey: 'heart-pulse', colorKey: 'red', subcategories: ['Farmácia', 'Consulta', 'Exames', 'Plano'] },
  { name: 'Serviços (Água, Luz, Internet)', direction: 'debit', iconKey: 'plug', colorKey: 'yellow', subcategories: ['Água', 'Luz', 'Internet', 'Gás', 'Telefone'] },
  { name: 'Transporte', direction: 'debit', iconKey: 'car', colorKey: 'gray', subcategories: ['Combustível', 'Uber/99', 'Ônibus', 'Estacionamento', 'Manutenção'] },
  { name: 'Outros', direction: 'both', iconKey: 'more-horizontal', colorKey: 'slate', subcategories: [] },
];

// Alias export to support components using DEFAULT_CATEGORIES
export const DEFAULT_CATEGORIES = OFFICIAL_SEEDS;

export const COLORS = {
  primary: '#2563EB',
  secondary: '#E6F0FA',
  danger: '#F87171',
  success: '#34D399',
  neutral: '#94A3B8',
};

// Mapeamento de cores para classes Tailwind
export const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  pink: 'bg-pink-50 text-pink-600 border-pink-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  sky: 'bg-sky-50 text-sky-600 border-sky-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  slate: 'bg-slate-50 text-slate-600 border-slate-100',
  teal: 'bg-teal-50 text-teal-600 border-teal-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  gray: 'bg-gray-50 text-gray-600 border-gray-100',
};