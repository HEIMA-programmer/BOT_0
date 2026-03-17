
from app import create_app, db

app = create_app()

with app.app_context():
    try:
        print('Checking and fixing database...')
        
        # Check if we can add last_reviewed column
        with db.engine.connect() as conn:
            result = conn.execute(db.text("PRAGMA table_info(word_bank)"))
            columns = [row[1] for row in result]
            print('Current columns:', columns)
            
            if 'last_reviewed' not in columns:
                print('Adding last_reviewed column...')
                conn.execute(db.text('ALTER TABLE word_bank ADD COLUMN last_reviewed DATETIME'))
                conn.commit()
                print('last_reviewed column added successfully!')
            else:
                print('last_reviewed column already exists')
        
        print('\nDatabase fix complete!')
    except Exception as e:
        print(f'Error: {e}')
