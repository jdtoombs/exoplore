# Plan: Chart Range Defaults and Analysis Controls

## Context

The current frontend chart code is split across:

- `frontend/src/pages/HomePage.jsx` — renders `LightcurveChart` and passes `getPlotData`, `getPlotLayout`, and Plotly config.
- `frontend/src/utils/lightcurveMath.js` — builds Plotly traces and layout.

Right now the Plotly chart uses automatic axis ranges. For exoplanet practice, that can make shallow transit dips hard to see because the y-axis may auto-scale too widely.

The desired first improvement is:

- Default the chart to full x-axis range.
- Default y-axis to median normalized flux ± 0.02, usually around `0.98` to `1.02`.
- Plan for Material UI controls that let the user switch between analysis-friendly ranges.
- Consider disabling default Plotly controls so the app has clearer, beginner-friendly controls.

## Approach

First implement the default analysis view by changing `getPlotLayout(lightcurve)` to compute a y-axis range from the loaded flux values:

```text
medianFlux = median(lightcurve.flux)
yaxis.range = [medianFlux - 0.02, medianFlux + 0.02]
```

The x-axis will stay full-range by default by not setting an explicit x-axis range.

Then add app-level chart controls in `HomePage.jsx` and pass selected settings into `getPlotLayout`. These controls will use Material UI components instead of relying on Plotly's default modebar.

Recommended Material UI controls:

- `ToggleButtonGroup` + `ToggleButton` for y-axis range presets:
  - `Auto`
  - `±1%`
  - `±2%` default
  - `±5%`
- `ButtonGroup` or `Stack` of `Button`s for view presets:
  - `Full View`
  - `Deepest Dip`
- `FormControlLabel` + `Switch` for optional traces:
  - Show/hide moving average trend line
- `Slider` for moving average window size later:
  - range like 5–201 points
- `Tooltip` for short explanations of each control

Plotly default controls should be disabled or minimized for now with Plotly config:

```js
config={{ responsive: true, displaylogo: false, displayModeBar: false }}
```

This avoids two competing control systems. Plotly hover and scroll/drag interactions can still be adjusted later if needed.

## Files to modify

- `frontend/src/utils/lightcurveMath.js` — add median/range helpers; update `getPlotLayout(lightcurve, chartSettings)` to support default and preset y-axis ranges.
- `frontend/src/pages/HomePage.jsx` — add chart settings state, render Material UI controls near the chart, pass chart settings to `LightcurveChart`.
- `frontend/src/pages/FaqPage.jsx` — optionally add definitions for median flux, y-axis range presets, and why a tight flux range helps with transit detection.

## Reuse

Existing reusable code:

- `frontend/src/utils/lightcurveMath.js` already centralizes Plotly layout creation.
- `frontend/src/pages/HomePage.jsx` already has the chart component and Material UI card layout.
- Material UI already provides the needed controls: `ToggleButtonGroup`, `ToggleButton`, `Switch`, `Slider`, `Button`, `Stack`, and `Tooltip`.
- Plotly config is already passed in `LightcurveChart`, so modebar behavior can be changed there.

## Steps

- [x] Add helper functions in `lightcurveMath.js` to calculate median flux and y-axis preset ranges.
- [x] Make the default chart y-axis range `medianFlux ± 0.02` while keeping x-axis full range.
- [x] Add `chartSettings` state in `HomePage.jsx`, defaulting to `{ yRangeMode: 'medium', showMovingAverage: true }`.
- [x] Add Material UI `ToggleButtonGroup` controls for `Auto`, `±1%`, `±2%`, and `±5%`.
- [x] Add Material UI `Switch` control for showing/hiding the moving average line.
- [x] Pass chart settings into `getPlotData` and `getPlotLayout`.
- [x] Disable Plotly's default modebar with `displayModeBar: false`.
- [x] Add a short FAQ entry explaining why the default y-axis is centered on median flux and why `±2%` is useful for practice.
- [x] Verify frontend with `npm run build`.
- [x] Manually verify that the chart defaults to full x-axis and tight y-axis after loading a light curve.

## Verification

Run:

```bash
cd frontend
npm run build
```

Manual checks:

- Start backend and frontend.
- Load `Kepler-10` / `Kepler`.
- Confirm the initial y-axis is centered around median flux and approximately `±0.02` wide.
- Confirm x-axis still shows the full time range.
- Confirm `Auto`, `±1%`, `±2%`, and `±5%` controls update the y-axis range.
- Confirm moving average toggle shows/hides the trend line.
- Confirm Plotly modebar is hidden.

## Open questions

None for the first version. Later we can add more controls like `Deepest Dip`, custom numeric y-axis inputs, moving average window slider, and raw/flattened/detrended chart modes.
