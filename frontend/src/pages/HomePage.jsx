import { useEffect, useRef, useState } from 'react';
import PanToolIcon from '@mui/icons-material/PanTool';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import Plot from 'react-plotly.js';
import RocketLoadingBar from '../components/RocketLoadingBar';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  getBlsPeriodogramLayout,
  getBlsPeriodogramPlotData,
  getFoldedPlotData,
  getFoldedPlotLayout,
  getPlotData,
  getPlotLayout,
} from '../utils/lightcurveMath';

const missions = ['Kepler', 'TESS', 'K2'];
const missionDescriptions = {
  Kepler: 'Original deep-field planet hunt',
  TESS: 'Nearby bright-star survey',
  K2: 'Repurposed ecliptic campaign',
};

function PageIntro() {
  return (
    <Box>
      <Typography variant="overline" color="primary">
        Mission Star List
      </Typography>
      <Typography variant="h3" component="h1" fontWeight={800} gutterBottom>
        Pick a mission, scan a star
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '760px' }}>
        Choose Kepler, TESS, or K2, then pick an available target to scan for Lightkurve data.
      </Typography>
    </Box>
  );
}

function MissionStarList({ loading, error, mission, selectedTarget, stars, onMissionChange, onSelectStar }) {
  return (
    <Card elevation={5}>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="h5" component="h2" fontWeight={800}>
                Targets
              </Typography>
              <Typography color="text.secondary">
                Select a mission, then choose a target.
              </Typography>
            </Box>

            <ToggleButtonGroup
              aria-label="Mission selector"
              color="primary"
              exclusive
              fullWidth
              onChange={(_, nextMission) => {
                if (nextMission) {
                  onMissionChange(nextMission);
                }
              }}
              size="small"
              value={mission}
              sx={{
                gap: 1,
                '& .MuiToggleButtonGroup-grouped': {
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '999px !important',
                  color: 'text.secondary',
                  fontWeight: 800,
                  py: 0.75,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.main',
                    },
                  },
                },
              }}
            >
              {missions.map((missionName) => (
                <ToggleButton key={missionName} value={missionName}>
                  {missionName}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Typography variant="caption" color="text.secondary">
              {missionDescriptions[mission]}
            </Typography>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 2 }}>
              <CircularProgress size={24} />
              <Typography>Loading mission targets...</Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {stars.map((star) => {
                const selected = star.value === selectedTarget;

                return (
                  <Box
                    key={star.value}
                    onClick={() => onSelectStar(star)}
                    sx={{
                      border: '1px solid',
                      borderColor: selected ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      cursor: 'pointer',
                      p: 2,
                      bgcolor: selected ? 'rgba(144, 202, 249, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      boxShadow: selected ? '0 0 24px rgba(144, 202, 249, 0.16)' : 'none',
                      transition: 'border-color 160ms ease, background 160ms ease, box-shadow 160ms ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'rgba(144, 202, 249, 0.08)',
                      },
                    }}
                  >
                    <Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" fontWeight={800}>
                          {star.label}
                        </Typography>
                        {selected && <Chip color="primary" label="Selected" size="small" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {star.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        RA {formatCoordinate(star.ra)}° · Dec {formatCoordinate(star.dec)}°{formatDistance(star.distanceLightYears)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}

        </Stack>
      </CardContent>
    </Card>
  );
}

function formatCoordinate(value) {
  return Number.isFinite(value) ? value.toFixed(2) : 'unknown';
}

function formatDistance(distanceLightYears) {
  return Number.isFinite(distanceLightYears) ? ` · ${distanceLightYears.toLocaleString()} ly from Sun` : '';
}

function TargetWorkspace({
  blsSearch,
  chartSettings,
  error,
  lightcurve,
  loading,
  loadingMessage,
  loadProgress,
  mission,
  selectedBlsCandidate,
  selectedStar,
  target,
  onChartSettingsChange,
  onRunBlsSearch,
  onScanTarget,
  onSelectBlsCandidate,
}) {
  const hasSelectedTarget = Boolean(target?.trim());
  const targetLabel = selectedStar?.label || target;

  return (
    <Card elevation={5} sx={{ minHeight: 520 }}>
      <CardContent>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { md: 'flex-start' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Current target
              </Typography>
              <Typography variant="h4" component="h2" fontWeight={800}>
                {hasSelectedTarget ? targetLabel : 'No target selected'}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {hasSelectedTarget
                  ? selectedStar
                    ? `${selectedStar.description} · RA ${formatCoordinate(selectedStar.ra)}° · Dec ${formatCoordinate(selectedStar.dec)}°${formatDistance(selectedStar.distanceLightYears)}`
                    : `Custom ${mission} target ready to scan.`
                  : 'Select a target in the target list and press Scan to begin.'}
              </Typography>
            </Box>

            {hasSelectedTarget && (
              <Button disabled={loading} onClick={() => onScanTarget(target)} size="large" variant="contained">
                {loading ? 'Scanning...' : 'Scan'}
              </Button>
            )}
          </Stack>

          {loading && (
            <RocketLoadingBar
              message={loadingMessage}
              mission={mission}
              progress={loadProgress}
              target={target}
            />
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {lightcurve ? (
            <LightcurveChart
              blsSearch={blsSearch}
              chartSettings={chartSettings}
              lightcurve={lightcurve}
              selectedBlsCandidate={selectedBlsCandidate}
              onChartSettingsChange={onChartSettingsChange}
              onRunBlsSearch={onRunBlsSearch}
              onSelectBlsCandidate={onSelectBlsCandidate}
            />
          ) : !loading && (
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 3,
                display: 'grid',
                minHeight: 300,
                placeItems: 'center',
                px: 3,
                textAlign: 'center',
              }}
            >
              <Stack spacing={1} sx={{ maxWidth: 460 }}>
                <Typography variant="h6" fontWeight={800}>
                  {hasSelectedTarget ? 'Ready to scan' : 'Select a target to begin'}
                </Typography>
                <Typography color="text.secondary">
                  {hasSelectedTarget
                    ? 'Press Scan in the target list or in this panel to fetch Lightkurve data and render the light curve.'
                    : 'Pick a mission on the left, choose a star from the target list, then press Scan.'}
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function LoadLightcurveCard({
  lightcurve,
  loading,
  loadProgress,
  loadingMessage,
  error,
  target,
  mission,
  targetSuggestions,
  targetSuggestionsOpen,
  targetSuggestionsLoading,
  chartSettings,
  blsSearch,
  selectedBlsCandidate,
  onChartSettingsChange,
  onTargetChange,
  onTargetSuggestionsClose,
  onTargetSuggestionsOpen,
  onLoad,
  onRunBlsSearch,
  onSelectBlsCandidate,
}) {
  return (
    <Card elevation={3}>
      <CardContent>
        <Stack spacing={3}>
          <SearchForm
            loading={loading}
            target={target}
            targetSuggestions={targetSuggestions}
            targetSuggestionsOpen={targetSuggestionsOpen}
            targetSuggestionsLoading={targetSuggestionsLoading}
            onTargetChange={onTargetChange}
            onTargetSuggestionsClose={onTargetSuggestionsClose}
            onTargetSuggestionsOpen={onTargetSuggestionsOpen}
            onLoad={onLoad}
          />
          {loading && (
            <RocketLoadingBar
              message={loadingMessage}
              mission={mission}
              progress={loadProgress}
              target={target}
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {lightcurve && (
            <LightcurveChart
              blsSearch={blsSearch}
              chartSettings={chartSettings}
              lightcurve={lightcurve}
              selectedBlsCandidate={selectedBlsCandidate}
              onChartSettingsChange={onChartSettingsChange}
              onRunBlsSearch={onRunBlsSearch}
              onSelectBlsCandidate={onSelectBlsCandidate}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function SearchForm({
  loading,
  target,
  targetSuggestions,
  targetSuggestionsOpen,
  targetSuggestionsLoading,
  onTargetChange,
  onTargetSuggestionsClose,
  onTargetSuggestionsOpen,
  onLoad,
}) {
  return (
    <Box component="form" onSubmit={onLoad}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" component="h2" fontWeight={700}>
            Load target data
          </Typography>
          <Typography color="text.secondary">
            Open the target field for starter suggestions, or type to search available mission data.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
          <TargetAutocomplete
            loading={targetSuggestionsLoading}
            open={targetSuggestionsOpen}
            options={targetSuggestions}
            target={target}
            onClose={onTargetSuggestionsClose}
            onOpen={onTargetSuggestionsOpen}
            onTargetChange={onTargetChange}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !target.trim()}
            sx={{ minWidth: 160 }}
          >
            {loading ? 'Scanning...' : 'Scan Star'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function TargetAutocomplete({ loading, open, options, target, onClose, onOpen, onTargetChange }) {
  return (
    <Autocomplete
      filterOptions={(availableOptions) => availableOptions}
      freeSolo
      fullWidth
      getOptionLabel={getTargetOptionLabel}
      isOptionEqualToValue={(option, value) => option.value === value?.value || option.value === value}
      loading={loading}
      onChange={(_, selectedOption) => {
        if (typeof selectedOption === 'string') {
          onTargetChange(selectedOption);
          return;
        }

        if (selectedOption?.value) {
          onTargetChange(selectedOption.value);
        }
      }}
      onClose={onClose}
      onInputChange={(_, inputValue) => onTargetChange(inputValue)}
      onOpen={onOpen}
      open={open}
      options={options}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Target"
          placeholder="Kepler-10"
          required
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps?.input,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={20} />}
                  {params.slotProps?.input?.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;

        return (
          <Box key={key} component="li" {...optionProps}>
            <Stack spacing={0.25}>
              <Typography>{option.label}</Typography>
              {option.description && (
                <Typography variant="caption" color="text.secondary">
                  {option.description}
                </Typography>
              )}
            </Stack>
          </Box>
        );
      }}
      value={target}
    />
  );
}

function getTargetOptionLabel(option) {
  if (typeof option === 'string') {
    return option;
  }

  return option?.label || option?.value || '';
}

function LightcurveChart({
  blsSearch,
  chartSettings,
  lightcurve,
  selectedBlsCandidate,
  onChartSettingsChange,
  onRunBlsSearch,
  onSelectBlsCandidate,
}) {
  return (
    <Stack spacing={2}>
      <Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography variant="subtitle1">
            {lightcurve.target} · {lightcurve.mission} · {lightcurve.points.toLocaleString()} points
          </Typography>
          <CacheStatus cache={lightcurve.cache} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Default view shows the full time range with flux centered on the median at ±0.5%.
          Drag a box on the chart to zoom further; double-click to reset.
        </Typography>
      </Box>

      <ChartControls
        blsSearch={blsSearch}
        chartSettings={chartSettings}
        lightcurve={lightcurve}
        selectedBlsCandidate={selectedBlsCandidate}
        onChartSettingsChange={onChartSettingsChange}
        onRunBlsSearch={onRunBlsSearch}
        onSelectBlsCandidate={onSelectBlsCandidate}
      />

      <Plot
        data={getPlotData(lightcurve, chartSettings)}
        layout={getPlotLayout(lightcurve, chartSettings)}
        config={{ responsive: true, displaylogo: false, displayModeBar: false, scrollZoom: true, doubleClick: 'reset' }}
        style={{ width: '100%', height: '560px' }}
        useResizeHandler
      />

      {blsSearch.results?.periodogram?.length > 0 && (
        <BlsPeriodogramChart
          blsSearchResults={blsSearch.results}
          selectedBlsCandidate={selectedBlsCandidate}
          onSelectBlsCandidate={onSelectBlsCandidate}
        />
      )}

      {selectedBlsCandidate && (
        <FoldedLightcurveChart
          blsCandidate={selectedBlsCandidate}
          chartSettings={chartSettings}
          lightcurve={lightcurve}
        />
      )}
    </Stack>
  );
}

function BlsPeriodogramChart({ blsSearchResults, selectedBlsCandidate, onSelectBlsCandidate }) {
  function selectPeriodogramPoint(event) {
    const clickedPoint = event.points?.[0];

    if (!clickedPoint) {
      return;
    }

    onSelectBlsCandidate({
      rank: 'picked',
      period: clickedPoint.x,
      power: clickedPoint.y,
      transitTime: clickedPoint.customdata[0],
      duration: clickedPoint.customdata[1],
      depth: clickedPoint.customdata[2],
      source: 'periodogram',
    });
  }

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            BLS periodogram
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Peaks show trial periods where repeating box-shaped dips fit better. Click a peak to update the folded view.
          </Typography>
        </Box>
        <Plot
          data={getBlsPeriodogramPlotData(blsSearchResults)}
          layout={getBlsPeriodogramLayout(selectedBlsCandidate)}
          config={{ responsive: true, displaylogo: false, displayModeBar: false, scrollZoom: true, doubleClick: 'reset' }}
          onClick={selectPeriodogramPoint}
          style={{ width: '100%', height: '360px' }}
          useResizeHandler
        />
      </Stack>
    </Box>
  );
}

function FoldedLightcurveChart({ blsCandidate, chartSettings, lightcurve }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Folded view · period {formatDuration(blsCandidate.period)}
          </Typography>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              This stacks the light curve on the selected BLS period so repeated dips line up near phase 0.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Points are colored by cycle/fold; the orange line is the binned median normalized flux.
            </Typography>
          </Stack>
        </Box>
        <Plot
          data={getFoldedPlotData(lightcurve, blsCandidate)}
          layout={getFoldedPlotLayout(lightcurve, blsCandidate, chartSettings)}
          config={{ responsive: true, displaylogo: false, displayModeBar: false, scrollZoom: true, doubleClick: 'reset' }}
          style={{ width: '100%', height: '440px' }}
          useResizeHandler
        />
      </Stack>
    </Box>
  );
}

function CacheStatus({ cache }) {
  if (!cache) {
    return null;
  }

  const cacheLabel = cache.hit ? 'Cached' : 'Downloaded';
  const cacheColor = cache.hit ? 'success' : 'info';

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Chip color={cacheColor} label={cacheLabel} size="small" variant="outlined" />
      <Typography variant="caption" color="text.secondary">
        {formatCacheAge(cache.ageSeconds)} old · expires after {formatCacheAge(cache.ttlSeconds)}
      </Typography>
    </Stack>
  );
}

function formatCacheAge(seconds) {
  if (!Number.isFinite(seconds)) {
    return 'unknown age';
  }

  if (seconds < 60) {
    return `${Math.max(0, Math.round(seconds))} sec`;
  }

  return `${Math.round(seconds / 60)} min`;
}

function ChartControls({
  blsSearch,
  chartSettings,
  lightcurve,
  selectedBlsCandidate,
  onChartSettingsChange,
  onRunBlsSearch,
  onSelectBlsCandidate,
}) {
  function updateChartSetting(key, value) {
    onChartSettingsChange((currentSettings) => {
      const nextSettings = {
        ...currentSettings,
        [key]: value,
      };

      if (!nextSettings.showFluxPoints && !nextSettings.showMovingAverage) {
        if (key === 'showMovingAverage') {
          nextSettings.showFluxPoints = true;
        } else {
          nextSettings.showMovingAverage = true;
        }
      }

      return nextSettings;
    });
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
        <Stack spacing={1}>
          <Typography variant="subtitle2">Y-axis range</Typography>
          <Tooltip title="Auto lets Plotly choose. Percent presets center on median flux; smaller ranges make shallow dips easier to see.">
            <ToggleButtonGroup
              color="primary"
              exclusive
              onChange={(_, nextMode) => {
                if (nextMode) {
                  updateChartSetting('yRangeMode', nextMode);
                }
              }}
              size="small"
              value={chartSettings.yRangeMode}
            >
              <ToggleButton value="auto">Auto</ToggleButton>
              <ToggleButton value="ultraTight">±0.1%</ToggleButton>
              <ToggleButton value="extraTight">±0.25%</ToggleButton>
              <ToggleButton value="tight">±0.5%</ToggleButton>
              <ToggleButton value="medium">±1%</ToggleButton>
              <ToggleButton value="wide">±2%</ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2">X-axis zoom</Typography>
          <Tooltip title="Use short windows to inspect interesting regions. Lowest point can be a single outlier, so BLS/folded view is better for transit evidence.">
            <ToggleButtonGroup
              color="primary"
              exclusive
              onChange={(_, nextMode) => {
                if (nextMode) {
                  updateChartSetting('xRangeMode', nextMode);
                }
              }}
              size="small"
              value={chartSettings.xRangeMode}
            >
              <ToggleButton value="full">Full</ToggleButton>
              <ToggleButton value="first10">10d</ToggleButton>
              <ToggleButton value="first1">1d</ToggleButton>
              <ToggleButton value="firstHalfDay">12h</ToggleButton>
              <ToggleButton value="deepestDipHalfDay">Lowest point</ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2">Left-drag mode</Typography>
          <Tooltip title="Zoom draws a box. Pan drags the current view left/right/up/down.">
            <ToggleButtonGroup
              color="primary"
              exclusive
              onChange={(_, nextMode) => {
                if (nextMode) {
                  updateChartSetting('dragMode', nextMode);
                }
              }}
              size="small"
              value={chartSettings.dragMode}
            >
              <ToggleButton value="zoom">
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <ZoomInIcon fontSize="small" />
                  <span>Zoom</span>
                </Stack>
              </ToggleButton>
              <ToggleButton value="pan">
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <PanToolIcon fontSize="small" />
                  <span>Pan</span>
                </Stack>
              </ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <FormControlLabel
          control={(
            <Switch
              checked={chartSettings.showFluxPoints}
              onChange={(event) => updateChartSetting('showFluxPoints', event.target.checked)}
            />
          )}
          label="Flux points"
        />
        <FormControlLabel
          control={(
            <Switch
              checked={chartSettings.showMovingAverage}
              onChange={(event) => updateChartSetting('showMovingAverage', event.target.checked)}
            />
          )}
          label="Moving average"
        />
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Tip: the best transit view is usually a short x-window plus a tight y-range like ±0.25% or ±0.5%.
      </Typography>

      <TransitSearchPanel
        blsSearch={blsSearch}
        selectedBlsCandidate={selectedBlsCandidate}
        onRunBlsSearch={onRunBlsSearch}
        onSelectBlsCandidate={onSelectBlsCandidate}
      />

    </Stack>
  );
}

function TransitSearchPanel({ blsSearch, selectedBlsCandidate, onRunBlsSearch, onSelectBlsCandidate }) {
  const candidates = blsSearch.results?.candidates ?? [];
  const selectedKey = getBlsCandidateKey(selectedBlsCandidate);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 2, p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="subtitle2">BLS period search</Typography>
            <Typography variant="caption" color="text.secondary">
              Searches for repeating box-shaped dips. Select a period candidate to stack the light curve in folded view.
            </Typography>
          </Box>
          <Button
            disabled={blsSearch.loading}
            onClick={onRunBlsSearch}
            startIcon={blsSearch.loading ? <CircularProgress color="inherit" size={16} /> : null}
            variant="contained"
          >
            {blsSearch.loading ? 'Searching...' : 'Run BLS search'}
          </Button>
        </Stack>

        {blsSearch.error && <Alert severity="error">{blsSearch.error}</Alert>}

        {blsSearch.results?.metadata && (
          <Typography variant="caption" color="text.secondary">
            Period search: {formatDuration(blsSearch.results.metadata.periodMin)} to{' '}
            {formatDuration(blsSearch.results.metadata.periodMax)} · {blsSearch.results.metadata.periodSamples.toLocaleString()} trial periods ·{' '}
            {formatAnalysisFlux(blsSearch.results.metadata.analysisFlux)} · {blsSearch.results.metadata.blsPoints?.toLocaleString()} BLS points
            {blsSearch.results.metadata.downsampledForBls ? `, downsampled from ${blsSearch.results.metadata.points?.toLocaleString()} cleaned points for speed` : ''}
          </Typography>
        )}

        {candidates.length > 0 && (
          <Stack spacing={1}>
            {candidates.map((candidate) => {
              const candidateKey = getBlsCandidateKey(candidate);
              const selected = candidateKey === selectedKey;

              return (
                <Button
                  key={candidateKey}
                  color={selected ? 'primary' : 'inherit'}
                  fullWidth
                  onClick={() => onSelectBlsCandidate(candidate)}
                  sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  variant={selected ? 'contained' : 'outlined'}
                >
                  <Stack spacing={0.25} sx={{ width: '100%' }}>
                    <Typography variant="body2" fontWeight={700}>
                      #{candidate.rank} · period {formatDuration(candidate.period)} · depth {formatFluxDepth(candidate.depth)}
                    </Typography>
                    <Typography variant="caption" color={selected ? 'inherit' : 'text.secondary'}>
                      transit at {formatTime(candidate.transitTime)} · duration {formatDuration(candidate.duration)} · power {formatPower(candidate.power)} · SDE {formatOptionalNumber(candidate.sde)} · {candidate.transitCount ?? 0} predicted transits
                    </Typography>
                  </Stack>
                </Button>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

function getBlsCandidateKey(candidate) {
  if (!candidate) {
    return '';
  }

  return `${candidate.rank}-${candidate.period}-${candidate.transitTime}`;
}

function formatTime(timeValue) {
  return Number.isFinite(timeValue) ? `${timeValue.toFixed(3)} d` : 'unknown time';
}

function formatAnalysisFlux(analysisFlux) {
  return analysisFlux === 'flattenedFlux' ? 'flattened flux' : 'normalized flux';
}

function formatOptionalNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : 'n/a';
}

function formatPower(power) {
  return Number.isFinite(power) ? power.toExponential(2) : 'n/a';
}

function formatFluxDepth(depth) {
  if (!Number.isFinite(depth)) {
    return 'unknown';
  }

  return `${(depth * 100).toFixed(depth < 0.001 ? 3 : 2)}%`;
}

function formatDuration(durationDays) {
  if (!Number.isFinite(durationDays)) {
    return 'unknown duration';
  }

  if (durationDays < 1) {
    return `${(durationDays * 24).toFixed(1)} hr`;
  }

  return `${durationDays.toFixed(2)} d`;
}

export default function HomePage() {
  const lightcurveEventSourceRef = useRef(null);
  const [target, setTarget] = useState('');
  const [mission, setMission] = useState('Kepler');
  const [targetSuggestions, setTargetSuggestions] = useState([]);
  const [targetSuggestionsOpen, setTargetSuggestionsOpen] = useState(false);
  const [targetSuggestionsLoading, setTargetSuggestionsLoading] = useState(false);
  const [lightcurve, setLightcurve] = useState(null);
  const [blsSearch, setBlsSearch] = useState({
    loading: false,
    error: '',
    results: null,
  });
  const [selectedBlsCandidate, setSelectedBlsCandidate] = useState(null);
  const [chartSettings, setChartSettings] = useState({
    yRangeMode: 'tight',
    xRangeMode: 'full',
    dragMode: 'zoom',
    showFluxPoints: true,
    showMovingAverage: true,
  });
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [starMap, setStarMap] = useState({
    loading: false,
    error: '',
    stars: [],
  });

  useEffect(() => () => {
    lightcurveEventSourceRef.current?.close();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setStarMap((currentMap) => ({
      ...currentMap,
      loading: true,
      error: '',
    }));

    async function loadStarMap() {
      const params = new URLSearchParams({ mission });

      try {
        const response = await fetch(`/api/targets/map?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.details || payload.error || 'Star list failed to load.');
        }

        if (active) {
          setStarMap({
            loading: false,
            error: '',
            stars: payload.stars || [],
          });
        }
      } catch (err) {
        if (active && err.name !== 'AbortError') {
          setStarMap({
            loading: false,
            error: err.message || 'Star list failed to load.',
            stars: [],
          });
        }
      }
    }

    loadStarMap();

    return () => {
      active = false;
      controller.abort();
    };
  }, [mission]);

  useEffect(() => {
    if (!targetSuggestionsOpen) {
      return undefined;
    }

    const controller = new AbortController();
    let active = true;

    setTargetSuggestionsLoading(true);

    const timeoutId = window.setTimeout(async () => {
      const params = new URLSearchParams({
        mission,
        q: target.trim(),
      });

      try {
        const response = await fetch(`/api/targets/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.details || payload.error || 'Target search failed.');
        }

        if (active) {
          setTargetSuggestions(payload.suggestions || []);
        }
      } catch (err) {
        if (active && err.name !== 'AbortError') {
          setTargetSuggestions([]);
        }
      } finally {
        if (active) {
          setTargetSuggestionsLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [mission, target, targetSuggestionsOpen]);

  function handleTargetSuggestionsClose() {
    setTargetSuggestionsOpen(false);
    setTargetSuggestionsLoading(false);
  }

  function startLightcurveScan(targetQuery, selectedMission = mission) {
    const cleanedTarget = targetQuery.trim();

    if (!cleanedTarget) {
      return;
    }

    const params = new URLSearchParams({ target: cleanedTarget, mission: selectedMission });

    if (lightcurveEventSourceRef.current) {
      lightcurveEventSourceRef.current.close();
      lightcurveEventSourceRef.current = null;
    }

    setTarget(cleanedTarget);
    setLoading(true);
    setLoadProgress(2);
    setLoadingMessage('Preparing the scan sequence...');
    setError('');
    setBlsSearch({ loading: false, error: '', results: null });
    setSelectedBlsCandidate(null);

    const eventSource = new EventSource(`/api/lightcurve/stream?${params.toString()}`);
    lightcurveEventSourceRef.current = eventSource;

    function isCurrentEventSource() {
      return lightcurveEventSourceRef.current === eventSource;
    }

    function closeEventSource() {
      eventSource.close();

      if (isCurrentEventSource()) {
        lightcurveEventSourceRef.current = null;
      }
    }

    eventSource.addEventListener('progress', (progressEvent) => {
      if (!isCurrentEventSource()) {
        return;
      }

      const progressPayload = JSON.parse(progressEvent.data);
      setLoadProgress(progressPayload.progress ?? 0);

      if (progressPayload.message) {
        setLoadingMessage(progressPayload.message);
      }
    });

    eventSource.addEventListener('complete', (completeEvent) => {
      if (!isCurrentEventSource()) {
        return;
      }

      const payload = JSON.parse(completeEvent.data);
      setLoadProgress(100);
      setLoadingMessage('Scan complete. Lightkurve data received.');
      setLightcurve(payload);
      setChartSettings((currentSettings) => ({
        ...currentSettings,
        xRangeMode: 'full',
      }));
      closeEventSource();
      setLoading(false);
    });

    eventSource.addEventListener('error', (errorEvent) => {
      if (!isCurrentEventSource()) {
        return;
      }

      let errorMessage = 'Something went wrong while loading the light curve.';

      if (errorEvent.data) {
        try {
          const errorPayload = JSON.parse(errorEvent.data);
          errorMessage = errorPayload.details || errorPayload.error || errorMessage;
        } catch {
          errorMessage = errorEvent.data;
        }
      }

      setLightcurve(null);
      setError(errorMessage);
      closeEventSource();
      setLoading(false);
    });
  }

  function loadLightcurve(event) {
    event.preventDefault();
    startLightcurveScan(target, mission);
  }

  function handleMissionChange(nextMission) {
    if (!nextMission || nextMission === mission) {
      return;
    }

    lightcurveEventSourceRef.current?.close();
    lightcurveEventSourceRef.current = null;
    setMission(nextMission);
    setTarget('');
    setLightcurve(null);
    setLoading(false);
    setError('');
    setTargetSuggestions([]);
    setTargetSuggestionsOpen(false);
    setTargetSuggestionsLoading(false);
    setBlsSearch({ loading: false, error: '', results: null });
    setSelectedBlsCandidate(null);
  }

  function selectMapStar(star) {
    if (star?.value) {
      setTarget(star.value);
    }
  }

  async function runBlsSearch() {
    if (!lightcurve) {
      return;
    }

    const params = new URLSearchParams({
      target: lightcurve.target,
      mission: lightcurve.mission,
      limit: '5',
    });

    setBlsSearch((currentState) => ({
      ...currentState,
      loading: true,
      error: '',
    }));
    setSelectedBlsCandidate(null);

    try {
      const response = await fetch(`/api/lightcurve/bls?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.details || payload.error || 'BLS search failed.');
      }

      setBlsSearch({
        loading: false,
        error: '',
        results: payload,
      });
    } catch (err) {
      setBlsSearch({
        loading: false,
        error: err.message || 'Something went wrong while running the BLS search.',
        results: null,
      });
    }
  }

  const selectedStar = starMap.stars.find((star) => star.value === target);

  return (
    <Stack spacing={4}>
      <PageIntro />
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'clamp(300px, 22vw, 380px) minmax(0, 1fr)' },
          alignItems: 'start',
        }}
      >
        <Stack spacing={3} sx={{ position: { lg: 'sticky' }, top: { lg: 24 } }}>
          <MissionStarList
            error={starMap.error}
            loading={starMap.loading}
            mission={mission}
            selectedTarget={target}
            stars={starMap.stars}
            onMissionChange={handleMissionChange}
            onSelectStar={selectMapStar}
          />
        </Stack>

        <TargetWorkspace
          blsSearch={blsSearch}
          chartSettings={chartSettings}
          error={error}
          lightcurve={lightcurve}
          loading={loading}
          loadingMessage={loadingMessage}
          loadProgress={loadProgress}
          mission={mission}
          selectedBlsCandidate={selectedBlsCandidate}
          selectedStar={selectedStar}
          target={target}
          onChartSettingsChange={setChartSettings}
          onRunBlsSearch={runBlsSearch}
          onScanTarget={(targetToScan) => startLightcurveScan(targetToScan, mission)}
          onSelectBlsCandidate={setSelectedBlsCandidate}
        />
      </Box>
    </Stack>
  );
}
