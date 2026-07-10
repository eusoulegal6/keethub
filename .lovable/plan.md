## Multi-Game Hub Foundation

Adapt the uploaded spec to the current TanStack Start + Lovable Cloud stack. The spec assumes Vite+React Router+custom JWT — I'll translate those to TanStack Router + Lovable Cloud auth while keeping the design system, layout, sidebar, game-grid, and store shapes intact.

### 1. Design system (`src/styles.css`)
Rewrite tokens to match the spec's dark-first palette. Convert HSL values to `oklch`, define semantic tokens for `background`, `foreground`, `card`, `primary` (vibrant purple), `secondary`, `muted`, `accent`, `border`, `ring`, `sidebar`, `game-card`, `destructive`, `success`, `warning`. Radius `0.75rem`. Inter font via `@fontsource/inter`.

### 2. Dependencies
Install: `zustand`, `zod`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `socket.io-client`, `@fontsource/inter`. (react-query, lucide-react already present.) Add missing shadcn primitives on demand — the current shadcn set is already installed via `components.json`; I'll add anything a component actually imports.

### 3. Backend (Lovable Cloud)
Enable Cloud. Schema:
- `profiles` (id → auth.users, username unique, avatar_config jsonb, created_at) + trigger to auto-create on signup + RLS (self read/update, public read of username/avatar).
- `games` (id, slug, title, description, category, thumbnail_url, is_active, created_at) — public read.
- `game_scores` (id, user_id, game_id, score, metadata jsonb, created_at) — insert own, public read.
- `user_roles` + `app_role` enum + `has_role()` SECURITY DEFINER (per platform rules).
- Grants for `authenticated`/`anon`/`service_role` on every public table.
- Seed a handful of placeholder games via the insert tool.

### 4. Auth (replaces spec's custom JWT)
Use Lovable Cloud auth (email/password + Google). The spec's `AuthContext` is replaced by:
- `src/routes/_authenticated/route.tsx` — integration-managed gate (auto-shipped).
- `src/routes/auth.tsx` — public sign-in/sign-up page with tabs, react-hook-form + zod, sonner toasts.
- Root `onAuthStateChange` listener in `__root.tsx` that invalidates router + query cache.
- `useAuth()` hook exposing user/profile/signOut.

### 5. Layout & routes
```text
src/routes/
  __root.tsx              (providers, Sonner Toaster, auth listener, real head metadata)
  index.tsx               (public marketing landing → CTA to /auth or /hub)
  auth.tsx                (sign in / sign up)
  _authenticated/
    route.tsx             (managed gate)
    hub.tsx               (sidebar layout: nav + <Outlet/>)
    hub.index.tsx         (game grid — "Library")
    hub.games.$slug.tsx   (game detail / launch screen)
    hub.profile.tsx       (profile + avatar config)
    hub.leaderboard.tsx   (top scores across games)
  sitemap[.]xml.ts
```
Sidebar: fixed left, sidebar-bg, logo, nav items (Library, Leaderboard, Profile), user chip at bottom with sign-out. Main area: header + scroll-area content.

### 6. State (zustand)
`src/stores/hub-store.ts` — UI state: sidebar collapsed, active game session, filter/search. Server data flows through TanStack Query (loader + `useSuspenseQuery`).

### 7. Server functions (`src/lib/*.functions.ts`)
- `games.functions.ts` — `listGames`, `getGameBySlug` (public, publishable-key client).
- `scores.functions.ts` — `submitScore`, `getLeaderboard`, `getMyScores` (auth-gated with `requireSupabaseAuth`).
- `profile.functions.ts` — `getMyProfile`, `updateMyProfile`.

### 8. Placeholder game runtime
Each game detail route renders an `<iframe>`/canvas placeholder + score-submit hook. `socket.io-client` scaffolded as an optional realtime client (not connected — no server yet) exposed via `src/lib/realtime.ts` so future multiplayer games can plug in.

### 9. Metadata / SEO
Real title + description on `__root` ("GameHub — Play. Compete. Level up."), unique per-page head() on `/`, `/auth`, `/hub/leaderboard`, and `/hub/games/$slug` (dynamic from loader). `public/robots.txt` + sitemap route.

### 10. What's NOT included from the spec
- Custom `/api/auth/*` JWT endpoints — replaced by Cloud auth (more secure, less code).
- Custom socket.io server — client scaffold only; no backend socket server on Cloudflare Workers.
Everything else (tokens, layout, contexts equivalents, game hub UX) is honored.

### Verification
After build: playwright-check `/`, `/auth`, sign up flow, land on `/hub`, see seeded games, open a game detail, sign out returns to `/auth`.
