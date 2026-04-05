import csv
import random
import re
import secrets
import string
from datetime import datetime
from pathlib import Path

from flask import Blueprint, jsonify, request, current_app
from flask_login import current_user, login_required
from sqlalchemy.orm import joinedload

from app import db, socketio
from app.models.room import Room, RoomMember
from app.models.room_record import RoomRecord
from app.models.game_record import GameRecord
from app.models.word import Word

room_bp = Blueprint('room', __name__, url_prefix='/api/rooms')

VALID_TYPES = ('game', 'speaking', 'watch')
VALID_VISIBILITY = ('public', 'private')

_INVITE_ALPHABET = string.ascii_uppercase + string.digits
PROJECT_ROOT = Path(__file__).resolve().parents[3]
AWL_CSV_PATH = PROJECT_ROOT / 'frontend' / 'public' / 'AWL' / 'AWL.csv'
AWL_SENTENCE_PATH = PROJECT_ROOT / 'frontend' / 'public' / 'AWL' / 'AWL_example_sentences.txt'
CONTEXT_GUESSER_TOTAL_ROUNDS = 10
CONTEXT_GUESSER_BLANK_STAGES = (1, 1, 2, 2, 2, 3, 3, 4, 4, 4)
CONTEXT_TOKEN_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]*")
CONTEXT_STOPWORDS = {
    'about', 'after', 'again', 'along', 'also', 'because', 'before', 'being',
    'between', 'class', 'clear', 'could', 'course', 'daily', 'direct', 'during',
    'each', 'every', 'final', 'first', 'focuses', 'from', 'helped', 'improve',
    'introduced', 'isolation', 'learn', 'learners', 'local', 'long', 'makes',
    'meaning', 'more', 'rather', 'results', 'revealed', 'routine', 'should',
    'short', 'simple', 'something', 'stronger', 'study', 'students', 'supported',
    'survey', 'teacher', 'than', 'their', 'there', 'these', 'those', 'through',
    'trends', 'understand', 'website', 'which', 'while', 'with', 'without',
    'writing',
}


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
    if not isinstance(max_players, int) or not (1 <= max_players <= 8):
        return jsonify({'error': 'max_players must be between 1 and 8'}), 400
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


CONTEXT_TEMPLATES = [
    'The professor emphasized the importance of _____ in the research methodology.',
    'Students must demonstrate strong _____ skills in their final project.',
    'The concept of _____ is fundamental to understanding this academic discipline.',
    'The study found that _____ played a significant role in the outcome.',
    'A thorough understanding of _____ is essential for success in this course.',
    'The report highlighted the need for better _____ in the industry.',
    'Recent developments in _____ have transformed the field dramatically.',
    'The committee recommended further _____ to address the existing challenges.',
    'Effective _____ requires both theoretical knowledge and practical experience.',
    'The research paper discussed the relationship between _____ and innovation.',
]


_awl_context_bank_cache = None


def _load_awl_context_bank():
    """Load AWL words and example sentences from the frontend public assets.

    Results are cached after the first successful load.  An empty/missing file
    is **not** cached so the next call will retry (e.g. after deployment fixes
    the path).
    """
    global _awl_context_bank_cache
    if _awl_context_bank_cache is not None:
        return _awl_context_bank_cache

    if not AWL_CSV_PATH.is_file() or not AWL_SENTENCE_PATH.is_file():
        return ()

    with AWL_CSV_PATH.open('r', encoding='utf-8-sig', newline='') as csv_file:
        csv_rows = [row for row in csv.reader(csv_file) if row]

    with AWL_SENTENCE_PATH.open('r', encoding='utf-8-sig') as sentence_file:
        sentence_rows = [line.strip() for line in sentence_file.read().splitlines()]

    entries = []
    for index, row in enumerate(csv_rows):
        word = (row[0] or '').strip() if row else ''
        definition = (row[1] or '').strip() if len(row) > 1 else ''
        sentence = sentence_rows[index].strip() if index < len(sentence_rows) else ''

        if word and sentence:
            entries.append({
                'word': word,
                'definition': definition,
                'sentence': sentence,
            })

    result = tuple(entries)
    if result:
        _awl_context_bank_cache = result
    return result


def _build_context_blank_progress(count):
    if count <= len(CONTEXT_GUESSER_BLANK_STAGES):
        return list(CONTEXT_GUESSER_BLANK_STAGES[:count])
    return list(CONTEXT_GUESSER_BLANK_STAGES) + [CONTEXT_GUESSER_BLANK_STAGES[-1]] * (
        count - len(CONTEXT_GUESSER_BLANK_STAGES)
    )


def _is_context_candidate(token_text):
    normalized = (token_text or '').strip().lower()
    return len(normalized) >= 4 and normalized not in CONTEXT_STOPWORDS


def _mask_context_sentence(sentence, primary_word, blank_count):
    tokens = list(CONTEXT_TOKEN_PATTERN.finditer(sentence or ''))
    if not tokens:
        fallback = (primary_word or '').strip()
        return sentence or '_____', [fallback] if fallback else []

    desired_blank_count = max(1, min(blank_count, len(tokens)))
    selected_indexes = []
    normalized_primary = (primary_word or '').strip().lower()

    if normalized_primary:
        for idx, match in enumerate(tokens):
            if match.group(0).lower() == normalized_primary:
                selected_indexes.append(idx)
                break

    if not selected_indexes:
        for idx, match in enumerate(tokens):
            if _is_context_candidate(match.group(0)):
                selected_indexes.append(idx)
                break

    if not selected_indexes:
        selected_indexes.append(0)

    for idx, match in enumerate(tokens):
        if len(selected_indexes) >= desired_blank_count:
            break
        if idx in selected_indexes:
            continue
        if _is_context_candidate(match.group(0)):
            selected_indexes.append(idx)

    for idx in range(len(tokens)):
        if len(selected_indexes) >= desired_blank_count:
            break
        if idx not in selected_indexes:
            selected_indexes.append(idx)

    selected_indexes = sorted(selected_indexes[:desired_blank_count])
    answers = []
    parts = []
    cursor = 0

    for idx in selected_indexes:
        match = tokens[idx]
        start, end = match.span()
        parts.append(sentence[cursor:start])
        parts.append('_____')
        answers.append(match.group(0))
        cursor = end

    parts.append(sentence[cursor:])
    return ''.join(parts), answers


def _generate_word_duel_questions(count):
    words = Word.query.order_by(db.func.random()).limit(count).all()
    return [
        {
            'id': index + 1,
            'question': word.definition or f'Definition for: {word.text}',
            'answer': word.text,
        }
        for index, word in enumerate(words)
    ]


def _generate_awl_context_questions(count):
    context_bank = list(_load_awl_context_bank())
    if not context_bank:
        return []

    selected_entries = random.sample(context_bank, min(count, len(context_bank)))
    blank_schedule = _build_context_blank_progress(len(selected_entries))
    questions = []

    for index, entry in enumerate(selected_entries):
        masked_sentence, answers = _mask_context_sentence(
            entry['sentence'],
            entry['word'],
            blank_schedule[index],
        )
        if not answers:
            continue

        questions.append({
            'id': index + 1,
            'sentence': masked_sentence,
            'spoken_text': entry['sentence'],
            'answers': answers,
            'answer': answers[0],
            'blank_count': len(answers),
            'blank_lengths': [max(5, len(answer)) for answer in answers],
            'explanation': entry['definition'] or f"{entry['word']} - an academic vocabulary word.",
        })

    return questions


def _generate_fallback_context_questions(count):
    words = Word.query.order_by(db.func.random()).limit(count).all()
    if not words:
        return []

    blank_schedule = _build_context_blank_progress(len(words))
    questions = []

    for index, word in enumerate(words):
        full_sentence = CONTEXT_TEMPLATES[index % len(CONTEXT_TEMPLATES)].replace('_____', word.text)
        masked_sentence, answers = _mask_context_sentence(
            full_sentence,
            word.text,
            blank_schedule[index],
        )
        if not answers:
            answers = [word.text]

        questions.append({
            'id': index + 1,
            'sentence': masked_sentence,
            'spoken_text': full_sentence,
            'answers': answers,
            'answer': answers[0],
            'blank_count': len(answers),
            'blank_lengths': [max(5, len(answer)) for answer in answers],
            'explanation': word.definition or f'{word.text} - an academic vocabulary word.',
        })

    return questions


def generate_game_questions(game_type, count=5):
    """Generate game questions for room games."""
    if game_type == 'word_duel':
        return _generate_word_duel_questions(count)

    if game_type == 'context_guesser':
        questions = _generate_awl_context_questions(count)
        if questions:
            return questions
        return _generate_fallback_context_questions(count)

    return []


@room_bp.route('/game-questions', methods=['GET'])
@login_required
def get_game_questions():
    """Generate random game questions from the word database."""
    game_type = request.args.get('type', 'word_duel')
    count = request.args.get('count', 5, type=int)
    count = min(max(count, 3), 30)

    if game_type not in ('word_duel', 'context_guesser'):
        return jsonify({'error': 'type must be word_duel or context_guesser'}), 400

    questions = generate_game_questions(game_type, count)
    return jsonify({'questions': questions}), 200


@room_bp.route('/game-records/<int:record_id>', methods=['GET'])
@login_required
def get_game_record(record_id):
    """Get detailed game record. record_id can be a GameRecord ID or a RoomRecord ID."""
    # First try GameRecord directly
    record = db.session.get(GameRecord, record_id)
    if not record:
        # Try looking up via RoomRecord → find matching GameRecord
        room_record = db.session.get(RoomRecord, record_id)
        if room_record and room_record.room_type == 'game':
            record = GameRecord.query.filter_by(
                room_id=room_record.room_id,
                user_id=room_record.user_id,
            ).order_by(GameRecord.created_at.desc()).first()

    if not record:
        return jsonify({'error': 'Record not found'}), 404

    if record.user_id != current_user.id and not getattr(current_user, 'is_admin', False):
        return jsonify({'error': 'Not authorized'}), 403

    return jsonify(record.to_dict()), 200


