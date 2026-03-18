from datetime import datetime, timezone
from app import db


class Word(db.Model):
    __tablename__ = 'words'

    __table_args__ = (
        db.CheckConstraint(
            "difficulty_level IN ('beginner', 'intermediate', 'advanced')",
            name='ck_words_difficulty_level'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(100), nullable=False)
    definition = db.Column(db.Text, nullable=False)
    example_sentence = db.Column(db.Text, nullable=True)
    part_of_speech = db.Column(db.String(20), nullable=True)
    difficulty_level = db.Column(
        db.String(20),
        nullable=False,
        default='intermediate',
        server_default=db.text("'intermediate'")
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )

    word_bank_entries = db.relationship(
        'WordBank',
        back_populates='word',
        cascade='all, delete-orphan',
        passive_deletes=True,
        lazy=True
    )
    user_word_progress = db.relationship(
        'UserWordProgress',
        back_populates='word',
        cascade='all, delete-orphan',
        passive_deletes=True,
        lazy=True
    )

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
