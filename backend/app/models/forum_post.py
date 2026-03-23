from datetime import datetime, timezone
from app import db


class ForumPost(db.Model):
    __tablename__ = 'forum_posts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    tag = db.Column(db.String(20), nullable=False)  # skills, experience, academic_culture, public
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    file_url = db.Column(db.String(500), nullable=True)
    file_name = db.Column(db.String(200), nullable=True)
    video_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship('User', backref=db.backref('forum_posts', lazy=True))
    comments = db.relationship(
        'ForumComment', back_populates='post',
        cascade='all, delete-orphan', lazy=True,
        order_by='ForumComment.created_at'
    )
    forwards = db.relationship(
        'ForumForward', back_populates='post',
        cascade='all, delete-orphan', lazy=True,
        foreign_keys='ForumForward.original_post_id'
    )

    def to_dict(self, include_comments=False):
        d = {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'tag': self.tag,
            'title': self.title,
            'content': self.content,
            'file_url': self.file_url,
            'file_name': self.file_name,
            'video_url': self.video_url,
            'comment_count': len(self.comments),
            'forward_count': len(self.forwards),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_comments:
            d['comments'] = [c.to_dict() for c in self.comments]
        return d
