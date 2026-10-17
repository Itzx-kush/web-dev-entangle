# Production Deployment Guide — EntangleX Q-Health

This guide outlines the production deployment architecture and configuration for the EntangleX Q-Health application.

---

## 1. System Architecture Overview

The production architecture consists of four decoupled services:

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
        |  Hosted as Static SPA    |                           |  User JWT & Profile      |
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
|  MongoDB Atlas Cluster   |
|  Persistent Notes DB     |
+--------------------------+
```

1. **Frontend (React / Vite SPA)**:
   - Deployed on **Vercel** as a static single-page application.
   - Project Root Directory: `frontend`.
   - Node.js runtime pinned via `frontend/.nvmrc` to `22.12.0`.
   - Handles client-side routing via `BrowserRouter` with `frontend/vercel.json` SPA rewrite rules.

2. **Node.js / Express Experiment Notes API**:
   - Deployed on **Vercel** as a Serverless REST API.
   - Project Root Directory: `node-api`.
   - Serverless entrypoint: `api/index.js` exporting the Express application.
   - Routed via `node-api/vercel.json` rewrite rules.
   - Node.js runtime pinned via `node-api/.nvmrc` to `22.12.0`.
   - Authenticated via Supabase Auth JWT verification (`@supabase/supabase-js`).
   - Persists experiment notes in MongoDB Atlas via Mongoose with connection pooling and in-flight promise caching.

3. **Python / FastAPI Backend**:
   - Retained on **Render** (configured via root `render.yaml`).
   - Responsible for classical and quantum machine learning pipelines (VQC, QSVC, QNN), dataset storage, SHAP explainability, and hardware provider integrations.

4. **Data & Identity Layer**:
   - **MongoDB Atlas**: Managed cloud document database for experiment notes.
   - **Supabase**: Managed authentication service issuing JWT bearer tokens.

---

## 2. Vercel Project 1: Frontend Static SPA

Deploy the frontend as a standalone project linked to the repository.

### Configuration Settings

| Setting | Value |
| --- | --- |
| **Project Name** | `entanglex-qhealth-frontend` (or preferred name) |
| **Root Directory** | `frontend` |
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci` |
| **Node.js Version** | `22.x` (enforced via `frontend/.nvmrc`) |

### Environment Variables

Configure the following environment variables in the Vercel Project Settings under **Environment Variables** (Production and Preview):

| Variable | Description | Example |
| --- | --- | --- |
| `VITE_API_BASE` | URL of the Python FastAPI backend | `https://entanglex-q-health-api.onrender.com/api` |
| `VITE_NODE_API_BASE` | URL of the Node.js Express Notes API | `https://entanglex-node-api.vercel.app/api` |
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://xyzproject.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Public API Key | `eyJhbGciOi...` |

### Client-Side SPA Deep-Linking (`frontend/vercel.json`)

Vite SPAs require client-side route rewrites so direct navigation or refreshing a deep route (such as `/notes`, `/datasets`, or `/experiments/:id`) serves `index.html` rather than returning a 404:

```json
{
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 3. Vercel Project 2: Node.js Express Serverless API

Deploy the Node API as a second project linked to the same Git repository.

### Configuration Settings

| Setting | Value |
| --- | --- |
| **Project Name** | `entanglex-node-api` (or preferred name) |
| **Root Directory** | `node-api` |
| **Framework Preset** | `Other` |
| **Build Command** | _None_ (serverless function) |
| **Output Directory** | _None_ |
| **Install Command** | `npm ci` |
| **Node.js Version** | `22.x` (enforced via `node-api/.nvmrc`) |

### Serverless Routing (`node-api/vercel.json`)

All incoming requests to the API are rewritten to the Express serverless entrypoint `api/index.js`:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index.js"
    }
  ]
}
```

### Environment Variables

Configure the following variables in the Node API Vercel project:

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Environment identifier | `production` |
| `PORT` | Local port (defaults to `5000` locally) | `5000` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/entanglex?retryWrites=true&w=majority` |
| `SUPABASE_URL` | Supabase Project URL (same as frontend) | `https://xyzproject.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anon Key (same as frontend) | `eyJhbGciOi...` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `https://entanglex-qhealth-frontend.vercel.app` |

> [!IMPORTANT]
> In production (`NODE_ENV=production`), `CORS_ORIGINS` is required and **must not** contain wildcards (`*`). Requests from origins not in this list will be rejected with HTTP 403 Forbidden.

---

## 4. MongoDB Atlas Database Setup

1. **Create an Atlas Cluster**:
   - Create a free (M0) or dedicated cluster in your target cloud region.
   - Database name: `entanglex`.

2. **Database User**:
   - Create a database user with `readWrite` permissions on the `entanglex` database.
   - Use a strong, random password. Avoid URL-unsafe characters or percent-encode them in the connection URI.

3. **Network Access / IP Allowlist**:
   - Because Vercel serverless functions execute from dynamic IP pools, configure MongoDB Atlas Network Access to allow access from anywhere (`0.0.0.0/0`) protected by standard username/password authentication, or configure Atlas Peering/PrivateLink if on an enterprise tier.

4. **Connection Pooling & Cold-Start Caching**:
   - The Mongoose connection manager in `node-api/src/db/mongodb.js` caches both the connection and the in-flight `connectionPromise`.
   - Concurrent cold starts await the single shared promise, preventing redundant connection overhead.
   - Reused warm lambdas return the existing connection immediately without overhead.

---

## 5. Local Development vs. Production Configuration

| Component | Local Development | Production |
| --- | --- | --- |
| **Frontend URL** | `http://localhost:5173` | `https://<frontend-project>.vercel.app` |
| **Node API URL** | `http://localhost:5000/api` | `https://<node-api-project>.vercel.app/api` |
| **Python API URL** | `http://localhost:8000/api` | `https://<render-service>.onrender.com/api` |
| **MongoDB** | `mongodb://localhost:27017/entanglex` | `mongodb+srv://...` (Atlas) |
| **CORS Origins** | `http://localhost:5173, http://localhost:3000` | Exact frontend production URL |

### Running Locally

1. **Start Python Backend**:
   ```bash
   cd backend
   python -m uvicorn app.main:app --port 8000 --reload
   ```

2. **Start Node.js API**:
   ```bash
   cd node-api
   npm run dev
   # Runs on http://localhost:5000
   ```

3. **Start React Frontend**:
   ```bash
   cd frontend
   npm run dev
   # Runs on http://localhost:5173
   ```

---

## 6. Pre-Flight and Post-Deployment Verification Checklist

### Pre-Deployment (Local)

- [ ] Frontend test suite passes: `cd frontend && npm test -- --run`
- [ ] Frontend production build succeeds: `cd frontend && npm run build`
- [ ] Backend test suite passes: `cd node-api && npm test`
- [ ] No git diff check warnings: `git diff --check`

### Post-Deployment (Production)

1. **Verify Node API Health**:
   ```bash
   curl -i https://<node-api-project>.vercel.app/health
   # Expected: HTTP 200, { "status": "ok", "database": "connected", ... }
   ```

2. **Verify CORS Enforcement**:
   ```bash
   # Approved origin:
   curl -i -H "Origin: https://<frontend-project>.vercel.app" https://<node-api-project>.vercel.app/health
   # Expected: HTTP 200 with Access-Control-Allow-Origin header

   # Unapproved origin:
   curl -i -H "Origin: https://evil.example.com" https://<node-api-project>.vercel.app/health
   # Expected: HTTP 403 Forbidden
   ```

3. **Verify Frontend SPA Deep-Linking**:
   - Open browser to `https://<frontend-project>.vercel.app/notes` directly.
   - Verify page loads without 404 error.

4. **Verify Authentication & End-to-End Notes Flow**:
   - Sign in using researcher credentials via Supabase Auth.
   - Navigate to **Experiment Notes**.
   - Create a note tagged with a dataset and model.
   - Edit the note and save changes.
   - Filter notes by dataset name.
   - Delete the note.
   - Verify changes persist across page reloads.

5. **Verify Python Backend Services**:
   - Navigate to **Quantum Lab** or **Demo Center** in the frontend.
   - Verify dataset loading, circuit inspection, and baseline predictions execute without disruption.
