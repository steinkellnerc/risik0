# risik0

A web-based implementation of the classic Risk strategy board game. Play locally against AI opponents or create multiplayer matches with friends in real time.

![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Vite](https://img.shields.io/badge/Vite-8.0-purple)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-green)

## Features

- **Local Play** — 1–6 human players with AI filling remaining slots
- **Online Multiplayer** — Real-time games via Supabase Realtime subscriptions
- **Classic Rules** — Reinforce → Attack → Fortify phase cycle, dice combat, card trading with escalating values
- **Secret Missions** — Optional alternate win conditions (e.g. "Control North America & Africa")
- **Interactive SVG Map** — 42 territories across 6 continents with adjacency visualization
- **AI Opponents** — Rule-based AI with threat scoring, continent completion awareness, and strategic fortification
- **Lobby System** — Create, join, and share multiplayer games with a link

## Tech Stack

| Layer | Tools |
|-------|-------|
| UI | React, Tailwind CSS, Radix UI, Framer Motion |
| State | Zustand |
| Routing | React Router |
| Backend | Supabase (Auth, Postgres, Realtime) |
| Build | Vite, TypeScript, ESLint |
| Testing | Vitest, Playwright |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Environment Variables

Create a `.env` (or set in your hosting dashboard):

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PROJECT_ID=<project-id>
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Database Setup

Apply the schema from [`supabase/schema.sql`](supabase/schema.sql) to your Supabase project. It creates tables for games, players, territories, cards, and a game log, along with Row-Level Security policies.

### Install & Run

```bash
npm install
npm run dev        # starts dev server on http://localhost:8080
```

### Other Scripts

```bash
npm run build      # production build
npm run preview    # preview the production build locally
npm run lint       # run ESLint
npm run test       # run Vitest
npm run test:watch # run Vitest in watch mode
```

## How It Works

1. **Setup** — Territories are distributed among players and initial armies placed.
2. **Reinforce** — Receive armies based on territory count + continent bonuses. Optionally trade card sets for extra armies.
3. **Attack** — Target adjacent enemy territories. Attacker rolls up to 3 dice, defender up to 2. Ties favor the defender.
4. **Fortify** — Move armies between connected friendly territories.
5. **Victory** — Conquer all 42 territories, or complete your secret mission if missions are enabled.

## Project Structure

```
src/
├── components/    # React components (map, panels, status bars)
├── game/          # Core game logic, AI, state stores, map data
├── hooks/         # Custom React hooks
├── lib/           # Supabase client, auth, multiplayer sync, utilities
├── pages/         # Route pages (login, lobby, game)
└── test/          # Test setup and specs
supabase/
└── schema.sql     # Database schema with RLS policies
```

## Deployment

Configured for **Vercel** — push to your repo and it builds automatically. See [`vercel.json`](vercel.json) for the config. Make sure your Supabase env vars are set in the Vercel dashboard.

## License

MIT
