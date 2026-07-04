# Data Cleaning and BLS Improvement Roadmap

This document tracks how Exoplore cleans light curve data and how we plan to improve transit candidate detection over time.

## Goal

Make Exoplore better at helping users inspect real mission light curve data for possible planet transit candidates while staying transparent that candidates are not confirmed planets.

## Current pipeline

- User selects a target and mission.
- Backend searches Lightkurve/MAST for available light curve data.
- Backend downloads a bounded set of useful matching light curve products.
- Backend applies default Lightkurve quality filtering.
- Backend stitches multiple downloaded products when available.
- Backend removes NaN values, normalizes flux, removes cautious outliers, and creates flattened flux.
- Frontend plots normalized flux with zoom and y-axis controls.
- User can run a Box Least Squares search.
- Backend returns BLS candidate periods, depths, durations, power values, and a periodogram.
- Frontend can fold the light curve on a selected candidate period.

## Main limitations

- The backend uses a bounded product count, so it may not stitch every available quarter, campaign, or sector yet.
- Quality flags are applied but not fully surfaced to the user.
- Flattening settings are fixed and not user-controlled yet.
- BLS uses a bounded frequency-spaced period grid for predictable runtime, not a fully adaptive exhaustive search.
- Candidate ranking has basic SDE and transit count, but still needs more vetting metrics.
- No odd/even transit comparison yet.
- No secondary eclipse check yet.
- No harmonic/alias warning yet.

## Improvement phases

### Phase 1: Better data cleaning

- [x] Download a bounded set of useful light curve products for a target/mission instead of only the first result.
- [x] Stitch multiple quarters/sectors/campaigns into one combined light curve when multiple products are downloaded.
- [x] Apply mission quality flags during download, starting with `quality_bitmask="default"`.
- [x] Keep NaN removal and normalization.
- [x] Add careful outlier removal that avoids deleting possible transit dips.
- [x] Add flattening/detrending with a documented window length.
- [x] Return both normalized flux and cleaned/flattened flux to the frontend.
- [x] Include cleaning metadata in API responses.

### Phase 2: Better BLS search

- [x] Run BLS on cleaned/flattened flux instead of only normalized flux.
- [x] Replace the fixed linear period grid with a bounded frequency-spaced period grid for predictable runtime.
- [ ] Revisit Astropy `BoxLeastSquares.autopower()` for narrower/user-controlled searches where runtime is safe.
- [ ] Add user-configurable min/max period controls.
- [ ] Consider staged searches such as short, medium, and long period ranges.
- [ ] Improve duration grid selection based on cadence and period range.
- [x] Return transit count for each candidate.
- [x] Return stronger candidate scoring metrics such as SNR/SDE where possible.

### Phase 3: Candidate vetting

- [ ] Detect likely duplicate periods and harmonics.
- [ ] Add odd/even transit depth comparison.
- [ ] Add secondary eclipse check near phase 0.5.
- [ ] Add simple confidence labels such as low, moderate, and high.
- [ ] Add warnings for signals with too few observed transits.
- [ ] Clearly label all detections as candidates, not confirmed planets.

### Phase 4: Frontend transparency and controls

- [ ] Add controls for normalized vs flattened flux display.
- [ ] Add controls for BLS min period and max period.
- [ ] Add controls for flattening window length.
- [ ] Show a cleaning summary near each chart.
- [x] Show BLS analysis details such as flattened flux, downsampled BLS points, SDE, and transit count.
- [ ] Show candidate-vetting explanations in plain language.
- [x] Add an "About the Data" page explaining data source and processing steps.

## Notes

- The biggest immediate win should be: stitch more data, flatten/detrend before BLS, and use adaptive BLS period search.
- Deep single-point dips are not enough to claim a planet. Repeating dips at a consistent period are stronger evidence.
- This tool should help explore and learn from light curves, not claim confirmation of planets.
