// src/utils/env.ts
export function isAiStudioPreview(): boolean {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  const origin = window.location.origin;

  return (
    hostname.includes("usercontent.goog") ||
    hostname.includes("ai.studio") ||
    origin.includes("scf.usercontent.goog")
  );
}
