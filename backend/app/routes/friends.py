from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.user import User
from app.models.friendship import Friendship
from app.models.friend_request import FriendRequest

friends_bp = Blueprint('friends', __name__, url_prefix='/api/friends')


def _get_friend_ids(user_id):
    """Return a set of friend user IDs for the given user."""
    rows = Friendship.query.filter_by(user_id=user_id).all()
    return {r.friend_id for r in rows}


@friends_bp.route('/', methods=['GET'])
@login_required
def list_friends():
    friendships = Friendship.query.filter_by(user_id=current_user.id).all()
    return jsonify({
        'friends': [f.to_dict() for f in friendships],
    }), 200


@friends_bp.route('/requests', methods=['GET'])
@login_required
def list_requests():
    received = FriendRequest.query.filter_by(
        receiver_id=current_user.id, status='pending'
    ).order_by(FriendRequest.created_at.desc()).all()

    sent = FriendRequest.query.filter_by(
        sender_id=current_user.id
    ).order_by(FriendRequest.created_at.desc()).all()

    return jsonify({
        'received': [r.to_dict() for r in received],
        'sent': [r.to_dict() for r in sent],
    }), 200


@friends_bp.route('/search', methods=['GET'])
@login_required
def search_users():
    email = request.args.get('email', '').strip().lower()
    if len(email) < 2:
        return jsonify({'users': []}), 200

    friend_ids = _get_friend_ids(current_user.id)

    users = User.query.filter(
        User.email.ilike(f'%{email}%'),
        User.id != current_user.id,
        User.is_admin == False,  # noqa: E712
    ).limit(10).all()

    result = []
    for u in users:
        is_friend = u.id in friend_ids
        pending_request = FriendRequest.query.filter(
            db.or_(
                db.and_(FriendRequest.sender_id == current_user.id, FriendRequest.receiver_id == u.id),
                db.and_(FriendRequest.sender_id == u.id, FriendRequest.receiver_id == current_user.id),
            ),
            FriendRequest.status == 'pending',
        ).first()

        result.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'is_friend': is_friend,
            'has_pending_request': pending_request is not None,
        })

    return jsonify({'users': result}), 200


@friends_bp.route('/request', methods=['POST'])
@login_required
def send_request():
    data = request.get_json() or {}
    receiver_email = data.get('receiver_email', '').strip().lower()

    if not receiver_email:
        return jsonify({'error': 'Email is required'}), 400

    receiver = User.query.filter_by(email=receiver_email).first()
    if not receiver:
        return jsonify({'error': 'User not found'}), 404

    if receiver.id == current_user.id:
        return jsonify({'error': 'Cannot send request to yourself'}), 400

    if receiver.is_admin:
        return jsonify({'error': 'Cannot add admin as friend'}), 400

    existing_friendship = Friendship.query.filter_by(
        user_id=current_user.id, friend_id=receiver.id
    ).first()
    if existing_friendship:
        return jsonify({'error': 'Already friends'}), 409

    existing_request = FriendRequest.query.filter(
        db.or_(
            db.and_(FriendRequest.sender_id == current_user.id, FriendRequest.receiver_id == receiver.id),
            db.and_(FriendRequest.sender_id == receiver.id, FriendRequest.receiver_id == current_user.id),
        ),
        FriendRequest.status == 'pending',
    ).first()
    if existing_request:
        return jsonify({'error': 'A pending request already exists'}), 409

    fr = FriendRequest(sender_id=current_user.id, receiver_id=receiver.id)
    db.session.add(fr)
    db.session.commit()

    return jsonify({'message': 'Friend request sent', 'request': fr.to_dict()}), 201


@friends_bp.route('/accept', methods=['POST'])
@login_required
def accept_request():
    data = request.get_json() or {}
    request_id = data.get('request_id')

    if not request_id:
        return jsonify({'error': 'request_id is required'}), 400

    fr = FriendRequest.query.get(request_id)
    if not fr:
        return jsonify({'error': 'Request not found'}), 404

    if fr.receiver_id != current_user.id:
        return jsonify({'error': 'Not authorized'}), 403

    if fr.status != 'pending':
        return jsonify({'error': 'Request is no longer pending'}), 400

    fr.status = 'accepted'

    # Create bidirectional friendship
    f1 = Friendship(user_id=fr.sender_id, friend_id=fr.receiver_id)
    f2 = Friendship(user_id=fr.receiver_id, friend_id=fr.sender_id)
    db.session.add(f1)
    db.session.add(f2)
    db.session.commit()

    return jsonify({'message': 'Friend request accepted'}), 200


@friends_bp.route('/reject', methods=['POST'])
@login_required
def reject_request():
    data = request.get_json() or {}
    request_id = data.get('request_id')

    if not request_id:
        return jsonify({'error': 'request_id is required'}), 400

    fr = FriendRequest.query.get(request_id)
    if not fr:
        return jsonify({'error': 'Request not found'}), 404

    if fr.receiver_id != current_user.id:
        return jsonify({'error': 'Not authorized'}), 403

    if fr.status != 'pending':
        return jsonify({'error': 'Request is no longer pending'}), 400

    fr.status = 'rejected'
    db.session.commit()

    return jsonify({'message': 'Friend request rejected'}), 200


@friends_bp.route('/<int:friend_user_id>', methods=['DELETE'])
@login_required
def remove_friend(friend_user_id):
    f1 = Friendship.query.filter_by(
        user_id=current_user.id, friend_id=friend_user_id
    ).first()
    f2 = Friendship.query.filter_by(
        user_id=friend_user_id, friend_id=current_user.id
    ).first()

    if not f1 and not f2:
        return jsonify({'error': 'Not friends'}), 404

    if f1:
        db.session.delete(f1)
    if f2:
        db.session.delete(f2)

    # Clean up any friend requests between the two
    FriendRequest.query.filter(
        db.or_(
            db.and_(FriendRequest.sender_id == current_user.id, FriendRequest.receiver_id == friend_user_id),
            db.and_(FriendRequest.sender_id == friend_user_id, FriendRequest.receiver_id == current_user.id),
        )
    ).delete()

    db.session.commit()
    return jsonify({'message': 'Friend removed'}), 200
