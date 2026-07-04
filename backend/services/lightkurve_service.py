from copy import deepcopy
from datetime import datetime, timezone
from functools import lru_cache
from time import time

import lightkurve as lk
import numpy as np
from astropy.timeseries import BoxLeastSquares

VALID_MISSIONS = {'Kepler', 'TESS', 'K2'}
LIGHTCURVE_CACHE_TTL_SECONDS = 30 * 60
DOWNLOAD_QUALITY_BITMASK = 'default'
MAX_LIGHTCURVE_PRODUCTS = 16
OUTLIER_SIGMA_UPPER = 5
OUTLIER_SIGMA_LOWER = 10
FLATTEN_WINDOW_LENGTH = 401
FLATTEN_POLYORDER = 2
BLS_MAX_POINTS = 8000
BLS_PERIOD_SAMPLES = 2500
_lightcurve_cache = {}

MISSION_STARTER_TARGETS = {
    'Kepler': [
        {
            'value': 'Kepler-10',
            'label': 'Kepler-10',
            'description': 'Known Kepler system; good starter target',
        },
        {
            'value': 'Kepler-22',
            'label': 'Kepler-22',
            'description': 'Known Kepler planet host',
        },
        {
            'value': 'Kepler-186',
            'label': 'Kepler-186',
            'description': 'Known Kepler multi-planet system',
        },
        {
            'value': 'KIC 8462852',
            'label': 'KIC 8462852',
            'description': "Tabby's Star; unusual Kepler light curve",
        },
    ],
    'TESS': [
        {
            'value': 'TOI-700',
            'label': 'TOI-700',
            'description': 'Known TESS planet host',
        },
        {
            'value': 'LHS 3844',
            'label': 'LHS 3844',
            'description': 'Known TESS planet host',
        },
        {
            'value': 'HD 21749',
            'label': 'HD 21749',
            'description': 'Known TESS planet host',
        },
        {
            'value': 'Pi Mensae',
            'label': 'Pi Mensae',
            'description': 'Bright known TESS planet host',
        },
    ],
    'K2': [
        {
            'value': 'K2-18',
            'label': 'K2-18',
            'description': 'Known K2 planet host',
        },
        {
            'value': 'K2-3',
            'label': 'K2-3',
            'description': 'Known K2 planet host',
        },
        {
            'value': 'K2-141',
            'label': 'K2-141',
            'description': 'Known K2 planet host',
        },
        {
            'value': 'EPIC 201367065',
            'label': 'EPIC 201367065',
            'description': 'EPIC identifier for a known K2 system',
        },
    ],
}


def _as_float_array(values):
    """Convert Lightkurve/Astropy array-like values into a plain float ndarray."""
    if hasattr(values, 'value'):
        values = values.value
    return np.asarray(values, dtype=float)


def _as_text(value):
    if value is None:
        return ''

    text = str(value).strip()

    if text in {'', '--', 'None', 'nan'}:
        return ''

    return text


def _clean_target(target):
    cleaned_target = target.strip()

    if not cleaned_target:
        raise ValueError('Target is required.')

    return cleaned_target


def _clean_query(query):
    return query.strip()


def _clean_mission(mission):
    cleaned_mission = mission.strip()

    if not cleaned_mission:
        raise ValueError('Mission is required.')

    for valid_mission in VALID_MISSIONS:
        if cleaned_mission.lower() == valid_mission.lower():
            return valid_mission

    allowed_missions = ', '.join(sorted(VALID_MISSIONS))
    raise ValueError(f'Mission must be one of: {allowed_missions}.')


def _get_row_text(row, column_name):
    if column_name not in row.colnames:
        return ''

    return _as_text(row[column_name])


def _starter_target_suggestions(mission):
    return [
        {
            **target,
            'mission': mission,
            'source': 'starter',
        }
        for target in MISSION_STARTER_TARGETS.get(mission, [])
    ]


def _search_result_suggestions(search_result, mission, limit):
    suggestions = []
    seen_targets = set()

    for row in search_result.table:
        target_name = _get_row_text(row, 'target_name')

        if not target_name:
            continue

        target_key = target_name.lower()

        if target_key in seen_targets:
            continue

        seen_targets.add(target_key)

        context_parts = [
            _get_row_text(row, 'mission'),
            _get_row_text(row, 'obs_collection'),
            _get_row_text(row, 'author'),
        ]
        description = ' · '.join(part for part in context_parts if part)

        suggestions.append({
            'value': target_name,
            'label': target_name,
            'description': description or f'Available {mission} light curve data',
            'mission': mission,
            'source': 'lightkurve',
        })

        if len(suggestions) >= limit:
            break

    return suggestions


def _lightcurve_cache_key(target, mission):
    return (target.lower(), mission)


def _timestamp_to_iso(timestamp):
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()


def _cache_metadata(hit, cached_at, now):
    age_seconds = max(0, int(now - cached_at))

    return {
        'hit': hit,
        'ageSeconds': age_seconds,
        'ttlSeconds': LIGHTCURVE_CACHE_TTL_SECONDS,
        'cachedAt': _timestamp_to_iso(cached_at),
    }


def _response_with_cache_metadata(lightcurve_data, hit, cached_at, now):
    response = deepcopy(lightcurve_data)
    response['cache'] = _cache_metadata(hit, cached_at, now)
    return response


def _emit_progress(progress_callback, progress, stage, message):
    if not progress_callback:
        return

    progress_callback({
        'progress': int(progress),
        'stage': stage,
        'message': message,
    })


def _selected_search_results(search_result):
    """Pick a bounded set of useful products so stitching improves coverage without huge downloads."""
    product_count = len(search_result)

    if product_count <= MAX_LIGHTCURVE_PRODUCTS:
        return search_result

    try:
        table = search_result.table

        if 'exptime' in table.colnames:
            exptime_values = np.asarray(table['exptime'], dtype=float)
            long_cadence_indices = [
                index
                for index, exptime in enumerate(exptime_values)
                if np.isfinite(exptime) and exptime >= 600
            ]

            if long_cadence_indices:
                return search_result[long_cadence_indices[:MAX_LIGHTCURVE_PRODUCTS]]
    except Exception:
        pass

    return search_result[:MAX_LIGHTCURVE_PRODUCTS]


def _download_lightcurve_collection(search_result, progress_callback=None):
    _emit_progress(
        progress_callback,
        26,
        'selecting-products',
        'Choosing the best light curve products...',
    )
    selected_results = _selected_search_results(search_result)
    _emit_progress(
        progress_callback,
        34,
        'downloading',
        f'Downloading {len(selected_results)} light curve product(s) from MAST...',
    )
    collection = selected_results.download_all(quality_bitmask=DOWNLOAD_QUALITY_BITMASK)

    if collection is not None and len(collection) > 0:
        _emit_progress(
            progress_callback,
            62,
            'downloaded',
            'Light curve products downloaded.',
        )
        return collection, len(selected_results)

    _emit_progress(
        progress_callback,
        44,
        'downloading-fallback',
        'Trying a fallback light curve download...',
    )
    fallback_lightcurve = search_result[0].download(quality_bitmask=DOWNLOAD_QUALITY_BITMASK)

    if fallback_lightcurve is None:
        raise RuntimeError('The selected light curve could not be downloaded.')

    _emit_progress(
        progress_callback,
        62,
        'downloaded',
        'Fallback light curve downloaded.',
    )
    return [fallback_lightcurve], 1


def _stitch_lightcurves(lightcurve_collection):
    if len(lightcurve_collection) == 1:
        return lightcurve_collection[0]

    return lightcurve_collection.stitch()


def _flatten_window_length(point_count):
    if point_count < 11:
        return None

    window_length = min(FLATTEN_WINDOW_LENGTH, point_count - 1)

    if window_length % 2 == 0:
        window_length -= 1

    return max(11, window_length)


def _prepare_lightcurve(lightcurve, progress_callback=None):
    _emit_progress(
        progress_callback,
        74,
        'normalizing',
        'Normalizing the light curve...',
    )
    normalized = lightcurve.remove_nans().normalize()
    points_after_normalize = len(normalized.time)
    _emit_progress(
        progress_callback,
        80,
        'cleaning',
        'Removing outliers and noisy points...',
    )
    outlier_cleaned = normalized.remove_outliers(
        sigma_upper=OUTLIER_SIGMA_UPPER,
        sigma_lower=OUTLIER_SIGMA_LOWER,
    )
    points_after_outliers = len(outlier_cleaned.time)
    flatten_window = _flatten_window_length(points_after_outliers)

    if flatten_window is None:
        flattened = outlier_cleaned
    else:
        _emit_progress(
            progress_callback,
            86,
            'flattening',
            'Flattening stellar trends...',
        )
        flattened = outlier_cleaned.flatten(
            window_length=flatten_window,
            polyorder=FLATTEN_POLYORDER,
        )

    return normalized, outlier_cleaned, flattened, flatten_window, points_after_normalize


def _download_lightcurve(cleaned_target, cleaned_mission, progress_callback=None):
    _emit_progress(
        progress_callback,
        10,
        'searching',
        f'Searching MAST for {cleaned_target} in {cleaned_mission}...',
    )
    search_result = lk.search_lightcurve(cleaned_target, mission=cleaned_mission)

    if len(search_result) == 0:
        raise RuntimeError(
            f'No light curve results were found for {cleaned_target} using {cleaned_mission}.'
        )

    _emit_progress(
        progress_callback,
        22,
        'found-products',
        f'Found {len(search_result)} available light curve product(s).',
    )
    lightcurve_collection, attempted_products = _download_lightcurve_collection(search_result, progress_callback)
    _emit_progress(
        progress_callback,
        68,
        'stitching',
        'Stitching downloaded products into one flight path...',
    )
    stitched_lightcurve = _stitch_lightcurves(lightcurve_collection)
    normalized, outlier_cleaned, flattened, flatten_window, points_after_normalize = _prepare_lightcurve(
        stitched_lightcurve,
        progress_callback,
    )

    _emit_progress(
        progress_callback,
        92,
        'serializing',
        'Preparing chart-ready light curve data...',
    )
    time = _as_float_array(outlier_cleaned.time)
    flux = _as_float_array(outlier_cleaned.flux)
    flattened_flux = _as_float_array(flattened.flux)

    if flattened_flux.size != flux.size:
        raise RuntimeError('Flattened light curve did not align with normalized light curve data.')

    finite_mask = np.isfinite(time) & np.isfinite(flux) & np.isfinite(flattened_flux)
    time = time[finite_mask]
    flux = flux[finite_mask]
    flattened_flux = flattened_flux[finite_mask]

    if time.size == 0 or flux.size == 0:
        raise RuntimeError('Downloaded light curve did not contain valid numeric data.')

    _emit_progress(
        progress_callback,
        96,
        'readying-response',
        'Finalizing the light curve payload...',
    )

    return {
        'target': cleaned_target,
        'mission': cleaned_mission,
        'timeLabel': f"Time ({getattr(outlier_cleaned.time, 'format', 'unknown')})",
        'fluxLabel': 'Normalized Flux',
        'flattenedFluxLabel': 'Flattened Flux',
        'points': int(time.size),
        'time': time.tolist(),
        'flux': flux.tolist(),
        'flattenedFlux': flattened_flux.tolist(),
        'cleaning': {
            'source': 'Lightkurve/MAST',
            'availableProducts': int(len(search_result)),
            'attemptedProducts': int(attempted_products),
            'stitchedProducts': int(len(lightcurve_collection)),
            'qualityBitmask': DOWNLOAD_QUALITY_BITMASK,
            'normalized': True,
            'nanRemoval': True,
            'outlierRemoval': {
                'enabled': True,
                'sigmaUpper': OUTLIER_SIGMA_UPPER,
                'sigmaLower': OUTLIER_SIGMA_LOWER,
                'removedPoints': int(max(0, points_after_normalize - len(outlier_cleaned.time))),
            },
            'flattening': {
                'enabled': flatten_window is not None,
                'windowLength': flatten_window,
                'polyorder': FLATTEN_POLYORDER if flatten_window is not None else None,
            },
            'finitePointsRemoved': int(len(outlier_cleaned.time) - time.size),
        },
    }


@lru_cache(maxsize=64)
def search_targets(query, mission, limit=10):
    """Return target suggestions for a mission-aware autocomplete."""
    cleaned_query = _clean_query(query)
    cleaned_mission = _clean_mission(mission)

    if limit < 1:
        raise ValueError('Limit must be at least 1.')

    if not cleaned_query:
        return _starter_target_suggestions(cleaned_mission)[:limit]

    search_result = lk.search_lightcurve(cleaned_query, mission=cleaned_mission)

    if len(search_result) == 0:
        return []

    return _search_result_suggestions(search_result, cleaned_mission, limit)


def get_lightcurve(target, mission, progress_callback=None):
    """Download and prepare a target light curve for JSON responses."""
    _emit_progress(
        progress_callback,
        4,
        'validating',
        'Checking launch coordinates...',
    )
    cleaned_target = _clean_target(target)
    cleaned_mission = _clean_mission(mission)
    cache_key = _lightcurve_cache_key(cleaned_target, cleaned_mission)
    now = time()

    _emit_progress(
        progress_callback,
        7,
        'cache-check',
        'Checking the local light curve cache...',
    )
    cached_entry = _lightcurve_cache.get(cache_key)

    if cached_entry:
        cached_at = cached_entry['cachedAt']
        cache_age = now - cached_at

        if cache_age < LIGHTCURVE_CACHE_TTL_SECONDS:
            _emit_progress(
                progress_callback,
                100,
                'cached',
                'Arrived using cached light curve data.',
            )
            return _response_with_cache_metadata(cached_entry['data'], True, cached_at, now)

        del _lightcurve_cache[cache_key]

    lightcurve_data = _download_lightcurve(cleaned_target, cleaned_mission, progress_callback)
    cached_at = time()
    _lightcurve_cache[cache_key] = {
        'cachedAt': cached_at,
        'data': lightcurve_data,
    }

    _emit_progress(
        progress_callback,
        100,
        'complete',
        'Arrived at the destination star.',
    )
    return _response_with_cache_metadata(lightcurve_data, False, cached_at, cached_at)


def _finite_sorted_lightcurve_arrays(lightcurve_data, flux_key='flux'):
    time_values = np.asarray(lightcurve_data.get('time', []), dtype=float)
    flux_values = np.asarray(lightcurve_data.get(flux_key, []), dtype=float)

    if flux_values.size != time_values.size and flux_key != 'flux':
        flux_values = np.asarray(lightcurve_data.get('flux', []), dtype=float)

    finite_mask = np.isfinite(time_values) & np.isfinite(flux_values)
    time_values = time_values[finite_mask]
    flux_values = flux_values[finite_mask]

    if time_values.size == 0 or flux_values.size == 0:
        raise RuntimeError('Light curve did not contain valid numeric data for BLS search.')

    sort_order = np.argsort(time_values)
    return time_values[sort_order], flux_values[sort_order]


def _lightcurve_baseline_days(time_values):
    return float(np.nanmax(time_values) - np.nanmin(time_values))


def _downsample_for_bls(time_values, flux_values):
    if time_values.size <= BLS_MAX_POINTS:
        return time_values, flux_values, False

    bin_size = int(np.ceil(time_values.size / BLS_MAX_POINTS))
    usable_points = (time_values.size // bin_size) * bin_size
    binned_time = np.nanmean(time_values[:usable_points].reshape(-1, bin_size), axis=1)
    binned_flux = np.nanmean(flux_values[:usable_points].reshape(-1, bin_size), axis=1)

    if usable_points < time_values.size:
        binned_time = np.append(binned_time, np.nanmean(time_values[usable_points:]))
        binned_flux = np.append(binned_flux, np.nanmean(flux_values[usable_points:]))

    finite_mask = np.isfinite(binned_time) & np.isfinite(binned_flux)
    return binned_time[finite_mask], binned_flux[finite_mask], True


def _bls_period_bounds(time_values, min_period=None, max_period=None):
    baseline_days = _lightcurve_baseline_days(time_values)

    if baseline_days <= 0:
        raise RuntimeError('Light curve time span is too short for BLS search.')

    minimum_period = 0.5 if min_period is None else float(min_period)
    maximum_period = min(30.0, baseline_days / 2) if max_period is None else float(max_period)
    maximum_period = min(maximum_period, baseline_days * 0.9)

    if maximum_period <= minimum_period:
        raise RuntimeError('Light curve time span is too short for the requested BLS period range.')

    return minimum_period, maximum_period


def _bls_period_grid(minimum_period, maximum_period, samples=BLS_PERIOD_SAMPLES):
    """Use a bounded frequency-spaced period grid for predictable BLS runtime."""
    frequency_grid = np.linspace(1 / maximum_period, 1 / minimum_period, int(samples))
    return np.sort(1 / frequency_grid)


def _bls_duration_grid(min_duration=0.03, max_duration=0.35, samples=8):
    return np.linspace(float(min_duration), float(max_duration), int(samples))


def _bls_sde(result, index):
    finite_power = np.asarray(result.power, dtype=float)
    finite_power = finite_power[np.isfinite(finite_power)]

    if finite_power.size < 2:
        return None

    power_std = float(np.nanstd(finite_power))

    if power_std <= 0:
        return None

    return float((float(result.power[index]) - float(np.nanmedian(finite_power))) / power_std)


def _transit_count(time_values, period, transit_time):
    if not np.isfinite(period) or period <= 0 or not np.isfinite(transit_time):
        return 0

    first_cycle = int(np.ceil((float(np.nanmin(time_values)) - transit_time) / period))
    last_cycle = int(np.floor((float(np.nanmax(time_values)) - transit_time) / period))

    return max(0, last_cycle - first_cycle + 1)


def _bls_candidate_from_result(result, index, rank, time_values):
    period = float(result.period[index])
    duration = float(result.duration[index])
    transit_time = float(result.transit_time[index])
    depth = float(result.depth[index])
    power = float(result.power[index])
    depth_snr = getattr(result, 'depth_snr', None)
    depth_snr_value = None

    if depth_snr is not None and np.isfinite(depth_snr[index]):
        depth_snr_value = float(depth_snr[index])

    return {
        'rank': rank,
        'period': period,
        'transitTime': transit_time,
        'duration': duration,
        'depth': depth,
        'power': power,
        'depthSnr': depth_snr_value,
        'sde': _bls_sde(result, index),
        'transitCount': _transit_count(time_values, period, transit_time),
    }


def _bls_periodogram_points(result):
    return [
        {
            'period': float(period),
            'power': float(result.power[index]),
            'transitTime': float(result.transit_time[index]),
            'duration': float(result.duration[index]),
            'depth': float(result.depth[index]),
        }
        for index, period in enumerate(result.period)
        if np.isfinite(period) and np.isfinite(result.power[index])
    ]


def _select_bls_candidates(result, time_values, limit=5, min_period_separation_fraction=0.03):
    sorted_indices = np.argsort(result.power)[::-1]
    candidates = []

    for index in sorted_indices:
        period = float(result.period[index])

        if not np.isfinite(period):
            continue

        is_duplicate_peak = any(
            abs(period - candidate['period']) / candidate['period'] < min_period_separation_fraction
            for candidate in candidates
        )

        if is_duplicate_peak:
            continue

        candidates.append(_bls_candidate_from_result(result, index, len(candidates) + 1, time_values))

        if len(candidates) >= limit:
            break

    return candidates


def get_bls_candidates(target, mission, min_period=None, max_period=None, limit=5):
    """Run Box Least Squares on the cleaned/flattened light curve for candidate transits."""
    lightcurve_data = get_lightcurve(target, mission)
    analysis_flux_key = 'flattenedFlux' if lightcurve_data.get('flattenedFlux') else 'flux'
    time_values, flux_values = _finite_sorted_lightcurve_arrays(lightcurve_data, flux_key=analysis_flux_key)
    minimum_period, maximum_period = _bls_period_bounds(
        time_values,
        min_period=min_period,
        max_period=max_period,
    )
    duration_grid = _bls_duration_grid()
    bls_time_values, bls_flux_values, was_downsampled = _downsample_for_bls(time_values, flux_values)
    bls_median_flux = float(np.nanmedian(bls_flux_values))
    bls_centered_flux = bls_flux_values - bls_median_flux
    period_grid = _bls_period_grid(minimum_period, maximum_period)
    model = BoxLeastSquares(bls_time_values, bls_centered_flux)
    result = model.power(period_grid, duration_grid)
    candidates = _select_bls_candidates(result, bls_time_values, limit=limit)

    return {
        'target': lightcurve_data['target'],
        'mission': lightcurve_data['mission'],
        'candidates': candidates,
        'periodogram': _bls_periodogram_points(result),
        'metadata': {
            'algorithm': 'Box Least Squares bounded frequency grid',
            'analysisFlux': analysis_flux_key,
            'periodGrid': 'frequency-spaced',
            'periodMin': minimum_period,
            'periodMax': maximum_period,
            'periodSamples': int(len(result.period)),
            'durationMin': float(duration_grid[0]),
            'durationMax': float(duration_grid[-1]),
            'durationSamples': int(duration_grid.size),
            'baselineDays': _lightcurve_baseline_days(time_values),
            'points': int(time_values.size),
            'blsPoints': int(bls_time_values.size),
            'downsampledForBls': was_downsampled,
            'maxBlsPoints': BLS_MAX_POINTS,
        },
    }


def get_kepler10_lightcurve():
    """Download and prepare a Kepler-10 light curve for JSON responses."""
    return get_lightcurve('Kepler-10', 'Kepler')
