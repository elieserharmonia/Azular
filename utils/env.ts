export const BUILD_ID = "2025.02.21.06";

export function isPreview(): boolean {
  if (typeof window === "undefined") return false;
  
  const origin = window.location.origin || "";
  const hostname = window.location.hostname || "";

  return (
    origin.includes("usercontent.goog") ||
    origin.includes("ai.studio") ||
    hostname.includes("usercontent.goog") ||
    hostname.includes("ai.studio") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}