# Single-Project Vercel Services Deployment

This is an experimental alternative to the split deployment described in [deployment-setup.md](deployment-setup.md). It configures the existing React/Vite frontend, Express Experiment Notes API, and FastAPI research backend as services in one Vercel project.

The repository root must be the Vercel project root directory, and the project framework/preset must be Services. The root [vercel.json](../vercel.json) is the source of truth for routing and service roots.

## Public service routes

| Service | Public path | Purpose |
| --- | --- | --- |
| frontend | / and other non-API routes | React/Vite single-page application |
| node-api | /api/notes/* | Express Experiment Notes CRUD API |
| backend | /api/*, except /api/notes/* | Python FastAPI research API |

The notes route is listed before the general Python API route. A service-level request-path transform removes the public /api/notes prefix and restores the internal /api prefix expected by the existing Express routes. The FastAPI app already exposes routes under /api, so its path remains unchanged. The final catch-all rewrite sends page routes to the frontend.

## Environment variables

Set values in the Vercel project settings for Production and Preview as applicable. Do not commit private database passwords, service-role keys, or provider API tokens.

### Frontend build variables

- VITE_API_BASE=/api
- VITE_NODE_API_BASE=/api/notes
- VITE_SUPABASE_URL — the Supabase project URL
- VITE_SUPABASE_ANON_KEY — the Supabase public anon/publishable key only; never use a service-role key here

The first two values use same-origin public routes configured in the root vercel.json.

### Node/Express service

- NODE_ENV=production
- MONGODB_URI — a MongoDB Atlas URI for the entanglex database
- SUPABASE_URL — the Supabase project URL
- SUPABASE_ANON_KEY — the public anon key used to verify user tokens
- CORS_ORIGINS — the exact Vercel site origin, for example https://your-project.vercel.app (no trailing slash)

MongoDB Atlas must allow connections from the deployed service. Use a database user with only the permissions it needs, and keep the connection URI private.

### Python/FastAPI service

- QHEALTH_DEPLOYMENT_MODE=production
- QHEALTH_TRUSTED_HOSTS — the exact Vercel hostname, such as your-project.vercel.app (host only, no scheme); comma-separate additional hostnames when required
- QHEALTH_CORS_ORIGINS — the exact HTTPS site origin, such as https://your-project.vercel.app
- QHEALTH_STORAGE_ROOT=/tmp/qhealth — makes the service use writable temporary storage for a best-effort deployment attempt; this storage is ephemeral
- QHEALTH_SUPABASE_URL and QHEALTH_SUPABASE_SERVICE_ROLE_KEY only if backend-only saved-report persistence is needed
- QHEALTH_GROQ_API_KEY only if the optional Groq-backed features are needed

The project may also need adjustments for authentication and provider-specific callback URLs after the Vercel hostname is known.

## Internal service bindings

No service binding is added in this configuration because code review found no server-to-server call between the frontend, Node API, and Python API. Frontend API requests are made by the user's browser to the public same-origin rewrite paths; a static Vite build cannot consume a runtime-only binding. The Node API accesses MongoDB and Supabase directly and does not call the Python service. Adding an unused binding would not change runtime behavior.

If a server-side service-to-service call is introduced later, add the binding to the caller service and update that caller's runtime code to use the injected environment variable. Do not hardcode a private service URL or try to use a runtime binding during the Vite build.

## Verification after deployment

1. Open the generated site and refresh a nested frontend page to verify SPA routing.
2. Request /api/health and confirm FastAPI returns its health response.
3. Request /api/notes/health and confirm the Node API health endpoint reports its database state.
4. Sign in and test create, list, update, and delete for a test note.
5. Test one research workflow only after confirming the Python service is ready and its dependencies were installed.

## Important runtime limitations

This configuration is a deployment attempt, not confirmation that the entire research backend is production-compatible with serverless execution. The existing Python service uses SQLite, local files for uploaded datasets and model artifacts, and an in-process background training thread pool. The temporary directory on Vercel is not durable or shared between separate function instances, and serverless execution does not guarantee a long-running worker will continue after a request ends. Those features may therefore lose state or fail to complete reliably, even if the service builds and its health endpoint responds.

The Python requirements also include scientific and quantum dependencies (including Qiskit, SHAP, and PyTorch/PennyLane), so dependency installation and function packaging may exceed the limits or constraints of the selected Vercel plan. The current persistent-storage/container deployment in [render.yaml](../render.yaml) remains the reliable fallback until storage and training jobs are redesigned around external durable storage and a managed queue/worker. Do not remove the Render configuration based only on a successful Vercel build.

See Vercel's [Services documentation](https://vercel.com/docs/services), [service bindings](https://vercel.com/docs/services/bindings), and [FastAPI deployment guide](https://vercel.com/docs/frameworks/backend/fastapi) for platform behavior and supported configuration.
