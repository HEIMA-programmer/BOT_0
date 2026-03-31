from datetime import datetime, timezone
from app import db


class Room(db.Model):
    __tablename__ = 'rooms'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    room_type = db.Column(db.String(20), nullable=False)   # 'game' | 'speaking' | 'watch'
    status = db.Column(db.String(20), nullable=False, default='waiting')  # 'waiting' | 'active' | 'ended'
    visibility = db.Column(db.String(10), nullable=False, default='public')  # 'public' | 'private'
    invite_code = db.Column(db.String(8), unique=True, nullable=False, index=True)
    max_players = db.Column(db.Integer, nullable=False, default=4)
    host_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )
    ended_at = db.Column(db.DateTime(timezone=True), nullable=True)

    host = db.relationship('User', foreign_keys=[host_id])
    members = db.relationship(
        'RoomMember',
        back_populates='room',
        cascade='all, delete-orphan',
        passive_deletes=True,
        lazy=True
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'room_type': self.room_type,
            'status': self.status,
            'visibility': self.visibility,
            'invite_code': self.invite_code,
            'max_players': self.max_players,
            'host_id': self.host_id,
            'host': self.host.username if self.host else None,
            'player_count': len(self.members),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class RoomMember(db.Model):
    __tablename__ = 'room_members'
    __table_args__ = (
        db.UniqueConstraint('room_id', 'user_id', name='uq_room_member'),
    )

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(
        db.Integer,
        db.ForeignKey('rooms.id', ondelete='CASCADE'),
        nullable=False
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    role = db.Column(db.String(10), nullable=False, default='member')  # 'host' | 'member'
    is_ready = db.Column(db.Boolean, nullable=False, default=False)
    joined_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )

    room = db.relationship('Room', back_populates='members')
    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'role': self.role,
            'is_ready': self.is_ready,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
        }
