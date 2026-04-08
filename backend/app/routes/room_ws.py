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
import math
import re
from datetime import datetime, timezone

from flask_socketio import emit, join_room, leave_room
from flask import request, current_app
from flask_login import current_user

import json
import time as _time

from app import socketio, db
from app.models.room import Room, RoomMember
from app.models.room_record import RoomRecord
from app.models.game_record import GameRecord
from app.routes.room import (
    _remove_member,
    CONTEXT_GUESSER_TOTAL_ROUNDS,
    generate_game_questions,
)

# Lock protecting all three dicts below — acquire before reading or mutating.
_state_lock = threading.Lock()
# room_id (int) → set of socket sids currently in that room
active_rooms: dict = {}
# sid → room_id
sid_room: dict = {}
# user_id → pending threading.Timer for deferred DB cleanup on disconnect
pending_cleanups: dict = {}
# room_id → {title, video_url, categoryId, videoId}  (WatchTogether content)
room_content: dict = {}
# room_id → {is_playing: bool, position: float, last_update_at: float}
# last_update_at is a server-side monotonic timestamp; it is never leaked to
# clients. See _compute_live_playback below for how the live position is
# derived so late joiners receive the host's current playhead instead of a
# stale snapshot.
room_playback: dict = {}
# room_id → topic string  (SpeakingRoom)
room_topics: dict = {}
# room_id → game state dict  (GameRoom)
game_states: dict = {}
# room_id → room invitations  (pending invites)
room_invitations: dict = {}
# user_id → sid (for direct messaging)
user_sids: dict = {}
ROUND_DURATION_SECS = 20
GUESS_TOKEN_PATTERN = re.compile(r"[A-Za-z'-]+")


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
            duration_secs = int((datetime.utcnow() - member.joined_at).total_seconds())
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


def _compute_live_playback(state):
    """
    Return the current playback state advanced by the time elapsed since the
    host's last update. This is what late joiners should see so they don't
    start at a stale position. The returned dict intentionally omits the
    internal ``last_update_at`` timestamp.
    """
    if not state:
        return None
    now = _time.monotonic()
    last_update = state.get('last_update_at') or now
    position = float(state.get('position', 0.0))
    if state.get('is_playing'):
        position += max(0.0, now - last_update)
    return {
        'is_playing': bool(state.get('is_playing', False)),
        'position': position,
    }


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
    with _state_lock:
        user_sids[current_user.id] = request.sid
    current_app.logger.info(
        f'Room WS connected: {request.sid} (user {current_user.id} — {current_user.username})'
    )


@socketio.on('disconnect', namespace='/room')
def handle_disconnect():
    sid = request.sid

    with _state_lock:
        room_id = sid_room.pop(sid, None)
        # Clean up user_sids if this is their current sid
        if current_user.is_authenticated:
            if user_sids.get(current_user.id) == sid:
                user_sids.pop(current_user.id, None)

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

    # Sync current session state to the joining client.
    # Socket.IO preserves per-connection event order, so the client receives
    # content_selected before playback_synced and can apply the sync once the
    # player reports ready (pendingSyncRef handles the race).
    if room.room_type == 'watch':
        if room_id in room_content:
            emit('content_selected', room_content[room_id])
        live = _compute_live_playback(room_playback.get(room_id))
        if live is not None:
            emit('playback_synced', live)
    elif room.room_type == 'speaking' and room_id in room_topics:
        emit('topic_changed', {'topic': room_topics[room_id]})
    elif room.room_type == 'game' and room_id in game_states:
        # Sync game state for late joiners / reconnecting players
        _emit_game_state_sync(room_id)


def _emit_game_state_sync(room_id):
    """Send current game state to the requesting client."""
    state = game_states.get(room_id)
    if not state:
        return
    emit('game_state_sync', _build_round_payload(room_id, state))


@socketio.on('request_game_state', namespace='/room')
def handle_request_game_state(data):
    if not current_user.is_authenticated:
        return
    room_id = (data or {}).get('room_id')
    if room_id and room_id in game_states:
        _emit_game_state_sync(room_id)


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

    data = data or {}
    room_id = data.get('room_id')
    game_type = data.get('game_type') or 'word_duel'
    room, caller_member = _get_room_and_member(room_id)

    if not caller_member or caller_member.role != 'host':
        emit('room_error', {'message': 'Only the host can start the game'})
        return

    members = RoomMember.query.filter_by(room_id=room_id).all()
    if len(members) < 1:
        emit('room_error', {'message': 'Need at least 1 player to start'})
        return
    if not all(m.is_ready for m in members):
        emit('room_error', {'message': 'All members must be ready before starting'})
        return

    # Accept optional question_count from frontend (3–30), fall back to defaults
    raw_count = data.get('question_count')
    if isinstance(raw_count, int) and 3 <= raw_count <= 30:
        count = raw_count
    else:
        count = 5 if game_type == 'word_duel' else CONTEXT_GUESSER_TOTAL_ROUNDS
    questions = generate_game_questions(game_type, count)
    if not questions:
        emit('room_error', {'message': 'No questions available. Please seed word data first.'})
        return

    room.status = 'active'
    db.session.commit()

    member_list = [{'user_id': m.user_id, 'username': m.user.username, 'role': m.role} for m in members]

    # Initialize game state
    round_started_at = _time.time()
    game_state = {
        'game_type': game_type,
        'questions': questions,
        'current_round': 0,
        'total_rounds': len(questions),
        'scores': {m.user_id: 0 for m in members},
        'round_answers': {},  # user_id → {answer, correct, timestamp}
        'locked_players': set(),
        'round_start_time': round_started_at,
        'members': member_list,
        'rounds_log': [],
        'start_time': round_started_at,
        'round_duration_secs': ROUND_DURATION_SECS,
        'player_completion_ms': {m.user_id: 0 for m in members},
    }
    game_states[room_id] = game_state

    socketio.emit(
        'game_started',
        _build_round_payload(room_id, game_state),
        namespace='/room',
        room=str(room_id),
    )
    socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')

    # Start round timer
    app = current_app._get_current_object()
    socketio.start_background_task(_round_timer, app, room_id, 0)


def _sanitize_question(q, game_type):
    """Remove answer from question before sending to clients."""
    if game_type == 'word_duel':
        return {'id': q['id'], 'question': q['question']}
    return {
        'id': q['id'],
        'sentence': q['sentence'],
        'spoken_text': q.get('spoken_text', ''),
        'blank_count': q.get('blank_count', 1),
        'blank_lengths': q.get('blank_lengths', []),
    }


def _build_round_payload(room_id, state):
    cur_round = state['current_round']
    question = _sanitize_question(state['questions'][cur_round], state['game_type'])
    return {
        'room_id': room_id,
        'game_type': state['game_type'],
        'total_rounds': state['total_rounds'],
        'round': cur_round,
        'question': question,
        'scores': {int(k): v for k, v in state['scores'].items()},
        'members': state['members'],
        'remaining_time': _remaining_round_seconds(state),
        'submitted_players': list(state['locked_players']),
    }


def _remaining_round_seconds(state):
    limit = state.get('round_duration_secs', ROUND_DURATION_SECS)
    elapsed = _time.time() - state['round_start_time']
    return max(0, min(limit, math.ceil(limit - elapsed)))


def _normalize_guess_token(value):
    matches = GUESS_TOKEN_PATTERN.findall((value or '').strip())
    return matches[0].lower() if matches else ''


def _all_players_locked(state):
    return all(uid in state['locked_players'] for uid in state['scores'])


def _context_round_leader(round_answers):
    best_user_id = None
    best_signature = None

    for uid, submission in round_answers.items():
        # Higher correct_count is better; lower response_ms (faster) is better.
        signature = (
            submission.get('correct_count', 0),
            -submission.get('response_ms', ROUND_DURATION_SECS * 1000),
        )
        if best_signature is None or signature > best_signature:
            best_signature = signature
            best_user_id = uid

    return best_user_id


def _round_timer(app, room_id, round_idx):
    """Background task: waits 20 seconds then ends the round if not already ended."""
    socketio.sleep(ROUND_DURATION_SECS)
    with app.app_context():
        with _state_lock:
            state = game_states.get(room_id)
            if not state or state['current_round'] != round_idx:
                return  # Round already ended
            _end_round(app, room_id, winner_id=None)


def _end_round(app, room_id, winner_id=None):
    """End the current round, broadcast result, and advance or end the game."""
    state = game_states.get(room_id)
    if not state:
        return

    round_idx = state['current_round']
    question = state['questions'][round_idx]
    points = {uid: 0 for uid in state['scores']}

    if state['game_type'] == 'word_duel':
        correct_answer = question['answer']
        explanation = question.get('explanation')
        round_log = {
            'round': round_idx,
            'question': question.get('question') or question.get('sentence'),
            'correct_answer': correct_answer,
            'winner_user_id': winner_id,
            'answers': dict(state['round_answers']),
        }
        if winner_id is not None:
            points[winner_id] = 1

        round_payload = {
            'round': round_idx,
            'correct_answer': correct_answer,
            'explanation': explanation,
            'winner_user_id': winner_id,
            'points': points,
            'scores': dict(state['scores']),
        }
    else:
        correct_answers = question.get('answers', [])
        revealed_sentence = question.get('spoken_text', '')
        winner_id = _context_round_leader(state['round_answers'])
        serialized_answers = {}

        for uid in state['scores']:
            submission = state['round_answers'].get(uid)
            if submission:
                points[uid] = submission.get('correct_count', 0)
                state['scores'][uid] = state['scores'].get(uid, 0) + points[uid]
                state['player_completion_ms'][uid] = (
                    state['player_completion_ms'].get(uid, 0)
                    + submission.get('response_ms', ROUND_DURATION_SECS * 1000)
                )
                serialized_answers[str(uid)] = {
                    'answers': submission.get('answers', []),
                    'correct_mask': submission.get('correct_mask', []),
                    'correct_count': submission.get('correct_count', 0),
                    'response_ms': submission.get('response_ms', ROUND_DURATION_SECS * 1000),
                }
            else:
                state['player_completion_ms'][uid] = (
                    state['player_completion_ms'].get(uid, 0)
                    + state.get('round_duration_secs', ROUND_DURATION_SECS) * 1000
                )
                serialized_answers[str(uid)] = {
                    'answers': [],
                    'correct_mask': [],
                    'correct_count': 0,
                    'response_ms': state.get('round_duration_secs', ROUND_DURATION_SECS) * 1000,
                }

        round_log = {
            'round': round_idx,
            'question': question.get('sentence'),
            'revealed_sentence': revealed_sentence,
            'correct_answer': ', '.join(correct_answers),
            'correct_answers': correct_answers,
            'winner_user_id': winner_id,
            'answers': serialized_answers,
            'points': points,
        }
        round_payload = {
            'round': round_idx,
            'correct_answer': ', '.join(correct_answers),
            'correct_answers': correct_answers,
            'revealed_sentence': revealed_sentence,
            'explanation': question.get('explanation'),
            'winner_user_id': winner_id,
            'points': points,
            'scores': dict(state['scores']),
        }

    state['rounds_log'].append(round_log)

    socketio.emit(
        'round_ended',
        round_payload,
        namespace='/room',
        room=str(room_id),
    )

    # Check if game is over
    if round_idx + 1 >= state['total_rounds']:
        socketio.sleep(2.5)
        _end_game(app, room_id)
    else:
        socketio.sleep(2.5)
        # Advance to next round
        state['current_round'] = round_idx + 1
        state['round_answers'] = {}
        state['locked_players'] = set()
        state['round_start_time'] = _time.time()

        socketio.emit(
            'next_round',
            _build_round_payload(room_id, state),
            namespace='/room',
            room=str(room_id),
        )
        # Start new round timer
        socketio.start_background_task(_round_timer, app, room_id, state['current_round'])


def _end_game(app, room_id):
    """Finalize the game, save records, broadcast final results."""
    state = game_states.pop(room_id, None)
    if not state:
        return

    scores = state['scores']
    player_completion_ms = state.get('player_completion_ms', {})
    if state['game_type'] == 'context_guesser':
        sorted_players = sorted(
            scores.items(),
            key=lambda item: (-item[1], player_completion_ms.get(item[0], ROUND_DURATION_SECS * 1000)),
        )
    else:
        sorted_players = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    placements = {}
    for idx, (uid, _) in enumerate(sorted_players):
        placements[uid] = idx + 1

    duration_secs = int(_time.time() - state['start_time'])

    final_results = [
        {
            'user_id': uid,
            'score': scores[uid],
            'placement': placements[uid],
            'username': next((m['username'] for m in state['members'] if m['user_id'] == uid), 'Unknown'),
            'completion_ms': (
                player_completion_ms.get(uid) if state['game_type'] == 'context_guesser' else None
            ),
            'completion_secs': (
                round(player_completion_ms.get(uid, 0) / 1000, 2)
                if state['game_type'] == 'context_guesser'
                else None
            ),
        }
        for uid, _ in sorted_players
    ]

    # Save game records to database and broadcast results
    try:
        room = db.session.get(Room, room_id)
        room_name = room.name if room else 'Game Room'
        game_label = state['game_type'].replace('_', ' ').title()

        for uid, score in scores.items():
            game_record = GameRecord(
                room_id=room_id,
                user_id=uid,
                game_type=state['game_type'],
                score=score,
                total_rounds=state['total_rounds'],
                placement=placements[uid],
                rounds_data=json.dumps(state['rounds_log']),
                duration_secs=duration_secs,
            )
            db.session.add(game_record)

            # Also create a RoomRecord for room history
            p = placements[uid]
            suffix = "st" if p == 1 else "nd" if p == 2 else "rd" if p == 3 else "th"
            placement_str = f'{p}{suffix}'
            room_record = RoomRecord(
                room_id=room_id,
                user_id=uid,
                room_name=room_name,
                room_type='game',
                summary=f'{game_label} · {score} pts · {placement_str} place',
                duration_secs=duration_secs,
            )
            db.session.add(room_record)

        # Reset room status
        if room:
            room.status = 'waiting'
            for member in RoomMember.query.filter_by(room_id=room_id).all():
                member.is_ready = False
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Failed to save game records: {e}')

    socketio.emit(
        'game_over',
        {
            'results': final_results,
            'rounds_log': state['rounds_log'],
            'duration_secs': duration_secs,
        },
        namespace='/room',
        room=str(room_id),
    )
    socketio.emit('rooms_updated', {}, namespace='/room', room='lobby')


@socketio.on('submit_answer', namespace='/room')
def handle_submit_answer(data):
    """Handle a player's answer submission during a game."""
    if not current_user.is_authenticated:
        return

    data = data or {}
    room_id = data.get('room_id')
    answer = (data.get('answer') or '').strip()

    state = game_states.get(room_id)
    if not state:
        emit('answer_result', {'error': 'No active game'})
        return

    uid = current_user.id
    if uid not in state['scores']:
        emit('answer_result', {'error': 'Not a player in this game'})
        return

    if uid in state['locked_players']:
        if state['game_type'] == 'context_guesser':
            emit('answer_result', {'submitted': True, 'locked': True})
        else:
            emit('answer_result', {'correct': False, 'locked': True})
        return

    round_idx = state['current_round']
    question = state['questions'][round_idx]
    if state['game_type'] == 'word_duel':
        correct = answer.lower() == question['answer'].lower()

        state['round_answers'][uid] = {
            'answer': answer,
            'correct': correct,
            'timestamp': _time.time(),
        }

        if correct:
            state['scores'][uid] = state['scores'].get(uid, 0) + 1
            state['locked_players'].add(uid)
            emit('answer_result', {'correct': True})

            app = current_app._get_current_object()
            socketio.start_background_task(_end_round_wrapper, app, room_id, uid, round_idx)
        else:
            emit('answer_result', {'correct': False, 'locked': False})
            socketio.emit(
                'player_answered',
                {'user_id': uid, 'correct': False},
                namespace='/room',
                room=str(room_id),
            )
        return

    raw_answers = data.get('answers')
    if not isinstance(raw_answers, list):
        raw_answers = [answer]

    expected_answers = question.get('answers', [])
    submitted_answers = []
    for index, _ in enumerate(expected_answers):
        value = raw_answers[index] if index < len(raw_answers) else ''
        submitted_answers.append((value or '').strip())

    correct_mask = [
        _normalize_guess_token(submitted_answers[index]) == _normalize_guess_token(expected_answers[index])
        for index in range(len(expected_answers))
    ]
    response_ms = min(
        int((_time.time() - state['round_start_time']) * 1000),
        state.get('round_duration_secs', ROUND_DURATION_SECS) * 1000,
    )

    state['round_answers'][uid] = {
        'answers': submitted_answers,
        'correct_mask': correct_mask,
        'correct_count': sum(correct_mask),
        'timestamp': _time.time(),
        'response_ms': max(response_ms, 0),
    }
    state['locked_players'].add(uid)

    emit(
        'answer_result',
        {
            'submitted': True,
            'locked': True,
            'filled_count': sum(1 for submitted_answer in submitted_answers if submitted_answer),
            'blank_count': len(expected_answers),
        },
    )
    socketio.emit(
        'player_answered',
        {
            'user_id': uid,
            'submitted': True,
            'correct_count': sum(correct_mask),
        },
        namespace='/room',
        room=str(room_id),
    )

    if _all_players_locked(state):
        app = current_app._get_current_object()
        socketio.start_background_task(_end_round_wrapper, app, room_id, None, round_idx)


def _end_round_wrapper(app, room_id, winner_id, expected_round):
    """Wrapper to call _end_round only if the round hasn't been ended yet."""
    with app.app_context():
        with _state_lock:
            state = game_states.get(room_id)
            if state and state['current_round'] == expected_round:
                _end_round(app, room_id, winner_id)


@socketio.on('invite_friend', namespace='/room')
def handle_invite_friend(data):
    """Invite a friend to join the current room."""
    if not current_user.is_authenticated:
        return
    data = data or {}
    room_id = data.get('room_id')
    target_user_id = data.get('target_user_id')

    _, member = _get_room_and_member(room_id)
    if not member:
        return

    room = db.session.get(Room, room_id)
    if not room:
        return

    with _state_lock:
        target_sid = user_sids.get(target_user_id)

    if target_sid:
        socketio.emit(
            'room_invitation',
            {
                'room_id': room_id,
                'room_name': room.name,
                'room_type': room.room_type,
                'invite_code': room.invite_code,
                'invited_by': current_user.username,
            },
            namespace='/room',
            to=target_sid,
        )


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
        'title': (data.get('title') or '').strip(),
        'video_url': (data.get('video_url') or '').strip(),
        'categoryId': (data.get('categoryId') or '').strip(),
        'videoId': data.get('videoId'),
    }
    room_content[room_id] = content
    room_playback[room_id] = {
        'is_playing': False,
        'position': 0.0,
        'last_update_at': _time.monotonic(),
    }
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
        'position': float(data.get('position', 0)),
        'last_update_at': _time.monotonic(),
    }
    room_playback[room_id] = state
    # Route the broadcast through _compute_live_playback so the client
    # payload shape matches the late-join path and never leaks last_update_at.
    socketio.emit('playback_synced', _compute_live_playback(state),
                  namespace='/room', room=str(room_id), skip_sid=request.sid)


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
        'user_id': current_user.id,
        'username': current_user.username,
        'text': text,
        'time': datetime.now(timezone.utc).strftime('%H:%M'),
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
        duration_secs = int((datetime.utcnow() - target.joined_at).total_seconds())
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
