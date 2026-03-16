from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.word_bank import WordBank

word_bank_bp = Blueprint('word_bank', __name__, url_prefix='/api')


@word_bank_bp.route('/word-bank', methods=['GET'])
@login_required
def get_word_bank():
    entries = WordBank.query.filter_by(user_id=current_user.id).all()
    return jsonify({'words': [e.to_dict() for e in entries]}), 200


@word_bank_bp.route('/word-bank', methods=['POST'])
@login_required
def add_to_word_bank():
    data = request.get_json()
    if not data or 'word_id' not in data:
        return jsonify({'error': 'word_id is required'}), 400

    word_id = data['word_id']

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
