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
from app.models.room_record import RoomRecord
from app.routes.room import _remove_member

# Lock protecting all three dicts below — acquire before reading or mutating.
_state_lock = threading.Lock()
# room_id (int) → set of socket sids currently in that room
active_rooms: dict = {}
# sid → room_id
sid_room: dict = {}
# user_id → pending threading.Timer for deferred DB cleanup on disconnect
pending_cleanups: dict = {}
# room_id → {title, audio_url, source_slug}  (WatchTogether content)
room_content: dict = {}
# room_id → {is_playing: bool, position: float}
room_playback: dict = {}
# room_id → topic string  (SpeakingRoom)
room_topics: dict = {}


def _deferred_cleanup(app, user_id, room_id):
    """
    DB cleanup after a 1-second grace period following socket disconnect.
    Runs in a background thread. Cancelled if the user reconnects in time
    (handles React StrictMode's intentional unmount→remount cycle).
    """
    with _state_lock:
        pending_cleanups.pop(user_id, None)

    with app.app_context():
        member = RoomMember.query.filter_by(room_id=room_id, user_id=user_id).first()
        if not member:
            return  # already cleaned up via REST leave — nothing to do

        # Re-check room status: if a game room became active (game started) during
        # the grace period, do NOT remove the member — they are in-game.
        # Speaking/watch rooms are always 'active', so we do clean them up.
        room = db.session.get(Room, room_id)
        if not room:
            return
        if room.room_type == 'game' and room.status == 'active':
            return

        # Record the session for speaking/watch rooms
        if room.room_type in ('speaking', 'watch'):
            duration_secs = int((datetime.now(timezone.utc) - member.joined_at).total_seconds())
            record = RoomRecord(
                room_id=room.id,
                user_id=user_id,
                room_name=room.name,
                room_type=room.room_type,
                summary='',
                duration_secs=max(duration_secs, 0),
            )
            db.session.add(record)

        remaining, was_host = _remove_member(room, member)
        db.session.commit()

        if was_host and remaining:
            socketio.emit(
                'host_changed',
                {'new_host_user_id': remaining[0].user_id},
                namespace='/room',
                room=str(room_id),
            )

        socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')

        if not remaining:
            room_content.pop(room_id, None)
            room_playback.pop(room_id, None)
            room_topics.pop(room_id, None)


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

    with _state_lock:
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

        # Schedule DB cleanup with a 1-second grace period.
        # This allows React StrictMode's intentional unmount→remount to cancel it.
        # - waiting rooms: always clean up (user left the lobby)
        # - active speaking/watch rooms: clean up (these are drop-in sessions)
        # - active game rooms: do NOT clean up (game in progress, player may reconnect)
        room = db.session.get(Room, room_id)
        if room and not (room.room_type == 'game' and room.status == 'active'):
            app = current_app._get_current_object()
            user_id = current_user.id
            timer = threading.Timer(1.0, _deferred_cleanup, args=[app, user_id, room_id])
            with _state_lock:
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
    with _state_lock:
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
    with _state_lock:
        sid_room[sid] = room_id
        active_rooms.setdefault(room_id, set()).add(sid)

    socketio.emit(
        'member_joined',
        {'member': member.to_dict()},
        namespace='/room',
        room=str(room_id),
    )
    socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')

    # Sync current session state to the joining client
    if room.room_type == 'watch':
        if room_id in room_content:
            emit('content_selected', room_content[room_id])
        if room_id in room_playback:
            emit('playback_synced', room_playback[room_id])
    elif room.room_type == 'speaking' and room_id in room_topics:
        emit('topic_changed', {'topic': room_topics[room_id]})



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


# ── WatchTogether events ──────────────────────────────────────────────────────

@socketio.on('select_content', namespace='/room')
def handle_select_content(data):
    if not current_user.is_authenticated:
        return
    data = data or {}
    room_id = data.get('room_id')
    _, member = _get_room_and_member(room_id)
    if not member or member.role != 'host':
        emit('room_error', {'message': 'Only the host can select content'})
        return
    content = {
        'title':       (data.get('title') or '').strip(),
        'audio_url':   (data.get('audio_url') or '').strip(),
        'source_slug': (data.get('source_slug') or '').strip(),
    }
    room_content[room_id] = content
    room_playback[room_id] = {'is_playing': False, 'position': 0.0}
    socketio.emit('content_selected', content, namespace='/room', room=str(room_id))


@socketio.on('sync_playback', namespace='/room')
def handle_sync_playback(data):
    if not current_user.is_authenticated:
        return
    data = data or {}
    room_id = data.get('room_id')
    _, member = _get_room_and_member(room_id)
    if not member or member.role != 'host':
        return
    state = {
        'is_playing': bool(data.get('is_playing', False)),
        'position':   float(data.get('position', 0)),
    }
    room_playback[room_id] = state
    socketio.emit('playback_synced', state, namespace='/room',
                  room=str(room_id), skip_sid=request.sid)


@socketio.on('send_comment', namespace='/room')
def handle_send_comment(data):
    if not current_user.is_authenticated:
        return
    data = data or {}
    room_id = data.get('room_id')
    text = (data.get('text') or '').strip()[:500]
    _, member = _get_room_and_member(room_id)
    if not member or not text:
        return
    comment = {
        'user_id':  current_user.id,
        'username': current_user.username,
        'text':     text,
        'time':     datetime.now(timezone.utc).strftime('%H:%M'),
    }
    socketio.emit('comment_received', comment, namespace='/room', room=str(room_id))


# ── SpeakingRoom events ───────────────────────────────────────────────────────

@socketio.on('set_topic', namespace='/room')
def handle_set_topic(data):
    if not current_user.is_authenticated:
        return
    data = data or {}
    room_id = data.get('room_id')
    topic = (data.get('topic') or '').strip()
    _, member = _get_room_and_member(room_id)
    if not member or member.role != 'host':
        return
    room_topics[room_id] = topic
    socketio.emit('topic_changed', {'topic': topic}, namespace='/room', room=str(room_id))


@socketio.on('toggle_media', namespace='/room')
def handle_toggle_media(data):
    """Broadcast mic/camera state changes to other members in the speaking room."""
    if not current_user.is_authenticated:
        return
    data = data or {}
    room_id = data.get('room_id')
    _, member = _get_room_and_member(room_id)
    if not member:
        return
    socketio.emit(
        'media_state_changed',
        {
            'user_id': current_user.id,
            'mic_on': bool(data.get('mic_on', True)),
            'camera_on': bool(data.get('camera_on', True)),
        },
        namespace='/room',
        room=str(room_id),
        skip_sid=request.sid,
    )


@socketio.on('kick_member', namespace='/room')
def handle_kick_member(data):
    if not current_user.is_authenticated:
        return
    data = data or {}
    room_id = data.get('room_id')
    target_user_id = data.get('target_user_id')

    room, caller = _get_room_and_member(room_id)
    if not caller or caller.role != 'host':
        emit('room_error', {'message': 'Only the host can kick members'})
        return

    target = RoomMember.query.filter_by(room_id=room_id, user_id=target_user_id).first()
    if not target:
        emit('room_error', {'message': 'Target user is not in this room'})
        return
    if target.role == 'host':
        emit('room_error', {'message': 'Cannot kick the host'})
        return

    # Record session for speaking/watch rooms
    if room.room_type in ('speaking', 'watch'):
        duration_secs = int((datetime.now(timezone.utc) - target.joined_at).total_seconds())
        record = RoomRecord(
            room_id=room.id,
            user_id=target_user_id,
            room_name=room.name,
            room_type=room.room_type,
            summary='Removed by host',
            duration_secs=max(duration_secs, 0),
        )
        db.session.add(record)

    db.session.delete(target)
    db.session.commit()

    socketio.emit('member_kicked', {'user_id': target_user_id}, namespace='/room', room=str(room_id))
    socketio.emit('member_left', {'user_id': target_user_id}, namespace='/room', room=str(room_id))
    socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')
