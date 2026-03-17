from datetime import datetime, timezone
from app import db


class ReviewHistory(db.Model):
    __tablename__ = 'review_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    word_bank_entry_id = db.Column(
        db.Integer,
        db.ForeignKey('word_bank.id', ondelete='CASCADE'),
        nullable=False
    )
    review_date = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )
    knew_it = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    user = db.relationship('User', backref='review_history')
    word_bank_entry = db.relationship('WordBank', backref='review_history')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'word_bank_entry_id': self.word_bank_entry_id,
            'review_date': self.review_date.isoformat() if self.review_date else None,
            'knew_it': self.knew_it
        }
