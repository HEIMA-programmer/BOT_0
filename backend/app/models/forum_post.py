from datetime import datetime, timezone
from app import db


class ForumPost(db.Model):
    __tablename__ = 'forum_posts'

    STATUS_UNDER_REVIEW = 'UNDER_REVIEW'
    STATUS_PUBLISHED = 'PUBLISHED'
    STATUS_REJECTED = 'REJECTED'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    zone = db.Column(
        db.String(10), nullable=False, default='public',
        server_default=db.text("'public'"),
    )  # public, friend
    tag = db.Column(db.String(30), nullable=False)  # user-defined tags
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    file_url = db.Column(db.String(500), nullable=True)
    file_name = db.Column(db.String(200), nullable=True)
    video_url = db.Column(db.String(500), nullable=True)
    status = db.Column(
        db.String(20),
        nullable=False,
        default=STATUS_UNDER_REVIEW,
        server_default=db.text("'UNDER_REVIEW'")
    )
    is_pinned = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text('0'))
    rejection_reason = db.Column(db.String(120), nullable=True)
    review_note = db.Column(db.String(255), nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship(
        'User',
        foreign_keys=[user_id],
        backref=db.backref('forum_posts', lazy=True)
    )
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])
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
    friend_pins = db.relationship(
        'ForumPostPin',
        back_populates='post',
        cascade='all, delete-orphan',
        lazy=True,
    )

    def to_dict(self, include_comments=False):
        d = {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'zone': self.zone,
            'tag': self.tag,
            'title': self.title,
            'content': self.content,
            'file_url': self.file_url,
            'file_name': self.file_name,
            'video_url': self.video_url,
            'status': self.status,
            'is_pinned': bool(self.is_pinned),
            'rejection_reason': self.rejection_reason,
            'review_note': self.review_note,
            'reviewed_by': self.reviewed_by,
            'reviewed_by_username': self.reviewer.username if self.reviewer else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'comment_count': len(self.comments),
            'forward_count': len(self.forwards),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_comments:
            d['comments'] = [c.to_dict() for c in self.comments]
        return d
