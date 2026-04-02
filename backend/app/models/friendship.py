from datetime import datetime, timezone
from app import db


class Friendship(db.Model):
    __tablename__ = 'friendships'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    friend_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        db.UniqueConstraint('user_id', 'friend_id', name='uq_friendship'),
    )

    friend = db.relationship('User', foreign_keys=[friend_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'friend_id': self.friend_id,
            'friend_username': self.friend.username if self.friend else None,
            'friend_email': self.friend.email if self.friend else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
