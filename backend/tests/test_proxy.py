"""Tests for the /api/proxy/youtube/* blueprint.

These tests exercise the auth, validation, caching, and streaming paths
without touching the real YouTube network. The ``YoutubeDL`` class and the
``httpx.Client`` used inside ``app.routes.proxy`` are monkeypatched with
lightweight fakes so the route logic can be exercised deterministically.
"""

import pytest

from app.routes import proxy as proxy_mod


# ── Fixtures ──────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _clear_proxy_cache():
    """Ensure the module-level resolve cache is empty for every test."""
    with proxy_mod._cache_lock:
        proxy_mod._resolve_cache.clear()
    yield
    with proxy_mod._cache_lock:
        proxy_mod._resolve_cache.clear()


class _FakeYoutubeDL:
    """Minimal yt-dlp replacement used as a context manager."""

    def __init__(self, opts=None):
        self.opts = opts or {}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def extract_info(self, url, download=False):
        return {
            'url': 'https://fake.googlevideo.com/fake-video.mp4',
            'ext': 'mp4',
            'title': 'Fake Title',
            'duration': 42,
            'filesize': 12345,
        }


class _FakeRaisingYoutubeDL(_FakeYoutubeDL):
    def extract_info(self, url, download=False):
        raise RuntimeError('network down')


class _FakeEmptyYoutubeDL(_FakeYoutubeDL):
    def extract_info(self, url, download=False):
        return {'ext': 'mp4', 'title': 'no-url'}


class _FakeFallbackYoutubeDL(_FakeYoutubeDL):
    """No top-level ``url`` — falls back to ``requested_formats[0]``."""

    def extract_info(self, url, download=False):
        return {
            'requested_formats': [
                {'url': 'https://fallback.googlevideo.com/fallback.mp4'}
            ],
            'ext': 'webm',
            'title': 'Fallback Title',
        }


class _FakeHttpxResponse:
    def __init__(self, status_code=200, headers=None, chunks=None, raise_on_iter=False):
        self.status_code = status_code
        self.headers = headers or {
            'Content-Type': 'video/mp4',
            'Content-Length': '8',
            'Accept-Ranges': 'bytes',
        }
        self._chunks = chunks if chunks is not None else [b'abcd', b'efgh']
        self._raise = raise_on_iter
        self.closed = False

    def iter_bytes(self, chunk_size):
        if self._raise:
            raise RuntimeError('stream broke mid-way')
        for c in self._chunks:
            yield c

    def close(self):
        self.closed = True


class _FakeHttpxClient:
    """Lightweight stand-in for ``httpx.Client`` used in proxy_mod."""

    last_instance = None

    def __init__(self, *, response=None, send_raises=False, **kwargs):
        self.kwargs = kwargs
        self._response = response or _FakeHttpxResponse()
        self._send_raises = send_raises
        self.closed = False
        _FakeHttpxClient.last_instance = self

    def build_request(self, method, url, headers=None):
        return {'method': method, 'url': url, 'headers': headers}

    def send(self, req, stream=True):
        if self._send_raises:
            raise RuntimeError('connect failed')
        return self._response

    def close(self):
        self.closed = True


def _make_client_factory(response=None, send_raises=False):
    def _factory(**kwargs):
        return _FakeHttpxClient(
            response=response, send_raises=send_raises, **kwargs
        )
    return _factory


# ── Pure helper tests (no Flask client needed) ───────────────────────────


_PROXY_ENV_NAMES = ('HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy')


def _clear_proxy_env(monkeypatch):
    # Windows treats env var names case-insensitively, so we clear every
    # spelling before setting the one under test — otherwise the host's
    # existing HTTP_PROXY leaks in (or delenv('https_proxy') blows away
    # HTTPS_PROXY on Windows).
    for name in _PROXY_ENV_NAMES:
        monkeypatch.delenv(name, raising=False)


def test_get_proxy_url_prefers_https_proxy(monkeypatch):
    _clear_proxy_env(monkeypatch)
    monkeypatch.setenv('HTTPS_PROXY', 'http://proxy.example.com:8080')
    assert proxy_mod._get_proxy_url() == 'http://proxy.example.com:8080'


def test_get_proxy_url_falls_back_to_http_proxy(monkeypatch):
    _clear_proxy_env(monkeypatch)
    monkeypatch.setenv('HTTP_PROXY', 'http://fallback:3128')
    assert proxy_mod._get_proxy_url() == 'http://fallback:3128'


def test_get_proxy_url_none_when_unset(monkeypatch):
    _clear_proxy_env(monkeypatch)
    assert proxy_mod._get_proxy_url() is None


def test_cache_set_get_drop_roundtrip():
    proxy_mod._cache_set('vid1', {'url': 'http://x'})
    assert proxy_mod._cache_get('vid1') == {'url': 'http://x'}
    proxy_mod._cache_drop('vid1')
    assert proxy_mod._cache_get('vid1') is None


def test_cache_get_honours_ttl(monkeypatch):
    # Simulate an expired entry by shrinking the monotonic offset.
    monkeypatch.setattr(
        proxy_mod, 'CACHE_TTL_SECONDS', -1
    )
    proxy_mod._cache_set('vid2', {'url': 'http://y'})
    assert proxy_mod._cache_get('vid2') is None


def test_resolve_youtube_returns_none_when_ytdlp_missing(monkeypatch):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', None)
    with pytest.raises(ValueError, match='yt-dlp is not installed'):
        proxy_mod._resolve_youtube('someid1234')


def test_resolve_youtube_success_is_cached(monkeypatch):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeYoutubeDL)
    resolved = proxy_mod._resolve_youtube('dQw4w9WgXcQ')
    assert resolved['url'] == 'https://fake.googlevideo.com/fake-video.mp4'
    assert resolved['mime'] == 'video/mp4'
    assert resolved['title'] == 'Fake Title'

    # Second call with a raising impl — should hit cache, never invoke ytdl.
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeRaisingYoutubeDL)
    cached = proxy_mod._resolve_youtube('dQw4w9WgXcQ')
    assert cached['url'] == 'https://fake.googlevideo.com/fake-video.mp4'


def test_resolve_youtube_uses_fallback_formats(monkeypatch):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeFallbackYoutubeDL)
    resolved = proxy_mod._resolve_youtube('fallback_id')
    assert resolved['url'].startswith('https://fallback.googlevideo.com')
    assert resolved['mime'] == 'video/webm'


def test_resolve_youtube_no_stream_raises(monkeypatch):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeEmptyYoutubeDL)
    with pytest.raises(ValueError, match='No playable stream'):
        proxy_mod._resolve_youtube('empty_id99')


def test_resolve_youtube_wraps_ytdlp_errors(monkeypatch):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeRaisingYoutubeDL)
    with pytest.raises(ValueError, match='yt-dlp failed'):
        proxy_mod._resolve_youtube('raising_id')


# ── Route-level tests: /info ─────────────────────────────────────────────


def test_youtube_info_requires_login(client):
    resp = client.get('/api/proxy/youtube/dQw4w9WgXcQ/info')
    assert resp.status_code == 401


def test_youtube_info_rejects_invalid_id(client, login_user):
    login_user()
    resp = client.get('/api/proxy/youtube/!!bad!!/info')
    assert resp.status_code == 400


def test_youtube_info_rejects_too_short_id(client, login_user):
    login_user()
    resp = client.get('/api/proxy/youtube/abc/info')
    assert resp.status_code == 400


def test_youtube_info_returns_metadata(monkeypatch, client, login_user):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeYoutubeDL)
    login_user()
    resp = client.get('/api/proxy/youtube/dQw4w9WgXcQ/info')
    assert resp.status_code == 200
    body = resp.get_json()
    # Direct URL is NEVER leaked — only metadata.
    assert 'url' not in body
    assert body['title'] == 'Fake Title'
    assert body['duration'] == 42
    assert body['filesize'] == 12345
    assert body['mime'] == 'video/mp4'


def test_youtube_info_returns_502_when_ytdlp_missing(
    monkeypatch, client, login_user
):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', None)
    login_user()
    resp = client.get('/api/proxy/youtube/dQw4w9WgXcQ/info')
    assert resp.status_code == 502
    body = resp.get_json()
    assert body['error'] == 'unresolvable'


def test_youtube_info_returns_502_on_ytdlp_failure(
    monkeypatch, client, login_user
):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeRaisingYoutubeDL)
    login_user()
    resp = client.get('/api/proxy/youtube/dQw4w9WgXcQ/info')
    assert resp.status_code == 502


# ── Route-level tests: /stream ───────────────────────────────────────────


def test_youtube_stream_requires_login(client):
    resp = client.get('/api/proxy/youtube/dQw4w9WgXcQ/stream')
    assert resp.status_code == 401


def test_youtube_stream_rejects_invalid_id(client, login_user):
    login_user()
    resp = client.get('/api/proxy/youtube/!!bad!!/stream')
    assert resp.status_code == 400


def test_youtube_stream_returns_bytes(monkeypatch, client, login_user):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeYoutubeDL)
    fake_response = _FakeHttpxResponse(
        status_code=200,
        headers={
            'Content-Type': 'video/mp4',
            'Content-Length': '8',
            'Content-Disposition': 'inline',
        },
        chunks=[b'abcd', b'efgh'],
    )
    monkeypatch.setattr(
        proxy_mod.httpx, 'Client', _make_client_factory(response=fake_response)
    )
    login_user()
    resp = client.get('/api/proxy/youtube/dQw4w9WgXcQ/stream')
    assert resp.status_code == 200
    assert resp.headers.get('Accept-Ranges') == 'bytes'
    assert resp.headers.get('Cache-Control') == 'private, max-age=300'
    assert resp.data == b'abcdefgh'
    # Ensure the fake httpx client was actually torn down.
    assert _FakeHttpxClient.last_instance is not None
    assert _FakeHttpxClient.last_instance.closed is True


def test_youtube_stream_forwards_range_header(monkeypatch, client, login_user):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeYoutubeDL)
    fake_response = _FakeHttpxResponse(
        status_code=206,
        headers={
            'Content-Type': 'video/mp4',
            'Content-Range': 'bytes 0-3/8',
            'Content-Length': '4',
        },
        chunks=[b'abcd'],
    )
    monkeypatch.setattr(
        proxy_mod.httpx, 'Client', _make_client_factory(response=fake_response)
    )
    login_user()
    resp = client.get(
        '/api/proxy/youtube/dQw4w9WgXcQ/stream',
        headers={'Range': 'bytes=0-3'},
    )
    assert resp.status_code == 206
    assert resp.headers.get('Content-Range') == 'bytes 0-3/8'
    assert resp.data == b'abcd'


def test_youtube_stream_upstream_4xx_returns_502(
    monkeypatch, client, login_user
):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeYoutubeDL)
    fake_response = _FakeHttpxResponse(status_code=403)
    monkeypatch.setattr(
        proxy_mod.httpx, 'Client', _make_client_factory(response=fake_response)
    )
    login_user()
    resp = client.get('/api/proxy/youtube/dQw4w9WgXcQ/stream')
    assert resp.status_code == 502
    body = resp.get_json()
    assert body['error'].startswith('upstream_status_')


def test_youtube_stream_connect_failure_returns_502_and_drops_cache(
    monkeypatch, client, login_user
):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeYoutubeDL)
    # Prime the cache first so we can assert the drop below.
    proxy_mod._cache_set('dQw4w9WgXcQ', {
        'url': 'http://x',
        'mime': 'video/mp4',
        'filesize': None,
        'title': None,
        'duration': None,
    })
    monkeypatch.setattr(
        proxy_mod.httpx, 'Client',
        _make_client_factory(send_raises=True),
    )
    login_user()
    resp = client.get('/api/proxy/youtube/dQw4w9WgXcQ/stream')
    assert resp.status_code == 502
    # Cache should have been dropped by the error path.
    assert proxy_mod._cache_get('dQw4w9WgXcQ') is None


def test_youtube_stream_resolve_failure_returns_502(
    monkeypatch, client, login_user
):
    monkeypatch.setattr(proxy_mod, 'YoutubeDL', _FakeRaisingYoutubeDL)
    login_user()
    resp = client.get('/api/proxy/youtube/dQw4w9WgXcQ/stream')
    assert resp.status_code == 502
