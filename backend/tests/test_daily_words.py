from app import db
from app.models.word import Word


def clear_words():
    Word.query.delete()
    db.session.commit()


def test_daily_words_returns_empty_list_when_no_words(client):
    clear_words()

    response = client.get('/api/daily-words')

    assert response.status_code == 200
    data = response.get_json()
    assert data['words'] == []
    assert 'date' in data


def test_daily_words_returns_available_words_when_less_than_five_exist(client, create_word):
    clear_words()
    create_word(text='hypothesis')
    create_word(text='methodology')
    create_word(text='empirical')

    response = client.get('/api/daily-words?date=2026-03-18')

    assert response.status_code == 200
    data = response.get_json()
    assert len(data['words']) == 3
    assert {word['text'] for word in data['words']} == {
        'hypothesis',
        'methodology',
        'empirical',
    }


def test_daily_words_returns_between_five_and_eight_words(client, create_word):
    clear_words()
    for i in range(10):
        create_word(text=f'word-{i}', definition=f'definition-{i}')

    response = client.get('/api/daily-words?date=2026-03-18')

    assert response.status_code == 200
    data = response.get_json()
    assert 5 <= len(data['words']) <= 8


def test_daily_words_returns_consistent_selection_for_same_date(client, create_word):
    clear_words()
    for i in range(10):
        create_word(text=f'word-{i}', definition=f'definition-{i}')

    first_response = client.get('/api/daily-words?date=2026-03-18')
    second_response = client.get('/api/daily-words?date=2026-03-18')

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.get_json()['words'] == second_response.get_json()['words']


def test_daily_words_includes_expected_word_fields(client, create_word):
    clear_words()
    create_word(
        text='synthesize',
        definition='Combine into a whole.',
        example_sentence='Students synthesize different sources.',
        part_of_speech='verb',
        difficulty_level='advanced',
    )

    response = client.get('/api/daily-words')

    assert response.status_code == 200
    word = response.get_json()['words'][0]
    assert word['text'] == 'synthesize'
    assert word['definition'] == 'Combine into a whole.'
    assert word['example_sentence'] == 'Students synthesize different sources.'
    assert word['part_of_speech'] == 'verb'
    assert word['difficulty_level'] == 'advanced'
    assert word['audio_available'] is True
