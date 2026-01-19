# Frontend Architecture

> Official spec for Gimbal's frontend infrastructure.

## Decision

**"React + Light PWA"** — keep the current React/Vite stack, add PWA manifest for installability.

## Architecture

```
┌─────────────────────────────────────────┐
│              Browser / PWA              │
├─────────────────────────────────────────┤
│  React 18 + TypeScript                  │
│  ├── Components (ChatPanel, FileTree)   │
│  ├── Local state (useState/useContext)  │
│  └── API client (REST + SSE streaming)  │
├─────────────────────────────────────────┤
│  Vite (build + dev server)              │
├─────────────────────────────────────────┤
│  Service Worker (cache static assets)   │
│  Web App Manifest (installability)      │
└─────────────────────────────────────────┘
         │
         │ HTTPS
         ▼
    App Runner (API)
```

## Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React 18 + TypeScript | Already implemented, zero migration cost |
| Build | Vite | Fast dev, good production builds |
| Styling | Plain CSS + custom properties | Light/dark mode via CSS variables |
| Connection | SSE (Server-Sent Events) | Perfect for streaming Claude responses |
| State | Local state + Context | Simple, sufficient for current needs |
| Persistence | Server-side + localStorage | Server for data, localStorage for preferences |
| Desktop | Web-first, Electron available | Don't prioritize desktop packaging |

## PWA Configuration

### What We're Adding

**Light PWA** — installable on desktop/mobile without full offline complexity.

1. **Web App Manifest** (`manifest.json`)
   - App name, icons, theme colors
   - `display: standalone` for app-like experience
   - Start URL and scope

2. **Basic Service Worker**
   - Cache static assets (JS, CSS, images)
   - Faster subsequent loads
   - NOT caching API responses (Claude needs server)

3. **App Icons**
   - 192x192 and 512x512 PNG for Android/desktop
   - 180x180 Apple touch icon for iOS
   - Favicon set (16, 32, ico)

### What We're NOT Doing

- Full offline support (Claude requires connectivity)
- Background sync
- Push notifications (not needed yet)
- Complex cache invalidation strategies

### Manifest Example

```json
{
  "name": "Gimbal",
  "short_name": "Gimbal",
  "description": "Get things done with AI",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker (Minimal)

```javascript
// Cache static assets on install
const CACHE_NAME = 'gimbal-v1';
const STATIC_ASSETS = ['/', '/index.html', '/assets/index.js', '/assets/index.css'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests for static assets
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // Don't cache API

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

## Rationale

**Why keep React:**
- Already implemented — no migration cost
- Massive ecosystem, easy to find solutions
- Framework choice is invisible to users — they see UX, not tech

**Why SSE over WebSockets:**
- Gimbal's flow is: user sends prompt → server streams response
- That's exactly what SSE is for
- Simpler than WebSockets, works through proxies
- WebSockets add complexity without benefit (no real-time collab yet)

**Why Light PWA:**
- Installability is valuable — users can add to home screen
- Basic caching speeds up loads
- Full offline isn't worth the complexity (Claude needs server anyway)

**Why not full state management (Redux, etc):**
- Current app is simple enough for useState/Context
- Can add Zustand later if state becomes painful
- YAGNI — don't add complexity until needed

## Constraints Met

| Constraint | How |
|------------|-----|
| Non-technical users | No visible complexity, just works |
| Fast loads | Vite optimizes bundles, PWA caches assets |
| Mobile-friendly | PWA install, responsive design |
| Low maintenance | Minimal dependencies, standard React patterns |

## Evolution Path

1. **Now:** React + Vite + Light PWA
2. **If state gets complex:** Add Zustand for state management
3. **If API calls get complex:** Add TanStack Query for server state
4. **If desktop matters:** Evaluate Tauri (smaller than Electron)
5. **If offline matters:** Expand service worker, add IndexedDB

## Implementation Checklist

- [ ] Create `public/manifest.json`
- [ ] Add icons to `public/icons/` (192, 512, apple-touch)
- [ ] Create `public/sw.js` (basic service worker)
- [ ] Add manifest link to `index.html`
- [ ] Register service worker in app entry
- [ ] Add meta tags for iOS (apple-mobile-web-app-capable, etc.)
- [ ] Test "Add to Home Screen" on mobile

## Related

- Source material: `doc_archive/frontend_architecture_brainstorm.md`
- Backend architecture: `specs/backend_architecture.md`
