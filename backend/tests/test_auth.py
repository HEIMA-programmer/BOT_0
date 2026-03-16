import json


def register_user(client, **overrides):
    payload = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    }
    payload.update(overrides)
    return client.post('/api/auth/register', json=payload)


def test_register(client):
    response = register_user(client)
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['username'] == 'testuser'
    assert data['email'] == 'test@example.com'
    assert 'id' in data


def test_register_normalizes_email(client):
    response = register_user(client, email='  TEST@Example.COM ')
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['email'] == 'test@example.com'


def test_register_requires_payload(client):
    response = client.post('/api/auth/register')
    assert response.status_code == 400
    assert response.get_json()['error'] == 'No data provided'


def test_register_requires_all_fields(client):
    response = register_user(client, email='')
    assert response.status_code == 400
    assert response.get_json()['error'] == 'Username, email, and password are required'


def test_register_rejects_invalid_email(client):
    response = register_user(client, email='not-an-email')
    assert response.status_code == 400
    assert response.get_json()['error'] == 'Please provide a valid email address'


def test_register_rejects_short_password(client):
    response = register_user(client, password='123')
    assert response.status_code == 400
    assert response.get_json()['error'] == 'Password must be at least 6 characters long'


def test_register_duplicate_username(client):
    register_user(client, email='test1@example.com')
    response = register_user(client, email='test2@example.com')
    assert response.status_code == 409
    assert response.get_json()['error'] == 'Username already exists'


def test_register_duplicate_email_is_case_insensitive(client):
    register_user(client, email='Test@Example.com')
    response = register_user(client, username='anotheruser', email='test@example.com')
    assert response.status_code == 409
    assert response.get_json()['error'] == 'Email already registered'


def test_login(client):
    register_user(client)
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['username'] == 'testuser'


def test_login_normalizes_email(client):
    register_user(client, email='mixed@example.com')
    response = client.post('/api/auth/login', json={
        'email': '  MIXED@EXAMPLE.COM ',
        'password': 'password123'
    })
    assert response.status_code == 200


def test_login_requires_payload(client):
    response = client.post('/api/auth/login')
    assert response.status_code == 400
    assert response.get_json()['error'] == 'No data provided'


def test_login_requires_email_and_password(client):
    response = client.post('/api/auth/login', json={'email': '', 'password': ''})
    assert response.status_code == 400
    assert response.get_json()['error'] == 'Email and password are required'


def test_login_invalid(client):
    response = client.post('/api/auth/login', json={
        'email': 'nobody@example.com',
        'password': 'wrong'
    })
    assert response.status_code == 401


def test_me_unauthenticated(client):
    response = client.get('/api/auth/me')
    assert response.status_code == 401
    assert response.get_json()['error'] == 'Not authenticated'


def test_me_authenticated(client):
    register_user(client)
    response = client.get('/api/auth/me')
    assert response.status_code == 200
    assert response.get_json()['email'] == 'test@example.com'


def test_logout_clears_session(client):
    register_user(client)
    logout_response = client.post('/api/auth/logout')
    assert logout_response.status_code == 200
    assert logout_response.get_json()['message'] == 'Logged out'

    me_response = client.get('/api/auth/me')
    assert me_response.status_code == 401
    assert me_response.get_json()['error'] == 'Not authenticated'
