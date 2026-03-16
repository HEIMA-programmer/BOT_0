from datetime import datetime, timezone
from app import db


class WordBank(db.Model):
    __tablename__ = 'word_bank'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    word_id = db.Column(db.Integer, db.ForeignKey('words.id'), nullable=False)
    added_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    mastery_level = db.Column(db.Integer, default=0)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'word_id', name='unique_user_word'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'word_id': self.word_id,
            'text': self.word.text if self.word else None,
            'definition': self.word.definition if self.word else None,
            'added_at': self.added_at.isoformat() if self.added_at else None,
            'mastery_level': self.mastery_level
        }
