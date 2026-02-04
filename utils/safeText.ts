
/**
 * Garante que qualquer valor seja convertido para uma string segura para renderização.
 * Previne o erro "Minified React error #31" (Objects are not valid as a React child).
 */
export function safeText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  
  if (v instanceof Error) return v.message;
  
  // Se for um objeto com $$typeof, é um React Element. 
  // No contexto de mensagens simples, geralmente queremos converter para string.
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
