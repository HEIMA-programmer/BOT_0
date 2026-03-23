import os
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from app import db
from app.models.forum_post import ForumPost
from app.models.forum_comment import ForumComment
from app.models.forum_forward import ForumForward

forum_bp = Blueprint('forum', __name__, url_prefix='/api/forum')

VALID_TAGS = ('skills', 'experience', 'academic_culture', 'public')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'webm', 'mov'}


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _upload_dir():
    upload_dir = os.path.join(current_app.instance_path, 'uploads', 'forum')
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


# ── Posts ────────────────────────────────────────────────────────────

@forum_bp.route('/posts', methods=['GET'])
@login_required
def get_posts():
    """Get posts, optionally filtered by tag or user."""
    tag = request.args.get('tag')
    user_id = request.args.get('user_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = ForumPost.query
    if tag and tag in VALID_TAGS:
        query = query.filter_by(tag=tag)
    if user_id:
        query = query.filter_by(user_id=user_id)
    query = query.order_by(ForumPost.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    posts = [p.to_dict() for p in pagination.items]

    return jsonify({
        'posts': posts,
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    }), 200


@forum_bp.route('/posts/<int:post_id>', methods=['GET'])
@login_required
def get_post(post_id):
    """Get a single post with comments."""
    post = ForumPost.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    return jsonify(post.to_dict(include_comments=True)), 200


@forum_bp.route('/posts', methods=['POST'])
@login_required
def create_post():
    """Create a new post. Accepts multipart/form-data for file upload."""
    if request.content_type and 'multipart/form-data' in request.content_type:
        tag = request.form.get('tag')
        title = request.form.get('title', '').strip()
        content = request.form.get('content', '').strip()
        video_url = request.form.get('video_url', '').strip() or None
    else:
        data = request.get_json() or {}
        tag = data.get('tag')
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        video_url = data.get('video_url', '').strip() or None

    if not tag or tag not in VALID_TAGS:
        return jsonify({'error': f'tag must be one of: {", ".join(VALID_TAGS)}'}), 400
    if not title:
        return jsonify({'error': 'title is required'}), 400
    if not content:
        return jsonify({'error': 'content is required'}), 400

    file_url = None
    file_name = None
    if 'file' in request.files:
        file = request.files['file']
        if file.filename and _allowed_file(file.filename):
            original_name = secure_filename(file.filename)
            unique_name = f"{uuid.uuid4().hex}_{original_name}"
            file.save(os.path.join(_upload_dir(), unique_name))
            file_url = f'/api/forum/uploads/{unique_name}'
            file_name = original_name

    post = ForumPost(
        user_id=current_user.id,
        tag=tag,
        title=title,
        content=content,
        file_url=file_url,
        file_name=file_name,
        video_url=video_url,
    )
    db.session.add(post)
    db.session.commit()
    return jsonify(post.to_dict()), 201


@forum_bp.route('/posts/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    post = ForumPost.query.filter_by(id=post_id, user_id=current_user.id).first()
    if not post:
        return jsonify({'error': 'Not found or not authorised'}), 404
    db.session.delete(post)
    db.session.commit()
    return jsonify({'message': 'Post deleted'}), 200


# ── Comments ─────────────────────────────────────────────────────────

@forum_bp.route('/posts/<int:post_id>/comments', methods=['POST'])
@login_required
def add_comment(post_id):
    post = ForumPost.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    data = request.get_json() or {}
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'content is required'}), 400

    comment = ForumComment(post_id=post_id, user_id=current_user.id, content=content)
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment.to_dict()), 201


@forum_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@login_required
def delete_comment(comment_id):
    comment = ForumComment.query.filter_by(id=comment_id, user_id=current_user.id).first()
    if not comment:
        return jsonify({'error': 'Not found or not authorised'}), 404
    db.session.delete(comment)
    db.session.commit()
    return jsonify({'message': 'Comment deleted'}), 200


# ── Forwards (repost) ───────────────────────────────────────────────

@forum_bp.route('/posts/<int:post_id>/forward', methods=['POST'])
@login_required
def forward_post(post_id):
    """Forward (repost) someone else's post to your own timeline."""
    post = ForumPost.query.get(post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    existing = ForumForward.query.filter_by(
        user_id=current_user.id, original_post_id=post_id
    ).first()
    if existing:
        return jsonify({'error': 'Already forwarded'}), 409

    data = request.get_json() or {}
    comment = data.get('comment', '').strip() or None

    forward = ForumForward(
        user_id=current_user.id, original_post_id=post_id, comment=comment
    )
    db.session.add(forward)
    db.session.commit()
    return jsonify(forward.to_dict()), 201


@forum_bp.route('/my-posts', methods=['GET'])
@login_required
def my_posts():
    """Get current user's posts and forwards combined, sorted by date."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    # User's own posts
    posts = ForumPost.query.filter_by(user_id=current_user.id)\
        .order_by(ForumPost.created_at.desc()).all()
    # User's forwards
    forwards = ForumForward.query.filter_by(user_id=current_user.id)\
        .order_by(ForumForward.created_at.desc()).all()

    items = []
    for p in posts:
        d = p.to_dict()
        d['type'] = 'post'
        items.append(d)
    for f in forwards:
        d = f.to_dict()
        d['type'] = 'forward'
        items.append(d)

    items.sort(key=lambda x: x['created_at'] or '', reverse=True)

    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page
    return jsonify({
        'items': items[start:end],
        'total': total,
        'page': page,
    }), 200


# ── File serving ─────────────────────────────────────────────────────

@forum_bp.route('/uploads/<path:filename>', methods=['GET'])
@login_required
def serve_upload(filename):
    from flask import send_from_directory, make_response
    response = make_response(send_from_directory(_upload_dir(), filename))
    # Cache uploaded files for 7 days — they are immutable (UUID-named)
    response.headers['Cache-Control'] = 'public, max-age=604800, immutable'
    return response
