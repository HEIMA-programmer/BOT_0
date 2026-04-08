"""Tests for the /api/speaking/sessions REST endpoints.

Covers auth guards, pagination clamping, per-user isolation on GET/DELETE,
the JSON (de)serialisation done by ``SpeakingSession.to_dict``, and the
404 paths for non-existent / cross-user rows.
"""

import json
from datetime import datetime, timedelta, timezone

from app import db as _db
from app.models.speaking_session import SpeakingSession


def _make_session(user_id, **overrides):
    """Insert a SpeakingSession row and return it. Non-nullable fields are
    populated with sensible defaults so tests can override only what they
    care about."""
    defaults = {
        'user_id': user_id,
        'topic': 'Climate change',
        'scenario_type': 'office_hours',
        'transcript': 'The quick brown fox jumps over the lazy dog.',
        'pronunciation_json': json.dumps({
            'overall': 82,
            'accuracy': 84,
            'fluency': 80,
            'prosody': 81,
        }),
        'content_json': json.dumps({
            'overall': 76,
            'vocabulary': 80,
            'grammar': 70,
            'topic': 78,
            'feedback': {
                'vocabulary': 'Nice use of synonyms.',
                'grammar': 'Watch tense agreement.',
                'topic': 'Stayed on topic throughout.',
            },
        }),
        'overall_score': 79.0,
        'score': 79.0,
        'ai_feedback': 'Stayed on topic throughout.',
    }
    defaults.update(overrides)
    row = SpeakingSession(**defaults)
    _db.session.add(row)
    _db.session.commit()
    return row


# ── Auth guards ──────────────────────────────────────────────────────────


def test_list_sessions_requires_login(client):
    resp = client.get('/api/speaking/sessions')
    assert resp.status_code == 401


def test_get_session_requires_login(client):
    resp = client.get('/api/speaking/sessions/1')
    assert resp.status_code == 401


def test_delete_session_requires_login(client):
    resp = client.delete('/api/speaking/sessions/1')
    assert resp.status_code == 401


# ── Listing ──────────────────────────────────────────────────────────────


def test_list_sessions_returns_empty_page(client, login_user):
    login_user()
    resp = client.get('/api/speaking/sessions')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body == {'sessions': [], 'total': 0, 'page': 1, 'pages': 0}


def test_list_sessions_returns_user_rows_sorted_desc(client, login_user):
    login_user()
    from app.models.user import User
    user = User.query.filter_by(email='test@example.com').first()
    older = _make_session(
        user.id,
        topic='Older topic',
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    newer = _make_session(
        user.id,
        topic='Newer topic',
        created_at=datetime.now(timezone.utc),
    )

    resp = client.get('/api/speaking/sessions')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['total'] == 2
    topics = [s['topic'] for s in body['sessions']]
    assert topics == ['Newer topic', 'Older topic']

    # The serialised session should expose the parsed JSON blocks.
    first = body['sessions'][0]
    assert first['id'] == newer.id
    assert first['scenario_type'] == 'office_hours'
    assert first['pronunciation']['overall'] == 82
    assert first['content']['grammar'] == 70
    assert first['content']['feedback']['vocabulary'] == 'Nice use of synonyms.'
    assert first['transcript'].startswith('The quick brown fox')
    assert first['overall_score'] == 79.0
    # Bad-JSON handling: the serializer should treat malformed blobs as None.
    _ = older  # keep the reference alive for the ORM


def test_list_sessions_hides_other_users_rows(client, login_user, create_user):
    login_user()
    from app.models.user import User
    me = User.query.filter_by(email='test@example.com').first()
    other = create_user(username='stranger', email='stranger@example.com')
    _make_session(me.id, topic='Mine')
    _make_session(other.id, topic='Not mine')

    resp = client.get('/api/speaking/sessions')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['total'] == 1
    assert body['sessions'][0]['topic'] == 'Mine'


def test_list_sessions_pagination_clamps_per_page(client, login_user):
    login_user()
    from app.models.user import User
    user = User.query.filter_by(email='test@example.com').first()
    for i in range(5):
        _make_session(user.id, topic=f'Topic {i}')

    # per_page < 1 → clamp to 1 (one item per page)
    resp_low = client.get('/api/speaking/sessions?per_page=0')
    assert resp_low.status_code == 200
    body_low = resp_low.get_json()
    assert body_low['total'] == 5
    assert len(body_low['sessions']) == 1
    assert body_low['pages'] == 5

    # per_page > 100 → clamp to 100 (all five fit in one page)
    resp_high = client.get('/api/speaking/sessions?per_page=9999')
    assert resp_high.status_code == 200
    body_high = resp_high.get_json()
    assert body_high['total'] == 5
    assert len(body_high['sessions']) == 5
    assert body_high['pages'] == 1


def test_list_sessions_second_page(client, login_user):
    login_user()
    from app.models.user import User
    user = User.query.filter_by(email='test@example.com').first()
    for i in range(3):
        _make_session(user.id, topic=f'Topic {i}')

    resp = client.get('/api/speaking/sessions?per_page=2&page=2')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['total'] == 3
    assert body['page'] == 2
    assert body['pages'] == 2
    assert len(body['sessions']) == 1


# ── Single GET ───────────────────────────────────────────────────────────


def test_get_session_returns_own_row(client, login_user):
    login_user()
    from app.models.user import User
    user = User.query.filter_by(email='test@example.com').first()
    row = _make_session(user.id, topic='Solo')

    resp = client.get(f'/api/speaking/sessions/{row.id}')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['id'] == row.id
    assert body['topic'] == 'Solo'
    assert body['pronunciation']['overall'] == 82


def test_get_session_404_for_missing_id(client, login_user):
    login_user()
    resp = client.get('/api/speaking/sessions/99999')
    assert resp.status_code == 404
    assert resp.get_json()['error'] == 'Session not found'


def test_get_session_404_for_other_user_row(client, login_user, create_user):
    login_user()
    other = create_user(username='stranger', email='stranger@example.com')
    row = _make_session(other.id, topic='Theirs')

    resp = client.get(f'/api/speaking/sessions/{row.id}')
    assert resp.status_code == 404


# ── DELETE ───────────────────────────────────────────────────────────────


def test_delete_session_removes_own_row(client, login_user):
    login_user()
    from app.models.user import User
    user = User.query.filter_by(email='test@example.com').first()
    row = _make_session(user.id)
    row_id = row.id

    resp = client.delete(f'/api/speaking/sessions/{row_id}')
    assert resp.status_code == 200
    assert resp.get_json()['message'] == 'deleted'
    assert _db.session.get(SpeakingSession, row_id) is None


def test_delete_session_404_for_missing_id(client, login_user):
    login_user()
    resp = client.delete('/api/speaking/sessions/4242')
    assert resp.status_code == 404


def test_delete_session_404_for_other_user_row(client, login_user, create_user):
    login_user()
    other = create_user(username='stranger', email='stranger@example.com')
    row = _make_session(other.id)

    resp = client.delete(f'/api/speaking/sessions/{row.id}')
    assert resp.status_code == 404
    # Row should still be there — cross-user deletes must be a no-op.
    assert _db.session.get(SpeakingSession, row.id) is not None


# ── Model-level serialization (exercises _safe_json_loads) ───────────────


def test_to_dict_handles_malformed_json_blobs(client, login_user):
    login_user()
    from app.models.user import User
    user = User.query.filter_by(email='test@example.com').first()
    # Deliberately corrupt JSON blobs.
    row = _make_session(
        user.id,
        topic='Bad blobs',
        pronunciation_json='not-valid-json',
        content_json=None,
    )
    resp = client.get(f'/api/speaking/sessions/{row.id}')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['pronunciation'] is None
    assert body['content'] is None
    assert body['topic'] == 'Bad blobs'
