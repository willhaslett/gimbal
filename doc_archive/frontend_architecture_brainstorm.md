# Frontend Architecture Brainstorm

> Exploring frontend technology choices for Gimbal. Each category has trade-offs; goal is to find the right combination for our target users and constraints.

---

## Current State

What Gimbal uses today (local prototype):
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** Plain CSS with custom properties (light/dark mode)
- **Connection:** SSE for streaming Claude responses
- **State:** Local React state (useState)
- **Persistence:** Server-side only (chat history via API)
- **Desktop:** Electron packaging exists

---

## Category 1: Framework / Language

### Option A: React (Current)

**What:** React 18 + TypeScript + Vite

**Pros:**
- Already implemented — zero migration cost
- Massive ecosystem, easy to find solutions
- TypeScript integration is mature
- Vite provides fast dev experience
- Team familiarity (assumed)

**Cons:**
- Larger bundle than alternatives
- Boilerplate for simple things (useState, useEffect)
- React-specific patterns to learn

**Best for:** Teams that know React, apps that need ecosystem depth.

### Option B: Vue 3

**What:** Vue 3 + TypeScript + Vite

**Pros:**
- Simpler mental model than React
- Better official tooling (Vue CLI, Pinia)
- Single-file components are clean
- Good TypeScript support (improved in Vue 3)

**Cons:**
- Migration cost from current React code
- Smaller ecosystem than React
- Fewer senior Vue developers in market

**Best for:** Teams that prefer simplicity over ecosystem size.

### Option C: Svelte / SvelteKit

**What:** Svelte 5 + TypeScript

**Pros:**
- Compiled — smaller bundles, better runtime performance
- Less boilerplate (no useState, no virtual DOM)
- Intuitive reactivity model
- SvelteKit provides routing, SSR if needed

**Cons:**
- Migration cost
- Smaller ecosystem
- Fewer developers know it
- Less mature than React/Vue

**Best for:** Performance-sensitive apps, teams willing to bet on newer tech.

### Option D: Solid.js

**What:** Solid + TypeScript

**Pros:**
- React-like syntax, easier migration than Svelte/Vue
- Fine-grained reactivity (better performance than React)
- Small bundle size
- No virtual DOM overhead

**Cons:**
- Migration cost
- Small ecosystem
- Niche — harder to hire

**Best for:** React teams who want better performance without full rewrite.

### Option E: Next.js / Remix

**What:** React meta-framework with SSR

**Pros:**
- SEO benefits (if needed for landing pages)
- File-based routing
- API routes built in
- Good for hybrid static + dynamic

**Cons:**
- Adds complexity (SSR, hydration)
- Gimbal is an app, not a content site — SSR value is unclear
- Hosting is more complex (not just static files)

**Best for:** Content-heavy sites, SEO requirements.

### Recommendation Signal

Given no migration cost, React (Option A) is the default. The question is whether the benefits of alternatives outweigh the switching cost. For Gimbal's target users (non-technical), framework choice is invisible — they see the UX, not the tech.

---

## Category 2: Connection Design

How does the frontend communicate with the backend, especially for streaming?

### Option A: SSE (Current)

**What:** Server-Sent Events — server pushes text stream over HTTP

**Pros:**
- Already implemented
- Simple — just HTTP with streaming response
- Works through proxies and CDNs
- Auto-reconnect built into browser API
- Perfect for one-way streaming (server → client)

**Cons:**
- One-way only (client can't send mid-stream)
- Limited to text (no binary)
- Some corporate proxies buffer SSE (rare)

**Best for:** Streaming responses where client doesn't need to interrupt.

### Option B: WebSockets

**What:** Full-duplex, persistent TCP connection

**Pros:**
- Bidirectional — client and server can send anytime
- Lower latency than HTTP for rapid back-and-forth
- Good for real-time collaboration (if we add it later)
- Binary support

**Cons:**
- More complex server implementation
- Connection management (reconnection, heartbeats)
- Some proxies/firewalls block WebSockets
- Overkill for streaming where client rarely sends

**Best for:** Real-time collaboration, gaming, chat apps with typing indicators.

### Option C: HTTP/2 Streams

**What:** Multiplexed streams over single connection

**Pros:**
- Multiple streams without multiple connections
- Works with existing HTTP infrastructure

**Cons:**
- Browser APIs don't expose HTTP/2 streaming well
- Not widely used for app-level streaming
- SSE is simpler for same outcome

**Best for:** Niche cases, not typical web apps.

### Option D: Long Polling

**What:** Client polls, server holds connection until data ready

**Pros:**
- Works everywhere (fallback option)
- Simple to implement

**Cons:**
- Higher latency
- More server resources (holding connections)
- Not really "streaming"

**Best for:** Fallback when SSE/WebSockets fail.

### Recommendation Signal

SSE (Option A) is the right fit. Gimbal's primary flow is: user sends prompt → server streams response. That's exactly what SSE is for. WebSockets would add complexity without clear benefit unless we add real-time collaboration.

---

## Category 3: Frontend Persistence

Where does client-side state live? How much survives refresh/offline?

### Option A: Server-Only (Current)

**What:** All persistence on server. Client fetches on load.

**Pros:**
- Simple — single source of truth
- No sync issues
- Works across devices automatically

**Cons:**
- Requires network for everything
- No offline capability
- Latency on initial load

**Best for:** Connected apps where offline isn't a requirement.

### Option B: localStorage

**What:** Browser key-value store, persists across sessions

**Pros:**
- Simple API
- ~5MB storage
- Synchronous access
- Good for preferences, small cache

**Cons:**
- Synchronous (can block main thread)
- String-only (must JSON serialize)
- No structure, no queries
- Shared across tabs (can cause issues)

**Best for:** User preferences, small caches, draft autosave.

### Option C: IndexedDB

**What:** Browser database, async, supports large data

**Pros:**
- Large storage (hundreds of MB+)
- Async — doesn't block
- Can store blobs, files
- Structured queries

**Cons:**
- Complex API (usually use wrapper like Dexie.js)
- Overkill for simple storage

**Best for:** Offline-first apps, caching large datasets, file storage.

### Option D: Service Worker + Cache API

**What:** Intercept network requests, serve from cache

**Pros:**
- True offline support
- Can cache API responses
- Background sync
- Foundation for PWA

**Cons:**
- Complex — service worker lifecycle is tricky
- Cache invalidation is hard
- Debugging is harder

**Best for:** PWAs, offline-first apps.

### Recommendation Signal

Start with **Server-Only (Option A)** + **localStorage (Option B)** for preferences and draft autosave. Add IndexedDB/Service Worker later only if offline support becomes a requirement.

---

## Category 4: PWA

Should Gimbal be a Progressive Web App?

### What PWA Provides

- **Installable:** "Add to Home Screen" on mobile/desktop
- **Offline:** Works without network (with caching)
- **Push notifications:** Re-engage users
- **App-like experience:** Full screen, no browser chrome

### Option A: Not PWA (Web-Only)

**What:** Standard web app, no service worker

**Pros:**
- Simpler
- No service worker complexity
- Users access via browser (familiar)

**Cons:**
- No offline support
- Can't install to home screen
- No push notifications

**Best for:** Apps where offline isn't needed, simple deployment.

### Option B: Light PWA

**What:** Add manifest + basic service worker

**Pros:**
- Installable on desktop/mobile
- Basic caching for faster loads
- Still simple

**Cons:**
- Not truly offline (server required for core function)
- Limited benefit for server-dependent app

**Best for:** "Nice to have" installability without full offline commitment.

### Option C: Full PWA

**What:** Complete offline support, background sync, push notifications

**Pros:**
- Works offline
- Native-app feel
- Push notifications for engagement

**Cons:**
- Significant complexity
- Gimbal needs server for Claude — truly "offline" is limited
- Cache invalidation challenges

**Best for:** Apps where offline is core value prop.

### Gimbal-Specific Consideration

Gimbal's core value is AI assistance, which requires the server (and Claude). True offline is limited — you could cache UI and recent history, but can't chat with Claude offline. This limits PWA's value proposition.

### Recommendation Signal

**Light PWA (Option B)** makes sense: installable, basic caching, but don't over-invest in offline since Claude requires connectivity anyway.

---

## Category 5: State Management

How does the frontend manage application state?

### Option A: Local State (Current)

**What:** useState/useReducer in components

**Pros:**
- Simple, built-in
- No dependencies
- Fine for small apps

**Cons:**
- Prop drilling for shared state
- Hard to share state across component trees
- No persistence built-in

**Best for:** Simple apps, isolated components.

### Option B: React Context

**What:** Built-in context for shared state

**Pros:**
- Built-in, no dependencies
- Good for "global" state (theme, user, etc.)

**Cons:**
- Re-renders all consumers on any change
- Not great for frequently-changing state
- Can get messy with many contexts

**Best for:** Infrequently-changing global state (auth, theme).

### Option C: Zustand

**What:** Lightweight state management

**Pros:**
- Simple API
- No boilerplate
- Works outside React components
- Good performance (selective subscriptions)
- ~1KB

**Cons:**
- Another dependency
- Less structure than Redux

**Best for:** Medium complexity apps that outgrow useState.

### Option D: TanStack Query (React Query)

**What:** Server state management

**Pros:**
- Handles caching, refetching, loading states
- Great for API-heavy apps
- Reduces boilerplate for data fetching
- Background refetching, optimistic updates

**Cons:**
- Learning curve
- Overkill if you have few API calls
- ~12KB

**Best for:** Apps with lots of server state, complex caching needs.

### Option E: Redux Toolkit

**What:** Full state management solution

**Pros:**
- Very structured
- Great devtools
- Large ecosystem

**Cons:**
- Boilerplate (even with Toolkit)
- Overkill for most apps
- ~15KB

**Best for:** Large apps with complex state requirements.

### Recommendation Signal

**Local State (A) + Context (B)** for now is fine. If state management becomes painful, **Zustand (C)** is the natural upgrade — simple, small, solves the problem without over-engineering.

**TanStack Query (D)** is worth considering for server state (projects, files, history) — it would simplify the data fetching layer significantly.

---

## Category 6: Styling

### Option A: Plain CSS (Current)

**What:** CSS files with custom properties

**Pros:**
- No build complexity
- No dependencies
- Full CSS power
- Custom properties enable theming

**Cons:**
- Global namespace (class name collisions)
- No component scoping by default
- Manual organization required

**Best for:** Small apps, teams comfortable with CSS.

### Option B: CSS Modules

**What:** CSS files with automatic scoping

**Pros:**
- Scoped by default (no collisions)
- Still just CSS
- Works with Vite out of the box

**Cons:**
- Import syntax is different
- Composition can be awkward

**Best for:** Component-based apps wanting scoping without framework change.

### Option C: Tailwind

**What:** Utility-first CSS framework

**Pros:**
- Fast prototyping
- Consistent design system
- Small production bundle (purges unused)
- Popular, lots of resources

**Cons:**
- HTML gets cluttered with classes
- Learning curve for utility names
- Opinionated

**Best for:** Rapid development, teams that like utility-first.

### Option D: CSS-in-JS (styled-components, emotion)

**What:** CSS defined in JavaScript

**Pros:**
- True component scoping
- Dynamic styles based on props
- Colocation with components

**Cons:**
- Runtime cost
- Different mental model
- Bundle size

**Best for:** Highly dynamic UIs, design systems.

### Recommendation Signal

**Plain CSS (A)** is working fine. If scoping becomes a problem, **CSS Modules (B)** is the minimal upgrade. **Tailwind (C)** is worth considering for faster iteration, but it's a style preference more than a technical requirement.

---

## Category 7: Desktop App

### Option A: Web-Only

**What:** No desktop app, browser only

**Pros:**
- Simplest
- No packaging, no updates to manage
- Users always have latest version

**Cons:**
- Less "app-like" feel
- No system integration (file associations, etc.)
- Requires browser

**Best for:** MVP, validating before investing in desktop.

### Option B: Electron (Current)

**What:** Chromium + Node.js packaged as desktop app

**Pros:**
- Already implemented
- Full Node.js access
- Cross-platform
- Mature ecosystem

**Cons:**
- Large bundle (~150MB+)
- Resource heavy (it's a whole browser)
- Security surface area

**Best for:** Desktop apps needing full Node.js access.

### Option C: Tauri

**What:** Rust backend + system webview

**Pros:**
- Much smaller bundle (~10MB)
- Better performance
- System webview (less memory)
- Rust backend for performance-critical code

**Cons:**
- Newer, less mature
- Rust knowledge helpful for customization
- System webview means browser differences

**Best for:** Apps prioritizing size/performance, teams comfortable with Rust.

### Option D: PWA Install

**What:** Users install PWA from browser

**Pros:**
- No app store
- Always up to date
- Works on desktop and mobile
- Zero packaging effort

**Cons:**
- Limited system integration
- Less "discoverable" than app store
- Some users don't know about PWA install

**Best for:** Light desktop presence without full app investment.

### Recommendation Signal

**Web-only (A)** for MVP validation. Keep **Electron (B)** as an option but don't prioritize. Consider **Tauri (C)** if desktop becomes important and bundle size matters.

---

## Open Questions

1. **Target platforms:** Web-first? Mobile-first? Desktop essential?
2. **Offline requirements:** How important is working without connection?
3. **Real-time collaboration:** Ever? If so, WebSockets become more relevant.
4. **Mobile app:** Native eventually? Or PWA sufficient?
5. **Bundle size budget:** Does it matter for target users?

---

## Current Thinking

*To be filled in as we discuss...*

---

## Decisions Log

| Decision | Choice | Rationale | Date |
|----------|--------|-----------|------|
| | | | |
