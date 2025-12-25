/// <reference types="vite/client" />

// Simple nations loader using Vite's import.meta.glob
// Returns a record keyed by nation id -> nation JSON

export async function loadNations(): Promise<Record<string, any>> {
  // Use Vite's glob to eagerly import JSON files from data/nations
  // The pattern is project-root relative. Vite supports `as: 'json'`.
  const modules = import.meta.glob('/data/nations/*.json', { eager: true, as: 'json' }) as Record<string, any>;
  const result: Record<string, any> = {};

  for (const path in modules) {
    try {
      const mod = modules[path];
      // The imported JSON may be the payload itself or under default
      const payload = mod?.default ?? mod;
      if (payload && payload.id) result[payload.id] = payload;
    } catch (err) {
      // skip malformed file
      // eslint-disable-next-line no-console
      console.warn('Failed to load nation file', path, err);
    }
  }

  return result;
}
