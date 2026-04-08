"""Back-end proxy for external video sources (YouTube).

Resolves YouTube URLs with yt-dlp (over HTTPS_PROXY) to a direct progressive
``mp4`` URL, then proxies the bytes through this server so the browser never
talks to YouTube directly. Supports HTTP Range requests so HTML5 <video>
seeking works.
"""

import os
import re
import threading
import time

from flask import (
    Blueprint,
    Response,
    abort,
    current_app,
    jsonify,
    request,
    stream_with_context,
)
from flask_login import login_required

import httpx

try:
    from yt_dlp import YoutubeDL
except ImportError:  # pragma: no cover - handled gracefully at runtime
    YoutubeDL = None

proxy_bp = Blueprint('proxy', __name__, url_prefix='/api/proxy')

# ── Constants ────────────────────────────────────────────────────────────
CACHE_TTL_SECONDS = 600  # 10-minute cache for resolved stream URLs
YT_ID_RE = re.compile(r'^[\w-]{6,20}$')
CHUNK_SIZE = 65536  # 64 KB
STREAM_TIMEOUT = httpx.Timeout(connect=15.0, read=None, write=30.0, pool=15.0)

# Progressive (muxed video+audio) mp4 preference so we never need ffmpeg.
# Caps the resolution at 720p to keep bandwidth reasonable.
YTDL_FORMAT = (
    'best[height<=720][ext=mp4][acodec!=none][vcodec!=none][protocol^=http]/'
    'best[height<=720][acodec!=none][vcodec!=none][protocol^=http]/'
    'best[ext=mp4][acodec!=none][vcodec!=none]'
)

# ── Module-level resolve cache ───────────────────────────────────────────
_resolve_cache: dict = {}  # video_id -> (expires_at_monotonic, resolved_dict)
_cache_lock = threading.Lock()


def _get_proxy_url():
    return (
        os.getenv('HTTPS_PROXY')
        or os.getenv('https_proxy')
        or os.getenv('HTTP_PROXY')
        or os.getenv('http_proxy')
        or None
    )


def _cache_get(video_id):
    now = time.monotonic()
    with _cache_lock:
        entry = _resolve_cache.get(video_id)
        if entry and entry[0] > now:
            return entry[1]
        if entry:
            _resolve_cache.pop(video_id, None)
    return None


def _cache_set(video_id, value):
    with _cache_lock:
        _resolve_cache[video_id] = (time.monotonic() + CACHE_TTL_SECONDS, value)


def _cache_drop(video_id):
    with _cache_lock:
        _resolve_cache.pop(video_id, None)


def _resolve_youtube(video_id):
    """Resolve a YouTube video ID to a direct stream URL via yt-dlp.

    Returns a dict with ``url`` (direct googlevideo URL, kept server-side),
    plus metadata. Raises ``ValueError`` on any failure.
    """
    if YoutubeDL is None:
        raise ValueError('yt-dlp is not installed on the server')

    cached = _cache_get(video_id)
    if cached:
        return cached

    opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'noplaylist': True,
        'cachedir': False,
        'format': YTDL_FORMAT,
        # The 'web' client no longer returns any progressive (muxed) mp4
        # for most videos — only DASH (split audio+video). Since proxy.py
        # streams a single URL directly to the browser without ffmpeg
        # merging, we need a client that still serves itag 18 (360p mp4
        # progressive). 'android' is the only client that consistently
        # returns it; 'web' is kept as fallback for the rare case android
        # is throttled.
        'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
    }
    proxy_url = _get_proxy_url()
    if proxy_url:
        opts['proxy'] = proxy_url

    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(
                f'https://www.youtube.com/watch?v={video_id}',
                download=False,
            )
    except Exception as exc:
        raise ValueError(f'yt-dlp failed: {exc}') from exc

    direct_url = info.get('url') if info else None
    if not direct_url and info and info.get('requested_formats'):
        # Rare: no progressive format picked up — fall back to first combo.
        direct_url = info['requested_formats'][0].get('url')
    if not direct_url:
        raise ValueError('No playable stream found for this video')

    ext = (info.get('ext') if info else None) or 'mp4'
    mime = 'video/mp4' if ext == 'mp4' else f'video/{ext}'

    filesize = None
    if info:
        filesize = info.get('filesize') or info.get('filesize_approx')
    resolved = {
        'url': direct_url,
        'mime': mime,
        'filesize': filesize,
        'title': info.get('title') if info else None,
        'duration': info.get('duration') if info else None,
    }
    _cache_set(video_id, resolved)
    return resolved


def _validate_video_id(video_id):
    if not video_id or not YT_ID_RE.match(video_id):
        abort(400, description='Invalid video id')


@proxy_bp.route('/youtube/<video_id>/info', methods=['GET'])
@login_required
def youtube_info(video_id):
    _validate_video_id(video_id)
    try:
        resolved = _resolve_youtube(video_id)
    except ValueError as exc:
        current_app.logger.warning('YouTube resolve failed for %s: %s', video_id, exc)
        return jsonify({'error': 'unresolvable', 'detail': str(exc)}), 502
    # Do NOT leak the raw direct URL to the client — it is signed for the
    # server IP and useless to the browser anyway.
    return jsonify({
        'title': resolved.get('title'),
        'duration': resolved.get('duration'),
        'filesize': resolved.get('filesize'),
        'mime': resolved.get('mime'),
    }), 200


@proxy_bp.route('/youtube/<video_id>/stream', methods=['GET'])
@login_required
def youtube_stream(video_id):
    _validate_video_id(video_id)
    try:
        resolved = _resolve_youtube(video_id)
    except ValueError as exc:
        current_app.logger.warning('YouTube resolve failed for %s: %s', video_id, exc)
        return jsonify({'error': 'unresolvable', 'detail': str(exc)}), 502

    direct_url = resolved['url']

    upstream_headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/124.0 Safari/537.36'
        ),
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    range_header = request.headers.get('Range')
    if range_header:
        upstream_headers['Range'] = range_header

    client_kwargs = {
        'timeout': STREAM_TIMEOUT,
        'follow_redirects': True,
    }
    proxy_url = _get_proxy_url()
    if proxy_url:
        client_kwargs['proxy'] = proxy_url
    client = httpx.Client(**client_kwargs)
    try:
        # Build + send with stream=True gives us a manually managed Response
        # whose lifecycle we can control from the generator's finally block.
        req = client.build_request('GET', direct_url, headers=upstream_headers)
        response = client.send(req, stream=True)
    except Exception as exc:
        client.close()
        current_app.logger.warning('YouTube stream failed for %s: %s', video_id, exc)
        # A likely signed-URL expiry — drop cache so the next request
        # re-resolves via yt-dlp.
        _cache_drop(video_id)
        return jsonify({'error': 'stream_failed'}), 502

    status_code = response.status_code
    if status_code >= 400:
        try:
            response.close()
        finally:
            client.close()
        _cache_drop(video_id)
        return jsonify({'error': f'upstream_status_{status_code}'}), 502

    out_headers = {}
    for key in ('Content-Type', 'Content-Length', 'Content-Range', 'Content-Disposition'):
        value = response.headers.get(key)
        if value:
            out_headers[key] = value
    out_headers['Accept-Ranges'] = 'bytes'
    out_headers.setdefault('Content-Type', resolved.get('mime') or 'video/mp4')
    # Browsers cache media aggressively; serve it with a short private cache.
    out_headers['Cache-Control'] = 'private, max-age=300'

    def generate():
        try:
            for chunk in response.iter_bytes(CHUNK_SIZE):
                if chunk:
                    yield chunk
        except GeneratorExit:
            # Client disconnected — fall through to the finally block.
            raise
        except Exception as exc:
            current_app.logger.warning('YouTube stream broke for %s: %s', video_id, exc)
        finally:
            try:
                response.close()
            finally:
                client.close()

    flask_response = Response(
        stream_with_context(generate()),
        status=status_code,
        headers=out_headers,
    )
    return flask_response
