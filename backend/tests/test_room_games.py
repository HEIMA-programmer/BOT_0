from app import db
from app.models.word import Word
from app.routes.room import generate_game_questions


def clear_words():
    Word.query.delete()
    db.session.commit()


def test_generate_context_guesser_questions_uses_progressive_awl_blanks(app):
    with app.app_context():
        questions = generate_game_questions('context_guesser', 10)

    assert len(questions) == 10

    blank_counts = [question['sentence'].count('_____') for question in questions]

    assert blank_counts == sorted(blank_counts)
    assert blank_counts[0] in (1, 2)
    assert blank_counts[-1] >= 4

    for question in questions:
        assert question['spoken_text']
        assert question['blank_count'] == len(question['answers'])
        assert question['blank_count'] == question['sentence'].count('_____')
        assert question['blank_lengths'] == [max(5, len(answer)) for answer in question['answers']]


def test_generate_word_duel_questions_preserves_definition_answer_shape(app, create_word):
    with app.app_context():
        clear_words()
        create_word(text='analysis', definition='A detailed investigation.')
        create_word(text='approach', definition='A way of doing something.')

        questions = generate_game_questions('word_duel', 2)

    assert len(questions) == 2
    assert all('question' in question for question in questions)
    assert all('answer' in question for question in questions)
    assert all('sentence' not in question for question in questions)
