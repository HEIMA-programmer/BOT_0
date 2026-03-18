from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.word_bank import WordBank
from app.models.review_history import ReviewHistory

word_bank_bp = Blueprint('word_bank', __name__, url_prefix='/api')


@word_bank_bp.route('/word-bank', methods=['GET'])
@login_required
def get_word_bank():
    entries = WordBank.query.filter_by(user_id=current_user.id).all()
    return jsonify({'words': [e.to_dict() for e in entries]}), 200


@word_bank_bp.route('/word-bank', methods=['POST'])
@login_required
def add_to_word_bank():
    from app.models.word import Word

    data = request.get_json()
    if not data:
        return jsonify({'error': 'word_id or word_text is required'}), 400

    word_id = data.get('word_id')
    word_text = data.get('word_text')

    if not word_id and not word_text:
        return jsonify({'error': 'word_id or word_text is required'}), 400

    # Prefer text-based lookup to avoid frontend/backend ID mismatch
    word = None
    if word_text:
        word = Word.query.filter_by(text=word_text).first()
        if not word:
            word = Word(
                text=word_text,
                definition=data.get('definition', ''),
                example_sentence=data.get('example_sentence', ''),
                part_of_speech=data.get('part_of_speech', ''),
                difficulty_level=data.get('difficulty_level', 'intermediate'),
            )
            db.session.add(word)
            db.session.flush()
        word_id = word.id
    else:
        word = Word.query.get(word_id)
        if not word:
            return jsonify({'error': 'Word not found'}), 404

    existing = WordBank.query.filter_by(
        user_id=current_user.id, word_id=word_id
    ).first()
    if existing:
        return jsonify({'error': 'Word already in bank'}), 409

    entry = WordBank(user_id=current_user.id, word_id=word_id)
    db.session.add(entry)
    db.session.commit()

    return jsonify(entry.to_dict()), 201


@word_bank_bp.route('/word-bank/<int:entry_id>', methods=['DELETE'])
@login_required
def remove_from_word_bank(entry_id):
    entry = WordBank.query.filter_by(
        id=entry_id, user_id=current_user.id
    ).first()
    if not entry:
        return jsonify({'error': 'Not found'}), 404

    db.session.delete(entry)
    db.session.commit()

    return jsonify({'message': 'Removed from word bank'}), 200


@word_bank_bp.route('/word-bank/<int:entry_id>', methods=['PATCH'])
@login_required
def update_word_bank_entry(entry_id):
    entry = WordBank.query.filter_by(
        id=entry_id, user_id=current_user.id
    ).first()
    if not entry:
        return jsonify({'error': 'Not found'}), 404

    data = request.get_json()
    if 'mastery_level' in data:
        mastery_level = data['mastery_level']
        if not isinstance(mastery_level, int) or mastery_level < 0 or mastery_level > 3:
            return jsonify({'error': 'Invalid mastery level'}), 400
        entry.mastery_level = mastery_level

    db.session.commit()
    return jsonify(entry.to_dict()), 200


@word_bank_bp.route('/word-bank/stats', methods=['GET'])
@login_required
def get_word_bank_stats():
    today = datetime.now(timezone.utc).date()
    
    entries = WordBank.query.filter_by(user_id=current_user.id).all()
    
    today_reviews = ReviewHistory.query.filter(
        ReviewHistory.user_id == current_user.id,
        db.func.date(ReviewHistory.review_date) == today
    ).all()
    
    review_history = db.session.query(
        db.func.date(ReviewHistory.review_date).label('date'),
        db.func.count(ReviewHistory.id).label('count')
    ).filter(
        ReviewHistory.user_id == current_user.id
    ).group_by(
        db.func.date(ReviewHistory.review_date)
    ).order_by(
        db.func.date(ReviewHistory.review_date).desc()
    ).limit(30).all()
    
    stats = {
        'total': len(entries),
        'new': len([e for e in entries if e.mastery_level == 0]),
        'learning': len([e for e in entries if e.mastery_level == 1]),
        'familiar': len([e for e in entries if e.mastery_level == 2]),
        'mastered': len([e for e in entries if e.mastery_level == 3]),
        'today_reviewed': len(today_reviews),
        'review_history': [{'date': str(r.date), 'count': r.count} for r in review_history]
    }
    
    return jsonify(stats), 200


@word_bank_bp.route('/word-bank/<int:entry_id>/review', methods=['POST'])
@login_required
def review_word(entry_id):
    entry = WordBank.query.filter_by(
        id=entry_id, user_id=current_user.id
    ).first()
    if not entry:
        return jsonify({'error': 'Not found'}), 404

    data = request.get_json()
    knew_it = data.get('knew_it', True)
    
    if knew_it and entry.mastery_level < 3:
        entry.mastery_level = entry.mastery_level + 1
    
    entry.last_reviewed = datetime.now(timezone.utc)
    
    review = ReviewHistory(
        user_id=current_user.id,
        word_bank_entry_id=entry.id,
        knew_it=knew_it
    )
    
    db.session.add(review)
    db.session.commit()
    
    return jsonify(entry.to_dict()), 200
