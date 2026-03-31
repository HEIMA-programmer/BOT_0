from datetime import datetime, timezone
from app import db


class RoomRecord(db.Model):
    __tablename__ = 'room_records'

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(
        db.Integer,
        db.ForeignKey('rooms.id', ondelete='SET NULL'),
        nullable=True
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    room_name = db.Column(db.String(80), nullable=False)   # snapshot of name at session time
    room_type = db.Column(db.String(20), nullable=False)
    summary = db.Column(db.String(255), nullable=True)     # e.g. "Won · 5 rounds · 1st place"
    duration_secs = db.Column(db.Integer, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text('CURRENT_TIMESTAMP')
    )

    user = db.relationship('User', foreign_keys=[user_id])
    room = db.relationship('Room', foreign_keys=[room_id])

    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'room_name': self.room_name,
            'room_type': self.room_type,
            'summary': self.summary,
            'duration_secs': self.duration_secs,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
