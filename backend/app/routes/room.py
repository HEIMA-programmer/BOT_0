import secrets
import string
import time
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, current_app
from flask_login import current_user, login_required
from sqlalchemy.orm import joinedload

from app import db, socketio
from app.models.room import Room, RoomMember
from app.models.room_record import RoomRecord

room_bp = Blueprint('room', __name__, url_prefix='/api/rooms')

VALID_TYPES = ('game', 'speaking', 'watch')
VALID_VISIBILITY = ('public', 'private')

_INVITE_ALPHABET = string.ascii_uppercase + string.digits


def _generate_invite_code():
    """Generate a unique 6-character uppercase alphanumeric invite code."""
    for _ in range(50):
        code = ''.join(secrets.choice(_INVITE_ALPHABET) for _ in range(6))
        if not Room.query.filter_by(invite_code=code).first():
            return code
    raise RuntimeError('Failed to generate unique invite code after 50 attempts')


def _auto_leave_active_rooms(user_id):
    """Remove user from all active (non-ended) rooms before joining or creating a new one."""
    memberships = (
        RoomMember.query
        .join(Room, RoomMember.room_id == Room.id)
        .filter(RoomMember.user_id == user_id, Room.status != 'ended')
        .all()
    )
    for m in memberships:
        db.session.delete(m)


def _remove_member(room, member):
    """
    Remove a member from a room, handle host promotion / room ending.
    Returns (remaining_members, was_host).
    Caller must call db.session.commit() afterwards.
    """
    was_host = member.role == 'host'
    db.session.delete(member)
    db.session.flush()

    remaining = (
        RoomMember.query
        .filter_by(room_id=room.id)
        .order_by(RoomMember.joined_at.asc())
        .all()
    )
    if not remaining:
        room.status = 'ended'
        room.ended_at = datetime.utcnow()
    elif was_host:
        remaining[0].role = 'host'
        room.host_id = remaining[0].user_id

    return remaining, was_host


@room_bp.route('', methods=['GET'])
@login_required
def list_rooms():
    room_type = request.args.get('type')
    query = (
        Room.query
        .options(joinedload(Room.members))
        .filter(Room.visibility == 'public', Room.status != 'ended')
    )
    if room_type and room_type in VALID_TYPES:
        query = query.filter(Room.room_type == room_type)
    rooms = query.order_by(Room.created_at.desc()).all()
    return jsonify({'rooms': [r.to_dict() for r in rooms]}), 200


@room_bp.route('', methods=['POST'])
@login_required
def create_room():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    room_type = data.get('room_type', 'speaking')
    max_players = data.get('max_players', 4)
    visibility = data.get('visibility', 'public')

    if not name or len(name) > 80:
        return jsonify({'error': 'Room name must be 1–80 characters'}), 400
    if room_type not in VALID_TYPES:
        return jsonify({'error': f'room_type must be one of: {", ".join(VALID_TYPES)}'}), 400
    if not isinstance(max_players, int) or not (2 <= max_players <= 8):
        return jsonify({'error': 'max_players must be between 2 and 8'}), 400
    if visibility not in VALID_VISIBILITY:
        return jsonify({'error': 'visibility must be public or private'}), 400

    # Auto-leave any active rooms before creating a new one
    _auto_leave_active_rooms(current_user.id)

    invite_code = _generate_invite_code()
    # speaking/watch go live immediately — no waiting phase needed
    initial_status = 'waiting' if room_type == 'game' else 'active'
    room = Room(
        name=name,
        room_type=room_type,
        max_players=max_players,
        visibility=visibility,
        invite_code=invite_code,
        host_id=current_user.id,
        status=initial_status,
    )
    db.session.add(room)
    db.session.flush()  # get room.id before commit

    member = RoomMember(
        room_id=room.id,
        user_id=current_user.id,
        role='host',
        is_ready=True,
    )
    db.session.add(member)
    db.session.commit()

    socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')
    return jsonify({'room': room.to_dict(), 'member': member.to_dict()}), 201


@room_bp.route('/join', methods=['POST'])
@login_required
def join_room():
    data = request.get_json() or {}
    invite_code = (data.get('invite_code') or '').strip().upper()

    if not invite_code:
        return jsonify({'error': 'invite_code is required'}), 400

    # Lock the room row to prevent concurrent joins from exceeding max_players.
    # with_for_update() acquires a row-level lock held until commit/rollback.
    room = (
        Room.query
        .filter_by(invite_code=invite_code)
        .with_for_update()
        .first()
    )
    if not room or room.status == 'ended':
        return jsonify({'error': 'Invalid code or room not found'}), 404

    # Game rooms cannot be joined once active (mid-game)
    if room.room_type == 'game' and room.status == 'active':
        return jsonify({'error': 'Game is already in progress'}), 409

    # Idempotent: return existing membership if already in this room
    existing = RoomMember.query.filter_by(room_id=room.id, user_id=current_user.id).first()
    if existing:
        db.session.commit()  # release the FOR UPDATE lock
        return jsonify({'room': room.to_dict(), 'member': existing.to_dict()}), 200

    current_count = RoomMember.query.filter_by(room_id=room.id).count()
    if current_count >= room.max_players:
        db.session.commit()  # release the FOR UPDATE lock
        return jsonify({'error': 'Room is full'}), 409

    # Auto-leave any other active rooms so the user is never in two rooms at once
    _auto_leave_active_rooms(current_user.id)

    member = RoomMember(
        room_id=room.id,
        user_id=current_user.id,
        role='member',
        is_ready=False,
    )
    db.session.add(member)
    db.session.commit()

    socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')
    return jsonify({'room': room.to_dict(), 'member': member.to_dict()}), 200


@room_bp.route('/<int:room_id>', methods=['GET'])
@login_required
def get_room(room_id):
    room = db.session.get(Room, room_id)
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    # Private rooms: only members can view details
    if room.visibility == 'private':
        is_member = RoomMember.query.filter_by(
            room_id=room_id, user_id=current_user.id
        ).first()
        if not is_member:
            return jsonify({'error': 'Room not found'}), 404

    # Order by joined_at so members appear left-to-right in join order
    members = (
        RoomMember.query
        .filter_by(room_id=room_id)
        .order_by(RoomMember.joined_at.asc())
        .all()
    )
    return jsonify({
        'room': room.to_dict(),
        'members': [m.to_dict() for m in members],
    }), 200


@room_bp.route('/<int:room_id>/members/me', methods=['DELETE'])
@login_required
def leave_room(room_id):
    room = db.session.get(Room, room_id)
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    member = RoomMember.query.filter_by(room_id=room_id, user_id=current_user.id).first()
    if not member:
        return jsonify({'error': 'You are not a member of this room'}), 404

    # Record the session for speaking/watch rooms (game rooms record separately)
    if room.room_type in ('speaking', 'watch'):
        duration_secs = int((datetime.utcnow() - member.joined_at).total_seconds())
        summary = request.get_json(silent=True) or {}
        record = RoomRecord(
            room_id=room.id,
            user_id=current_user.id,
            room_name=room.name,
            room_type=room.room_type,
            summary=summary.get('summary', ''),
            duration_secs=max(duration_secs, 0),
        )
        db.session.add(record)

    was_host = member.role == 'host'
    remaining, _ = _remove_member(room, member)
    db.session.commit()

    if was_host and remaining:
        socketio.emit(
            'host_changed',
            {'new_host_user_id': remaining[0].user_id},
            namespace='/room',
            room=str(room_id),
        )
    socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')

    return jsonify({'message': 'Left room'}), 200


@room_bp.route('/records', methods=['GET'])
@login_required
def get_records():
    """Return the current user's room session history, newest first."""
    records = (
        RoomRecord.query
        .filter_by(user_id=current_user.id)
        .order_by(RoomRecord.created_at.desc())
        .limit(50)
        .all()
    )
    return jsonify({'records': [r.to_dict() for r in records]}), 200


@room_bp.route('/<int:room_id>/agora-token', methods=['GET'])
@login_required
def get_agora_token(room_id):
    """Generate an Agora RTC token for the current user to join a speaking room."""
    from app.agora_token.RtcTokenBuilder2 import RtcTokenBuilder, Role_Publisher

    room = db.session.get(Room, room_id)
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    member = RoomMember.query.filter_by(room_id=room_id, user_id=current_user.id).first()
    if not member:
        return jsonify({'error': 'You are not a member of this room'}), 403

    app_id = current_app.config.get('AGORA_APP_ID', '')
    app_cert = current_app.config.get('AGORA_APP_CERTIFICATE', '')
    if not app_id or not app_cert:
        return jsonify({'error': 'Agora credentials not configured'}), 500

    # Channel name = "room_{id}" to keep it unique per room
    channel_name = f'room_{room_id}'
    # Token valid for 24 hours
    expire_secs = 86400

    token = RtcTokenBuilder.build_token_with_uid(
        app_id, app_cert, channel_name,
        current_user.id,       # uid — use our DB user id
        Role_Publisher,        # can publish audio/video
        token_expire=expire_secs,
        privilege_expire=expire_secs,
    )

    return jsonify({
        'token': token,
        'app_id': app_id,
        'channel': channel_name,
        'uid': current_user.id,
    }), 200


