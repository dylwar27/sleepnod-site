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

// Reads token from VIMEO_TOKEN env var (set in .env for local, Vercel/Pages env vars for CI).
// Without a token, falls back to oEmbed — works for public videos only.
// With a token, uses api.vimeo.com — works for public, unlisted, and private videos.
function getToken(): string | null {
  return process.env.VIMEO_TOKEN ?? null;
}

async function fetchWithApi(vimeoId: string, token: string): Promise<VimeoMeta | null> {
  const res = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
    },
  });
  if (!res.ok) return null;
  const data = await res.json() as Record<string, unknown>;

  // Pick the largest thumbnail under 2000px wide from pictures.sizes
  let thumbnail: string | null = null;
  const pictures = data.pictures as Record<string, unknown> | undefined;
  const sizes = pictures?.sizes as Array<{ width: number; link: string }> | undefined;
  if (Array.isArray(sizes) && sizes.length > 0) {
    const eligible = sizes.filter((s) => s.width <= 1920).sort((a, b) => b.width - a.width);
    thumbnail = eligible[0]?.link ?? sizes[sizes.length - 1]?.link ?? null;
  }

  return {
    thumbnail,
    title: typeof data.name === 'string' ? data.name : null,
    duration: typeof data.duration === 'number' ? data.duration : null,
    width: typeof data.width === 'number' ? data.width : null,
    height: typeof data.height === 'number' ? data.height : null,
  };
}

async function fetchWithOEmbed(vimeoId: string): Promise<VimeoMeta | null> {
  const res = await fetch(
    `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}`
  );
  if (!res.ok) return null;
  const data = await res.json() as Record<string, unknown>;
  return {
    thumbnail: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
    title: typeof data.title === 'string' ? data.title : null,
    duration: typeof data.duration === 'number' ? data.duration : null,
    width: typeof data.width === 'number' ? data.width : null,
    height: typeof data.height === 'number' ? data.height : null,
  };
}

export async function getVimeoMeta(vimeoId: string | undefined): Promise<VimeoMeta | null> {
  if (!vimeoId) return null;

  mkdirSync(CACHE_DIR, { recursive: true });
  const token = getToken();
  // Separate cache files per auth method so a token-less build doesn't poison the API cache
  const cacheKey = token ? `${vimeoId}-api` : vimeoId;
  const cachePath = join(CACHE_DIR, `${cacheKey}.json`);

  if (existsSync(cachePath)) {
    try {
      return JSON.parse(readFileSync(cachePath, 'utf8'));
    } catch {
      // fall through to re-fetch
    }
  }

  try {
    const meta = token
      ? await fetchWithApi(vimeoId, token)
      : await fetchWithOEmbed(vimeoId);
    if (meta) writeFileSync(cachePath, JSON.stringify(meta, null, 2));
    return meta;
  } catch {
    return null;
  }
}
