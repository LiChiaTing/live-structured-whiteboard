/**
 * Read an environment variable in a way that works in both Astro (server) and
 * Vitest — both are Vite-based, so check import.meta.env first, then process.env.
 */
export function envVar(name: string): string | undefined {
  const fromImportMeta =
    typeof import.meta !== "undefined" ? (import.meta as { env?: Record<string, string> }).env?.[name] : undefined;
  return fromImportMeta || (typeof process !== "undefined" ? process.env?.[name] : undefined);
}
