from datetime import datetime, timezone
from app import db


class FriendRequest(db.Model):
    __tablename__ = 'friend_requests'

    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    receiver_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    status = db.Column(
        db.String(20), nullable=False,
        default=STATUS_PENDING, server_default=db.text("'pending'")
    )
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        db.UniqueConstraint('sender_id', 'receiver_id', name='uq_friend_request'),
    )

    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_friend_requests', lazy=True))
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref=db.backref('received_friend_requests', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_username': self.sender.username if self.sender else None,
            'sender_email': self.sender.email if self.sender else None,
            'receiver_id': self.receiver_id,
            'receiver_username': self.receiver.username if self.receiver else None,
            'receiver_email': self.receiver.email if self.receiver else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
