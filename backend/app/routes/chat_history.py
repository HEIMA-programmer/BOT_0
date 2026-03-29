"""REST API for conversation history (sessions + messages + scores)."""

import json
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from app import db
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.services.scenario_prompts import SCENARIO_SUB_OPTIONS, get_scenario_prompt
from datetime import datetime, timezone

chat_history_bp = Blueprint('chat_history', __name__, url_prefix='/api/chat-history')


@chat_history_bp.route('/scenarios/<scenario_type>', methods=['GET'])
@login_required
def get_scenario_options(scenario_type):
    options = SCENARIO_SUB_OPTIONS.get(scenario_type)
    if not options:
        return jsonify({'error': 'Unknown scenario type'}), 404
    return jsonify({'options': options})


@chat_history_bp.route('/scenario-prompt', methods=['POST'])
@login_required
def get_prompt():
    data = request.get_json() or {}
    scenario_type = data.get('scenario_type')
    sub_scenario = data.get('sub_scenario')
    custom_context = data.get('custom_context')
    prompt = get_scenario_prompt(scenario_type, sub_scenario, custom_context)
    return jsonify({'prompt': prompt})


@chat_history_bp.route('/sessions', methods=['POST'])
@login_required
def create_session():
    data = request.get_json() or {}
    scenario_type = data.get('scenario_type', 'free_conversation')

    session = ChatSession(
        user_id=current_user.id,
        scenario_type=scenario_type,
    )
    db.session.add(session)
    db.session.commit()

    return jsonify(session.to_dict()), 201


@chat_history_bp.route('/sessions', methods=['GET'])
@login_required
def list_sessions():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    scenario_type = request.args.get('scenario_type')

    query = ChatSession.query.filter_by(user_id=current_user.id)
    if scenario_type:
        query = query.filter_by(scenario_type=scenario_type)
    query = query.order_by(ChatSession.started_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    sessions = []
    for s in pagination.items:
        d = s.to_dict()
        # Parse report to include overall_score in list view
        if s.report:
            try:
                report = json.loads(s.report)
                d['overall_score'] = report.get('overall_score')
            except (json.JSONDecodeError, TypeError):
                pass
        d['message_count'] = len(s.messages)
        sessions.append(d)

    return jsonify({
        'sessions': sessions,
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@chat_history_bp.route('/sessions/<int:session_id>', methods=['GET'])
@login_required
def get_session(session_id):
    session = db.session.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        return jsonify({'error': 'Session not found'}), 404

    data = session.to_dict(include_messages=True)

    # Parse report JSON
    if session.report:
        try:
            data['report'] = json.loads(session.report)
        except (json.JSONDecodeError, TypeError):
            pass

    return jsonify(data)


@chat_history_bp.route('/sessions/<int:session_id>/messages', methods=['POST'])
@login_required
def save_messages(session_id):
    session = db.session.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        return jsonify({'error': 'Session not found'}), 404

    data = request.get_json() or {}
    messages = data.get('messages', [])

    for msg in messages:
        db.session.add(ChatMessage(
            session_id=session_id,
            role=msg.get('role', 'user'),
            content=msg.get('content', ''),
        ))

    db.session.commit()
    return jsonify({'saved': len(messages)}), 201


@chat_history_bp.route('/sessions/<int:session_id>/end', methods=['PUT'])
@login_required
def end_session(session_id):
    session = db.session.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        return jsonify({'error': 'Session not found'}), 404

    data = request.get_json() or {}
    session.ended_at = datetime.now(timezone.utc)

    if 'report' in data:
        report = data['report']
        session.report = json.dumps(report) if isinstance(report, dict) else report

    db.session.commit()
    return jsonify(session.to_dict())
