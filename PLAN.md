# Plan: React + Vite + Material UI Frontend with Flask Backend

## Context

The project currently has a Python virtual environment and a `requirements.txt` containing:

- `matplotlib`
- `flask`
- `astroquery`
- `lightkurve`

The goal is to structure the app with a modern React frontend using Vite and Material UI, plus a Flask backend that can serve API endpoints for Lightkurve/Astroquery work such as generating or returning Kepler-10 light curve data/plots.

## Approach

Use a split frontend/backend layout:

```text
exoplore/
  backend/
    app.py
    requirements.txt
    ...
  frontend/
    package.json
    index.html
    src/
      App.jsx
      main.jsx
      ...
```

The Flask backend will expose API routes, and the React/Vite frontend will call those routes. During local development, Vite will run separately from Flask and proxy API requests to Flask.

For charting, use Plotly through `react-plotly.js` / `plotly.js`. This pairs well with scientific/time-series data because it supports zooming, panning, hover values, responsive charts, and large numeric arrays better than simpler dashboard chart libraries.

Lightkurve is still useful: the backend will use Lightkurve to search/download/process the Kepler-10 light curve, then return simplified JSON arrays to React. Plotly only handles rendering in the browser.

Recommended first backend API shape:

- `GET /api/health` — confirm backend is running
- `GET /api/lightcurve/kepler-10` — return Kepler-10 light curve data as JSON, e.g. time and normalized flux arrays

Recommended first frontend UI:

- Material UI app shell
- Button/card for loading Kepler-10 light curve
- Loading and error states
- Plotly chart rendering backend-provided light curve JSON

## Files to modify

Likely files/directories to create or move:

- `backend/requirements.txt` — move current Python dependency list here
- `backend/app.py` — Flask app entrypoint
- `backend/services/lightkurve_service.py` — Kepler-10 search/download/processing logic
- `frontend/package.json` — React/Vite/Material UI/Plotly dependencies and scripts
- `frontend/index.html` — Vite HTML entrypoint
- `frontend/src/main.jsx` — React entrypoint
- `frontend/src/App.jsx` — main Material UI interface
- `frontend/vite.config.js` — dev server proxy to Flask
- `.gitignore` — ignore `.venv`, frontend `node_modules`, Python caches, generated artifacts
- `README.md` — local run instructions

## Reuse

Existing reusable project pieces found:

- `requirements.txt` — already lists `matplotlib`, `flask`, `astroquery`, and `lightkurve`; should be moved or copied into `backend/requirements.txt` depending on preferred layout.
- `.venv/` — existing Python virtual environment can continue to be used for backend development.

## Steps

- [x] Create `backend/` directory and move/copy the existing `requirements.txt` there.
- [x] Create an organized Flask backend with `backend/app.py` plus `backend/services/lightkurve_service.py`.
- [x] Add backend API routes for health check and Kepler-10 JSON light curve data.
- [x] In the Lightkurve service, search/download Kepler-10 data, clean invalid values, normalize flux, and convert arrays into JSON-safe lists.
- [x] Create `frontend/` with Vite React setup.
- [x] Install React, Vite, Material UI, Emotion, Plotly, and `react-plotly.js`.
- [x] Configure Vite proxy so frontend can call Flask using `/api/...`.
- [x] Build Material UI frontend with load button, loading state, error state, and Plotly result chart.
- [x] Add local development instructions to `README.md`.

## Verification

Backend checks:

```bash
cd backend
source ../.venv/bin/activate
python app.py
```

Then verify:

```text
http://127.0.0.1:5000/api/health
```

Frontend checks:

```bash
cd frontend
npm install
npm run dev
```

Then open the Vite URL and confirm:

- React app loads.
- Material UI styling appears.
- Frontend can call backend through `/api/health`.
- Kepler-10 test action displays a Plotly light curve chart.
- Chart supports hover and zoom interactions.

## Decisions

- Frontend charting will use Plotly via `react-plotly.js`.
- Backend files will live under `backend/`, including `backend/requirements.txt`.
- Backend will use an organized layout with service code separated from Flask route code.

## Open questions

None currently.
