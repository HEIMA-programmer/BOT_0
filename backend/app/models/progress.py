from datetime import datetime, timezone
from app import db


class Progress(db.Model):
    __tablename__ = 'progress'

    __table_args__ = (
        db.CheckConstraint(
            "module IN ('vocab', 'listening', 'speaking', 'chat')",
            name='ck_progress_module'
        ),
        db.CheckConstraint(
            'score IS NULL OR score >= 0',
            name='ck_progress_score'
        ),
        db.CheckConstraint(
            'time_spent IS NULL OR time_spent >= 0',
            name='ck_progress_time_spent'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    module = db.Column(db.String(50), nullable=False)
    activity_type = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Float, nullable=True)
    time_spent = db.Column(db.Integer, nullable=True)
    completed_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )

    user = db.relationship('User', back_populates='progress_records')
