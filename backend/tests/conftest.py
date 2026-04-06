import pytest
from app import create_app, db as _db
from app.models.user import User
from app.models.word import Word


@pytest.fixture(scope='session')
def app():
    app = create_app('testing')
    yield app


@pytest.fixture(scope='function')
def db(app):
    with app.app_context():
        _db.drop_all()
        _db.create_all()
        yield _db
        _db.session.rollback()
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app, db):
    return app.test_client()


@pytest.fixture(scope='function')
def create_user(db):
    def _create_user(
        username='testuser',
        email='test@example.com',
        password='password123',
    ):
        user = User(username=username, email=email.strip().lower())
        user.set_password(password)
        _db.session.add(user)
        _db.session.commit()
        return user

    return _create_user


@pytest.fixture(scope='function')
def login_user(client, create_user):
    def _login_user(
        username='testuser',
        email='test@example.com',
        password='password123',
    ):
        create_user(username=username, email=email, password=password)
        response = client.post(
            '/api/auth/login',
            json={'email': email, 'password': password},
        )
        assert response.status_code == 200
        return response

    return _login_user


@pytest.fixture(scope='function')
def create_word(db):
    def _create_word(
        text='hypothesis',
        definition='A proposed explanation.',
        example_sentence='The hypothesis was tested.',
        part_of_speech='noun',
        difficulty_level='intermediate',
    ):
        word = Word(
            text=text,
            definition=definition,
            example_sentence=example_sentence,
            part_of_speech=part_of_speech,
            difficulty_level=difficulty_level,
        )
        _db.session.add(word)
        _db.session.commit()
        return word

    return _create_word
