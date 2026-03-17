import re
import os
from app import create_app, db
from app.models.word import Word
from app.models.word_bank import WordBank

app = create_app()
with app.app_context():
    # Check the WordBank table again.
    awl_csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'public', 'AWL', 'AWL.csv')
    
    try:
        with open(awl_csv_path, 'r', encoding='utf-8') as f:
            awlCsvContent = f.read()
    except FileNotFoundError:
        print(f"AWL.csv file not found at: {awl_csv_path}")
        exit(1)
    
    # Parse the AWL CSV content
    # Remove BOM if present
    awlCsvContent = awlCsvContent.replace('\ufeff', '')
    lines = awlCsvContent.split('\n')
    words = []
    
    for line in lines:
        if line.strip():
            # Handle the definitions in quotation marks
            match = re.match(r'^([^,]+),"?([^"]*)"?$', line)
            if match:
                word, definition = match.groups()
                words.append(Word(
                    text=word.strip(),
                    definition=definition.strip(),
                    example_sentence='',  # example sentence information (need to add)
                    part_of_speech='',  #  part-of-speech information (need to add)
                    difficulty_level='intermediate'  # Default difficulty
                ))
    
    # Delete the existing word bank entries first to avoid foreign key constraint errors
    WordBank.query.delete()
    db.session.commit()
    
    # Delete the existing words
    Word.query.delete()
    db.session.commit()
    
    # Add new words
    for word in words:
        db.session.add(word)
    
    db.session.commit()
    print(f'Added {len(words)} AWL words to the database.')
    print('First 10 words:', [w.text for w in Word.query.limit(10).all()])
