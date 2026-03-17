"""Seed the development database with test data."""

from app import create_app, db
from app.models.user import User
from app.models.word import Word


SEED_WORDS = [
    {
        'text': 'hypothesis',
        'definition': 'A supposition or proposed explanation made on the basis of limited evidence as a starting point for further investigation.',
        'example_sentence': 'The researcher proposed a new hypothesis about climate change.',
        'part_of_speech': 'noun',
        'difficulty_level': 'intermediate',
    },
    {
        'text': 'methodology',
        'definition': 'A system of methods used in a particular area of study or activity.',
        'example_sentence': 'The paper outlines the methodology used for data collection.',
        'part_of_speech': 'noun',
        'difficulty_level': 'intermediate',
    },
    {
        'text': 'empirical',
        'definition': 'Based on, concerned with, or verifiable by observation or experience rather than theory.',
        'example_sentence': 'The study provides empirical evidence supporting the theory.',
        'part_of_speech': 'adjective',
        'difficulty_level': 'advanced',
    },
    {
        'text': 'paradigm',
        'definition': 'A typical example or pattern of something; a model.',
        'example_sentence': 'This discovery led to a paradigm shift in the field of physics.',
        'part_of_speech': 'noun',
        'difficulty_level': 'advanced',
    },
    {
        'text': 'synthesize',
        'definition': 'To combine a number of things into a coherent whole.',
        'example_sentence': 'The literature review aims to synthesize existing research on the topic.',
        'part_of_speech': 'verb',
        'difficulty_level': 'intermediate',
    },
    {
        'text': 'pedagogy',
        'definition': 'The method and practice of teaching, especially as an academic subject or theoretical concept.',
        'example_sentence': 'Modern pedagogy emphasizes student-centered learning approaches.',
        'part_of_speech': 'noun',
        'difficulty_level': 'advanced',
    },
    {
        'text': 'analyze',
        'definition': 'Examine something methodically and in detail, typically in order to explain and interpret it.',
        'example_sentence': 'We need to analyze the data before drawing any conclusions.',
        'part_of_speech': 'verb',
        'difficulty_level': 'beginner',
    },
    {
        'text': 'abstract',
        'definition': 'A summary of the contents of a book, article, or formal speech.',
        'example_sentence': 'Please read the abstract before the full paper.',
        'part_of_speech': 'noun',
        'difficulty_level': 'beginner',
    },
    {
        'text': 'citation',
        'definition': 'A quotation from or reference to a book, paper, or author.',
        'example_sentence': 'Proper citation is essential to avoid plagiarism in academic writing.',
        'part_of_speech': 'noun',
        'difficulty_level': 'beginner',
    },
    {
        'text': 'discourse',
        'definition': 'Written or spoken communication or debate on a particular topic.',
        'example_sentence': 'Academic discourse requires precise language and logical argumentation.',
        'part_of_speech': 'noun',
        'difficulty_level': 'intermediate',
    },
    {
        'text': 'extrapolate',
        'definition': 'Extend the application of a method or conclusion to an unknown situation by assuming existing trends will continue.',
        'example_sentence': 'We can extrapolate future trends from the current data.',
        'part_of_speech': 'verb',
        'difficulty_level': 'advanced',
    },
    {
        'text': 'qualitative',
        'definition': 'Relating to, measuring, or measured by the quality of something rather than its quantity.',
        'example_sentence': 'The study used qualitative methods such as interviews and focus groups.',
        'part_of_speech': 'adjective',
        'difficulty_level': 'intermediate',
    },
    {
        'text': 'quantitative',
        'definition': 'Relating to, measuring, or measured by the quantity of something rather than its quality.',
        'example_sentence': 'Quantitative analysis of the survey results revealed significant trends.',
        'part_of_speech': 'adjective',
        'difficulty_level': 'intermediate',
    },
    {
        'text': 'thesis',
        'definition': 'A statement or theory that is put forward as a premise to be maintained or proved.',
        'example_sentence': 'Her thesis argues that social media has fundamentally changed political communication.',
        'part_of_speech': 'noun',
        'difficulty_level': 'beginner',
    },
    {
        'text': 'corroborate',
        'definition': 'Confirm or give support to a statement, theory, or finding.',
        'example_sentence': 'The new findings corroborate the results of earlier studies.',
        'part_of_speech': 'verb',
        'difficulty_level': 'advanced',
    },
]


def seed():
    app = create_app()
    with app.app_context():
        # Seed test user
        if not User.query.filter_by(email='test@example.com').first():
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            print('Created test user: test@example.com / password123')
        else:
            print('Test user already exists, skipping.')

        # Seed words
        existing_count = Word.query.count()
        if existing_count == 0:
            for w in SEED_WORDS:
                db.session.add(Word(**w))
            print(f'Seeded {len(SEED_WORDS)} academic words.')
        else:
            print(f'{existing_count} words already exist, skipping.')

        db.session.commit()
        print('Done.')


if __name__ == '__main__':
    seed()
