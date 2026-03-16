import json


def test_register(client):
    response = client.post('/api/auth/register', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['username'] == 'testuser'
    assert data['email'] == 'test@example.com'
    assert 'id' in data


def test_register_duplicate_username(client):
    client.post('/api/auth/register', json={
        'username': 'testuser',
        'email': 'test1@example.com',
        'password': 'password123'
    })
    response = client.post('/api/auth/register', json={
        'username': 'testuser',
        'email': 'test2@example.com',
        'password': 'password123'
    })
    assert response.status_code == 400


def test_login(client):
    client.post('/api/auth/register', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['username'] == 'testuser'


def test_login_invalid(client):
    response = client.post('/api/auth/login', json={
        'email': 'nobody@example.com',
        'password': 'wrong'
    })
    assert response.status_code == 401


def test_me_unauthenticated(client):
    response = client.get('/api/auth/me')
    assert response.status_code == 401
