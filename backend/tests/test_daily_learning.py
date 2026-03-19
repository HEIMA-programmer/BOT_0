from datetime import date, timedelta

from app import db
from app.models.user_word_progress import UserWordProgress
from app.models.word_bank import WordBank


def test_daily_learning_requires_authentication(client):
    response = client.get('/api/daily-learning/today')

    assert response.status_code == 401
    assert response.get_json()['error'] == 'Authentication required'


def test_get_today_assigns_new_pending_words_for_user(client, login_user, create_word):
    login_user()
    for i in range(6):
        create_word(text=f'word-{i}', definition=f'definition-{i}')

    response = client.get('/api/daily-learning/today?count=4')

    assert response.status_code == 200
    data = response.get_json()
    assert data['pending_count'] == 4
    assert len(data['words']) == 4
    assert data['review_count'] == 0
    assert data['mastered_count'] == 0
    assert data['total_words'] == 6


def test_get_today_includes_carryover_and_only_assigns_remaining_slots(
    client,
    login_user,
    create_word,
):
    login_user()
    old_word = create_word(text='carryover')
    new_word_one = create_word(text='new-1')
    new_word_two = create_word(text='new-2')
    create_word(text='new-3')

    db.session.add(
        UserWordProgress(
            user_id=1,
            word_id=old_word.id,
            status='pending',
            assigned_date=date.today() - timedelta(days=1),
        )
    )
    db.session.commit()

    response = client.get('/api/daily-learning/today?count=3')

    assert response.status_code == 200
    data = response.get_json()
    assert data['pending_count'] == 3
    assert {word['text'] for word in data['words']} == {
        'carryover',
        new_word_one.text,
        new_word_two.text,
    }


def test_update_word_status_validates_input(client, login_user):
    login_user()

    response = client.post('/api/daily-learning/word-status', json={'progress_id': None, 'status': 'done'})

    assert response.status_code == 400
    assert response.get_json()['error'] == 'progress_id and valid status required'


def test_update_word_status_updates_existing_progress(client, login_user, create_word):
    login_user()
    word = create_word()
    progress = UserWordProgress(user_id=1, word_id=word.id, status='pending')
    db.session.add(progress)
    db.session.commit()

    response = client.post(
        '/api/daily-learning/word-status',
        json={'progress_id': progress.id, 'status': 'review'},
    )

    assert response.status_code == 200
    assert response.get_json()['status'] == 'review'


def test_get_review_words_returns_review_entries_only(client, login_user, create_word):
    login_user()
    review_word = create_word(text='review-word')
    pending_word = create_word(text='pending-word')
    db.session.add(UserWordProgress(user_id=1, word_id=review_word.id, status='review'))
    db.session.add(UserWordProgress(user_id=1, word_id=pending_word.id, status='pending'))
    db.session.commit()

    response = client.get('/api/daily-learning/review-words')

    assert response.status_code == 200
    data = response.get_json()
    assert data['count'] == 1
    assert data['words'][0]['text'] == 'review-word'


def test_get_mastered_words_returns_mastered_entries_only(client, login_user, create_word):
    login_user()
    mastered_word = create_word(text='mastered-word')
    review_word = create_word(text='review-word')
    db.session.add(UserWordProgress(user_id=1, word_id=mastered_word.id, status='mastered'))
    db.session.add(UserWordProgress(user_id=1, word_id=review_word.id, status='review'))
    db.session.commit()

    response = client.get('/api/daily-learning/mastered-words')

    assert response.status_code == 200
    data = response.get_json()
    assert data['count'] == 1
    assert data['words'][0]['text'] == 'mastered-word'


def test_get_all_words_includes_progress_and_bank_flags(client, login_user, create_word):
    login_user()
    word_one = create_word(text='hypothesis', definition='A proposed explanation.')
    word_two = create_word(text='empirical', definition='Based on observation.')
    db.session.add(UserWordProgress(user_id=1, word_id=word_one.id, status='review'))
    db.session.add(WordBank(user_id=1, word_id=word_two.id))
    db.session.commit()

    response = client.get('/api/daily-learning/all-words?search=iric')

    assert response.status_code == 200
    data = response.get_json()
    assert data['total'] == 1
    assert data['words'][0]['text'] == 'empirical'
    assert data['words'][0]['progress_status'] is None
    assert data['words'][0]['in_word_bank'] is True


def test_get_learning_stats_returns_expected_counts(client, login_user, create_word):
    login_user()
    pending_word = create_word(text='pending-word')
    review_word = create_word(text='review-word')
    mastered_word = create_word(text='mastered-word')
    bank_word = create_word(text='bank-word')

    db.session.add(UserWordProgress(user_id=1, word_id=pending_word.id, status='pending'))
    db.session.add(UserWordProgress(user_id=1, word_id=review_word.id, status='review'))
    db.session.add(UserWordProgress(user_id=1, word_id=mastered_word.id, status='mastered'))
    db.session.add(WordBank(user_id=1, word_id=bank_word.id))
    db.session.commit()

    response = client.get('/api/daily-learning/stats')

    assert response.status_code == 200
    data = response.get_json()
    assert data['pending'] == 1
    assert data['review'] == 1
    assert data['mastered'] == 1
    assert data['total_learned'] == 2
    assert data['word_bank_count'] == 1


def test_mark_mastered_creates_progress_when_missing(client, login_user, create_word):
    login_user()
    word = create_word()

    response = client.post('/api/daily-learning/mark-mastered', json={'word_id': word.id})

    assert response.status_code == 200
    assert response.get_json()['status'] == 'mastered'
    assert UserWordProgress.query.filter_by(word_id=word.id, status='mastered').count() == 1


def test_mark_mastered_rejects_missing_word(client, login_user):
    login_user()

    response = client.post('/api/daily-learning/mark-mastered', json={'word_id': 9999})

    assert response.status_code == 404
    assert response.get_json()['error'] == 'Word not found'


def test_add_to_bank_from_daily_learning_adds_word(client, login_user, create_word):
    login_user()
    word = create_word()

    response = client.post('/api/daily-learning/add-to-bank', json={'word_id': word.id})

    assert response.status_code == 201
    assert response.get_json()['word_id'] == word.id


def test_add_to_bank_from_daily_learning_rejects_duplicate(client, login_user, create_word):
    login_user()
    word = create_word()
    db.session.add(WordBank(user_id=1, word_id=word.id))
    db.session.commit()

    response = client.post('/api/daily-learning/add-to-bank', json={'word_id': word.id})

    assert response.status_code == 409
    assert response.get_json()['error'] == 'Word already in bank'
