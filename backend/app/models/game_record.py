from datetime import datetime, timezone
from app import db


class GameRecord(db.Model):
    __tablename__ = 'game_records'

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(
        db.Integer, db.ForeignKey('rooms.id', ondelete='SET NULL'), nullable=True
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    game_type = db.Column(db.String(30), nullable=False)
    score = db.Column(db.Integer, nullable=False, default=0)
    total_rounds = db.Column(db.Integer, nullable=False, default=0)
    placement = db.Column(db.Integer, nullable=True)
    rounds_data = db.Column(db.Text, nullable=True)  # JSON string
    duration_secs = db.Column(db.Integer, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship('User', backref=db.backref('game_records', lazy=True))
    room = db.relationship('Room', backref=db.backref('game_records', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'room_id': self.room_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'game_type': self.game_type,
            'score': self.score,
            'total_rounds': self.total_rounds,
            'placement': self.placement,
            'rounds_data': self.rounds_data,
            'duration_secs': self.duration_secs,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
