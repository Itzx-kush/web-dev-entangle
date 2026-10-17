# EntangleX Q-Health — Node.js & Express Research Notes API

The `node-api` package provides a production-conscious REST API service for EntangleX Q-Health. It enables authenticated researchers to record, organize, and manage persistent qualitative notes, observations, and hypotheses across datasets, models, and experiment runs.

---

## Architecture Overview

This service is architected as an independent Node.js microservice maintaining strict isolation from the existing React frontend (`frontend/`) and Python FastAPI backend (`backend/`):

- **Runtime & Module System**: Node.js (>= 20.0.0, pinned to Node 22 via root `.nvmrc`) using native ES modules (`"type": "module"`).
- **Web Framework**: Express 4 with security headers (`helmet`), configurable CORS origins (`cors`), and rate limiting (`express-rate-limit`).
- **Database & Persistence**: Supabase Postgres. Every notes request uses the verified user's JWT and database row-level security (RLS); no service-role key or separate database URI is needed.
- **Data Validation**: Strict runtime schema validation using Zod 3. Request payloads prevent injection or modification of system fields (`ownerId`, `_id`, timestamps).
- **Authentication**: Validates incoming Bearer JWT tokens via Supabase Auth client (`supabase.auth.getUser()`), attaching verified user identity (`id`, `email`) to request context.
- **Testing**: Built on native Node.js test runner (`node:test`) and `supertest`, executing in-memory without requiring live external services in continuous integration.

---

## Directory Structure

```
node-api/
├── .env.example                 # Example environment configuration template
├── .gitignore                   # Local node_modules and env ignore rules
├── package.json                 # Package definition, scripts, and dependencies
├── package-lock.json            # Deterministic dependency lockfile
├── README.md                    # Service documentation
├── src/
│   ├── app.js                   # Express application factory and middleware wiring
│   ├── index.js                 # Public library exports
│   ├── local.js                 # Local runtime listener and graceful shutdown
│   ├── config/
│   │   └── env.js               # Environment variables parsing and validation
│   ├── db/
│   │   └── supabase.js          # User-scoped Supabase client and database health probe
│   ├── models/
├── supabase/migrations/         # Experiment Notes table, indexes, trigger, and RLS policies
│   ├── validation/
│   │   └── experimentNotes.schema.js # Zod schemas for CRUD payloads, IDs, and queries
│   ├── services/
│   │   └── experimentNotes.service.js # Business logic and ownership-scoped queries
│   ├── controllers/
│   │   └── experimentNotes.controller.js # HTTP request handlers and standard responses
│   ├── middleware/
│   │   ├── auth.js              # Bearer token verification with dependency injection
│   │   ├── errorHandler.js      # Centralized error handler with sanitized responses
│   │   └── notFound.js          # Standard 404 handler for unknown routes
│   └── routes/
│       ├── health.routes.js     # Health check and DB status endpoints
│       └── experimentNotes.routes.js # Authenticated CRUD endpoints
└── test/
    ├── experimentNotes.test.js  # Comprehensive 12-scenario HTTP & business logic test suite
    ├── schema.test.js           # API payload and UUID validation tests
    └── helpers/
        └── inMemoryService.js   # Fast in-memory service mock for zero-dependency testing
```

---

## Environment Variables

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `5000` | Port for the HTTP server |
| `NODE_ENV` | String | `development` | Runtime environment (`development`, `production`, `test`) |
| `SUPABASE_URL` | String | `""` | Supabase project URL |\n| `SUPABASE_ANON_KEY` | String | `""` | Public Supabase anon/publishable key used for Auth and user-scoped Postgres requests |
| `SUPABASE_URL` | String | `""` | Supabase project URL |
| `SUPABASE_ANON_KEY` | String | `""` | Supabase anonymous API key |
| `CORS_ORIGINS` | String | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |

---

## API Endpoints

### 1. Health Check

#### `GET /health` or `GET /api/health`
- **Authentication**: None
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-10-17T12:00:00.000Z",
  "uptime": 12.34,
  "database": "connected"
}
```

---

### 2. Experiment Notes

All experiment notes endpoints require an `Authorization: Bearer <token>` header.

#### `POST /api/experiment-notes`
Create a new research note. `ownerId` is derived from the authenticated session.
- **Request Body**:
```json
{
  "title": "Quantum Variational Classifier Baseline",
  "content": "Evaluated accuracy across 50 iterations on dataset Q-Health-v1.",
  "datasetName": "Q-Health-v1",
  "modelName": "QuantumClassifier",
  "experimentReference": "exp-qhc-001",
  "tags": ["quantum", "baseline", "v1"]
}
```
- **Response**: `201 Created` with the created note document.

#### `GET /api/experiment-notes`
Retrieve a paginated list of notes owned by the authenticated user.
- **Query Parameters**:
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `10`, max: `100`)
  - `datasetName`: Filter by exact dataset name
  - `modelName`: Filter by exact model name
  - `experimentReference`: Filter by experiment reference identifier
  - `tag`: Filter by presence of tag
  - `search`: Case-insensitive text search across title and content
- **Response**: `200 OK`
```json
{
  "notes": [ ... ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

#### `GET /api/experiment-notes/:id`
Fetch a single note by its UUID. RLS and explicit owner filters ensure other users' records are not visible.
- **Response**: `200 OK` with note object, or `404 Not Found` if note does not exist or belongs to another user.

#### `PATCH /api/experiment-notes/:id`
Partially update allowed fields (`title`, `content`, `datasetName`, `modelName`, `experimentReference`, `tags`).
- Any attempt to modify `ownerId`, `_id`, `id`, `createdAt`, or `updatedAt` returns `400 Bad Request`.
- **Response**: `200 OK` with updated note object, or `404 Not Found`.

#### `DELETE /api/experiment-notes/:id`
Delete an existing note.
- **Response**: `200 OK` `{ "message": "Experiment note deleted successfully" }`, or `404 Not Found`.

---

## Local Development & Testing

### Installation

```bash
cd node-api
npm install
```

### Running Locally

```bash
# Copy template and configure variables
cp .env.example .env

# Start in development mode with automatic reload
npm run dev

# Or start standard production server
npm start
```

### Running Automated Tests

```bash
npm test
```
The test suite utilizes Node's built-in test runner (`node:test`) and `supertest`, executing all validation, authentication, authorization, ownership isolation, pagination, and error scenarios.
