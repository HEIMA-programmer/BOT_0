from datetime import datetime, timezone, date as date_type
from app import db


class UserWordProgress(db.Model):
    __tablename__ = 'user_word_progress'

    __table_args__ = (
        db.UniqueConstraint('user_id', 'word_id', name='unique_user_word_progress'),
        db.CheckConstraint(
            "status IN ('pending', 'review', 'mastered')",
            name='ck_user_word_progress_status'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    word_id = db.Column(
        db.Integer,
        db.ForeignKey('words.id', ondelete='CASCADE'),
        nullable=False
    )
    status = db.Column(
        db.String(20),
        nullable=False,
        default='pending',
        server_default=db.text("'pending'")
    )
    assigned_date = db.Column(
        db.Date,
        nullable=False,
        default=lambda: date_type.today()
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship('User', back_populates='word_progress')
    word = db.relationship('Word', back_populates='user_word_progress')

    def to_dict(self):
        return {
            'id': self.id,
            'word_id': self.word_id,
            'text': self.word.text if self.word else None,
            'definition': self.word.definition if self.word else None,
            'example_sentence': self.word.example_sentence if self.word else None,
            'part_of_speech': self.word.part_of_speech if self.word else None,
            'difficulty_level': self.word.difficulty_level if self.word else None,
            'status': self.status,
            'assigned_date': self.assigned_date.isoformat() if self.assigned_date else None,
        }
