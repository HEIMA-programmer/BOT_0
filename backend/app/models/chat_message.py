from datetime import datetime, timezone
from app import db


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    __table_args__ = (
        db.CheckConstraint(
            "role IN ('user', 'assistant')",
            name='ck_chat_messages_role'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(
        db.Integer,
        db.ForeignKey('chat_sessions.id', ondelete='CASCADE'),
        nullable=False
    )
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )

    session = db.relationship('ChatSession', back_populates='messages')
