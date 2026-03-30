import os
import uuid
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename

from app import db
from app.models.forum_comment import ForumComment
from app.models.forum_forward import ForumForward
from app.models.forum_post import ForumPost

forum_bp = Blueprint('forum', __name__, url_prefix='/api/forum')

VALID_TAGS = ('skills', 'experience', 'academic_culture', 'public')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'webm', 'mov'}
REJECTION_REASONS = (
    'The post contains inaccurate or misleading information',
    'The post is not relevant to the forum topic',
    'The content needs clearer explanation or more context',
    'The post contains inappropriate or unfriendly language',
    'The attachment or external link does not meet the requirements',
)
VALID_POST_STATUSES = (
    ForumPost.STATUS_PENDING,
    ForumPost.STATUS_APPROVED,
    ForumPost.STATUS_REJECTED,
)


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _upload_dir():
    upload_dir = os.path.join(current_app.instance_path, 'uploads', 'forum')
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def _is_admin():
    return bool(getattr(current_user, 'is_admin', False))


def _require_admin():
    if not _is_admin():
        return jsonify({'error': 'Admin access required'}), 403
    return None


def _can_view_post(post):
    if post.status == ForumPost.STATUS_APPROVED:
        return True
    if _is_admin():
        return True
    return post.user_id == current_user.id


def _get_visible_post_or_404(post_id):
    post = db.session.get(ForumPost, post_id)
    if not post or not _can_view_post(post):
        return None, (jsonify({'error': 'Post not found'}), 404)
    return post, None


def _serialise_post(post, include_comments=False):
    data = post.to_dict(include_comments=include_comments)
    data['can_delete'] = _is_admin() or post.user_id == current_user.id
    # Intentional policy: admins can edit their own posts at any status, while
    # regular users can only revise their own rejected posts for resubmission.
    data['can_edit'] = (_is_admin() and post.user_id == current_user.id) or (
        not _is_admin() and post.user_id == current_user.id and post.status == ForumPost.STATUS_REJECTED
    )
    data['can_forward'] = post.status == ForumPost.STATUS_APPROVED
    data['can_pin'] = _is_admin() and post.status == ForumPost.STATUS_APPROVED
    data['can_review'] = _is_admin() and post.status == ForumPost.STATUS_PENDING
    return data


def _touch_post(post):
    post.updated_at = datetime.now(timezone.utc)


def _post_query_for_current_user():
    if _is_admin():
        return ForumPost.query
    return ForumPost.query.filter_by(status=ForumPost.STATUS_APPROVED)


# ── Posts ────────────────────────────────────────────────────────────

@forum_bp.route('/posts', methods=['GET'])
@login_required
def get_posts():
    """Get forum posts visible to the current user."""
    tag = request.args.get('tag')
    user_id = request.args.get('user_id', type=int)
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = _post_query_for_current_user()
    if tag and tag in VALID_TAGS:
        query = query.filter_by(tag=tag)
    if user_id:
        query = query.filter_by(user_id=user_id)
    if _is_admin() and status in VALID_POST_STATUSES:
        query = query.filter_by(status=status)

    query = query.order_by(ForumPost.is_pinned.desc(), ForumPost.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'posts': [_serialise_post(p) for p in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    }), 200


@forum_bp.route('/posts/<int:post_id>', methods=['GET'])
@login_required
def get_post(post_id):
    """Get a single post with comments."""
    post, error = _get_visible_post_or_404(post_id)
    if error:
        return error
    return jsonify(_serialise_post(post, include_comments=True)), 200


@forum_bp.route('/posts', methods=['POST'])
@login_required
def create_post():
    """Create a new post. Normal users' posts require admin approval."""
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
        status=ForumPost.STATUS_APPROVED if _is_admin() else ForumPost.STATUS_PENDING,
        reviewed_by=current_user.id if _is_admin() else None,
        reviewed_at=datetime.now(timezone.utc) if _is_admin() else None,
    )
    _touch_post(post)
    db.session.add(post)
    db.session.commit()

    return jsonify({
        'post': _serialise_post(post),
        'message': 'Post published' if _is_admin() else 'Post submitted for review',
    }), 201


@forum_bp.route('/posts/<int:post_id>', methods=['PATCH'])
@login_required
def update_post(post_id):
    """Admins can edit their own posts; rejected user posts can be edited and resubmitted."""
    post = db.session.get(ForumPost, post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    if post.user_id != current_user.id:
        return jsonify({'error': 'Only the author can edit this post'}), 403
    if not _is_admin() and post.status != ForumPost.STATUS_REJECTED:
        return jsonify({'error': 'You can only edit rejected posts'}), 403

    data = request.get_json() or {}
    tag = data.get('tag', post.tag)
    title = data.get('title', post.title).strip()
    content = data.get('content', post.content).strip()
    video_url = data.get('video_url', post.video_url or '')
    video_url = video_url.strip() or None

    if tag not in VALID_TAGS:
        return jsonify({'error': f'tag must be one of: {", ".join(VALID_TAGS)}'}), 400
    if not title:
        return jsonify({'error': 'title is required'}), 400
    if not content:
        return jsonify({'error': 'content is required'}), 400

    post.tag = tag
    post.title = title
    post.content = content
    post.video_url = video_url
    if _is_admin():
        post.reviewed_by = current_user.id
        post.reviewed_at = datetime.now(timezone.utc)
    else:
        post.status = ForumPost.STATUS_PENDING
        post.rejection_reason = None
        post.review_note = None
        post.reviewed_by = None
        post.reviewed_at = None
        post.is_pinned = False
    _touch_post(post)
    db.session.commit()
    return jsonify({
        'post': _serialise_post(post),
        'message': 'Post updated' if _is_admin() else 'Post resubmitted for review',
    }), 200


@forum_bp.route('/posts/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    post = db.session.get(ForumPost, post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    if post.user_id != current_user.id and not _is_admin():
        return jsonify({'error': 'Not found or not authorised'}), 404
    db.session.delete(post)
    db.session.commit()
    return jsonify({'message': 'Post deleted'}), 200


# ── Comments ─────────────────────────────────────────────────────────

@forum_bp.route('/posts/<int:post_id>/comments', methods=['POST'])
@login_required
def add_comment(post_id):
    post = db.session.get(ForumPost, post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    if post.status != ForumPost.STATUS_APPROVED:
        return jsonify({'error': 'Comments are available after approval'}), 403

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
    comment = db.session.get(ForumComment, comment_id)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    if comment.user_id != current_user.id and not _is_admin():
        return jsonify({'error': 'Not found or not authorised'}), 404
    db.session.delete(comment)
    db.session.commit()
    return jsonify({'message': 'Comment deleted'}), 200


# ── Forwards (repost) ───────────────────────────────────────────────

@forum_bp.route('/posts/<int:post_id>/forward', methods=['POST'])
@login_required
def forward_post(post_id):
    """Forward (repost) someone else's approved post to your own timeline."""
    post = db.session.get(ForumPost, post_id)
    if not post or post.status != ForumPost.STATUS_APPROVED:
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

    posts = ForumPost.query.filter_by(user_id=current_user.id)\
        .order_by(ForumPost.created_at.desc()).all()
    forwards = ForumForward.query.filter_by(user_id=current_user.id)\
        .order_by(ForumForward.created_at.desc()).all()

    items = []
    for post in posts:
        data = _serialise_post(post)
        data['type'] = 'post'
        items.append(data)
    for forward in forwards:
        data = forward.to_dict()
        data['type'] = 'forward'
        items.append(data)

    items.sort(key=lambda x: x['created_at'] or '', reverse=True)

    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page
    return jsonify({
        'items': items[start:end],
        'total': total,
        'page': page,
    }), 200


# ── Admin moderation ────────────────────────────────────────────────

@forum_bp.route('/admin/rejection-reasons', methods=['GET'])
@login_required
def get_rejection_reasons():
    resp = _require_admin()
    if resp is not None:
        return resp
    return jsonify({'reasons': list(REJECTION_REASONS)}), 200


@forum_bp.route('/admin/pending-posts', methods=['GET'])
@login_required
def get_pending_posts():
    resp = _require_admin()
    if resp is not None:
        return resp

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    query = ForumPost.query.filter_by(status=ForumPost.STATUS_PENDING)\
        .order_by(ForumPost.created_at.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'posts': [_serialise_post(post) for post in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    }), 200


@forum_bp.route('/admin/posts/<int:post_id>/review', methods=['POST'])
@login_required
def review_post(post_id):
    resp = _require_admin()
    if resp is not None:
        return resp

    post = db.session.get(ForumPost, post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    data = request.get_json() or {}
    action = (data.get('action') or '').strip().lower()
    if action not in {'approve', 'reject'}:
        return jsonify({'error': 'action must be approve or reject'}), 400

    post.reviewed_by = current_user.id
    post.reviewed_at = datetime.now(timezone.utc)

    if action == 'approve':
        post.status = ForumPost.STATUS_APPROVED
        post.rejection_reason = None
        post.review_note = None
    else:
        rejection_reason = (data.get('rejection_reason') or '').strip()
        review_note = (data.get('review_note') or '').strip() or None
        if not rejection_reason:
            return jsonify({'error': 'rejection_reason is required when rejecting'}), 400
        post.status = ForumPost.STATUS_REJECTED
        post.is_pinned = False
        post.rejection_reason = rejection_reason
        post.review_note = review_note

    _touch_post(post)
    db.session.commit()
    return jsonify(_serialise_post(post)), 200


@forum_bp.route('/admin/posts/<int:post_id>/pin', methods=['POST'])
@login_required
def pin_post(post_id):
    resp = _require_admin()
    if resp is not None:
        return resp

    post = db.session.get(ForumPost, post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    if post.status != ForumPost.STATUS_APPROVED:
        return jsonify({'error': 'Only approved posts can be pinned'}), 400

    data = request.get_json() or {}
    is_pinned = bool(data.get('is_pinned', True))
    post.is_pinned = is_pinned
    _touch_post(post)
    db.session.commit()
    return jsonify(_serialise_post(post)), 200


# ── File serving ─────────────────────────────────────────────────────

@forum_bp.route('/uploads/<path:filename>', methods=['GET'])
@login_required
def serve_upload(filename):
    from flask import make_response, send_from_directory

    response = make_response(send_from_directory(_upload_dir(), filename))
    response.headers['Cache-Control'] = 'public, max-age=604800, immutable'
    return response
