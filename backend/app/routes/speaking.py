"""REST endpoints for Structured Speaking session history."""

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app import db
from app.models.speaking_session import SpeakingSession

speaking_bp = Blueprint('speaking', __name__, url_prefix='/api/speaking')


@speaking_bp.route('/sessions', methods=['GET'])
@login_required
def list_sessions():
    """Return the current user's structured speaking history, paginated."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    if per_page < 1:
        per_page = 1
    if per_page > 100:
        per_page = 100

    pagination = (
        SpeakingSession.query
        .filter_by(user_id=current_user.id)
        .order_by(SpeakingSession.created_at.desc(), SpeakingSession.id.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return jsonify({
        'sessions': [s.to_dict() for s in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
    }), 200


@speaking_bp.route('/sessions/<int:session_id>', methods=['GET'])
@login_required
def get_session(session_id):
    session = db.session.get(SpeakingSession, session_id)
    if not session or session.user_id != current_user.id:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify(session.to_dict()), 200


@speaking_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@login_required
def delete_session(session_id):
    session = db.session.get(SpeakingSession, session_id)
    if not session or session.user_id != current_user.id:
        return jsonify({'error': 'Session not found'}), 404
    db.session.delete(session)
    db.session.commit()
    return jsonify({'message': 'deleted'}), 200
