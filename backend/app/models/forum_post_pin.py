from datetime import datetime, timezone

from app import db


class ForumPostPin(db.Model):
    __tablename__ = 'forum_post_pins'

    __table_args__ = (
        db.UniqueConstraint('user_id', 'post_id', name='uq_forum_post_pins_user_post'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    post_id = db.Column(
        db.Integer, db.ForeignKey('forum_posts.id', ondelete='CASCADE'), nullable=False
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship('User')
    post = db.relationship('ForumPost', back_populates='friend_pins')
