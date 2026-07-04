const yRangeModes = {
  ultraTight: 0.001,
  extraTight: 0.0025,
  tight: 0.005,
  medium: 0.01,
  wide: 0.02,
};

const xRangeDurations = {
  first30: 30,
  first10: 10,
  first1: 1,
  firstHalfDay: 0.5,
  deepestDip1Day: 1,
  deepestDipHalfDay: 0.5,
};

function getFiniteValues(values) {
  return values.filter((value) => Number.isFinite(value));
}

function getFirstFiniteValue(values) {
  return values.find((value) => Number.isFinite(value));
}

export function getMedianFlux(values) {
  return getMedianValue(values);
}

function getMedianValue(values) {
  const finiteValues = getFiniteValues(values).toSorted((left, right) => left - right);

  if (finiteValues.length === 0) {
    return null;
  }

  const middleIndex = Math.floor(finiteValues.length / 2);

  if (finiteValues.length % 2 === 1) {
    return finiteValues[middleIndex];
  }

  return (finiteValues[middleIndex - 1] + finiteValues[middleIndex]) / 2;
}

export function getYAxisRange(fluxValues, yRangeMode = 'medium') {
  if (yRangeMode === 'auto') {
    return undefined;
  }

  const rangeSize = yRangeModes[yRangeMode] ?? yRangeModes.medium;
  const medianFlux = getMedianFlux(fluxValues);

  if (medianFlux === null) {
    return undefined;
  }

  return [medianFlux - rangeSize, medianFlux + rangeSize];
}

export function getDeepestDipTime(lightcurve) {
  let deepestDipTime = null;
  let deepestFlux = Infinity;

  lightcurve.flux.forEach((fluxValue, index) => {
    const timeValue = lightcurve.time[index];

    if (!Number.isFinite(fluxValue) || !Number.isFinite(timeValue)) {
      return;
    }

    if (fluxValue < deepestFlux) {
      deepestFlux = fluxValue;
      deepestDipTime = timeValue;
    }
  });

  return deepestDipTime;
}

function getCenteredXAxisRange(centerTime, durationDays) {
  if (!Number.isFinite(centerTime) || !Number.isFinite(durationDays)) {
    return undefined;
  }

  const halfDuration = durationDays / 2;
  return [centerTime - halfDuration, centerTime + halfDuration];
}

export function getXAxisRange(lightcurve, xRangeMode = 'full') {
  if (xRangeMode === 'full') {
    return undefined;
  }

  if (['first30', 'first10', 'first1', 'firstHalfDay'].includes(xRangeMode)) {
    const firstTime = getFirstFiniteValue(lightcurve.time);
    return firstTime === undefined ? undefined : [firstTime, firstTime + xRangeDurations[xRangeMode]];
  }

  if (['deepestDip1Day', 'deepestDipHalfDay', 'deepestDip'].includes(xRangeMode)) {
    const deepestDipTime = getDeepestDipTime(lightcurve);
    const durationDays = xRangeDurations[xRangeMode] ?? xRangeDurations.deepestDipHalfDay;
    return getCenteredXAxisRange(deepestDipTime, durationDays);
  }

  return undefined;
}

export function getFoldedLightcurvePoints(lightcurve, blsCandidate) {
  if (!blsCandidate || !Number.isFinite(blsCandidate.period) || blsCandidate.period <= 0) {
    return [];
  }

  const period = blsCandidate.period;
  const transitTime = Number.isFinite(blsCandidate.transitTime) ? blsCandidate.transitTime : 0;

  return lightcurve.time
    .map((timeValue, index) => {
      const fluxValue = lightcurve.flux[index];

      if (!Number.isFinite(timeValue) || !Number.isFinite(fluxValue)) {
        return null;
      }

      const cycle = Math.floor((timeValue - transitTime) / period);
      const phase = ((((timeValue - transitTime) + (period / 2)) % period) + period) % period / period - 0.5;

      return {
        cycle,
        phase,
        flux: fluxValue,
        time: timeValue,
      };
    })
    .filter(Boolean)
    .toSorted((left, right) => left.phase - right.phase);
}

function getFoldedMedianLine(foldedPoints, binCount = 80) {
  const bins = Array.from({ length: binCount }, (_, index) => ({
    phase: -0.5 + ((index + 0.5) / binCount),
    fluxValues: [],
  }));

  foldedPoints.forEach((point) => {
    const binIndex = Math.min(binCount - 1, Math.max(0, Math.floor((point.phase + 0.5) * binCount)));
    bins[binIndex].fluxValues.push(point.flux);
  });

  return bins
    .map((bin) => ({
      phase: bin.phase,
      flux: getMedianValue(bin.fluxValues),
    }))
    .filter((point) => point.flux !== null);
}

export function getTransitDurationPhase(blsCandidate) {
  if (!blsCandidate || !Number.isFinite(blsCandidate.duration) || !Number.isFinite(blsCandidate.period) || blsCandidate.period <= 0) {
    return null;
  }

  return Math.min(0.5, Math.max(0, blsCandidate.duration / blsCandidate.period));
}

function getMedianCadence(timeValues) {
  const gaps = [];

  for (let index = 1; index < timeValues.length; index += 1) {
    const previousTime = timeValues[index - 1];
    const currentTime = timeValues[index];
    const gap = currentTime - previousTime;

    if (Number.isFinite(gap) && gap > 0) {
      gaps.push(gap);
    }
  }

  return getMedianValue(gaps);
}

function getGapThreshold(timeValues) {
  const medianCadence = getMedianCadence(timeValues);

  if (!Number.isFinite(medianCadence)) {
    return 0.25;
  }

  return Math.max(0.25, medianCadence * 20);
}

export function getMovingAverage(values, windowSize = 25) {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const windowValues = values.slice(start, index + 1).filter((value) => Number.isFinite(value));

    if (windowValues.length === 0) {
      return null;
    }

    const sum = windowValues.reduce((total, value) => total + value, 0);

    return sum / windowValues.length;
  });
}

export function getGapAwareMovingAverage(timeValues, fluxValues, windowSize = 25) {
  const gapThreshold = getGapThreshold(timeValues);
  const movingAverageTime = [];
  const movingAverageFlux = [];
  let windowValues = [];
  let previousTime = null;

  timeValues.forEach((timeValue, index) => {
    const fluxValue = fluxValues[index];

    if (!Number.isFinite(timeValue) || !Number.isFinite(fluxValue)) {
      return;
    }

    if (previousTime !== null && timeValue - previousTime > gapThreshold) {
      movingAverageTime.push(timeValue);
      movingAverageFlux.push(null);
      windowValues = [];
    }

    windowValues.push(fluxValue);

    if (windowValues.length > windowSize) {
      windowValues = windowValues.slice(-windowSize);
    }

    const sum = windowValues.reduce((total, value) => total + value, 0);
    movingAverageTime.push(timeValue);
    movingAverageFlux.push(sum / windowValues.length);
    previousTime = timeValue;
  });

  return {
    time: movingAverageTime,
    flux: movingAverageFlux,
  };
}

export function getBlsPeriodogramPlotData(blsSearchResults) {
  const periodogram = blsSearchResults?.periodogram ?? [];

  return [
    {
      x: periodogram.map((point) => point.period),
      y: periodogram.map((point) => point.power),
      customdata: periodogram.map((point) => [
        point.transitTime,
        point.duration,
        point.depth,
      ]),
      type: 'scatter',
      mode: 'lines',
      line: {
        color: '#90caf9',
        width: 2,
      },
      name: 'BLS power',
      hovertemplate: 'period=%{x:.4f} d<br>power=%{y:.6f}<br>duration=%{customdata[1]:.4f} d<br>depth=%{customdata[2]:.6f}<extra></extra>',
    },
  ];
}

export function getBlsPeriodogramLayout(selectedBlsCandidate = null) {
  const selectedPeriod = selectedBlsCandidate?.period;
  const selectedShape = Number.isFinite(selectedPeriod) ? [
    {
      type: 'line',
      xref: 'x',
      yref: 'paper',
      x0: selectedPeriod,
      x1: selectedPeriod,
      y0: 0,
      y1: 1,
      line: { color: '#ffcc80', width: 2, dash: 'dot' },
    },
  ] : [];

  return {
    autosize: true,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(255,255,255,0.04)',
    font: { color: '#ffffff' },
    margin: { l: 60, r: 24, t: 24, b: 60 },
    showlegend: false,
    xaxis: {
      title: { text: 'Trial period (days)' },
      gridcolor: 'rgba(255,255,255,0.12)',
    },
    yaxis: {
      title: { text: 'BLS power' },
      gridcolor: 'rgba(255,255,255,0.12)',
    },
    shapes: selectedShape,
    hovermode: 'closest',
  };
}

export function getFoldedPlotData(lightcurve, blsCandidate) {
  const foldedPoints = getFoldedLightcurvePoints(lightcurve, blsCandidate);
  const medianLine = getFoldedMedianLine(foldedPoints);

  return [
    {
      x: foldedPoints.map((point) => point.phase),
      y: foldedPoints.map((point) => point.flux),
      customdata: foldedPoints.map((point) => [point.time, point.cycle]),
      type: 'scattergl',
      mode: 'markers',
      marker: {
        color: foldedPoints.map((point) => point.cycle),
        colorscale: 'Viridis',
        colorbar: {
          title: { text: 'Cycle', side: 'right' },
          thickness: 12,
          len: 0.72,
          x: 1.03,
          y: 0.45,
        },
        size: 3,
        opacity: 0.5,
      },
      name: 'Folded flux points',
      hovertemplate: 'phase=%{x:.4f}<br>flux=%{y:.6f}<br>time=%{customdata[0]:.4f}<br>cycle=%{customdata[1]}<extra></extra>',
    },
    {
      x: medianLine.map((point) => point.phase),
      y: medianLine.map((point) => point.flux),
      type: 'scatter',
      mode: 'lines',
      line: {
        color: '#ffcc80',
        width: 4,
      },
      name: 'Binned median flux',
      hovertemplate: 'phase=%{x:.4f}<br>median flux=%{y:.6f}<extra></extra>',
    },
  ];
}

export function getFoldedPlotLayout(lightcurve, blsCandidate, chartSettings = {}) {
  const yRangeMode = chartSettings.yRangeMode ?? 'tight';
  const yAxisRange = getYAxisRange(lightcurve.flux, yRangeMode);
  const durationPhase = getTransitDurationPhase(blsCandidate);
  const halfDurationPhase = durationPhase === null ? null : durationPhase / 2;

  return {
    autosize: true,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(255,255,255,0.04)',
    font: { color: '#ffffff' },
    margin: { l: 60, r: 104, t: 42, b: 60 },
    showlegend: false,
    xaxis: {
      title: { text: 'Phase (transit centered at 0)' },
      range: [-0.5, 0.5],
      gridcolor: 'rgba(255,255,255,0.12)',
      zeroline: true,
      zerolinecolor: 'rgba(255,255,255,0.4)',
    },
    yaxis: {
      title: { text: lightcurve.fluxLabel },
      gridcolor: 'rgba(255,255,255,0.12)',
      ...(yAxisRange ? { range: yAxisRange } : {}),
    },
    shapes: halfDurationPhase === null ? [] : [
      {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: -halfDurationPhase,
        x1: halfDurationPhase,
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(255, 204, 128, 0.16)',
        line: { color: 'rgba(255, 204, 128, 0.65)', width: 1 },
      },
    ],
    annotations: halfDurationPhase === null ? [] : [
      {
        x: 0,
        y: 1,
        xref: 'x',
        yref: 'paper',
        text: 'Predicted transit window',
        showarrow: false,
        yanchor: 'bottom',
        font: { color: '#ffcc80', size: 12 },
      },
    ],
    hovermode: 'closest',
  };
}

export function getPlotData(lightcurve, chartSettings = {}) {
  const showFluxPoints = chartSettings.showFluxPoints ?? true;
  const showMovingAverage = chartSettings.showMovingAverage ?? true;
  const traces = [];

  if (showFluxPoints) {
    traces.push({
      x: lightcurve.time,
      y: lightcurve.flux,
      type: 'scattergl',
      mode: 'markers',
      marker: {
        color: '#90caf9',
        size: 3,
      },
      name: 'Normalized flux',
    });
  }

  if (showMovingAverage) {
    const movingAverage = getGapAwareMovingAverage(lightcurve.time, lightcurve.flux);

    traces.push({
      x: movingAverage.time,
      y: movingAverage.flux,
      type: 'scatter',
      mode: 'lines',
      connectgaps: false,
      line: {
        color: '#ffcc80',
        width: 3,
      },
      name: 'Moving average',
    });
  }

  return traces;
}

export function getPlotLayout(lightcurve, chartSettings = {}) {
  const yRangeMode = chartSettings.yRangeMode ?? 'medium';
  const xRangeMode = chartSettings.xRangeMode ?? 'full';
  const dragMode = chartSettings.dragMode ?? 'zoom';
  const yAxisRange = getYAxisRange(lightcurve.flux, yRangeMode);
  const xAxisRange = getXAxisRange(lightcurve, xRangeMode);

  return {
    autosize: true,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(255,255,255,0.04)',
    font: { color: '#ffffff' },
    margin: { l: 60, r: 24, t: 24, b: 60 },
    dragmode: dragMode,
    xaxis: {
      title: { text: lightcurve.timeLabel },
      gridcolor: 'rgba(255,255,255,0.12)',
      ...(xAxisRange ? { range: xAxisRange } : {}),
    },
    yaxis: {
      title: { text: lightcurve.fluxLabel },
      gridcolor: 'rgba(255,255,255,0.12)',
      ...(yAxisRange ? { range: yAxisRange } : {}),
    },
    hovermode: 'closest',
  };
}
