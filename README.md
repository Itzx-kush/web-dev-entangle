# EntangleX Q-Health

**A full-stack hybrid quantum-classical biomedical machine-learning research platform and MongoDB-backed experiment notes management system.**

- **GitHub Repository:** [https://github.com/Itzx-kush/web-dev-entangle](https://github.com/Itzx-kush/web-dev-entangle)
- **Live Application Deployment (Vercel):** [https://web-dev-entangle.vercel.app](https://web-dev-entangle.vercel.app)
- **Hosted Python Research API (Render):** [https://entanglex-q-health-api.onrender.com](https://entanglex-q-health-api.onrender.com)

> [!IMPORTANT]
> **Research Prototype Disclaimer:** EntangleX Q-Health is designed for educational, research, and algorithmic evaluation purposes. Model predictions and risk estimates are based on benchmark and user-provided datasets; they do not constitute professional medical diagnosis, clinical prognosis, or treatment recommendations. The Experiment Notes feature provides qualitative research observation storage and is not an Electronic Health Record (EHR) or clinical record management system.

---

## 1. Real-World Problem Statement

Biomedical disease-risk classification research requires reproducible dataset quality auditing, leakage-safe preprocessing, isolated train/test evaluation, and systematic comparison between classical machine-learning baselines (Logistic Regression, Support Vector Machines, Random Forest) and simulated quantum machine-learning architectures (Variational Quantum Classifiers, Quantum Support Vector Classifiers, and Quantum Neural Networks).

In day-to-day computational research, investigators also face a critical workflow gap: while quantitative metrics, confusion matrices, and SHAP feature attributions are captured by training pipelines, qualitative research context—such as exploratory hypotheses, circuit ansatz convergence anomalies, feature-engineering rationale, and dataset observations—is frequently lost in scattered local text files or mixed inappropriately into prediction payloads. Researchers need a secure, searchable, user-scoped cloud notebook integrated directly alongside their interactive modeling workbench.

---

## 2. Project Objectives

This project is designed, developed, and deployed to fulfill both the biomedical research management problem and the full-stack web development theory assignment requirements:

1. **Address a Real-World Biomedical Research Problem:** Provide an end-to-end platform for evaluating classical and quantum disease-risk prediction models alongside persistent qualitative experiment notes.
2. **Demonstrate Full-Stack Web Technologies:** Integrate **HTML5**, **CSS3**, **JavaScript (ES Modules)**, **React.js (React 19)**, **Node.js**, **Express.js**, and **MongoDB (MongoDB Atlas with Mongoose)** in a cohesive production architecture.
3. **Deliver Responsive UI Design:** Support desktop, tablet, and mobile viewports with adaptive grids, collapsible navigation, accessible forms, and multi-theme styling.
4. **Implement RESTful API & MongoDB CRUD Operations:** Expose authenticated Express endpoints (`POST`, `GET`, `PATCH`, `DELETE`) backed by Mongoose models, compound indexes, and strict per-user ownership isolation (`ownerId`).
5. **Maintain Clear Architectural Separation of Storage & Identity:**
   - **Supabase Auth:** User identity management and Bearer JWT verification.
   - **MongoDB Atlas (via Mongoose):** Persistent cloud document storage for Experiment Notes CRUD operations.
   - **SQLite:** Embedded local storage used by the Python FastAPI backend for ML training jobs, model bundles, and quantitative experiment lineage.

---

## 3. Solution Overview

EntangleX Q-Health unites three coordinated tiers:

1. **Interactive React Research Frontend (`frontend/`):** A responsive single-page application built with React 19, Vite, and React Query covering dataset exploration, data-quality scorecards, feature selection, classical/quantum training, SHAP explainability, and the dedicated **Experiment Notes** workspace (`/my-research/notes`).
2. **Node.js & Express Experiment Notes REST API (`node-api/`):** An authenticated microservice that verifies Supabase JWT access tokens, validates payloads with Zod, manages serverless MongoDB Atlas connections via Mongoose, and executes owner-scoped CRUD operations on `ExperimentNote` documents.
3. **Python FastAPI Research Backend (`backend/`):** A scientific computing service executing scikit-learn pipelines, Qiskit/PennyLane quantum circuit simulations, SHAP explainability, and SQLite-backed experiment tracking.

| Assignment Requirement | Project Implementation & Source Mapping |
| :--- | :--- |
| **HTML5** | Semantic HTML structure, accessible forms, landmarks, and root entry document in [`frontend/index.html`](frontend/index.html). |
| **CSS3** | Responsive layouts, CSS custom properties, light/dark/research themes, and flexbox/grid systems in [`frontend/src/index.css`](frontend/src/index.css). |
| **JavaScript** | Native ES modules in the Node.js API ([`node-api/src/`](node-api/src/)) and browser runtime; TypeScript ([`frontend/src/`](frontend/src/)) compiles to standard ES JavaScript. |
| **React.js** | React 19 functional components, custom hooks, context providers, and lazy-loaded routing in [`frontend/src/App.tsx`](frontend/src/App.tsx) and [`frontend/src/research/ExperimentNotesPage.tsx`](frontend/src/research/ExperimentNotesPage.tsx). |
| **Node.js** | Asynchronous JavaScript runtime (pinned to Node `22.12.0` via [`.nvmrc`](.nvmrc)) powering the Experiment Notes service. |
| **Express.js** | REST API framework with `helmet`, `cors`, `express-rate-limit`, authentication middleware, and centralized error handling in [`node-api/src/app.js`](node-api/src/app.js). |
| **MongoDB & Mongoose** | MongoDB Atlas connection manager ([`node-api/src/db/mongodb.js`](node-api/src/db/mongodb.js)), Mongoose schema/indexes ([`node-api/src/models/ExperimentNote.js`](node-api/src/models/ExperimentNote.js)), and CRUD service ([`node-api/src/services/experimentNotes.service.js`](node-api/src/services/experimentNotes.service.js)). |
| **RESTful API Integration** | Typed frontend client ([`frontend/src/lib/experimentNotesApi.ts`](frontend/src/lib/experimentNotesApi.ts)) communicating with `/api/experiment-notes` and `/health`. |

---

## 4. Technology Stack

| Layer | Technology | Location | Role in Application |
| :--- | :--- | :--- | :--- |
| **Frontend Structure & Style** | HTML5, CSS3 | `frontend/index.html`, `frontend/src/index.css` | Semantic markup, responsive grid/flexbox layouts, custom theme tokens, and accessibility states. |
| **Frontend Application** | React 19, TypeScript 5.9, Vite 7 | `frontend/src/` | Component-driven SPA, client-side routing (`react-router-dom`), and optimized asset bundling. |
| **Frontend State & Fetching** | TanStack React Query 5 | `frontend/src/research/ExperimentNotesPage.tsx` | Server-state caching, pagination, search debouncing, and mutation invalidation. |
| **Notes Backend Runtime** | Node.js (>=20.0.0, 22.12.0 LTS) | `node-api/` | Non-blocking ES module server runtime for the Experiment Notes REST API. |
| **Notes Web Framework** | Express 4, Helmet, CORS, Rate Limit | `node-api/src/app.js` | REST routing, HTTP security headers, origin allowlist enforcement, and abuse protection. |
| **Notes Database & ODM** | MongoDB Atlas, Mongoose 8 | `node-api/src/db/mongodb.js`, `node-api/src/models/ExperimentNote.js` | Persistent document storage, schema validation, ObjectId serialization, and compound indexing. |
| **Payload Validation** | Zod 3 | `node-api/src/validation/experimentNotes.schema.js` | Strict request body, query parameter, and 24-hex ObjectId validation. |
| **Authentication** | Supabase Auth (`@supabase/supabase-js`) | `frontend/src/auth/`, `node-api/src/middleware/auth.js` | OAuth/email user sign-in and server-side Bearer JWT verification. |
| **ML & Quantum Backend** | Python 3.11, FastAPI, scikit-learn, Qiskit, PennyLane, SQLite | `backend/` | Classical/quantum model training, dataset auditing, SHAP explainability, and SQLite job persistence. |
| **Automated Testing** | Node Test Runner (`node:test`), Supertest, Vitest, Testing Library | `node-api/test/`, `frontend/src/tests/` | Automated unit, component, schema, and HTTP integration test suites. |

---

## 5. System Architecture

The following diagram illustrates the active request flow across the React client, Supabase authentication, the Express + Mongoose notes microservice, MongoDB Atlas, and the Python FastAPI research backend:

```mermaid
flowchart TD
    subgraph Client["React 19 Frontend (frontend/)"]
        UI["Responsive Research Shell & Navigation"]
        NotesUI["Experiment Notes Page (/my-research/notes)"]
        ResearchUI["Data Lab / Quantum Lab / Model Studio"]
    end

    subgraph Auth["Authentication Provider"]
        SupabaseAuth["Supabase Auth (Issues & Verifies User JWTs)"]
    end

    subgraph NodeAPI["Node.js + Express API (node-api/)"]
        AuthMW["Auth Middleware (Bearer JWT -> req.user.id)"]
        DbMW["MongoDB Connection Middleware (ensureDbConnected)"]
        NotesCtrl["Controller + Zod Schema Validation"]
        NotesSvc["Mongoose CRUD Service (experimentNotes.service.js)"]
    end

    subgraph MongoAtlas["MongoDB Atlas Cloud"]
        MongoCollection[("ExperimentNote Collection (Mongoose ODM)")]
    end

    subgraph PythonAPI["Python FastAPI Backend (backend/)"]
        FastAPI["FastAPI Endpoints (/api/...)"]
        MLQuantum["scikit-learn + Qiskit / PennyLane"]
        SQLite[("SQLite Storage (ML Jobs, Models, Lineage)")]
    end

    UI --> SupabaseAuth
    NotesUI -- "REST API + Bearer JWT" --> AuthMW
    AuthMW -- "Verify Token" --> SupabaseAuth
    AuthMW --> DbMW
    DbMW --> NotesCtrl
    NotesCtrl --> NotesSvc
    NotesSvc -- "Mongoose Queries (ownerId scoped)" --> MongoCollection

    ResearchUI -- "REST API" --> FastAPI
    FastAPI --> MLQuantum
    MLQuantum --> SQLite
```

### Storage and Identity Responsibilities
- **Supabase Auth:** Used strictly for user identity and Bearer JWT verification (`supabase.auth.getUser(token)`). It is **not** used as the Experiment Notes persistence database.
- **MongoDB Atlas:** The active CRUD database for Experiment Notes, accessed through Mongoose (`node-api/src/models/ExperimentNote.js` and `node-api/src/services/experimentNotes.service.js`).
- **SQLite:** Used exclusively by the Python FastAPI research backend (`backend/`) to store dataset registrations, training runs, and model artifacts.
- *(Historical note: `supabase/migrations/20261017_create_experiment_notes.sql` is retained in the repository for historical reference only and is explicitly marked as superseded by the MongoDB Atlas + Mongoose implementation).*

---

## 6. Frontend Implementation

The frontend in [`frontend/`](frontend/) is a React 19 single-page application:

- **Entry & HTML Metadata:** [`frontend/index.html`](frontend/index.html) defines semantic document metadata, viewport rules, and the `#root` mount container.
- **Experiment Notes Workspace ([`frontend/src/research/ExperimentNotesPage.tsx`](frontend/src/research/ExperimentNotesPage.tsx)):**
  - Provides a complete interface to **create**, **list/search**, **edit**, and **delete** research notes.
  - Supports real-time character counters (`200` chars for title, `10,000` chars for content), optional metadata fields (`datasetName`, `modelName`, `experimentReference`), and comma-separated `tags`.
  - Includes debounced keyword search (300ms), pagination controls (`Previous` / `Next`), and deep links from `experimentReference` badges directly to `/experiments/:id`.
  - Renders explicit UI states for **loading** (`<Loading />`), **empty results** (`<EmptyState />`), **mutation success** (`<Notice tone="green" />`), **API/validation errors** (`<ErrorBanner />`), and **guest/unauthenticated prompts**.
- **Typed REST Client ([`frontend/src/lib/experimentNotesApi.ts`](frontend/src/lib/experimentNotesApi.ts)):**
  - Attaches `Authorization: Bearer <access_token>` to every protected request.
  - Normalizes development (`http://localhost:5000/api`) and production (`/api/notes` or HTTPS origin) base URLs.
  - Translates HTTP `400`, `401`, `404`, `429`, `500`, and `503` responses into structured `NodeApiError` instances.

---

## 7. Backend Implementation

The backend layer comprises two specialized services:

1. **Node.js & Express Experiment Notes Service ([`node-api/`](node-api/)):**
   - [`node-api/src/app.js`](node-api/src/app.js): Configures proxy trust (`app.set('trust proxy', 1)`), `helmet` security headers, origin-checked `cors`, `express.json({ limit: '1mb' })`, `/api/` rate limiting, `/health` routes, and `/api/experiment-notes` routes.
   - [`node-api/src/routes/experimentNotes.routes.js`](node-api/src/routes/experimentNotes.routes.js): Enforces middleware ordering so `authMiddleware` executes first, `ensureDbConnected` executes second, and CRUD controller handlers execute only after authentication and database readiness succeed.
   - [`node-api/src/controllers/experimentNotes.controller.js`](node-api/src/controllers/experimentNotes.controller.js): Validates incoming request bodies, query strings, and `:id` parameters using Zod schemas before invoking the Mongoose service with `req.user.id`.
   - [`node-api/src/middleware/errorHandler.js`](node-api/src/middleware/errorHandler.js): Maps malformed JSON (`400`), Zod validation errors (`400`), Mongoose `CastError`/`ValidationError` (`400`), CORS rejections (`403`), and MongoDB connection/timeout errors (`503`) to sanitized JSON responses without leaking stack traces or connection strings.
2. **Python FastAPI Research Service ([`backend/`](backend/)):**
   - Preserved untouched for biomedical dataset management, classical ML pipelines, Qiskit/PennyLane quantum simulation, and SHAP explainability.

---

## 8. Express REST API Specification

| Operation | HTTP Method | Endpoint | Auth Required | Success Status | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Create Note** | `POST` | `/api/experiment-notes` | Yes (`Bearer JWT`) | `201 Created` | Creates a new note in MongoDB with `ownerId = req.user.id`. |
| **Get All Notes** | `GET` | `/api/experiment-notes` | Yes (`Bearer JWT`) | `200 OK` | Lists authenticated user's notes with pagination, search, and filters. |
| **Get One Note** | `GET` | `/api/experiment-notes/:id` | Yes (`Bearer JWT`) | `200 OK` | Retrieves a single note by 24-hex ObjectId if owned by caller. |
| **Update Note** | `PATCH` | `/api/experiment-notes/:id` | Yes (`Bearer JWT`) | `200 OK` | Partially updates allowed fields on an owned note. |
| **Delete Note** | `DELETE` | `/api/experiment-notes/:id` | Yes (`Bearer JWT`) | `200 OK` | Deletes an owned note permanently from MongoDB. |
| **Health Check** | `GET` | `/health` (and `/api/health`) | No | `200 OK` | Reports service status, uptime, and Mongoose connection state. |

### Query Parameters for `GET /api/experiment-notes`
- `page` (integer, default `1`, min `1`)
- `limit` (integer, default `10`, min `1`, max `100`)
- `datasetName` (optional exact filter)
- `modelName` (optional exact filter)
- `experimentReference` (optional exact filter)
- `tag` (optional tag inclusion filter)
- `search` (optional case-insensitive regex-escaped search matching `title` or `content`)

---

## 9. MongoDB Atlas Integration

MongoDB connectivity is implemented in [`node-api/src/db/mongodb.js`](node-api/src/db/mongodb.js) and [`node-api/src/config/env.js`](node-api/src/config/env.js):

- **Environment Validation:** `MONGODB_URI` is defined in `env.mongodbUri` and validated by `validateEnv()` and `isValidMongoUri()` to ensure it uses `mongodb://` or `mongodb+srv://` (and is strictly required when `NODE_ENV=production`).
- **Serverless Connection Caching:** `connectMongo()` caches both the active Mongoose connection (`cachedConnection`) and the in-flight connection promise (`connectionPromise`). Concurrent requests share the same connection attempt, and warm serverless invocations reuse the existing connection instead of opening a new connection per request.
- **Lifecycle & Reconnection Handling:** Registers `disconnected`, `reconnected`, and `error` listeners once on `mongoose.connection` to clear stale cache state on disconnect and restore it on reconnect.
- **Credential-Safe Logging:** `sanitizeMongoUri()` strips any `mongodb://` or `mongodb+srv://` URIs and `username:password` pairs before logging or constructing error messages. Full connection strings and database passwords are never printed to application logs.
- **Graceful Degradation (HTTP 503):** When MongoDB is unreachable, `connectMongo()` throws a sanitized `MongooseServerSelectionError` with status `503`, which `errorHandler` translates into `503 Service Unavailable`.

---

## 10. Experiment Notes Data Model

Defined in [`node-api/src/models/ExperimentNote.js`](node-api/src/models/ExperimentNote.js):

| Field | Mongoose Type | Required | Validation & Constraints |
| :--- | :--- | :--- | :--- |
| `id` | String (Virtual) | Auto | Serialized from MongoDB `_id` (`ObjectId.toString()`); `_id` and `__v` are stripped in `toJSON`/`toObject`. |
| `title` | `String` | Yes | Trimmed; max `200` characters (`required: [true, 'Title is required']`). |
| `content` | `String` | Yes | Trimmed; max `10000` characters (`required: [true, 'Content is required']`). |
| `datasetName` | `String` | No | Trimmed; default `''`; max `100` characters. |
| `modelName` | `String` | No | Trimmed; default `''`; max `100` characters. |
| `experimentReference` | `String` | No | Trimmed; default `''`; max `100` characters. |
| `tags` | `[String]` | No | Default `[]`; max `20` tags; each tag trimmed and max `50` characters. |
| `ownerId` | `String` | Yes | Trimmed; single-field index (`index: true`); set from verified `req.user.id`. |
| `createdAt` | `Date` | System | Automatically managed via Mongoose `timestamps: true`. |
| `updatedAt` | `Date` | System | Automatically managed via Mongoose `timestamps: true`. |

### Database Indexes
- `{ ownerId: 1 }` (single-field owner index)
- `{ ownerId: 1, updatedAt: -1 }` (compound index for default chronological listing)
- `{ ownerId: 1, datasetName: 1 }` (compound index for dataset filtering)
- `{ ownerId: 1, modelName: 1 }` (compound index for model filtering)
- `{ ownerId: 1, tags: 1 }` (compound multikey index for tag filtering)
- `{ ownerId: 1, experimentReference: 1 }` (compound index for experiment reference lookup)

---

## 11. MongoDB CRUD Operations

Implemented in [`node-api/src/services/experimentNotes.service.js`](node-api/src/services/experimentNotes.service.js):

1. **CREATE (`createNote(ownerId, data)`):**
   - Calls `ExperimentNote.create({ title, content, datasetName, modelName, experimentReference, tags, ownerId })`.
   - Returns the serialized JSON document with `id`, `ownerId`, `createdAt`, and `updatedAt`.
2. **READ — List & Search (`listNotes(ownerId, query)`):**
   - Builds an owner-scoped filter `{ ownerId }` plus optional `datasetName`, `modelName`, `experimentReference`, `tags`, and regex-escaped `$or` search across `title` and `content`.
   - Executes `ExperimentNote.countDocuments(filter)` and `ExperimentNote.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).exec()` concurrently via `Promise.all`.
   - Returns `{ notes, pagination: { total, page, limit, totalPages } }`.
3. **READ — Single Record (`getNoteById(ownerId, noteId)`):**
   - Executes `ExperimentNote.findOne({ _id: noteId, ownerId }).exec()`.
   - Returns the serialized note or `null` (which the controller maps to `404 Not Found`).
4. **UPDATE (`updateNote(ownerId, noteId, updateData)`):**
   - Strips any system/immutable keys (`ownerId`, `_id`, `id`, `createdAt`, `updatedAt`).
   - Executes `ExperimentNote.findOneAndUpdate({ _id: noteId, ownerId }, { $set: cleanData }, { new: true, runValidators: true }).exec()`.
   - Returns the updated serialized note or `null` (`404 Not Found`).
5. **DELETE (`deleteNote(ownerId, noteId)`):**
   - Executes `ExperimentNote.deleteOne({ _id: noteId, ownerId }).exec()`.
   - Returns `true` when `result.deletedCount === 1`, or `false` (`404 Not Found`).

---

## 12. Authentication and Data Ownership

- **Bearer Token Verification:** [`node-api/src/middleware/auth.js`](node-api/src/middleware/auth.js) extracts the `Authorization: Bearer <token>` header, verifies the token with Supabase Auth (`supabase.auth.getUser(token)`), and populates `req.user = { id, email }`.
- **Pre-Database Auth Gate:** Protected routes execute `authMiddleware` before `ensureDbConnected`, ensuring unauthenticated requests are immediately rejected with `401 Unauthorized` without touching MongoDB.
- **Strict Ownership Isolation:** Every Mongoose query includes `ownerId: req.user.id`. A user can never read, update, or delete another user's note by supplying a different document's ObjectId; non-matching ownership returns `404 Not Found` without leaking whether the ID exists.
- **Payload Tamper Protection:** Both Zod (`checkForbiddenFields`) and the service layer forbid client payloads from setting or mutating `ownerId`, `_id`, `id`, `createdAt`, or `updatedAt`.

---

## 13. Responsive UI Implementation

- **Adaptive Layouts:** Built in [`frontend/src/index.css`](frontend/src/index.css) and component layouts using responsive CSS Grid and Flexbox breakpoints (`sm:`, `lg:`) that adapt from single-column mobile views to multi-column desktop research dashboards.
- **Collapsible Navigation & Workspace Shell:** The sidebar and header navigation collapse cleanly on smaller screens while preserving keyboard accessibility and focus indicators.
- **Theme Support:** Supports Light, Dark, and High-Contrast Research themes via CSS custom properties.

---

## 14. Installation Instructions

### Prerequisites
- **Node.js:** `v22.12.0` LTS (or `>= 20.0.0`) and **npm**
- **MongoDB:** A **MongoDB Atlas** cluster URI (`mongodb+srv://...`) or local MongoDB server (`mongodb://localhost:27017/entanglex`)
- **Supabase Project:** Public `SUPABASE_URL` and `SUPABASE_ANON_KEY` for user authentication
- **Python (Optional, for local ML/Quantum backend):** Python `3.11`

```bash
# 1. Clone the repository
git clone https://github.com/Itzx-kush/web-dev-entangle.git
cd web-dev-entangle

# 2. Install Node.js Express API dependencies
cd node-api
npm ci

# 3. Install React frontend dependencies
cd ../frontend
npm ci
```

---

## 15. Environment Variable Configuration

Copy the example environment templates and populate your local values (never commit real `.env` files):

```bash
cp .env.example .env
cp node-api/.env.example node-api/.env
cp frontend/.env.example frontend/.env
```

### `node-api/.env`
```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://your-db-user:your-db-password@your-cluster.mongodb.net/entanglex?retryWrites=true&w=majority
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### `frontend/.env`
```dotenv
VITE_API_BASE=/api
VITE_NODE_API_BASE=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 16. How to Run the Application Locally

### Terminal 1 — Start the Node.js & Express Notes API
```bash
cd node-api
npm run dev
```
- Runs on `http://localhost:5000`
- Health check: `http://localhost:5000/health`

### Terminal 2 — Start the React Frontend
```bash
cd frontend
npm run dev
```
- Runs on `http://localhost:5173`
- Navigate to **Studio → Experiment Notes** (`http://localhost:5173/my-research/notes`) after signing in.

### Terminal 3 (Optional) — Start the Python FastAPI Research Backend
```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe scripts\init_db.py
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --workers 1
```

---

## 17. Testing Instructions

Run the automated test suites and production build checks across the repository:

```bash
# 1. Node.js Express API & Mongoose Test Suite (56 tests across 20 suites)
cd node-api
npm ci
npm test

# 2. React Frontend Unit & Integration Test Suite (180 tests across 34 test files)
cd ../frontend
npm ci
npm test -- --run

# 3. Frontend Production Build Check (TypeScript + Vite bundle)
npm run build

# 4. Python Backend Source & Syntax Integrity Check
cd ..
python scripts/check_source.py
```

### Distinction Between Automated Tests and Live MongoDB Atlas Integration
- **Automated Test Verification (Executed & Passing):** All 56 Node API tests (covering Mongoose model validation, `ExperimentNote` schema indexes and `toJSON` transforms, `createExperimentNotesService` CRUD operations, owner isolation, 24-hex ObjectId validation, auth middleware ordering, serverless connection reuse, credential sanitization, and 503 outage handling) and all 180 frontend tests run deterministically in CI/local environments using isolated mocks.
- **Live MongoDB Atlas Integration:** Executing live CRUD requests against a cloud MongoDB Atlas cluster requires private runtime credentials (`MONGODB_URI=mongodb+srv://...` and live Supabase Auth credentials) configured in `.env` or Vercel environment settings. No live Atlas connection results are fabricated in automated test runs.

---

## 18. GitHub Repository Link

- **Repository:** [https://github.com/Itzx-kush/web-dev-entangle](https://github.com/Itzx-kush/web-dev-entangle)

---

## 19. Live Deployment Link

- **Live Web Application (Vercel):** [https://web-dev-entangle.vercel.app](https://web-dev-entangle.vercel.app)
- **Live Python Research Backend API (Render):** [https://entanglex-q-health-api.onrender.com](https://entanglex-q-health-api.onrender.com)
- **Deployment Documentation:** See [`docs/deployment-setup.md`](docs/deployment-setup.md) and [`docs/vercel-multi-service-deployment.md`](docs/vercel-multi-service-deployment.md) for Vercel environment variable requirements (including configuring `MONGODB_URI` in Vercel project settings once merged).
