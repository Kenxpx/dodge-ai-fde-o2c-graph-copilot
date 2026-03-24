# Setup and Deployment Guide

This document covers the stack, local setup, and the exact deployment model used for the live demo.

## Stack used

### Backend

- Python 3.11
- FastAPI
- DuckDB
- pandas
- sqlglot
- httpx

### Frontend

- React
- TypeScript
- Vite
- Cytoscape.js

### Model provider

- Gemini (`gemini-2.5-flash`) for dynamic SQL planning

### Hosting

- Render web service
- Docker-based deployment

## What is bundled in the repo

The repository includes:
- source code
- the extracted dataset under `dataset_unzipped/`
- session logs under `sessions/`
- deployment files (`Dockerfile`, `render.yaml`)

That means a reviewer can clone the repo and run it without fetching anything else.

The product also includes:
- an operations inbox for high-signal issue buckets
- guided follow-up questions in the chat experience
- Markdown brief export for investigation handoff

## Local setup

### 1. Create a Python environment

On Windows:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
```

On macOS or Linux:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
```

### 2. Build the database

```powershell
$env:PYTHONPATH='backend'
.\.venv\Scripts\python backend\scripts\build_database.py
```

This creates the DuckDB database under `backend/data/`.

### 3. Start the backend

```powershell
$env:PYTHONPATH='backend'
.\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload
```

### 4. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs on Vite and proxies `/api` to the FastAPI backend.

## Environment variables

Copy `.env.example` to `.env` if you want to enable an LLM locally.

Important variables:
- `APP_ENV`
- `FRONTEND_ORIGIN`
- `LLM_PROVIDER`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

### Example Gemini setup

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

## Running as one service

The app can also be run as a single container.

```powershell
docker build -t dodge-ai-o2c-graph-copilot .
docker run --rm -p 8000:8000 dodge-ai-o2c-graph-copilot
```

In this mode:
- the frontend is built during the Docker build
- FastAPI serves the static frontend
- the dataset is bundled inside the image

## Live deployment

The public demo is deployed on Render:

`https://dodge-ai-o2c-graph-copilot.onrender.com`

### Why Render

This app is not just a static frontend. It needs:
- a Python backend
- a bundled analytical dataset
- a long-running API process
- support for environment variables

Render fits that better than a purely static host.

## Render deployment steps

### 1. Connect the GitHub repository

Create a Render Web Service and point it at:

`https://github.com/Kenxpx/dodge-ai-fde-o2c-graph-copilot`

### 2. Use Docker deployment

The repo already includes:
- `Dockerfile`
- `render.yaml`

### 3. Configure environment variables

At minimum:

```env
APP_ENV=production
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=...
```

### 4. Deploy

Render builds the frontend, installs backend dependencies, bundles the dataset, and starts FastAPI.

## Updating the live site

Once the Render service is connected to GitHub, the normal update loop is:
1. commit changes locally
2. push to GitHub
3. let Render auto-deploy or trigger a manual deploy

Because the app is already packaged as one service, no additional deployment steps are needed after a normal code push.

## Verification checklist

After a deploy, I usually check:
- `/`
- `/api/health`
- `/api/meta`
- that `ops_inbox` is present in `/api/meta`
- one deterministic query
- one Gemini-backed query
- one follow-up question from a previous answer

## Troubleshooting

### DuckDB install issues on Windows

Use native CPython instead of MSYS Python. That avoids wheel compatibility issues.

### Frontend loads but API fails

Check:
- backend is running
- `PYTHONPATH=backend`
- Vite proxy or deployed environment is correct

### Gemini path says not configured

Check:
- `LLM_PROVIDER=gemini`
- `GEMINI_API_KEY` is set
- the service has restarted after the env var change
