from datetime import datetime, timezone
from app import db


class ChatSession(db.Model):
    __tablename__ = 'chat_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    scenario_type = db.Column(db.String(50), nullable=False)
    started_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )
    ended_at = db.Column(db.DateTime(timezone=True), nullable=True)
    report = db.Column(db.Text, nullable=True)

    user = db.relationship('User', back_populates='chat_sessions')
    messages = db.relationship(
        'ChatMessage',
        back_populates='session',
        cascade='all, delete-orphan',
        passive_deletes=True,
        lazy=True
    )
