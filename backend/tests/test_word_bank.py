from datetime import datetime, timezone

from app import db
from app.models.review_history import ReviewHistory
from app.models.word_bank import WordBank


def test_word_bank_requires_authentication(client):
    response = client.get('/api/word-bank')

    assert response.status_code == 401
    assert response.get_json()['error'] == 'Authentication required'


def test_add_word_to_bank_by_word_id(client, login_user, create_word):
    login_user()
    word = create_word()

    response = client.post('/api/word-bank', json={'word_id': word.id})

    assert response.status_code == 201
    data = response.get_json()
    assert data['word_id'] == word.id
    assert data['text'] == word.text
    assert WordBank.query.filter_by(word_id=word.id).count() == 1


def test_add_word_to_bank_by_word_text_creates_word_if_missing(client, login_user):
    login_user()

    response = client.post(
        '/api/word-bank',
        json={
            'word_text': 'rubric',
            'definition': 'A scoring guide.',
            'example_sentence': 'The rubric explains each criterion.',
            'part_of_speech': 'noun',
            'difficulty_level': 'intermediate',
        },
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data['text'] == 'rubric'
    assert data['definition'] == 'A scoring guide.'


def test_add_word_to_bank_requires_word_identifier(client, login_user):
    login_user()

    response = client.post('/api/word-bank', json={})

    assert response.status_code == 400
    assert response.get_json()['error'] == 'word_id or word_text is required'


def test_add_word_to_bank_rejects_missing_word_id(client, login_user):
    login_user()

    response = client.post('/api/word-bank', json={'word_id': 9999})

    assert response.status_code == 404
    assert response.get_json()['error'] == 'Word not found'


def test_add_word_to_bank_rejects_duplicates_for_same_user(client, login_user, create_word):
    login_user()
    word = create_word()
    client.post('/api/word-bank', json={'word_id': word.id})

    response = client.post('/api/word-bank', json={'word_id': word.id})

    assert response.status_code == 409
    assert response.get_json()['error'] == 'Word already in bank'


def test_get_word_bank_returns_only_current_user_entries(client, create_user, create_word):
    user_one = create_user(username='userone', email='one@example.com')
    user_two = create_user(username='usertwo', email='two@example.com')
    word_one = create_word(text='hypothesis')
    word_two = create_word(text='empirical')

    db.session.add(WordBank(user_id=user_one.id, word_id=word_one.id))
    db.session.add(WordBank(user_id=user_two.id, word_id=word_two.id))
    db.session.commit()

    login_response = client.post(
        '/api/auth/login',
        json={'email': 'one@example.com', 'password': 'password123'},
    )
    assert login_response.status_code == 200

    response = client.get('/api/word-bank')

    assert response.status_code == 200
    words = response.get_json()['words']
    assert len(words) == 1
    assert words[0]['text'] == 'hypothesis'


def test_remove_word_from_bank_deletes_entry(client, login_user, create_word):
    login_user()
    word = create_word()
    entry = WordBank(user_id=1, word_id=word.id)
    db.session.add(entry)
    db.session.commit()

    response = client.delete(f'/api/word-bank/{entry.id}')

    assert response.status_code == 200
    assert response.get_json()['message'] == 'Removed from word bank'
    assert WordBank.query.get(entry.id) is None


def test_remove_word_from_bank_rejects_missing_entry(client, login_user):
    login_user()

    response = client.delete('/api/word-bank/9999')

    assert response.status_code == 404
    assert response.get_json()['error'] == 'Not found'


def test_update_word_bank_entry_accepts_valid_mastery_level(client, login_user, create_word):
    login_user()
    word = create_word()
    entry = WordBank(user_id=1, word_id=word.id, mastery_level=0)
    db.session.add(entry)
    db.session.commit()

    response = client.patch(f'/api/word-bank/{entry.id}', json={'mastery_level': 2})

    assert response.status_code == 200
    assert response.get_json()['mastery_level'] == 2


def test_update_word_bank_entry_rejects_invalid_mastery_level(client, login_user, create_word):
    login_user()
    word = create_word()
    entry = WordBank(user_id=1, word_id=word.id, mastery_level=0)
    db.session.add(entry)
    db.session.commit()

    response = client.patch(f'/api/word-bank/{entry.id}', json={'mastery_level': 4})

    assert response.status_code == 400
    assert response.get_json()['error'] == 'Invalid mastery level'


def test_get_word_bank_stats_returns_expected_counts(client, login_user, create_word):
    login_user()
    word_one = create_word(text='hypothesis')
    word_two = create_word(text='empirical')
    entry_one = WordBank(user_id=1, word_id=word_one.id, mastery_level=0)
    entry_two = WordBank(user_id=1, word_id=word_two.id, mastery_level=3)
    db.session.add_all([entry_one, entry_two])
    db.session.commit()

    db.session.add(
        ReviewHistory(
            user_id=1,
            word_bank_entry_id=entry_two.id,
            review_date=datetime.now(timezone.utc),
            knew_it=True,
        )
    )
    db.session.commit()

    response = client.get('/api/word-bank/stats')

    assert response.status_code == 200
    data = response.get_json()
    assert data['total'] == 2
    assert data['new'] == 1
    assert data['mastered'] == 1
    assert data['today_reviewed'] == 1


def test_review_word_increments_mastery_and_records_history(client, login_user, create_word):
    login_user()
    word = create_word()
    entry = WordBank(user_id=1, word_id=word.id, mastery_level=1)
    db.session.add(entry)
    db.session.commit()

    response = client.post(f'/api/word-bank/{entry.id}/review', json={'knew_it': True})

    assert response.status_code == 200
    data = response.get_json()
    assert data['mastery_level'] == 2
    assert data['last_reviewed'] is not None
    assert ReviewHistory.query.filter_by(word_bank_entry_id=entry.id).count() == 1


def test_review_word_does_not_increment_when_user_did_not_know_it(client, login_user, create_word):
    login_user()
    word = create_word()
    entry = WordBank(user_id=1, word_id=word.id, mastery_level=2)
    db.session.add(entry)
    db.session.commit()

    response = client.post(f'/api/word-bank/{entry.id}/review', json={'knew_it': False})

    assert response.status_code == 200
    assert response.get_json()['mastery_level'] == 2


def test_review_word_rejects_missing_entry(client, login_user):
    login_user()

    response = client.post('/api/word-bank/9999/review', json={'knew_it': True})

    assert response.status_code == 404
    assert response.get_json()['error'] == 'Not found'
