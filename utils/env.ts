export const BUILD_ID = "2025.02.21.07";

export function isPreview(): boolean {
  if (typeof window === "undefined") return false;
  
  const origin = window.location.origin || "";
  const hostname = window.location.hostname || "";

  // Detecção robusta para Google AI Studio e UserContent Sandboxes
  return (
    origin.includes("usercontent.goog") ||
    origin.includes("ai.studio") ||
    origin.includes("scf.usercontent.goog") ||
    hostname.includes("usercontent.goog") ||
    hostname.includes("ai.studio") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}