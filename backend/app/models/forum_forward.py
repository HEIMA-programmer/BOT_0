from datetime import datetime, timezone
from app import db


class ForumForward(db.Model):
    __tablename__ = 'forum_forwards'

    VALID_ZONES = ('public', 'friend')

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    original_post_id = db.Column(
        db.Integer, db.ForeignKey('forum_posts.id', ondelete='CASCADE'), nullable=False
    )
    zone = db.Column(db.String(10), nullable=False, default='public', server_default=db.text("'public'"))
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship('User', backref=db.backref('forum_forwards', lazy=True))
    post = db.relationship('ForumPost', back_populates='forwards', foreign_keys=[original_post_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'original_post_id': self.original_post_id,
            'zone': self.zone,
            'original_post': self.post.to_dict() if self.post else None,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
