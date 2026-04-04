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
from app.models.forum_post_pin import ForumPostPin
from app.models.friendship import Friendship
from app.models.room import Room, RoomMember

forum_bp = Blueprint('forum', __name__, url_prefix='/api/forum')

SUGGESTED_TAGS = ('skills', 'experience', 'academic_culture', 'public', 'note')
VALID_ZONES = ('public', 'friend')
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
    if _is_admin():
        return True
    if post.status == ForumPost.STATUS_APPROVED:
        if post.zone == 'public':
            return True
        friend_ids = _get_friend_ids(current_user.id)
        return post.user_id == current_user.id or post.user_id in friend_ids
    return post.user_id == current_user.id


def _can_view_forward(forward):
    if _is_admin():
        return True
    if forward.zone == 'public':
        return forward.post is not None and forward.post.status == ForumPost.STATUS_APPROVED
    if forward.zone == 'friend':
        friend_ids = _get_friend_ids(current_user.id)
        return forward.user_id == current_user.id or forward.user_id in friend_ids
    return False


def _get_visible_post_or_404(post_id):
    post = db.session.get(ForumPost, post_id)
    if not post or not _can_view_post(post):
        return None, (jsonify({'error': 'Post not found'}), 404)
    return post, None


def _get_friend_pinned_post_ids(post_ids):
    if _is_admin() or not post_ids:
        return set()
    rows = ForumPostPin.query.filter(
        ForumPostPin.user_id == current_user.id,
        ForumPostPin.post_id.in_(post_ids),
    ).all()
    return {row.post_id for row in rows}


def _can_pin_post(post):
    if post.status != ForumPost.STATUS_APPROVED:
        return False
    if _is_admin():
        return post.zone == 'public'
    return post.zone == 'friend' and _can_view_post(post)


def _serialise_post(post, include_comments=False, friend_pinned_post_ids=None):
    data = post.to_dict(include_comments=include_comments)
    if post.zone == 'friend':
        friend_pinned = (
            post.id in friend_pinned_post_ids
            if friend_pinned_post_ids is not None
            else bool(
                ForumPostPin.query.filter_by(user_id=current_user.id, post_id=post.id).first()
            )
        )
        data['is_pinned'] = friend_pinned
    data['can_delete'] = _is_admin() or post.user_id == current_user.id
    # Intentional policy: admins can edit their own posts at any status, while
    # regular users can only revise their own rejected posts for resubmission.
    data['can_edit'] = (_is_admin() and post.user_id == current_user.id) or (
        not _is_admin() and post.user_id == current_user.id and post.status == ForumPost.STATUS_REJECTED
    )
    data['can_forward'] = post.status == ForumPost.STATUS_APPROVED
    data['can_pin'] = _can_pin_post(post)
    data['can_review'] = _is_admin() and post.status == ForumPost.STATUS_PENDING
    return data


def _serialise_posts(posts):
    friend_pinned_post_ids = _get_friend_pinned_post_ids([
        post.id for post in posts if post.zone == 'friend'
    ])
    return [
        _serialise_post(post, friend_pinned_post_ids=friend_pinned_post_ids)
        for post in posts
    ]


def _clear_friend_pins(post_id):
    ForumPostPin.query.filter_by(post_id=post_id).delete(synchronize_session=False)


def _touch_post(post):
    post.updated_at = datetime.now(timezone.utc)


def _post_query_for_current_user():
    if _is_admin():
        return ForumPost.query
    return ForumPost.query.filter_by(status=ForumPost.STATUS_APPROVED)


def _get_friend_ids(user_id):
    """Return a set of friend user IDs for the given user."""
    rows = Friendship.query.filter_by(user_id=user_id).all()
    return {r.friend_id for r in rows}


# ── Posts ────────────────────────────────────────────────────────────

@forum_bp.route('/posts', methods=['GET'])
@login_required
def get_posts():
    """Get forum posts visible to the current user, with optional forward inclusion."""
    tag = request.args.get('tag')
    search = (request.args.get('search') or '').strip()
    user_id = request.args.get('user_id', type=int)
    status = request.args.get('status')
    zone = request.args.get('zone')
    include_forwards = request.args.get('include_forwards', 'false').lower() == 'true'
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    # Friend zone: show friends' posts AND the user's own friend-zone posts
    if zone == 'friend' and not _is_admin():
        friend_ids = _get_friend_ids(current_user.id)
        visible_user_ids = friend_ids | {current_user.id}
        query = ForumPost.query.filter(
            ForumPost.status == ForumPost.STATUS_APPROVED,
            ForumPost.zone == 'friend',
            ForumPost.user_id.in_(visible_user_ids),
        ).outerjoin(
            ForumPostPin,
            db.and_(
                ForumPostPin.post_id == ForumPost.id,
                ForumPostPin.user_id == current_user.id,
            ),
        )
    else:
        query = _post_query_for_current_user()
        if _is_admin():
            if zone in VALID_ZONES:
                query = query.filter(ForumPost.zone == zone)
        else:
            query = query.filter(ForumPost.zone == 'public')

    if tag:
        query = query.filter_by(tag=tag)
    if search:
        pattern = f'%{search}%'
        query = query.filter(db.or_(
            ForumPost.title.ilike(pattern),
            ForumPost.tag.ilike(pattern),
        ))
    if user_id:
        query = query.filter_by(user_id=user_id)
    if _is_admin() and status in VALID_POST_STATUSES:
        query = query.filter_by(status=status)

    if zone == 'friend' and not _is_admin():
        query = query.order_by(ForumPostPin.id.is_not(None).desc(), ForumPost.created_at.desc())
    else:
        query = query.order_by(ForumPost.is_pinned.desc(), ForumPost.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    items = _serialise_posts(pagination.items)
    # Tag each post item with type
    for item in items:
        item['type'] = 'post'

    total = pagination.total

    # Include forwards in the feed
    if include_forwards:
        if zone == 'friend' and not _is_admin():
            friend_ids = _get_friend_ids(current_user.id)
            visible_user_ids = friend_ids | {current_user.id}
            forward_query = ForumForward.query.join(
                ForumPost, ForumForward.original_post_id == ForumPost.id
            ).filter(
                ForumPost.status == ForumPost.STATUS_APPROVED,
                ForumForward.user_id.in_(visible_user_ids),
                ForumForward.zone == 'friend',
            )
        elif zone == 'public' and not _is_admin():
            forward_query = ForumForward.query.join(
                ForumPost, ForumForward.original_post_id == ForumPost.id
            ).filter(
                ForumPost.status == ForumPost.STATUS_APPROVED,
                ForumForward.zone == 'public',
            )
        else:
            forward_query = ForumForward.query.join(
                ForumPost, ForumForward.original_post_id == ForumPost.id
            ).filter(ForumPost.status == ForumPost.STATUS_APPROVED)
            if zone in VALID_ZONES:
                forward_query = forward_query.filter(ForumForward.zone == zone)
        if search:
            pattern = f'%{search}%'
            forward_query = forward_query.filter(db.or_(
                ForumPost.title.ilike(pattern),
                ForumPost.tag.ilike(pattern),
            ))

        forwards = forward_query.order_by(ForumForward.created_at.desc()).all()
        for fw in forwards:
            data = fw.to_dict()
            data['type'] = 'forward'
            items.append(data)

        # Sort combined list by created_at descending, pinned posts first
        items.sort(key=lambda x: (
            x.get('is_pinned', False),
            x.get('created_at', ''),
        ), reverse=True)

        total = len(items)
        start = (page - 1) * per_page
        end = start + per_page
        items = items[start:end]

    return jsonify({
        'posts': items,
        'total': total,
        'page': page if not include_forwards else page,
        'pages': pagination.pages if not include_forwards else ((total + per_page - 1) // per_page),
    }), 200


@forum_bp.route('/posts/<int:post_id>', methods=['GET'])
@login_required
def get_post(post_id):
    """Get a single post with comments."""
    post, error = _get_visible_post_or_404(post_id)
    if error:
        return error
    friend_pinned_post_ids = _get_friend_pinned_post_ids([post.id]) if post.zone == 'friend' else set()
    return jsonify(_serialise_post(
        post,
        include_comments=True,
        friend_pinned_post_ids=friend_pinned_post_ids,
    )), 200


@forum_bp.route('/posts', methods=['POST'])
@login_required
def create_post():
    """Create a new post. Normal users' posts require admin approval."""
    if request.content_type and 'multipart/form-data' in request.content_type:
        tag = request.form.get('tag')
        title = request.form.get('title', '').strip()
        content = request.form.get('content', '').strip()
        video_url = request.form.get('video_url', '').strip() or None
        zone = request.form.get('zone', 'public').strip()
    else:
        data = request.get_json() or {}
        tag = data.get('tag')
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        video_url = data.get('video_url', '').strip() or None
        zone = data.get('zone', 'public').strip()

    if zone not in VALID_ZONES:
        zone = 'public'
    # Admins always post to public zone
    if _is_admin():
        zone = 'public'

    # Auto-set tag based on zone if not provided
    if not tag:
        tag = zone  # 'public' or 'friend'
    if len(tag) > 30:
        return jsonify({'error': 'tag must be 30 characters or less'}), 400
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

    # Game record posts are auto-approved, but only if the user actually
    # participated in the referenced game room (prevents tag abuse).
    game_verified = False
    if tag == 'game':
        if request.content_type and 'multipart/form-data' in request.content_type:
            room_id = request.form.get('room_id')
        else:
            room_id = (request.get_json() or {}).get('room_id')
        if room_id:
            member = RoomMember.query.filter_by(
                room_id=room_id, user_id=current_user.id
            ).first()
            room = Room.query.filter_by(
                id=room_id, room_type='game'
            ).first()
            game_verified = member is not None and room is not None
        if not game_verified:
            tag = 'public'  # downgrade to normal tag

    auto_approve = _is_admin() or game_verified

    post = ForumPost(
        user_id=current_user.id,
        zone=zone,
        tag=tag,
        title=title,
        content=content,
        file_url=file_url,
        file_name=file_name,
        video_url=video_url,
        status=ForumPost.STATUS_APPROVED if auto_approve else ForumPost.STATUS_PENDING,
        reviewed_by=current_user.id if auto_approve else None,
        reviewed_at=datetime.now(timezone.utc) if auto_approve else None,
    )
    _touch_post(post)
    db.session.add(post)
    db.session.commit()

    return jsonify({
        'post': _serialise_post(post),
        'message': 'Post published' if auto_approve else 'Post submitted for review',
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

    if not tag:
        tag = post.zone or 'public'
    if len(tag) > 30:
        return jsonify({'error': 'tag must be 30 characters or less'}), 400
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
        _clear_friend_pins(post.id)
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
    if not post or post.status != ForumPost.STATUS_APPROVED or not _can_view_post(post):
        return jsonify({'error': 'Post not found'}), 404

    existing = ForumForward.query.filter_by(
        user_id=current_user.id, original_post_id=post_id
    ).first()
    if existing:
        return jsonify({'error': 'Already forwarded'}), 409

    data = request.get_json() or {}
    comment = data.get('comment', '').strip() or None
    zone = (data.get('zone') or 'public').strip()
    if zone not in VALID_ZONES:
        zone = 'public'
    if _is_admin():
        zone = 'public'

    forward = ForumForward(
        user_id=current_user.id, original_post_id=post_id, zone=zone, comment=comment
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
    friend_pinned_post_ids = _get_friend_pinned_post_ids([
        item.id for item in posts if item.zone == 'friend'
    ])

    items = []
    for post in posts:
        data = _serialise_post(post, friend_pinned_post_ids=friend_pinned_post_ids)
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
        _clear_friend_pins(post.id)
        post.rejection_reason = rejection_reason
        post.review_note = review_note

    _touch_post(post)
    db.session.commit()
    return jsonify(_serialise_post(post)), 200


@forum_bp.route('/admin/posts/<int:post_id>/pin', methods=['POST'])
@login_required
def pin_post(post_id):
    post = db.session.get(ForumPost, post_id)
    if not post:
        return jsonify({'error': 'Post not found'}), 404

    data = request.get_json() or {}
    is_pinned = bool(data.get('is_pinned', True))
    if not _can_pin_post(post):
        if _is_admin():
            if post.status != ForumPost.STATUS_APPROVED:
                return jsonify({'error': 'Only approved posts can be pinned'}), 400
            return jsonify({'error': 'Only public posts can be pinned'}), 400
        return jsonify({'error': 'Only approved friend zone posts visible to you can be pinned'}), 403

    if _is_admin():
        post.is_pinned = is_pinned
        _touch_post(post)
    else:
        existing_pin = ForumPostPin.query.filter_by(user_id=current_user.id, post_id=post.id).first()
        if is_pinned and not existing_pin:
            db.session.add(ForumPostPin(user_id=current_user.id, post_id=post.id))
        elif not is_pinned and existing_pin:
            db.session.delete(existing_pin)

    db.session.commit()
    friend_pinned_post_ids = {post.id} if (post.zone == 'friend' and is_pinned and not _is_admin()) else set()
    return jsonify(_serialise_post(post, friend_pinned_post_ids=friend_pinned_post_ids)), 200


# ── File serving ─────────────────────────────────────────────────────

@forum_bp.route('/uploads/<path:filename>', methods=['GET'])
@login_required
def serve_upload(filename):
    from flask import make_response, send_from_directory

    response = make_response(send_from_directory(_upload_dir(), filename))
    response.headers['Cache-Control'] = 'public, max-age=604800, immutable'
    return response
