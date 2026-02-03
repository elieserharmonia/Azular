
/**
 * Converte qualquer entrada em um número válido, tratando vazios, nulos e formatação brasileira.
 */
export const parseNumericValue = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  // Remove pontos de milhar e substitui vírgula decimal por ponto
  const cleaned = String(val)
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
    
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formata um número para exibição em inputs (substituindo ponto por vírgula)
 */
export const formatForInput = (val: number): string => {
  if (val === 0) return '';
  return val.toString().replace('.', ',');
};
