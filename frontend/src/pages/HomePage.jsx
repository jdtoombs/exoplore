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
  MenuItem,
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

function PageIntro() {
  return (
    <Box>
      <Typography variant="overline" color="primary">
        Lightkurve Search
      </Typography>
      <Typography variant="h3" component="h1" fontWeight={800} gutterBottom>
        Explore a Star Light Curve
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '720px' }}>
        Enter a target star and mission. The Flask backend uses Lightkurve to download and
        normalize the mission data, then React renders the returned time-series data with Plotly.
      </Typography>
    </Box>
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
  onMissionChange,
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
            mission={mission}
            targetSuggestions={targetSuggestions}
            targetSuggestionsOpen={targetSuggestionsOpen}
            targetSuggestionsLoading={targetSuggestionsLoading}
            onTargetChange={onTargetChange}
            onTargetSuggestionsClose={onTargetSuggestionsClose}
            onTargetSuggestionsOpen={onTargetSuggestionsOpen}
            onMissionChange={onMissionChange}
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
  mission,
  targetSuggestions,
  targetSuggestionsOpen,
  targetSuggestionsLoading,
  onTargetChange,
  onTargetSuggestionsClose,
  onTargetSuggestionsOpen,
  onMissionChange,
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

          <TextField
            label="Mission"
            value={mission}
            onChange={(event) => onMissionChange(event.target.value)}
            select
            sx={{ minWidth: { md: 180 } }}
          >
            {missions.map((missionName) => (
              <MenuItem key={missionName} value={missionName}>
                {missionName}
              </MenuItem>
            ))}
          </TextField>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !target.trim()}
            sx={{ minWidth: 160 }}
          >
            {loading ? 'Loading...' : 'Load Data'}
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
  const [target, setTarget] = useState('Kepler-10');
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

  useEffect(() => () => {
    lightcurveEventSourceRef.current?.close();
  }, []);

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

  function loadLightcurve(event) {
    event.preventDefault();

    const targetQuery = target.trim();
    const params = new URLSearchParams({ target: targetQuery, mission });

    if (lightcurveEventSourceRef.current) {
      lightcurveEventSourceRef.current.close();
      lightcurveEventSourceRef.current = null;
    }

    setLoading(true);
    setLoadProgress(2);
    setLoadingMessage('Preparing the launch sequence...');
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
      setLoadingMessage('Arrived at the destination star.');
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

  return (
    <Stack spacing={4}>
      <PageIntro />
      <LoadLightcurveCard
        lightcurve={lightcurve}
        loading={loading}
        loadProgress={loadProgress}
        loadingMessage={loadingMessage}
        error={error}
        target={target}
        mission={mission}
        targetSuggestions={targetSuggestions}
        targetSuggestionsOpen={targetSuggestionsOpen}
        targetSuggestionsLoading={targetSuggestionsLoading}
        chartSettings={chartSettings}
        blsSearch={blsSearch}
        selectedBlsCandidate={selectedBlsCandidate}
        onChartSettingsChange={setChartSettings}
        onTargetChange={setTarget}
        onTargetSuggestionsClose={handleTargetSuggestionsClose}
        onTargetSuggestionsOpen={() => setTargetSuggestionsOpen(true)}
        onMissionChange={setMission}
        onLoad={loadLightcurve}
        onRunBlsSearch={runBlsSearch}
        onSelectBlsCandidate={setSelectedBlsCandidate}
      />
    </Stack>
  );
}
