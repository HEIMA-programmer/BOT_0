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

    def to_dict(self, include_messages=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'scenario_type': self.scenario_type,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'report': self.report,
        }
        if include_messages:
            data['messages'] = [message.to_dict() for message in self.messages]
        return data
