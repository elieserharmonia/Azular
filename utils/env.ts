export const BUILD_ID = "2025.02.21.05";

export function isPreview(): boolean {
  if (typeof window === "undefined") return false;
  
  const href = window.location.href || "";
  const origin = window.location.origin || "";
  const hostname = window.location.hostname || "";

  return (
    href.startsWith("blob:") ||
    origin.includes("usercontent.goog") ||
    hostname.includes("ai.studio") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}