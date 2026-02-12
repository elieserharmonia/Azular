
export const BUILD_ID = "2025.02.21.09";

/**
 * Detecta de forma restrita se o app está rodando no Google AI Studio Preview.
 * Em produção (Vercel ou domínios próprios), deve SEMPRE retornar false.
 */
export function isPreview(): boolean {
  if (typeof window === "undefined") return false;
  
  const origin = window.location.origin || "";
  const href = window.location.href || "";

  // Retorna true APENAS se estiver em domínios específicos do Google AI Studio/Preview
  const isGoogleSandbox = origin.endsWith(".usercontent.goog") || 
                         origin.includes("ai.studio") || 
                         origin.includes("scf.usercontent.goog");
  
  const isBlobSandbox = href.startsWith("blob:https://") && href.includes(".usercontent.goog");

  return isGoogleSandbox || isBlobSandbox;
}
