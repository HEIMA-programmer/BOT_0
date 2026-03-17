from datetime import datetime, timezone
from app import db


class ListeningClip(db.Model):
    __tablename__ = 'listening_clips'

    __table_args__ = (
        db.CheckConstraint(
            "difficulty_level IN ('beginner', 'intermediate', 'advanced')",
            name='ck_listening_clips_difficulty_level'
        ),
        db.CheckConstraint(
            'duration IS NULL OR duration >= 0',
            name='ck_listening_clips_duration'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    audio_url = db.Column(db.String(500), nullable=False)
    transcript = db.Column(db.Text, nullable=False)
    difficulty_level = db.Column(
        db.String(20),
        nullable=False,
        default='beginner',
        server_default=db.text("'beginner'")
    )
    duration = db.Column(db.Integer, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'audio_url': self.audio_url,
            'transcript': self.transcript,
            'difficulty_level': self.difficulty_level,
            'duration': self.duration,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
