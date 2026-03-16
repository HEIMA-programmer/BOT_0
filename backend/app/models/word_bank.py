from datetime import datetime, timezone
from app import db


class WordBank(db.Model):
    __tablename__ = 'word_bank'

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
    added_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )
    mastery_level = db.Column(
        db.Integer,
        nullable=False,
        default=0,
        server_default=db.text('0')
    )

    __table_args__ = (
        db.UniqueConstraint('user_id', 'word_id', name='unique_user_word'),
        db.CheckConstraint(
            'mastery_level >= 0 AND mastery_level <= 3',
            name='ck_word_bank_mastery_level'
        ),
    )

    user = db.relationship('User', back_populates='word_bank')
    word = db.relationship('Word', back_populates='word_bank_entries')

    def to_dict(self):
        return {
            'id': self.id,
            'word_id': self.word_id,
            'text': self.word.text if self.word else None,
            'definition': self.word.definition if self.word else None,
            'added_at': self.added_at.isoformat() if self.added_at else None,
            'mastery_level': self.mastery_level
        }
