from app import create_app, db
from app.models.word_bank import WordBank
from app.models.user import User

app = create_app()
with app.app_context():
    # Check the user table
    users = User.query.all()
    print('Number of users:', len(users))
    for user in users:
        print(f'User: {user.id}, {user.username}, {user.email}')
    
    # check the WordBank table
    word_bank_entries = WordBank.query.all()
    print('\nNumber of word bank entries:', len(word_bank_entries))
    for entry in word_bank_entries:
        print(f'WordBank entry: {entry.id}, user_id: {entry.user_id}, word_id: {entry.word_id}, text: {entry.word.text if entry.word else None}')
    
    # Delete invalid WordBank entries (where word_id does not exist)
    invalid_entries = WordBank.query.filter(~WordBank.word_id.in_([1, 2, 3, 4, 5, 6, 7, 8])).all()
    print(f'\nDeleting {len(invalid_entries)} invalid word bank entries...')
    for entry in invalid_entries:
        print(f'Deleting entry: {entry.id}, word_id: {entry.word_id}')
        db.session.delete(entry)
    db.session.commit()
    
    # Check the WordBank table again.
    word_bank_entries = WordBank.query.all()
    print('\nNumber of word bank entries after cleanup:', len(word_bank_entries))
    for entry in word_bank_entries:
        print(f'WordBank entry: {entry.id}, user_id: {entry.user_id}, word_id: {entry.word_id}, text: {entry.word.text if entry.word else None}')



