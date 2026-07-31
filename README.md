# Cloudflare Labs

実験用 / Experimental Projects

## 🎵 Suno Visualizer

A real-time music visualizer for Suno songs, built on Cloudflare Workers.

### Features
- Paste any public Suno song URL
- Real-time audio visualization using Web Audio API + p5.js
- Edge-resolved metadata (no local Node.js required)
- Pure static client with no build tools

### Architecture
- **Worker** (`index.ts`): Resolves Suno song metadata and CDN URLs
- **Client** (`public/visualizer.html`): Static HTML with p5.js visualization
- **Deploy**: Git push → Cloudflare auto-deploy (no npm, no build step)

### API Endpoint
```
GET /api/suno?url={suno_url}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Song Title",
  "audio_url": "https://cdn1.suno.ai/{id}.mp3",
  "cover_url": "https://cdn2.suno.ai/image_{id}.jpeg",
  "duration": null,
  "source_url": "https://suno.com/song/{id}",
  "resolved_at": "2026-08-01T00:00:00.000Z"
}
```

### Supported URL Formats
- `https://suno.com/song/{uuid}`
- `https://suno.com/s/{shortId}`
- Bare URLs: `suno.com/song/...`

### Usage
1. Visit `/visualizer.html` on the deployed Worker
2. Paste a public Suno song URL
3. Click "Load Song"
4. Press play and watch the visualization react to the audio

### Development
**No local development environment required.**

Deployment is handled automatically by Cloudflare:
1. Push to GitHub
2. Cloudflare auto-deploys from the repository
3. Test on the deployed Worker URL

## Constraints
- ❌ NO package.json
- ❌ NO npm install / npm run dev
- ❌ NO wrangler as project dependency
- ❌ NO build tools or bundlers
- ✅ Single Worker file (`index.ts`)
- ✅ Static assets in `public/`
- ✅ Git push → auto-deploy only

## Spec

Project constraints and architecture are defined in:

- [docs/spec.yaml](docs/spec.yaml)

All feature work should follow this file.
Design docs for individual features live under `docs/design-*.yaml`.

