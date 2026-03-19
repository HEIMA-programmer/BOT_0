from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app import db
from app.models.progress import Progress
from app.models.speaking_session import SpeakingSession
from app.models.user_word_progress import UserWordProgress

progress_bp = Blueprint('progress', __name__, url_prefix='/api/progress')

TIME_TRACKING_MODULES = {'vocab', 'listening', 'speaking', 'chat'}


@progress_bp.route('/track-time', methods=['POST'])
@login_required
def track_progress_time():
    payload = request.get_json(silent=True) or {}
    module = payload.get('module')
    activity_type = payload.get('activity_type')
    time_spent = payload.get('time_spent')

    if module not in TIME_TRACKING_MODULES:
        return jsonify({'error': 'Unsupported module'}), 400

    if not isinstance(activity_type, str) or not activity_type.strip():
        return jsonify({'error': 'activity_type is required'}), 400

    if not isinstance(time_spent, int) or time_spent <= 0:
        return jsonify({'error': 'time_spent must be a positive integer'}), 400

    progress_record = Progress(
        user_id=current_user.id,
        module=module,
        activity_type=activity_type.strip(),
        time_spent=time_spent,
    )
    db.session.add(progress_record)
    db.session.commit()

    return jsonify(progress_record.to_dict()), 201


@progress_bp.route('/dashboard', methods=['GET'])
@login_required
def get_progress_dashboard():
    words_learned = UserWordProgress.query.filter(
        UserWordProgress.user_id == current_user.id,
        UserWordProgress.status.in_(('review', 'mastered')),
    ).count()

    listening_done = db.session.query(
        db.func.count(db.distinct(Progress.activity_type))
    ).filter(
        Progress.user_id == current_user.id,
        Progress.module == 'listening',
        ~Progress.activity_type.like('study_time:%')
    ).scalar() or 0

    speaking_sessions = SpeakingSession.query.filter_by(user_id=current_user.id).count()

    total_time_minutes = db.session.query(
        db.func.coalesce(db.func.sum(Progress.time_spent), 0)
    ).filter(
        Progress.user_id == current_user.id
    ).scalar() or 0

    return jsonify({
        'words_learned': words_learned,
        'listening_done': listening_done,
        'speaking_sessions': speaking_sessions,
        'total_time_minutes': int(total_time_minutes),
    }), 200
