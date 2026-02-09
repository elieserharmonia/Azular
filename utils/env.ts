
export const BUILD_ID = "2025.02.21.08";

/**
 * Detecta de forma confiável se o app está rodando em um ambiente de Preview 
 * (Google AI Studio, Sandboxes, Localhost) para evitar o uso do Firebase.
 */
export function isPreview(): boolean {
  if (typeof window === "undefined") return false;
  
  const origin = window.location.origin || "";
  const hostname = window.location.hostname || "";
  const href = window.location.href || "";

  return (
    origin.includes("usercontent.goog") ||
    origin.includes("ai.studio") ||
    origin.includes("scf.usercontent.goog") ||
    hostname.includes("usercontent.goog") ||
    hostname.includes("ai.studio") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    href.startsWith("blob:") ||
    href.includes("webcontainer.io")
  );
}
