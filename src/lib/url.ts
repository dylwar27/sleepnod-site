const BASE = import.meta.env.BASE_URL;

export function withBase(path?: string | null): string {
  if (!path) return '';
  if (/^(https?:|mailto:|tel:|data:|#)/i.test(path)) return path;
  if (!path.startsWith('/')) return path;
  const clean = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  return clean + path;
}
