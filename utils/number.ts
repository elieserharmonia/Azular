/**
 * Converte qualquer entrada (string de moeda brasileira ou numero) em um número válido.
 * Lida com "R$ 1.234,56", "1234.56", etc.
 * Retorna 0 em vez de NaN para garantir estabilidade do banco.
 */
export const parseNumericValue = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  
  // Limpeza de caracteres não numéricos exceto vírgula, ponto e menos
  const cleaned = String(val)
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')       // Remove separador de milhar
    .replace(',', '.');       // Converte vírgula decimal em ponto
    
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Especializado em inputs de texto para garantir que nunca retorne NaN.
 */
export const parseBRL = (input: string | number): number => {
  return parseNumericValue(input);
};

/**
 * Formata um número para exibição em inputs (substituindo ponto por vírgula)
 */
export const formatForInput = (val: number): string => {
  if (val === 0 || isNaN(val)) return '';
  return val.toFixed(2).replace('.', ',');
};