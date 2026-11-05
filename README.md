# EntangleX Q-Health

A responsive full-stack web application for exploring disease-risk research workflows and managing experiment notes.

## Project links

| Resource | Link |
|---|---|
| **GitHub source code** | [Itzx-kush/web-dev-entangle](https://github.com/Itzx-kush/web-dev-entangle) |
| **Live assignment demo (Vercel)** | [https://web-dev-entangle.vercel.app](https://web-dev-entangle.vercel.app) |
| Optional full deployment (Render) | [https://entanglex-q-health.onrender.com](https://entanglex-q-health.onrender.com) |

**Deployment note:** The Vercel link is the primary demonstration for this assignment. It is set up as a mock/demo experience and can be explored using Guest access. Google authorization and the external API-backed AI integration are not enabled in this Vercel demo. The optional Render deployment is the fuller hosted version and includes the Google sign-in and AI integrations; these depend on the corresponding hosted services and credentials being available.

## 1. Problem statement

Exploring disease-risk prediction involves working with datasets, checking data quality, preparing features, comparing prediction models, and reviewing results. These activities are often handled in separate tools, making it difficult to follow one consistent workflow.

EntangleX Q-Health brings these steps together in one web application. It provides a visual research workspace for exploring datasets, reviewing model results, and keeping experiment-related notes.

The application is intended for academic demonstration and research exploration. It is not a clinical diagnosis or treatment system.

## 2. Main features

- **Dashboard:** A central overview of the research workspace and the featured Early Stage Diabetes demonstration.
- **Dataset management:** Browse datasets and inspect their structure and available features.
- **Data quality:** Review missing values, class distribution, and dataset quality information.
- **Data preparation:** Explore preprocessing, feature selection, and PCA stages.
- **Model training and comparison:** View classical, quantum-simulation, and hybrid model workflows and compare evaluation results.
- **Explainability and prediction:** Inspect feature contributions and explore prediction outputs.
- **Experiment management:** Review experiment records and their associated results.
- **Experiment Notes:** Create, view, update, search, and delete research notes through the Express API.
- **Responsive interface:** Use the workspace on desktop, tablet, and mobile layouts, with light and dark themes.

## 3. Technologies used

| Assignment requirement | Technology | Where it is used |
|---|---|---|
| Page structure | HTML5 | \`frontend/index.html\` and semantic React page structure |
| Styling and responsive design | CSS3 | \`frontend/src/\`, including responsive layouts and theme styles |
| Client-side programming | JavaScript / TypeScript | Frontend application logic and Node.js API |
| Component-based development | React 19 | \`frontend/src/\` |
| Development and API runtime | Node.js | \`node-api/\` |
| REST API framework | Express.js | \`node-api/src/\` |
| Database | MongoDB Atlas | Stores Experiment Notes |
| Database modelling | Mongoose | \`node-api/src/models/ExperimentNote.js\` |
| API communication | REST / HTTP | React frontend communicates with the Express API |
| Additional research service | Python, FastAPI, scikit-learn, Qiskit and PennyLane | Dataset and classical/quantum research workflows |

## 4. How the application works

The React application provides the user interface. The Express service handles Experiment Notes requests and uses Mongoose to store note records in MongoDB. The research workspace also communicates with the Python API for dataset and model-related operations.

\`\`\`mermaid
flowchart TD
    A[User] --> B[React Web Application]
    B --> C[Responsive Pages and Research Workspace]
    C --> D[Express REST API]
    D --> E[Mongoose]
    E --> F[(MongoDB Atlas)]
    C --> G[Python FastAPI Research Service]
    G --> H[Dataset and Model Workflows]
\`\`\`

### Main application areas

| Area | Purpose |
|---|---|
| Frontend (\`frontend/\`) | React user interface, routing, forms, navigation, and responsive styling |
| Node API (\`node-api/\`) | Express endpoints for Experiment Notes |
| MongoDB integration | Stores notes using the Mongoose \`ExperimentNote\` model |
| Research backend (\`backend/\`) | Python API for dataset, machine-learning, and quantum-simulation workflows |

## 5. REST API and MongoDB CRUD

The Experiment Notes feature demonstrates the four CRUD operations through the Express REST API. Requests to the protected notes routes require a valid user access token. Each record is associated with its owner.

| Operation | Method | Endpoint | Purpose |
|---|---|---|---|
| Create | \`POST\` | \`/api/experiment-notes\` | Add a note |
| Read all | \`GET\` | \`/api/experiment-notes\` | List and search notes |
| Read one | \`GET\` | \`/api/experiment-notes/:id\` | Retrieve a note |
| Update | \`PATCH\` | \`/api/experiment-notes/:id\` | Edit a note |
| Delete | \`DELETE\` | \`/api/experiment-notes/:id\` | Remove a note |

A note can contain a title, description, dataset name, model name, experiment reference, and tags. The API validates incoming data and scopes database queries to the authenticated owner.

## 6. Responsive interface

The interface uses CSS Grid, Flexbox, responsive breakpoints, and reusable React components. The navigation supports expanded and collapsed desktop layouts, while smaller screens use an adapted navigation layout. Light and dark themes are also available.

## 7. Run the project locally

### Requirements

- Node.js 22.12.x
- npm
- MongoDB Atlas connection string for the notes API
- Supabase project credentials for authenticated notes access
- Python 3.11 environment for the research backend (when running those workflows locally)

### Start the Express API

\`\`\`bash
cd node-api
npm ci
\`\`\`

Create a \`node-api/.env\` file using \`node-api/.env.example\` as a guide. Set the MongoDB and authentication values, then run:

\`\`\`bash
npm run dev
\`\`\`

The API runs locally on port \`5000\` by default.

### Start the React frontend

In a separate terminal:

\`\`\`bash
cd frontend
npm ci
npm run dev
\`\`\`

Open the local URL printed by Vite in the terminal.

### Run the tests and production build

Frontend:

\`\`\`bash
cd frontend
npm test
npm run build
\`\`\`

Node.js API:

\`\`\`bash
cd node-api
npm test
\`\`\`

## 8. Repository structure

\`\`\`text
web-dev-entangle/
├── frontend/       # React application and responsive UI
├── node-api/       # Node.js and Express REST API
├── backend/        # Python FastAPI research service
├── docs/           # Project and deployment documentation
├── render.yaml     # Render service configuration
├── vercel.json     # Vercel routing and deployment configuration
└── README.md
\`\`\`

## 9. Project note

EntangleX Q-Health was developed as a Smart India Hackathon 2026 project and is also being used to demonstrate the full-stack web development concepts listed in the course assignment.
