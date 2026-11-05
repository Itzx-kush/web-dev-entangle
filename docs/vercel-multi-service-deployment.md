# Single-Project Deployment with a Hosted Research API

The root [`vercel.json`](../vercel.json) deploys the existing React/Vite frontend and Express Experiment Notes API together (`https://web-dev-entangle.vercel.app`). Research API requests are forwarded to the existing FastAPI deployment at `https://entanglex-q-health-api.onrender.com`. The Python service is intentionally not built as a serverless function in this project because its scientific dependency stack, SQLite database, local artifact storage, and background worker are designed for a persistent service.

The repository root must be the project root directory, and the project framework/preset must be **Services**. Do not set the project root to `frontend` or `node-api`; the root configuration owns the shared routing table.

## Public routes

| Public path | Destination | Purpose |
| --- | --- | --- |
| `/` and other non-API paths | `frontend` service | React/Vite single-page application |
| `/api/notes/*` | `node-api` service | Express Experiment Notes API (MongoDB Atlas via Mongoose) |
| `/api/*`, except `/api/notes/*` | Existing FastAPI deployment | Research API: datasets, experiments, training, quantum workflows, and reports |

The notes rule must remain before the broader research API rule. Its service-level request-path transform maps `/api/notes/experiment-notes` to the existing Express `/api/experiment-notes` route. The final catch-all sends browser page routes to the frontend.

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
- `MONGODB_URI` — MongoDB Atlas connection string (`mongodb+srv://<username>:<password>@<cluster>.mongodb.net/entanglex?retryWrites=true&w=majority`) used by Mongoose for persistent Experiment Notes CRUD storage
- `SUPABASE_URL` — the same Supabase project URL (used for Bearer JWT verification)
- `SUPABASE_ANON_KEY` — the public anon key used to verify user tokens via Supabase Auth
- `CORS_ORIGINS` — exact allowed browser origins, comma-separated, with no wildcard

At request time, the Express API first verifies the caller's Supabase Bearer JWT (`req.user.id`), then ensures a cached Mongoose connection to MongoDB Atlas is established (`ensureDbConnected`), and finally executes owner-scoped Mongoose operations (`{ ownerId: req.user.id }`) against the `ExperimentNote` model.

## Why the research API stays on the existing service

The Python API is not included in the Vercel service list. Previous deployment attempts showed scientific dependency builds (`llvmlite`, Qiskit, PennyLane, PyTorch, SHAP) and stateful SQLite/artifact storage require a persistent service rather than ephemeral serverless function storage. Keeping FastAPI on `https://entanglex-q-health-api.onrender.com` preserves its full classical and quantum machine learning capabilities.

## Verification after configuring `MONGODB_URI`

1. Open `https://web-dev-entangle.vercel.app` and refresh a nested browser route to verify single-page-app routing.
2. Request `/api/health`; confirm it returns the FastAPI health response from the research service.
3. Request `/api/notes/health`; confirm the Express health endpoint responds with MongoDB connection status.
4. Once `MONGODB_URI`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` are configured, sign in and test creating, listing, updating, and deleting an experiment note.
5. Run a research workflow and confirm the returned dataset or experiment is present in the existing backend service.

See [`deployment-setup.md`](deployment-setup.md) for full architecture and MongoDB Atlas setup details.
