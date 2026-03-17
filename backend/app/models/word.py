from datetime import datetime, timezone
from app import db


class Word(db.Model):
    __tablename__ = 'words'

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(100), nullable=False)
    definition = db.Column(db.Text, nullable=False)
    example_sentence = db.Column(db.Text, nullable=True)
    part_of_speech = db.Column(db.String(20), nullable=True)
    difficulty_level = db.Column(db.String(20), default='intermediate')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    word_bank_entries = db.relationship('WordBank', backref='word', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'definition': self.definition,
            'example_sentence': self.example_sentence,
            'part_of_speech': self.part_of_speech,
            'difficulty_level': self.difficulty_level,
            'audio_available': True
        }
