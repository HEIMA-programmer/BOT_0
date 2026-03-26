from datetime import datetime, timezone
from app import db


class FollowAlongRecord(db.Model):
    __tablename__ = 'follow_along_records'

    __table_args__ = (
        db.CheckConstraint(
            'accuracy_score IS NULL OR (accuracy_score >= 0 AND accuracy_score <= 100)',
            name='ck_follow_along_records_accuracy_score'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    record_type = db.Column(
        db.String(20),
        nullable=False
    )
    target_text = db.Column(db.Text, nullable=False)
    user_transcript = db.Column(db.Text, nullable=True)
    accuracy_score = db.Column(db.Float, nullable=True)
    pronunciation_scores = db.Column(db.JSON, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )

    user = db.relationship('User', back_populates='follow_along_records')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'record_type': self.record_type,
            'target_text': self.target_text,
            'user_transcript': self.user_transcript,
            'accuracy_score': self.accuracy_score,
            'pronunciation_scores': self.pronunciation_scores,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }