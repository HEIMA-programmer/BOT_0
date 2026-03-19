from datetime import datetime, timezone, date as date_type
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.word import Word
from app.models.user_word_progress import UserWordProgress
from app.models.word_bank import WordBank

daily_learning_bp = Blueprint('daily_learning', __name__, url_prefix='/api')


@daily_learning_bp.route('/daily-learning/today', methods=['GET'])
@login_required
def get_today_words():
    """Get today's learning words: carry-over pending + new words.

    Assignment logic (prevents re-filling within the same day):
    - carry_over: pending words from *previous* days
    - assigned_today: all words assigned today (any status)
    - today_target = daily_count - carry_over count
    - new_needed = today_target - assigned_today (only if > 0)
    """
    daily_count = request.args.get('count', 10, type=int)
    daily_count = max(1, min(daily_count, 50))
    today = date_type.today()

    # Carry-over: pending words assigned BEFORE today
    carryover = UserWordProgress.query.filter(
        UserWordProgress.user_id == current_user.id,
        UserWordProgress.status == 'pending',
        UserWordProgress.assigned_date < today
    ).all()
    carryover_count = len(carryover)

    # Words assigned today (any status: pending, review, mastered)
    assigned_today_count = UserWordProgress.query.filter(
        UserWordProgress.user_id == current_user.id,
        UserWordProgress.assigned_date == today
    ).count()

    # Carry-over words already studied today should still count toward today's cap,
    # otherwise finishing old pending words would immediately unlock a fresh batch.
    processed_carryover_today_count = UserWordProgress.query.filter(
        UserWordProgress.user_id == current_user.id,
        UserWordProgress.assigned_date < today,
        UserWordProgress.status != 'pending',
        db.func.date(UserWordProgress.updated_at) == today
    ).count()

    # How many new words should be assigned today
    daily_slots_used = carryover_count + assigned_today_count + processed_carryover_today_count
    new_needed = max(0, daily_count - daily_slots_used)

    if new_needed > 0:
        # Get word IDs already in progress for this user
        existing_word_ids = db.session.query(UserWordProgress.word_id).filter_by(
            user_id=current_user.id
        ).all()
        existing_ids = {row[0] for row in existing_word_ids}

        # Get new words not yet assigned
        query = Word.query
        if existing_ids:
            query = query.filter(Word.id.notin_(existing_ids))
        available_words = query.order_by(Word.id).limit(new_needed).all()

        for word in available_words:
            progress = UserWordProgress(
                user_id=current_user.id,
                word_id=word.id,
                status='pending',
                assigned_date=today
            )
            db.session.add(progress)

        db.session.commit()

    completed_today_count = UserWordProgress.query.filter(
        UserWordProgress.user_id == current_user.id,
        UserWordProgress.assigned_date == today,
        UserWordProgress.status != 'pending',
    ).count()

    carryover_pending = UserWordProgress.query.filter(
        UserWordProgress.user_id == current_user.id,
        UserWordProgress.status == 'pending',
        UserWordProgress.assigned_date < today,
    ).order_by(UserWordProgress.assigned_date.asc(), UserWordProgress.id.asc()).all()

    today_pending = UserWordProgress.query.filter(
        UserWordProgress.user_id == current_user.id,
        UserWordProgress.status == 'pending',
        UserWordProgress.assigned_date == today,
    ).order_by(UserWordProgress.id.asc()).all()

    remaining_today_slots = max(
        0,
        daily_count - len(carryover_pending) - processed_carryover_today_count - completed_today_count
    )
    pending = carryover_pending + today_pending[:remaining_today_slots]

    review_count = UserWordProgress.query.filter_by(
        user_id=current_user.id,
        status='review'
    ).count()

    mastered_count = UserWordProgress.query.filter_by(
        user_id=current_user.id,
        status='mastered'
    ).count()

    total_words = Word.query.count()

    return jsonify({
        'date': today.isoformat(),
        'words': [p.to_dict() for p in pending],
        'pending_count': len(pending),
        'review_count': review_count,
        'mastered_count': mastered_count,
        'total_words': total_words,
    }), 200


@daily_learning_bp.route('/daily-learning/word-status', methods=['POST'])
@login_required
def update_word_status():
    """Update a word's learning status."""
    data = request.get_json()
    progress_id = data.get('progress_id')
    new_status = data.get('status')

    if not progress_id or new_status not in ('review', 'mastered', 'pending'):
        return jsonify({'error': 'progress_id and valid status required'}), 400

    progress = UserWordProgress.query.filter_by(
        id=progress_id,
        user_id=current_user.id
    ).first()

    if not progress:
        return jsonify({'error': 'Not found'}), 404

    progress.status = new_status
    progress.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify(progress.to_dict()), 200


@daily_learning_bp.route('/daily-learning/review-words', methods=['GET'])
@login_required
def get_review_words():
    """Get all words marked for review."""
    words = UserWordProgress.query.filter_by(
        user_id=current_user.id,
        status='review'
    ).order_by(UserWordProgress.updated_at.desc()).all()

    return jsonify({
        'words': [w.to_dict() for w in words],
        'count': len(words)
    }), 200


@daily_learning_bp.route('/daily-learning/mastered-words', methods=['GET'])
@login_required
def get_mastered_words():
    """Get all words marked as mastered."""
    words = UserWordProgress.query.filter_by(
        user_id=current_user.id,
        status='mastered'
    ).order_by(UserWordProgress.updated_at.desc()).all()

    return jsonify({
        'words': [w.to_dict() for w in words],
        'count': len(words)
    }), 200


@daily_learning_bp.route('/daily-learning/all-words', methods=['GET'])
@login_required
def get_all_words():
    """Get all available words with user's progress status."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '', type=str)

    query = Word.query
    if search:
        query = query.filter(Word.text.ilike(f'%{search}%'))

    total = query.count()
    words = query.order_by(Word.id).offset((page - 1) * per_page).limit(per_page).all()

    # Get user's progress for these words
    word_ids = [w.id for w in words]
    progress_map = {}
    if word_ids:
        progress_entries = UserWordProgress.query.filter(
            UserWordProgress.user_id == current_user.id,
            UserWordProgress.word_id.in_(word_ids)
        ).all()
        progress_map = {p.word_id: p.status for p in progress_entries}

    # Check which words are in word bank
    bank_set = set()
    if word_ids:
        bank_entries = WordBank.query.filter(
            WordBank.user_id == current_user.id,
            WordBank.word_id.in_(word_ids)
        ).all()
        bank_set = {b.word_id for b in bank_entries}

    result = []
    for w in words:
        d = w.to_dict()
        d['progress_status'] = progress_map.get(w.id, None)
        d['in_word_bank'] = w.id in bank_set
        result.append(d)

    return jsonify({
        'words': result,
        'total': total,
        'page': page,
        'per_page': per_page
    }), 200


@daily_learning_bp.route('/daily-learning/stats', methods=['GET'])
@login_required
def get_learning_stats():
    """Get learning statistics for home page."""
    mastered_count = UserWordProgress.query.filter_by(
        user_id=current_user.id,
        status='mastered'
    ).count()

    review_count = UserWordProgress.query.filter_by(
        user_id=current_user.id,
        status='review'
    ).count()

    pending_count = UserWordProgress.query.filter_by(
        user_id=current_user.id,
        status='pending'
    ).count()

    total_learned = mastered_count + review_count
    total_words = Word.query.count()
    word_bank_count = WordBank.query.filter_by(user_id=current_user.id).count()

    return jsonify({
        'mastered': mastered_count,
        'review': review_count,
        'pending': pending_count,
        'total_learned': total_learned,
        'total_words': total_words,
        'word_bank_count': word_bank_count,
    }), 200


@daily_learning_bp.route('/daily-learning/mark-mastered', methods=['POST'])
@login_required
def mark_word_mastered():
    """Mark a word as mastered by word_id. Creates progress entry if needed."""
    data = request.get_json()
    word_id = data.get('word_id')

    if not word_id:
        return jsonify({'error': 'word_id is required'}), 400

    word = Word.query.get(word_id)
    if not word:
        return jsonify({'error': 'Word not found'}), 404

    progress = UserWordProgress.query.filter_by(
        user_id=current_user.id,
        word_id=word_id
    ).first()

    if progress:
        progress.status = 'mastered'
        progress.updated_at = datetime.now(timezone.utc)
    else:
        progress = UserWordProgress(
            user_id=current_user.id,
            word_id=word_id,
            status='mastered',
            assigned_date=date_type.today()
        )
        db.session.add(progress)

    db.session.commit()
    return jsonify(progress.to_dict()), 200


@daily_learning_bp.route('/daily-learning/add-to-bank', methods=['POST'])
@login_required
def add_word_to_bank():
    """Add a word to the user's word bank from learning context."""
    data = request.get_json()
    word_id = data.get('word_id')

    if not word_id:
        return jsonify({'error': 'word_id is required'}), 400

    word = Word.query.get(word_id)
    if not word:
        return jsonify({'error': 'Word not found'}), 404

    existing = WordBank.query.filter_by(
        user_id=current_user.id,
        word_id=word_id
    ).first()
    if existing:
        return jsonify({'error': 'Word already in bank'}), 409

    entry = WordBank(user_id=current_user.id, word_id=word_id)
    db.session.add(entry)
    db.session.commit()

    return jsonify(entry.to_dict()), 201
