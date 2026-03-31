"""
WebSocket handler for the Room System.
Namespace: /room

Handles WaitingRoom real-time sync:
  - member join / leave
  - ready-status toggle
  - host transfer
  - game start
"""

import threading
from datetime import datetime, timezone

from flask_socketio import emit, join_room, leave_room
from flask import request, current_app
from flask_login import current_user

from app import socketio, db
from app.models.room import Room, RoomMember

# room_id (int) → set of socket sids currently in that room
active_rooms: dict = {}
# sid → room_id
sid_room: dict = {}
# user_id → pending threading.Timer for deferred DB cleanup on disconnect
pending_cleanups: dict = {}


def _deferred_cleanup(app, user_id, room_id):
    """
    DB cleanup after a 1-second grace period following socket disconnect.
    Runs in a background thread. Cancelled if the user reconnects in time
    (handles React StrictMode's intentional unmount→remount cycle).
    Only called for 'waiting' rooms — active games handle leave themselves.
    """
    pending_cleanups.pop(user_id, None)
    with app.app_context():
        member = RoomMember.query.filter_by(room_id=room_id, user_id=user_id).first()
        if not member:
            return  # already cleaned up via REST leave — nothing to do

        was_host = member.role == 'host'
        db.session.delete(member)
        db.session.flush()

        remaining = RoomMember.query.filter_by(room_id=room_id).all()
        room = db.session.get(Room, room_id)
        if not room:
            db.session.commit()
            return

        if not remaining:
            room.status = 'ended'
            room.ended_at = datetime.now(timezone.utc)
        elif was_host:
            remaining[0].role = 'host'
            room.host_id = remaining[0].user_id
            socketio.emit(
                'host_changed',
                {'new_host_user_id': remaining[0].user_id},
                namespace='/room',
                room=str(room_id),
            )

        db.session.commit()
        socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')


def _get_room_and_member(room_id):
    """Return (Room, RoomMember) for the current user, or (None, None) if not found."""
    room = db.session.get(Room, room_id)
    if not room:
        return None, None
    member = RoomMember.query.filter_by(room_id=room_id, user_id=current_user.id).first()
    return room, member


@socketio.on('connect', namespace='/room')
def handle_connect():
    if not current_user.is_authenticated:
        return False  # Reject unauthenticated connections
    current_app.logger.info(
        f'Room WS connected: {request.sid} (user {current_user.id} — {current_user.username})'
    )


@socketio.on('disconnect', namespace='/room')
def handle_disconnect():
    sid = request.sid
    room_id = sid_room.pop(sid, None)
    if room_id is None:
        return

    if room_id in active_rooms:
        active_rooms[room_id].discard(sid)
        if not active_rooms[room_id]:
            del active_rooms[room_id]

    leave_room(str(room_id), namespace='/room')

    if current_user.is_authenticated:
        socketio.emit(
            'member_left',
            {'user_id': current_user.id},
            namespace='/room',
            room=str(room_id),
        )
        socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')

        # Schedule DB cleanup only for waiting rooms.
        # Active rooms (game in progress) handle leave themselves.
        # 1-second grace period allows React StrictMode's remount to cancel it.
        room = db.session.get(Room, room_id)
        if room and room.status == 'waiting':
            app = current_app._get_current_object()
            user_id = current_user.id
            timer = threading.Timer(1.0, _deferred_cleanup, args=[app, user_id, room_id])
            pending_cleanups[user_id] = timer
            timer.start()

    current_app.logger.info(f'Room WS disconnected: {sid} from room {room_id}')


@socketio.on('join_lobby', namespace='/room')
def handle_join_lobby():
    if not current_user.is_authenticated:
        return
    join_room('lobby', namespace='/room')


@socketio.on('leave_lobby', namespace='/room')
def handle_leave_lobby():
    if not current_user.is_authenticated:
        return
    leave_room('lobby', namespace='/room')


@socketio.on('join_waiting_room', namespace='/room')
def handle_join_waiting_room(data):
    if not current_user.is_authenticated:
        emit('room_error', {'message': 'Authentication required'})
        return

    # Cancel any pending disconnect cleanup — handles StrictMode unmount→remount
    timer = pending_cleanups.pop(current_user.id, None)
    if timer:
        timer.cancel()

    room_id = (data or {}).get('room_id')
    if not room_id:
        emit('room_error', {'message': 'room_id is required'})
        return

    room, member = _get_room_and_member(room_id)
    if not room:
        emit('room_error', {'message': 'Room not found'})
        return
    if not member:
        emit('room_error', {'message': 'You are not a member of this room'})
        return

    sid = request.sid
    join_room(str(room_id), namespace='/room')
    sid_room[sid] = room_id
    active_rooms.setdefault(room_id, set()).add(sid)

    socketio.emit(
        'member_joined',
        {'member': member.to_dict()},
        namespace='/room',
        room=str(room_id),
    )
    socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')



@socketio.on('set_ready', namespace='/room')
def handle_set_ready(data):
    if not current_user.is_authenticated:
        emit('room_error', {'message': 'Authentication required'})
        return

    data = data or {}
    room_id = data.get('room_id')
    is_ready = bool(data.get('is_ready', True))

    _, member = _get_room_and_member(room_id)
    if not member:
        emit('room_error', {'message': 'Not a member of this room'})
        return

    member.is_ready = is_ready
    db.session.commit()

    socketio.emit(
        'ready_changed',
        {'user_id': current_user.id, 'is_ready': member.is_ready},
        namespace='/room',
        room=str(room_id),
    )


@socketio.on('transfer_host', namespace='/room')
def handle_transfer_host(data):
    if not current_user.is_authenticated:
        emit('room_error', {'message': 'Authentication required'})
        return

    data = data or {}
    room_id = data.get('room_id')
    new_host_user_id = data.get('new_host_user_id')

    room, caller_member = _get_room_and_member(room_id)
    if not caller_member or caller_member.role != 'host':
        emit('room_error', {'message': 'Only the host can transfer host'})
        return

    new_host_member = RoomMember.query.filter_by(
        room_id=room_id, user_id=new_host_user_id
    ).first()
    if not new_host_member:
        emit('room_error', {'message': 'Target user is not in this room'})
        return

    caller_member.role = 'member'
    new_host_member.role = 'host'
    room.host_id = new_host_user_id
    db.session.commit()

    socketio.emit(
        'host_changed',
        {'new_host_user_id': new_host_user_id},
        namespace='/room',
        room=str(room_id),
    )


@socketio.on('start_game', namespace='/room')
def handle_start_game(data):
    if not current_user.is_authenticated:
        emit('room_error', {'message': 'Authentication required'})
        return

    room_id = (data or {}).get('room_id')
    room, caller_member = _get_room_and_member(room_id)

    if not caller_member or caller_member.role != 'host':
        emit('room_error', {'message': 'Only the host can start the game'})
        return

    members = RoomMember.query.filter_by(room_id=room_id).all()
    if len(members) < 2:
        emit('room_error', {'message': 'Need at least 2 players to start'})
        return
    if not all(m.is_ready for m in members):
        emit('room_error', {'message': 'All members must be ready before starting'})
        return

    room.status = 'active'
    db.session.commit()

    socketio.emit(
        'game_started',
        {'room_id': room_id},
        namespace='/room',
        room=str(room_id),
    )
    socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')
