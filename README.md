# Exoplore

React + Vite frontend with a Flask backend that uses Lightkurve to fetch and visualize star light curve data.

## Project structure

```text
exoplore/
  backend/
    app.py
    requirements.txt
    services/
      lightkurve_service.py
  frontend/
    package.json
    vite.config.js
    src/
      App.jsx
      main.jsx
      components/
      pages/
      utils/
```

## Backend setup

From the project root:

```bash
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cd backend
python app.py
```

The backend runs at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

Generic light curve endpoint:

```text
http://localhost:5000/api/lightcurve?target=Kepler-10&mission=Kepler
```

Light curve responses are cached in memory for 30 minutes per target/mission while the Flask server is running.

Target typeahead endpoint:

```text
http://localhost:5000/api/targets/search?mission=Kepler&q=
http://localhost:5000/api/targets/search?mission=Kepler&q=Kepler-10
```

An empty `q` returns curated starter targets for the selected mission. A non-empty `q` searches Lightkurve/MAST and returns matching target suggestions.

Compatibility Kepler-10 endpoint:

```text
http://localhost:5000/api/lightcurve/kepler-10
```

## Frontend setup

In another terminal, from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

The frontend uses Vite's dev proxy, so requests to `/api/...` are forwarded to the Flask backend.
