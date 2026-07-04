# Plan: 30-Minute Data Cache and Custom Zoom Controls

## Goal

Add a 30-minute cache so previously loaded light curve data does not have to be downloaded from Lightkurve/MAST every time, and add custom chart zoom controls that focus around meaningful data points for analysis/practice.

## Current State

- `backend/services/lightkurve_service.py` currently uses `@lru_cache(maxsize=16)` on `get_lightcurve(target, mission)`, which caches indefinitely until the Flask process restarts. It does not expire after 30 minutes and does not expose cache age/status to the frontend.
- `backend/app.py` serves `GET /api/lightcurve?target=...&mission=...` and returns the raw JSON from `get_lightcurve`.
- `frontend/src/pages/HomePage.jsx` renders the chart and already has Material UI analysis controls for y-axis range and moving average visibility.
- `frontend/src/utils/lightcurveMath.js` builds Plotly data/layout and currently supports y-axis presets, but not custom x-axis zoom ranges.
- Plotly modebar is disabled, so app-provided Material UI controls should drive zoom/reset behavior.

## Proposed Approach

### Backend cache

Replace the indefinite `@lru_cache` on `get_lightcurve` with a small manual TTL cache:

- Cache key: normalized `(target, mission)`.
- TTL: 30 minutes / 1800 seconds.
- Cache value: prepared light curve JSON plus timestamp.
- If the cached value is younger than 30 minutes, return it immediately.
- Add response metadata like:

```json
{
  "cache": {
    "hit": true,
    "ageSeconds": 42,
    "ttlSeconds": 1800
  }
}
```

This avoids repeated Lightkurve downloads while still refreshing automatically after 30 minutes.

### Frontend cache visibility

Show a small Material UI status near the chart:

- `Chip` for `Cached` or `Downloaded`.
- `Typography` for cache age, e.g. `Loaded from cache · 4 min old`.

### Custom zoom controls

Add chart x-axis zoom settings to `chartSettings`:

```js
{
  yRangeMode: 'medium',
  showMovingAverage: true,
  xRangeMode: 'full'
}
```

Supported x-axis zoom presets:

- `Full` — no x-axis range; show all data.
- `First 30 days` — from first time value to first time + 30.
- `First 10 days` — from first time value to first time + 10.
- `Deepest dip` — find the minimum flux point and set x-axis to `minFluxTime ± 1 day`.

Useful Material UI controls:

- `ToggleButtonGroup` + `ToggleButton` for x-axis zoom presets:
  - `Full`
  - `10d`
  - `30d`
  - `Deepest dip`
- `Tooltip` explaining that `Deepest dip` is a practice helper and may zoom into noise/outliers, not necessarily a planet transit.
- Existing `ToggleButtonGroup` for y-axis range remains.
- Existing `Switch` for moving average remains.
- `Chip` for cache status.

Update `getPlotLayout(lightcurve, chartSettings)` to compute x-axis ranges based on `chartSettings.xRangeMode`.

## Steps

- [x] Replace indefinite `@lru_cache` on `get_lightcurve` with a manual 30-minute TTL cache.
- [x] Add cache metadata to light curve responses: cache hit/miss, cache age seconds, TTL seconds, and cached-at timestamp.
- [x] Keep `search_targets` caching as-is because target suggestions are lightweight and not the same as downloaded light curve data.
- [x] Add frontend display for cache status using Material UI `Chip` and `Typography`.
- [x] Add x-axis range helpers in `frontend/src/utils/lightcurveMath.js` for full, first 10 days, first 30 days, and deepest dip.
- [x] Extend `chartSettings` in `HomePage.jsx` with `xRangeMode: 'full'`.
- [x] Add Material UI `ToggleButtonGroup` controls for custom zoom presets.
- [x] Pass `xRangeMode` into `getPlotLayout` and apply the computed `xaxis.range` when needed.
- [x] Add a short FAQ entry explaining cached data and deepest-dip zoom.
- [x] Update README with a short note that light curve data is cached in memory for 30 minutes.
- [x] Verify backend cache behavior with Flask test client by requesting the same target twice and confirming the second response is a cache hit.
- [x] Verify frontend build with `npm run build`.

## Files Likely to Change

- `backend/services/lightkurve_service.py` — manual TTL cache for light curve data and cache metadata.
- `frontend/src/utils/lightcurveMath.js` — x-axis range helpers and layout support.
- `frontend/src/pages/HomePage.jsx` — cache status display and custom zoom controls.
- `frontend/src/pages/FaqPage.jsx` — definitions for cached data and deepest-dip zoom.
- `README.md` — note that light curve data is cached for 30 minutes.

## Verification

Backend:

```bash
cd backend
../.venv/bin/python - <<'PY'
from app import app
client = app.test_client()
first = client.get('/api/lightcurve?target=Kepler-10&mission=Kepler').get_json()
second = client.get('/api/lightcurve?target=Kepler-10&mission=Kepler').get_json()
print(first['cache'])
print(second['cache'])
PY
```

Frontend:

```bash
cd frontend
npm run build
```

Manual checks:

- Load a target once and confirm cache status says downloaded.
- Load the same target again within 30 minutes and confirm cache status says cached.
- Confirm `Full`, `10d`, `30d`, and `Deepest dip` zoom controls update the chart.
- Confirm the Plotly modebar remains hidden.

## Risks / Open Questions

- This cache is in-memory only. It survives repeated requests while Flask is running, but it resets when the backend restarts.
- Deepest-dip zoom can focus on an outlier or noise spike. It should be labeled as a practice helper, not a planet detector.
- If the light curve uses non-day time units, the `10d` and `30d` labels may be approximate. Lightkurve mission time values are generally in days for the current data.

## Out of Scope

- Persistent disk/database caching.
- Caching across deployed server restarts.
- Automatically confirming planet candidates.
- Box Least Squares transit search.
