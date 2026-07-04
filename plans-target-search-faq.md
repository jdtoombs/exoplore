# Plan: Target Search Input and Expanded FAQ

## Context

The app currently has:

- `backend/app.py` with Flask routes for `/api/health` and `/api/lightcurve/kepler-10`.
- `backend/services/lightkurve_service.py` with a hardcoded Kepler-10 Lightkurve fetch/normalize function.
- `frontend/src/pages/HomePage.jsx` with a hardcoded Kepler-10 load button and Plotly chart.
- `frontend/src/pages/FaqPage.jsx` with beginner definitions for flux, light curves, moving average, detrending, and related concepts.
- `frontend/src/components/AppHeader.jsx` with navigation to Home and FAQ.

The goal is to turn the hardcoded Kepler-10 demo into a more general one-star search/analyze workflow, starting with a target input and mission selector, while expanding the FAQ with useful astronomy/data-analysis definitions.

## Approach

Keep the current simple architecture and add a generic light curve endpoint:

```text
GET /api/lightcurve?target=Kepler-10&mission=Kepler
```

The backend will still use Lightkurve to search/download/clean/normalize data. The frontend will let the user enter a target name and select a mission, then render the returned time-series data with the existing Plotly chart and moving average line.

This is the next incremental step before adding heavier analysis features like Box Least Squares transit search.

## Files to modify

- `backend/services/lightkurve_service.py` — generalize hardcoded Kepler-10 logic into `get_lightcurve(target, mission)` and keep `get_kepler10_lightcurve()` as a convenience wrapper.
- `backend/app.py` — add `GET /api/lightcurve` route using query params.
- `frontend/src/pages/HomePage.jsx` — add target input, mission selector, and fetch using query params.
- `frontend/src/pages/FaqPage.jsx` — add definitions for target, mission, Kepler/TESS, normalized flux, noisy data, outliers, flattening, BLS, period, transit depth, transit duration, folded light curve, and false positives.
- `README.md` — document the generic light curve endpoint.

## Reuse

Existing reusable code:

- `backend/services/lightkurve_service.py` already handles Lightkurve search/download, `remove_nans()`, `normalize()`, finite-value filtering, and JSON-safe conversion.
- `frontend/src/pages/HomePage.jsx` already has loading/error state and chart rendering.
- `frontend/src/utils/lightcurveMath.js` already calculates moving average and Plotly traces.
- `frontend/src/pages/FaqPage.jsx` already has an FAQ accordion pattern to extend.

## Steps

- [x] Generalize the backend Lightkurve service from hardcoded Kepler-10 to target/mission parameters.
- [x] Add a generic Flask route: `GET /api/lightcurve?target=...&mission=...`.
- [x] Preserve the existing `/api/lightcurve/kepler-10` route for compatibility/testing.
- [x] Add target text input and mission selector to the Home page.
- [x] Update the Home page fetch call to use the generic endpoint.
- [x] Expand the FAQ with useful definitions for planet search and noisy light curve analysis.
- [x] Update README endpoint docs.
- [x] Verify backend route with Flask test client.
- [x] Verify frontend with `npm run build`.

## Verification

Backend:

```bash
cd backend
../.venv/bin/python - <<'PY'
from app import app
client = app.test_client()
response = client.get('/api/lightcurve?target=Kepler-10&mission=Kepler')
print(response.status_code)
print(response.get_json().keys())
PY
```

Frontend:

```bash
cd frontend
npm run build
```

Manual check:

- Start Flask at `http://localhost:5000`.
- Start Vite at `http://localhost:5173`.
- Enter `Kepler-10`, select `Kepler`, and load data.
- Open FAQ from the question-mark header button and verify new definitions appear.

## Open questions

None for this increment. Later we should decide how advanced the search controls should be, such as cadence, sector/quarter selection, flatten window length, and Box Least Squares period range.
