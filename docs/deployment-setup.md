# Production Deployment Guide — EntangleX Q-Health

This guide outlines the production deployment architecture and configuration for the EntangleX Q-Health application.

> **Current deployment:** The root [Vercel Services guide](vercel-multi-service-deployment.md) deploys the React frontend and Express Experiment Notes API together on Vercel (`https://web-dev-entangle.vercel.app`), while research API requests are proxied to the persistent FastAPI service on Render (`https://entanglex-q-health-api.onrender.com`). **Supabase Auth** provides user authentication and JWT verification, and **MongoDB Atlas** provides persistent Experiment Notes document storage via Mongoose.

---

## 1. System Architecture Overview

The production architecture consists of four decoupled tiers:

```
                                  +-----------------------------+
                                  |     User Browser / Client   |
                                  +--------------+--------------+
                                                 |
                     +---------------------------+---------------------------+
                     |                                                       |
                     v                                                       v
        +--------------------------+                           +--------------------------+
        |   Frontend (React/Vite)  |                           |  Supabase Authentication |
        |  Hosted as Static SPA    |                           |  User JWT & Identity     |
        |  Vercel (Root: frontend) |                           +------------+-------------+
        +------------+-------------+                                        |
                     |                                                      |
         +-----------+-----------------------+                              |
         |                                   |                              |
         v                                   v                              v
+--------------------------+       +-----------------------------------------------+
|  Node.js / Express API   |       |  Python FastAPI Backend                       |
|  Serverless Functions    |       |  Render Web Service (render.yaml)             |
|  Vercel (Root: node-api) |       |  Quantum, ML, Datasets, Explainability        |
+------------+-------------+       +-----------------------------------------------+
             |
             v
+--------------------------+
|  MongoDB Atlas (Mongoose)|
|  Persistent Notes Store  |
+--------------------------+
```

1. **Frontend (React / Vite SPA)**:
   - Deployed on **Vercel** as a static single-page application.
   - Node.js runtime pinned via `frontend/.nvmrc` to `22.12.0`.
   - Handles client-side routing via `BrowserRouter` with `frontend/vercel.json` SPA rewrite rules.

2. **Node.js / Express Experiment Notes API**:
   - Deployed on **Vercel** as a Serverless REST API (`node-api/api/index.js`).
   - Node.js runtime pinned via `node-api/.nvmrc` to `22.12.0`.
   - Authenticated via Supabase Auth JWT verification (`@supabase/supabase-js`).
   - Persists experiment notes in **MongoDB Atlas** using **Mongoose** (`node-api/src/models/ExperimentNote.js`), enforcing owner-level isolation (`ownerId: req.user.id`) on every query.

3. **Python / FastAPI Backend**:
   - Hosted on **Render** (`https://entanglex-q-health-api.onrender.com`, configured via root `render.yaml`).
   - Responsible for classical and quantum machine learning pipelines (VQC, QSVC, QNN), dataset storage, SHAP explainability, and SQLite-backed experiment lineage.

4. **Data & Identity Layer**:
   - **MongoDB Atlas**: Managed cloud document database storing `ExperimentNote` documents with owner-scoped compound indexes.
   - **Supabase Auth**: Managed authentication provider issuing JWT bearer tokens verified by the Node API.
   - **SQLite**: Embedded relational store used by the Python FastAPI backend for ML jobs, model artifacts, and dataset metadata.

---

## 2. Vercel Deployment Option A: Multi-Service Single Project (Root `vercel.json`)

See [`docs/vercel-multi-service-deployment.md`](vercel-multi-service-deployment.md) for the shared root `vercel.json` configuration that serves both `frontend` and `node-api` under one Vercel domain (`https://web-dev-entangle.vercel.app`).

---

## 3. Vercel Deployment Option B: Standalone Frontend & Node API Projects

### Frontend Static SPA (`frontend/`)

| Setting | Value |
| --- | --- |
| **Root Directory** | `frontend` |
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci` |
| **Node.js Version** | `22.x` (enforced via `frontend/.nvmrc`) |

#### Frontend Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `VITE_API_BASE` | URL of the Python FastAPI backend | `https://entanglex-q-health-api.onrender.com/api` or `/api` |
| `VITE_NODE_API_BASE` | URL of the Node.js Express Notes API | `/api/notes` or `https://entanglex-node-api.vercel.app/api` |
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://xyzproject.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Public API Key | `eyJhbGciOi...` |

---

### Node.js Express Serverless API (`node-api/`)

| Setting | Value |
| --- | --- |
| **Root Directory** | `node-api` |
| **Framework Preset** | `Other` / `Express` |
| **Entrypoint** | `api/index.js` |
| **Install Command** | `npm ci` |
| **Node.js Version** | `22.x` (enforced via `node-api/.nvmrc`) |

#### Node API Environment Variables

Configure the following variables in the Vercel project settings:

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Environment identifier | `production` |
| `PORT` | Local port (defaults to `5000` locally) | `5000` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/entanglex?retryWrites=true&w=majority` |
| `SUPABASE_URL` | Supabase Project URL for JWT verification | `https://xyzproject.supabase.co` |
| `SUPABASE_ANON_KEY` | Public Supabase Anon Key for JWT verification | `eyJhbGciOi...` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `https://web-dev-entangle.vercel.app` |

> [!IMPORTANT]
> In production (`NODE_ENV=production`), `MONGODB_URI`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `CORS_ORIGINS` are all required. `CORS_ORIGINS` **must not** contain wildcards (`*`).

---

## 4. MongoDB Atlas Setup for Experiment Notes

1. Create a **MongoDB Atlas** cluster (e.g., M0 Free Tier or higher) and database named `entanglex`.
2. Under **Database Access**, create a database user with `readWrite` permissions on `entanglex`.
3. Under **Network Access**, allow connections from Vercel serverless functions (`0.0.0.0/0` or configured static egress IPs).
4. Copy the connection string (`mongodb+srv://<username>:<password>@<cluster>.mongodb.net/entanglex?retryWrites=true&w=majority`) and set it as `MONGODB_URI` in the Node API environment.
5. Connection management in `node-api/src/db/mongodb.js` caches the active Mongoose connection and in-flight connection promise across warm serverless invocations, redacts credentials from all logs, and returns HTTP `503 Service Unavailable` if the cluster is unreachable.

> **Historical Note:** The file `supabase/migrations/20261017_create_experiment_notes.sql` is retained only as a superseded historical reference. Active Experiment Notes persistence uses MongoDB Atlas through Mongoose.

---

## 5. Local Development vs. Production Configuration

| Component | Local Development | Production |
| --- | --- | --- |
| **Frontend URL** | `http://localhost:5173` | `https://web-dev-entangle.vercel.app` |
| **Node API URL** | `http://localhost:5000/api` | `https://web-dev-entangle.vercel.app/api/notes` |
| **Python API URL** | `http://localhost:8000/api` | `https://entanglex-q-health-api.onrender.com/api` |
| **Notes Storage** | MongoDB (`mongodb://localhost:27017/entanglex` or Atlas) | MongoDB Atlas (`MONGODB_URI=mongodb+srv://...`) |
| **Identity Provider** | Supabase Auth (JWT) | Supabase Auth (JWT) |
| **CORS Origins** | `http://localhost:5173,http://localhost:3000` | Exact frontend production URL |

---

## 6. Pre-Flight and Post-Deployment Verification Checklist

### Pre-Deployment (Local)

- [x] Frontend test suite passes: `cd frontend && npm test -- --run`
- [x] Frontend production build succeeds: `cd frontend && npm run build`
- [x] Node API test suite passes: `cd node-api && npm test`
- [x] No git diff check warnings: `git diff --check`

### Post-Deployment (Production — Requires `MONGODB_URI` Configured in Vercel)

1. **Verify Node API Health**:
   ```bash
   curl -i https://web-dev-entangle.vercel.app/api/notes/health
   # Expected once MONGODB_URI is connected: HTTP 200, { "status": "ok", "database": "connected", ... }
   ```
2. **Verify Authentication & End-to-End MongoDB Notes CRUD**:
   - Sign in using researcher credentials via Supabase Auth.
   - Navigate to **Experiment Notes** (`/my-research/notes`).
   - Create a note tagged with a dataset and model.
   - Edit the note and save changes.
   - Search and filter notes.
   - Delete the note and verify persistence across page reloads.
