from datetime import datetime, timezone

from app import db


class ListeningAttempt(db.Model):
    __tablename__ = 'listening_attempts'

    __table_args__ = (
        db.UniqueConstraint(
            'user_id',
            'level_id',
            'scenario_id',
            'source_slug',
            name='uq_listening_attempt_user_activity',
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
    )
    level_id = db.Column(db.String(20), nullable=False)
    scenario_id = db.Column(db.String(50), nullable=False)
    source_slug = db.Column(db.String(200), nullable=False)
    answers_json = db.Column(db.Text, nullable=False)
    results_json = db.Column(db.Text, nullable=False)
    transcript = db.Column(db.Text, nullable=False)
    score = db.Column(db.Float, nullable=False)
    correct_count = db.Column(db.Integer, nullable=False)
    total_count = db.Column(db.Integer, nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP'),
    )

    user = db.relationship('User', backref='listening_attempts')

    def to_dict(self):
        import json

        return {
            'id': self.id,
            'level_id': self.level_id,
            'scenario_id': self.scenario_id,
            'source_slug': self.source_slug,
            'answers': json.loads(self.answers_json),
            'results': json.loads(self.results_json),
            'transcript': self.transcript,
            'score': self.score,
            'correct_count': self.correct_count,
            'total_count': self.total_count,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
