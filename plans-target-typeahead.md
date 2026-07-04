# Plan: Mission-Aware Target Typeahead

## Context

The app currently lets the user manually type a target and select a mission in `frontend/src/pages/HomePage.jsx`. The backend has a generic light curve endpoint in `backend/app.py`:

```text
GET /api/lightcurve?target=...&mission=...
```

and Lightkurve fetching logic in `backend/services/lightkurve_service.py`.

The requested change is to add typeahead/autocomplete for targets available in the selected mission.

Important constraint: Kepler/TESS/K2 catalogs are too large to load entirely into the browser. A 0-character autocomplete can still show suggestions, but those initial suggestions should come from a small curated per-mission starter list, not from loading the entire mission catalog.

## Approach

Add a backend search endpoint that accepts a query and selected mission. The query may be empty:

```text
GET /api/targets/search?mission=Kepler&q=Kepler-10
GET /api/targets/search?mission=Kepler&q=
```

The backend suggestions will come from two sources:

1. **0-character suggestions:** when `q` is empty, return a curated starter list for the selected mission. These are known useful example targets with available light curve data, such as `Kepler-10` for Kepler. This gives the user immediate suggestions when the autocomplete opens without pretending to load the full catalog.
2. **Typed-query suggestions:** when `q` has text, call Lightkurve:

```python
lk.search_lightcurve(query, mission=mission)
```

Lightkurve returns a `SearchResult` table from MAST. The app will extract target identifiers from rows with available light curve products, primarily the `target_name` column, such as `kplr011904151` for Kepler-10. It will deduplicate those target names and return a compact list of suggestions. Where available, the suggestion can also include context from columns like `mission`, `obs_collection`, and `author`.

This means the typeahead is not a full preloaded catalog. It is a curated starter list at 0 characters plus a live availability search when the user types.

The frontend will replace the plain target `TextField` with Material UI `Autocomplete`. The options shown in that autocomplete will be the backend's deduplicated Lightkurve/MAST search suggestions:

- User selects mission first.
- Autocomplete opens and immediately requests suggestions with `q=` using a 0-character minimum.
- Backend returns curated starter suggestions for the selected mission.
- As the user types, frontend debounces requests briefly and backend returns live Lightkurve/MAST suggestions.
- User can choose a returned target identifier suggestion, such as `kplr011904151`, or keep free-typing a friendly name like `Kepler-10`.
- Existing Load Data button continues to call `/api/lightcurve`.

This keeps the UX helpful at 0 characters while avoiding the impossible task of downloading every available target name for a mission.

## Files to modify

- `backend/services/lightkurve_service.py` — add `search_targets(query, mission)` helper that returns curated starter targets for empty queries and calls Lightkurve search for typed queries.
- `backend/app.py` — add `GET /api/targets/search` route.
- `frontend/src/pages/HomePage.jsx` — replace target `TextField` with Material UI `Autocomplete`, add suggestion loading state, debounce logic, and mission-aware search.
- `frontend/src/pages/FaqPage.jsx` — add a short FAQ note explaining that typeahead searches available mission data as you type rather than loading the full catalog.
- `README.md` — document the new target search endpoint.

## Reuse

Existing reusable code:

- `backend/services/lightkurve_service.py` already validates target/mission and uses `lk.search_lightcurve`.
- `frontend/src/pages/HomePage.jsx` already has target/mission state, loading/error UI, Material UI form layout, and API fetch pattern.
- Material UI is already installed and includes `Autocomplete`, so no new frontend dependency is needed.

## Steps

- [x] Add backend target-search helper with query and mission validation.
- [x] Add a small curated starter-target list per mission for 0-character suggestions.
- [x] For non-empty queries, return compact, unique suggestions from Lightkurve search result rows by extracting and deduplicating `target_name` values, with optional context from `mission`, `obs_collection`, and `author` columns.
- [x] Add Flask route `GET /api/targets/search`.
- [x] Replace frontend target text input with Material UI `Autocomplete` using `freeSolo` so manual typing still works.
- [x] Add suggestion fetching when the autocomplete opens, even if the input is empty.
- [x] Add debounced suggestion fetching when target text or mission changes.
- [x] Show autocomplete loading state while suggestions are being fetched.
- [x] Keep the existing light curve load flow unchanged after a target is selected/typed.
- [x] Add FAQ entry explaining target typeahead and catalog limitations.
- [x] Update README endpoint docs.
- [x] Verify backend target-search route with Flask test client.
- [x] Verify frontend build with `npm run build`.

## Verification

Backend:

```bash
cd backend
../.venv/bin/python - <<'PY'
from app import app
client = app.test_client()
response = client.get('/api/targets/search?mission=Kepler&q=')
print(response.status_code)
print(response.get_json())

response = client.get('/api/targets/search?mission=Kepler&q=Kepler-10')
print(response.status_code)
print(response.get_json())
PY
```

Frontend:

```bash
cd frontend
npm run build
```

Manual checks:

- Start Flask and Vite.
- Select `Kepler`, open the target autocomplete with an empty input, and confirm curated suggestions appear.
- Type `Kepler-10`, and confirm live search suggestions appear.
- Select or type a target and confirm Load Data still works.
- Change mission and confirm suggestions are mission-specific.

## Open questions

None for the first version. If the Lightkurve-backed search is too slow or too limited for partial names, a later improvement could query MAST catalogs directly or add a curated/pinned example-target list per mission.
