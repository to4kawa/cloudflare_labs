/**
 * Cloudflare Worker for Suno Visualizer
 * Resolves Suno song metadata and media URLs
 */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API endpoint: /api/suno
    if (url.pathname === '/api/suno') {
      return handleSunoAPI(request);
    }

    // Serve static files from public/
    // Map root to index.html
    let path = url.pathname;
    if (path === '/') {
      path = '/index.html';
    }

    // Try to serve from ASSETS binding (Cloudflare Workers Sites)
    try {
      // @ts-ignore - ASSETS is injected by Cloudflare
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // Fallback if ASSETS binding not available
      return new Response('Not Found - Static assets not configured', { status: 404 });
    }
  },
};

interface Env {
  ASSETS: Fetcher;
}

/**
 * Handle /api/suno endpoint
 */
async function handleSunoAPI(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sunoUrl = url.searchParams.get('url');

  // Validate URL parameter
  if (!sunoUrl) {
    return jsonError('Missing required parameter: url', 400, 'MISSING_URL');
  }

  // Parse and validate Suno URL
  const songId = parseSunoUrl(sunoUrl);
  if (!songId) {
    return jsonError('Invalid Suno URL. Expected format: https://suno.com/song/{uuid} or https://suno.com/s/{shortId}', 400, 'INVALID_URL');
  }

  try {
    // Resolve media URLs using direct CDN construction
    const metadata = await resolveSongMetadata(songId, sunoUrl);
    
    return new Response(JSON.stringify(metadata, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('not found')) {
      return jsonError('Song not found or is private', 404, 'NOT_FOUND');
    }
    console.error('Error resolving Suno metadata:', err);
    return jsonError('Failed to resolve song metadata', 502, 'UPSTREAM_ERROR');
  }
}

/**
 * Parse Suno URL and extract song ID
 * Supports:
 * - https://suno.com/song/{uuid}
 * - https://suno.com/s/{shortId}
 * - suno.com/song/... (without protocol)
 */
function parseSunoUrl(input: string): string | null {
  try {
    // Normalize URL
    let urlStr = input.trim();
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      urlStr = 'https://' + urlStr;
    }

    const url = new URL(urlStr);

    // Validate domain
    if (!url.hostname.includes('suno.com')) {
      return null;
    }

    // Extract ID from path
    const pathMatch = url.pathname.match(/\/(song|s)\/([^\/\?]+)/i);
    if (pathMatch) {
      return pathMatch[2]; // Return the ID (either UUID or short ID)
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve song metadata and media URLs
 * Primary strategy: Direct CDN URL construction
 * Fallback: Fetch Suno page and extract metadata
 */
async function resolveSongMetadata(songId: string, sourceUrl: string): Promise<SongMetadata> {
  // Short URL (/s/...) redirects to full /song/{uuid}. Follow redirect to get real UUID.
  let realId = songId;
  let realSourceUrl = sourceUrl;

  if (sourceUrl.includes('/s/')) {
    try {
      const res = await fetch(sourceUrl, { redirect: 'follow' });
      const finalUrl = res.url;
      const match = finalUrl.match(/\/song\/([a-f0-9\-]+)/i);
      if (match) {
        realId = match[1];
        realSourceUrl = finalUrl;
      }
    } catch (e) {
      // Redirect failed — fall through with original id
    }
  }

  // Try direct CDN URLs first
  const audioUrl = `https://cdn1.suno.ai/${realId}.mp3`;
  const coverCandidates = [
    `https://cdn2.suno.ai/image_${realId}.jpeg`,
    `https://cdn2.suno.ai/image_large_${realId}.jpeg`,
    `https://cdn1.suno.ai/image_${realId}.png`,
  ];

  // Verify audio URL exists (HEAD request)
  const audioCheck = await fetch(audioUrl, { method: 'HEAD' });
  if (!audioCheck.ok) {
    // Fallback: try to fetch metadata from page
    return await fetchMetadataFromPage(realId, realSourceUrl);
  }

  // Try to find working cover URL
  let coverUrl: string | null = null;
  for (const candidate of coverCandidates) {
    const coverCheck = await fetch(candidate, { method: 'HEAD' });
    if (coverCheck.ok) {
      coverUrl = candidate;
      break;
    }
  }

  return {
    id: realId,
    title: null, // Title requires page fetch
    audio_url: audioUrl,
    cover_url: coverUrl,
    duration: null,
    source_url: realSourceUrl,
    resolved_at: new Date().toISOString(),
  };
}

/**
 * Fallback: Fetch Suno page and extract metadata from HTML/JSON
 */
async function fetchMetadataFromPage(songId: string, sourceUrl: string): Promise<SongMetadata> {
  // Construct canonical URL
  const pageUrl = sourceUrl.includes('/song/') 
    ? sourceUrl 
    : `https://suno.com/song/${songId}`;

  const response = await fetch(pageUrl);
  if (!response.ok) {
    throw new Error('Song not found');
  }

  const html = await response.text();

  // Try to extract JSON-LD or meta tags
  let title: string | null = null;
  let audioUrl: string | null = null;
  let coverUrl: string | null = null;
  let duration: number | null = null;

  // Extract from meta tags
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
  if (titleMatch) {
    title = titleMatch[1];
  }

  const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (imageMatch) {
    coverUrl = imageMatch[1];
  }

  // Try to find audio URL in scripts or data attributes
  const audioMatch = html.match(/https:\/\/cdn1\.suno\.ai\/[a-f0-9\-]+\.mp3/i);
  if (audioMatch) {
    audioUrl = audioMatch[0];
  }

  if (!audioUrl) {
    // Last resort: construct it
    audioUrl = `https://cdn1.suno.ai/${songId}.mp3`;
  }

  return {
    id: songId,
    title,
    audio_url: audioUrl,
    cover_url: coverUrl,
    duration,
    source_url: pageUrl,
    resolved_at: new Date().toISOString(),
  };
}

/**
 * Helper: Return JSON error response
 */
function jsonError(message: string, status: number, code: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Error',
      message,
      code,
    }, null, 2),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

/**
 * Type definitions
 */
interface SongMetadata {
  id: string;
  title: string | null;
  audio_url: string;
  cover_url: string | null;
  duration: number | null;
  source_url: string;
  resolved_at: string;
}
