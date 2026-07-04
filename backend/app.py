import json
from queue import Queue
from threading import Thread

from flask import Flask, Response, jsonify, request, stream_with_context

from services.lightkurve_service import (
    get_bls_candidates,
    get_kepler10_lightcurve,
    get_lightcurve,
    search_targets,
)

app = Flask(__name__)


def _sse_event(event_name, payload):
    return f"event: {event_name}\ndata: {json.dumps(payload)}\n\n"


@app.get('/api/health')
def health_check():
    return jsonify({
        'status': 'ok',
        'service': 'exoplore-backend',
    })


@app.get('/api/targets/search')
def target_search():
    query = request.args.get('q', '')
    mission = request.args.get('mission', 'Kepler')
    limit = request.args.get('limit', 10, type=int)

    try:
        return jsonify({
            'mission': mission,
            'query': query,
            'suggestions': search_targets(query, mission, limit),
        })
    except Exception as exc:
        return jsonify({
            'error': 'Failed to search targets.',
            'details': str(exc),
        }), 500


@app.get('/api/lightcurve')
def lightcurve():
    target = request.args.get('target', '')
    mission = request.args.get('mission', 'Kepler')

    try:
        return jsonify(get_lightcurve(target, mission))
    except Exception as exc:
        return jsonify({
            'error': 'Failed to load light curve data.',
            'details': str(exc),
        }), 500


@app.get('/api/lightcurve/stream')
def lightcurve_stream():
    target = request.args.get('target', '')
    mission = request.args.get('mission', 'Kepler')

    def stream_lightcurve():
        event_queue = Queue()
        sentinel = object()

        def progress_callback(progress_payload):
            event_queue.put(('progress', progress_payload))

        def load_lightcurve():
            try:
                lightcurve_data = get_lightcurve(target, mission, progress_callback=progress_callback)
                event_queue.put(('complete', lightcurve_data))
            except Exception as exc:
                event_queue.put((
                    'error',
                    {
                        'error': 'Failed to load light curve data.',
                        'details': str(exc),
                    },
                ))
            finally:
                event_queue.put((None, sentinel))

        Thread(target=load_lightcurve, daemon=True).start()

        while True:
            event_name, payload = event_queue.get()

            if payload is sentinel:
                break

            yield _sse_event(event_name, payload)

    return Response(
        stream_with_context(stream_lightcurve()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        },
    )


@app.get('/api/lightcurve/bls')
def lightcurve_bls():
    target = request.args.get('target', '')
    mission = request.args.get('mission', 'Kepler')
    min_period = request.args.get('minPeriod', None, type=float)
    max_period = request.args.get('maxPeriod', None, type=float)
    limit = request.args.get('limit', 5, type=int)

    try:
        return jsonify(get_bls_candidates(
            target,
            mission,
            min_period=min_period,
            max_period=max_period,
            limit=limit,
        ))
    except Exception as exc:
        return jsonify({
            'error': 'Failed to run BLS transit search.',
            'details': str(exc),
        }), 500


@app.get('/api/lightcurve/kepler-10')
def kepler_10_lightcurve():
    try:
        return jsonify(get_kepler10_lightcurve())
    except Exception as exc:
        return jsonify({
            'error': 'Failed to load Kepler-10 light curve data.',
            'details': str(exc),
        }), 500


if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)
