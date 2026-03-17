from app import create_app, db
from app.models.word import Word

app = create_app()
with app.app_context():
    words = Word.query.all()
    print('Number of words in database:', len(words))
    print('Word IDs:', [w.id for w in words])
    print('Word texts:', [w.text for w in words])
