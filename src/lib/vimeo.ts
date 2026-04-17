import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_DIR = '.cache/vimeo';

export interface VimeoMeta {
  thumbnail: string | null;
  title: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
}

export async function getVimeoMeta(vimeoId: string | undefined): Promise<VimeoMeta | null> {
  if (!vimeoId) return null;

  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${vimeoId}.json`);

  if (existsSync(cachePath)) {
    try {
      return JSON.parse(readFileSync(cachePath, 'utf8'));
    } catch {
      // fall through to re-fetch if cache is corrupt
    }
  }

  const url = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    const meta: VimeoMeta = {
      thumbnail: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
      title: typeof data.title === 'string' ? data.title : null,
      duration: typeof data.duration === 'number' ? data.duration : null,
      width: typeof data.width === 'number' ? data.width : null,
      height: typeof data.height === 'number' ? data.height : null,
    };
    writeFileSync(cachePath, JSON.stringify(meta, null, 2));
    return meta;
  } catch {
    return null;
  }
}
