import json

from app.models.user import User


def register_user(client, **overrides):
    payload = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123',
    }
    payload.update(overrides)
    return client.post('/api/auth/register', json=payload)


def login_user(client, **overrides):
    payload = {
        'email': 'test@example.com',
        'password': 'password123',
    }
    payload.update(overrides)
    return client.post('/api/auth/login', json=payload)


def test_register_creates_user_and_hashes_password(client):
    response = register_user(client)

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['username'] == 'testuser'
    assert data['email'] == 'test@example.com'
    assert 'id' in data

    user = User.query.filter_by(email='test@example.com').first()
    assert user is not None
    assert user.username == 'testuser'
    assert user.password_hash != 'password123'
    assert user.check_password('password123') is True


def test_register_normalizes_email_before_storing(client):
    response = register_user(client, email='  Test@Example.com ')

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['email'] == 'test@example.com'

    user = User.query.filter_by(email='test@example.com').first()
    assert user is not None


def test_register_duplicate_username(client):
    register_user(client)

    response = register_user(client, email='another@example.com')

    assert response.status_code == 409
    assert json.loads(response.data)['error'] == 'Username already exists'


def test_register_duplicate_email_is_rejected_case_insensitively(client):
    register_user(client, email='Test@Example.com')

    response = register_user(client, username='anotheruser', email='test@example.com')

    assert response.status_code == 409
    assert json.loads(response.data)['error'] == 'Email already registered'


def test_register_rejects_short_password(client):
    response = register_user(client, password='short')

    assert response.status_code == 400
    assert json.loads(response.data)['error'] == 'Password must be at least 8 characters'


def test_register_rejects_invalid_email(client):
    response = register_user(client, email='not-an-email')

    assert response.status_code == 400
    assert json.loads(response.data)['error'] == 'Please provide a valid email address'


def test_register_rejects_short_username(client):
    response = register_user(client, username='ab')

    assert response.status_code == 400
    assert json.loads(response.data)['error'] == 'Username must be between 3 and 80 characters'


def test_login(client):
    register_user(client)

    response = login_user(client)

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['username'] == 'testuser'


def test_login_accepts_mixed_case_email(client):
    register_user(client, email='Test@Example.com')

    response = login_user(client, email='  test@example.com  ')

    assert response.status_code == 200


def test_login_requires_email_and_password(client):
    response = client.post('/api/auth/login', json={'email': '', 'password': ''})

    assert response.status_code == 400
    assert json.loads(response.data)['error'] == 'Email and password are required'


def test_login_invalid(client):
    response = login_user(client, email='nobody@example.com', password='wrong')

    assert response.status_code == 401
    assert json.loads(response.data)['error'] == 'Invalid credentials'


def test_me_returns_current_user_after_register(client):
    register_user(client)

    response = client.get('/api/auth/me')

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['email'] == 'test@example.com'


def test_logout_clears_session(client):
    register_user(client)

    logout_response = client.post('/api/auth/logout')
    me_response = client.get('/api/auth/me')

    assert logout_response.status_code == 200
    assert json.loads(logout_response.data)['message'] == 'Logged out'
    assert me_response.status_code == 401
    assert json.loads(me_response.data)['error'] == 'Authentication required'


def test_me_unauthenticated(client):
    response = client.get('/api/auth/me')

    assert response.status_code == 401
    assert json.loads(response.data)['error'] == 'Authentication required'
