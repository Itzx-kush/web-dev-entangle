# Single-Project Deployment with a Hosted Research API

The root [vercel.json](../vercel.json) deploys the existing React/Vite frontend and Express Experiment Notes API together. Research API requests are forwarded to the existing FastAPI deployment at `https://entanglex-q-health-api.onrender.com`. The Python service is intentionally not built as a serverless function in this project because its scientific dependency stack, SQLite database, local artifact storage, and background worker are designed for a persistent service.

The repository root must be the project root directory, and the project framework/preset must be **Services**. Do not set the project root to `frontend` or `node-api`; the root configuration owns the shared routing table.

## Public routes

| Public path | Destination | Purpose |
| --- | --- | --- |
| `/` and other non-API paths | `frontend` service | React/Vite single-page application |
| `/api/notes/*` | `node-api` service | Express Experiment Notes API |
| `/api/*`, except `/api/notes/*` | Existing FastAPI deployment | Research API: datasets, experiments, training, quantum workflows, and reports |

The notes rule must remain before the broader research API rule. Its service-level request-path transform maps `/api/notes/experiment-notes` to the existing Express `/api/experiment-notes` route. The final catch-all sends browser page routes to the frontend. The research API's external rewrite maps `/api/health` to the existing research service's `/api/health` endpoint without requiring browser CORS configuration for those same-origin requests.

## Required environment variables

Set these in the Vercel project settings for **Production and Preview** as appropriate. Values containing credentials must remain private and must never be committed to source control.

### Frontend service build

- `VITE_API_BASE=/api`
- `VITE_NODE_API_BASE=/api/notes`
- `VITE_SUPABASE_URL` — the existing Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — the public anon/publishable key only; never use a service-role key in a browser build

The first two values are same-origin paths and do not contain credentials. If the Supabase values are missing, the app can still render, but account sign-in will explicitly remain unavailable.

### Express Experiment Notes service

- `NODE_ENV=production`
No database connection string is required. Experiment Notes are stored in the existing Supabase Postgres project.
- `SUPABASE_URL` — the same Supabase project URL
- `SUPABASE_ANON_KEY` — the public anon key used to verify user tokens
- `CORS_ORIGINS` — exact allowed browser origins, comma-separated, with no wildcard

The API requires the Supabase URL and public anon key, plus a valid user access token at request time. The `experiment_notes` table uses Postgres row-level security so each signed-in user can access only their own records.

## Why the research API stays on the existing service

The Python API is not included in the Vercel service list. Previous real deployment attempts showed dependency installation failing in the serverless build environment: first the Python requirements included nested `-r` files, then the available Python 3.12 environment failed building `llvmlite==0.36.0`, whose own build guard supports Python versions below 3.10. The dependency set also contains large scientific and quantum packages, including SHAP and the PennyLane/PyTorch hybrid stack.

Keeping FastAPI on the existing persistent deployment preserves its current Python environment and data lifecycle instead of reducing model capability to make a serverless build pass. Its current SQLite database, uploaded dataset files, model artifacts, and in-process training thread pool are not suitable for being moved blindly into ephemeral serverless function storage. Do not remove or alter the existing persistent-service deployment as part of this Vercel change.

## Verification after deployment

1. Open the generated site and refresh a nested browser route to verify the single-page-app routing.
2. Request `/api/health`; confirm it returns the FastAPI health response from the research service.
3. Request `/api/notes/health`; confirm the Express health endpoint responds.
4. Once the Supabase URL/public anon key are configured, sign in and test creating, listing, updating, and deleting a test note.
5. Run a small research workflow and confirm the returned dataset or experiment is present in the existing backend service.

This configuration keeps the frontend and notes API under one domain while preserving the current research backend deployment. Supabase is already configured in the Vercel project; the notes table is protected by owner-level RLS, and the live CRUD path must still be tested with an authenticated session.

See [deployment-setup.md](deployment-setup.md) for the fuller architecture and setup notes, and Vercel's [Services documentation](https://vercel.com/kb/guide/vercel-services) and [external rewrite documentation](https://vercel.com/docs/routing/rewrites) for routing behavior.
