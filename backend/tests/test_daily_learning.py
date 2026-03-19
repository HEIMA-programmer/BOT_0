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


def test_get_today_does_not_refill_same_day_after_carryover_is_completed(
    client,
    login_user,
    create_word,
):
    login_user()
    old_word_one = create_word(text='carryover-1')
    old_word_two = create_word(text='carryover-2')
    create_word(text='new-1')
    create_word(text='new-2')

    yesterday = date.today() - timedelta(days=1)
    first_progress = UserWordProgress(
        user_id=1,
        word_id=old_word_one.id,
        status='pending',
        assigned_date=yesterday,
    )
    second_progress = UserWordProgress(
        user_id=1,
        word_id=old_word_two.id,
        status='pending',
        assigned_date=yesterday,
    )
    db.session.add(first_progress)
    db.session.add(second_progress)
    db.session.commit()

    first_response = client.get('/api/daily-learning/today?count=2')
    assert first_response.status_code == 200
    assert {word['text'] for word in first_response.get_json()['words']} == {
        'carryover-1',
        'carryover-2',
    }

    client.post('/api/daily-learning/word-status', json={'progress_id': first_progress.id, 'status': 'review'})
    client.post('/api/daily-learning/word-status', json={'progress_id': second_progress.id, 'status': 'review'})

    second_response = client.get('/api/daily-learning/today?count=2')
    assert second_response.status_code == 200
    assert second_response.get_json()['words'] == []


def test_get_today_hides_excess_pending_words_when_daily_limit_is_reduced(
    client,
    login_user,
    create_word,
):
    login_user()

    created_words = [create_word(text=f'word-{index}') for index in range(20)]

    first_response = client.get('/api/daily-learning/today?count=10')
    assert first_response.status_code == 200
    first_batch = first_response.get_json()['words']
    assert len(first_batch) == 10

    for progress in first_batch:
        client.post('/api/daily-learning/word-status', json={'progress_id': progress['id'], 'status': 'review'})

    second_response = client.get('/api/daily-learning/today?count=20')
    assert second_response.status_code == 200
    second_batch = second_response.get_json()['words']
    assert len(second_batch) == 10
    assert {word['word_id'] for word in second_batch} == {word.id for word in created_words[10:20]}

    third_response = client.get('/api/daily-learning/today?count=10')
    assert third_response.status_code == 200
    third_data = third_response.get_json()
    assert third_data['words'] == []
    assert third_data['pending_count'] == 0


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


def test_get_all_words_search_only_matches_word_text(client, login_user, create_word):
    login_user()
    create_word(text='abacus', definition='A counting frame.')
    create_word(text='zebra', definition='Contains character c in definition.')

    response = client.get('/api/daily-learning/all-words?search=c')

    assert response.status_code == 200
    data = response.get_json()
    assert {word['text'] for word in data['words']} == {'abacus'}


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
