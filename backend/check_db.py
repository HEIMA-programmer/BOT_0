from app import create_app, db
from app.models.user import User

app = create_app()
with app.app_context():
    # Check the user table
    users = User.query.all()
    print('Number of users:', len(users))
    for user in users:
        print(f'User: {user.id}, {user.username}, {user.email}')
    
    # Check if WordBank table exists
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print('\nDatabase tables:', tables)
    
    # Check WordBank table columns if it exists
    if 'word_bank' in tables:
        columns = inspector.get_columns('word_bank')
        print('\nWordBank table columns:')
        for column in columns:
            print(f'  {column["name"]} ({column["type"]})')



