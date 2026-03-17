from datetime import datetime, timezone
from app import db


class SpeakingSession(db.Model):
    __tablename__ = 'speaking_sessions'

    __table_args__ = (
        db.CheckConstraint(
            'score IS NULL OR score >= 0',
            name='ck_speaking_sessions_score'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    topic = db.Column(db.String(200), nullable=False)
    transcript = db.Column(db.Text, nullable=True)
    ai_feedback = db.Column(db.Text, nullable=True)
    score = db.Column(db.Float, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )

    user = db.relationship('User', back_populates='speaking_sessions')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'topic': self.topic,
            'transcript': self.transcript,
            'ai_feedback': self.ai_feedback,
            'score': self.score,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
