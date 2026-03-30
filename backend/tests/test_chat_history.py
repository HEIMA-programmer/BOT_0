"""Tests for the chat-history REST API."""

import json

from app import db as _db
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage


def _login(client, email, password):
    response = client.post(
        '/api/auth/login',
        json={'email': email, 'password': password},
    )
    assert response.status_code == 200


def test_create_session(client, create_user):
    user = create_user()
    _login(client, user.email, 'password123')

    response = client.post(
        '/api/chat-history/sessions',
        json={'scenario_type': 'free_conversation'},
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data['scenario_type'] == 'free_conversation'
    assert data['ended_at'] is None


def test_get_sessions(client, create_user):
    user = create_user()
    _login(client, user.email, 'password123')

    # Create two sessions
    client.post('/api/chat-history/sessions', json={'scenario_type': 'free_conversation'})
    client.post('/api/chat-history/sessions', json={'scenario_type': 'office_hours'})

    response = client.get('/api/chat-history/sessions')
    assert response.status_code == 200
    data = response.get_json()
    assert data['total'] == 2
    assert len(data['sessions']) == 2


def test_get_session_detail(client, create_user):
    user = create_user()
    _login(client, user.email, 'password123')

    create_resp = client.post(
        '/api/chat-history/sessions',
        json={'scenario_type': 'office_hours'},
    )
    session_id = create_resp.get_json()['id']

    response = client.get(f'/api/chat-history/sessions/{session_id}')
    assert response.status_code == 200
    data = response.get_json()
    assert data['id'] == session_id
    assert 'messages' in data


def test_save_messages(client, create_user):
    user = create_user()
    _login(client, user.email, 'password123')

    create_resp = client.post(
        '/api/chat-history/sessions',
        json={'scenario_type': 'free_conversation'},
    )
    session_id = create_resp.get_json()['id']

    messages = [
        {'role': 'assistant', 'content': 'Hello!'},
        {'role': 'user', 'content': 'Hi there.'},
    ]
    response = client.post(
        f'/api/chat-history/sessions/{session_id}/messages',
        json={'messages': messages},
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data['saved'] == 2


def test_end_session(client, create_user):
    user = create_user()
    _login(client, user.email, 'password123')

    create_resp = client.post(
        '/api/chat-history/sessions',
        json={'scenario_type': 'free_conversation'},
    )
    session_id = create_resp.get_json()['id']

    response = client.put(
        f'/api/chat-history/sessions/{session_id}/end',
        json={'report': {'overall_score': 7.5}},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data['ended_at'] is not None


def test_get_scenario_options(client, create_user):
    user = create_user()
    _login(client, user.email, 'password123')

    response = client.get('/api/chat-history/scenarios/office_hours')
    assert response.status_code == 200
    data = response.get_json()
    assert 'options' in data
    assert len(data['options']) > 0


def test_get_scenario_options_unknown_type(client, create_user):
    user = create_user()
    _login(client, user.email, 'password123')

    response = client.get('/api/chat-history/scenarios/nonexistent')
    assert response.status_code == 404


def test_requires_login(client):
    response = client.get('/api/chat-history/sessions')
    assert response.status_code == 401
