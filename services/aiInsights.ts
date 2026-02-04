
export type AiInsight = { 
  title: string; 
  message: string; 
  level?: "info" | "warn" | "action";
  badge?: string;
};

/**
 * Serviço de Insights do Azular.
 * 
 * Atualmente operando em modo Placeholder para garantir segurança e 
 * estabilidade no frontend, evitando exposição de chaves de API.
 */
export async function getAiInsights(): Promise<AiInsight[]> {
  // Simula uma pequena latência de rede
  await new Promise(resolve => setTimeout(resolve, 500));

  // Retorna insights estáticos e acolhedores (Placeholder)
  return [
    {
      title: "Guia Azular",
      message: "Seu lar financeiro está em construção. Continue registrando para liberar análises profundas.",
      level: "info",
      badge: "Em breve"
    }
  ];
}
