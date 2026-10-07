# Tambyte

Tambyte is a Vite + React campus map foundation for finding study and tambay
spots. The current map marker and spot details are a UI preview; the app does
not yet load or save spot data.

## Requirements

- Node.js 20.19+ (or 22.12+)
- npm

## Run locally

```sh
git clone https://github.com/vishnaur/project_tambyte.git
cd project_tambyte
npm ci
```

Copy `.env.example` to `.env.local` and set the Supabase values when you have
created a project. The frontend can currently run without Supabase credentials
because it does not make database requests yet.

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```sh
cp .env.example .env.local
```

Set `VITE_SUPABASE_URL` to the project URL and `VITE_SUPABASE_ANON_KEY` to the
project's public anon/publishable key in `.env.local`. Never put a Supabase
service-role key in a `VITE_` variable or any other frontend file. `.env.local`
is ignored by Git.

Start the development server:

```sh
npm run dev
```

Open <http://localhost:3000>.

## Development workflow

- `npm run dev` starts Vite with hot reload.
- `npm run lint` runs the TypeScript check.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the production bundle locally.
- `npm run clean` removes the generated `dist/` directory.

Keep changes on your assigned branch and open a pull request for team review.
Do not commit `.env.local` or other credentials.

## Frontend structure

- `src/main.tsx` mounts the React application.
- `src/App.tsx` renders `src/pages/HomePage.tsx`.
- `src/components/` contains the shared UI components.
- `src/services/supabase.ts` creates the typed Supabase client when configured.
- `src/types/database.ts` contains the database types.

There is no Next.js runtime. `index.html` and Vite load the application from
`src/main.tsx`.

## Supabase setup

1. Create a Supabase project.
2. Copy its project URL and public anon/publishable key into `.env.local`.
3. Apply `supabase/migrations/20261007000000_create_spots.sql` using the
   Supabase SQL Editor (or a Supabase CLI workflow set up by the team).

The migration creates one `spots` table. It stores a name, category, map
coordinates, hours, optional description/location/noise/outlet/image details,
and optional structured `operating_hours` data for a future open-now filter.
The JSON schedule can be agreed on by the team before implementing that filter.
The migration enables Row Level Security and permits public reads of active
spots. It grants no public write policy; authenticated admin writes should only
be added after the team's authentication and authorization rules are defined.

The database migration is not applied automatically, and the current UI does
not query it. `getSupabaseClient()` throws a configuration error if a future
caller tries to use the client before both environment values are configured.

## Security notes

- Vite exposes `VITE_` values in the browser bundle. Only the public Supabase
  anon/publishable key belongs there; database access must be protected by RLS.
- Never expose a service-role key to the frontend or commit private keys.
- The sample spot is presentation-only, not database-backed.
- Current UI fields are rendered as React text, not interpreted as HTML.
