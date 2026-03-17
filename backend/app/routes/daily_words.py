from datetime import date
from flask import Blueprint, jsonify, request
from app.models.word import Word

daily_words_bp = Blueprint('daily_words', __name__, url_prefix='/api')


@daily_words_bp.route('/daily-words', methods=['GET'])
def get_daily_words():
    request_date = request.args.get('date', date.today().isoformat())

    # Use date hash to select a consistent set of words for each day
    words = Word.query.all()
    if not words:
        return jsonify({'date': request_date, 'words': []}), 200

    # Select 5-8 words based on date seed
    day_seed = hash(request_date) % len(words)
    count = min(max(5, len(words)), 8)
    selected = []
    for i in range(count):
        idx = (day_seed + i) % len(words)
        selected.append(words[idx])

    return jsonify({
        'date': request_date,
        'words': [w.to_dict() for w in selected]
    }), 200
