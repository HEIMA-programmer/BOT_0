"""
WebSocket handler for AI Conversations (Free + Guided Scenarios).
Simple: SocketIO handlers put/get from thread-safe queues.
One listener thread forwards Gemini responses to the client.
"""

from flask_socketio import emit
from flask import current_app, request
from app import socketio, db
import threading
import base64
from app.services.conversation_service import ConversationService
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from datetime import datetime, timezone


# Store active sessions (session_id -> {service, db_session_id, scenario_type})
active_sessions = {}


@socketio.on('connect', namespace='/conversation')
def handle_connect():
    session_id = request.sid
    current_app.logger.info(f'Client connected to conversation: {session_id}')


@socketio.on('disconnect', namespace='/conversation')
def handle_disconnect():
    session_id = request.sid
    current_app.logger.info(f'Client disconnected from conversation: {session_id}')
    _cleanup_session(session_id)


@socketio.on('start_conversation', namespace='/conversation')
def handle_start_conversation(data=None):
    session_id = request.sid
    data = data or {}
    current_app.logger.info(f'Starting conversation for session: {session_id}')

    system_prompt = data.get('system_prompt')
    voice_name = data.get('voice_name')
    db_session_id = data.get('db_session_id')
    scenario_type = data.get('scenario_type', 'free_conversation')

    # For guided scenarios, send an initial message to trigger AI to speak first
    initial_message = None
    if scenario_type in ('office_hours', 'seminar_discussion'):
        initial_message = "Hello, I just arrived. Please start the conversation according to your role."

    # Clean up any existing session before starting a new one
    if session_id in active_sessions:
        current_app.logger.info(f'Cleaning up existing session before restart: {session_id}')
        _cleanup_session(session_id)

    try:
        service = ConversationService(
            system_prompt=system_prompt,
            voice_name=voice_name,
            initial_message=initial_message,
        )
        active_sessions[session_id] = {
            'service': service,
            'db_session_id': db_session_id,
            'scenario_type': scenario_type,
        }
        service.start()

        # Forward Gemini responses to the client in a background thread
        app = current_app._get_current_object()
        threading.Thread(
            target=_forward_responses,
            args=(service, session_id, app),
            daemon=True
        ).start()

    except Exception as e:
        current_app.logger.error(f'Failed to start conversation: {e}')
        emit('error', {'message': str(e)})


@socketio.on('audio_chunk', namespace='/conversation')
def handle_audio_chunk(data):
    session_id = request.sid
    session_data = active_sessions.get(session_id)
    if not session_data:
        return

    audio_base64 = data.get('audio')
    if audio_base64:
        audio_data = base64.b64decode(audio_base64)
        session_data['service'].audio_in_queue.put(audio_data)


@socketio.on('end_conversation', namespace='/conversation')
def handle_end_conversation():
    session_id = request.sid
    current_app.logger.info(f'Ending conversation for session: {session_id}')
    session_data = active_sessions.get(session_id)
    if not session_data:
        return

    service = session_data['service']
    db_session_id = session_data.get('db_session_id')

    # Save messages to database
    if db_session_id:
        try:
            messages = service.get_messages()
            if messages:
                for msg in messages:
                    db.session.add(ChatMessage(
                        session_id=db_session_id,
                        role=msg['role'],
                        content=msg['content'],
                    ))
                chat_session = db.session.get(ChatSession, db_session_id)
                if chat_session and not chat_session.ended_at:
                    chat_session.ended_at = datetime.now(timezone.utc)
                db.session.commit()
        except Exception as e:
            current_app.logger.error(f'Failed to save messages: {e}')

    # Stop the service but keep session data for scoring
    try:
        service.stop()
    except Exception:
        pass


@socketio.on('request_scoring', namespace='/conversation')
def handle_request_scoring(data=None):
    session_id = request.sid
    session_data = active_sessions.get(session_id)
    if not session_data:
        emit('error', {'message': 'No active conversation session'})
        return

    service = session_data['service']
    db_session_id = session_data.get('db_session_id')
    scenario_type = session_data.get('scenario_type', 'free_conversation')
    sub_scenario = (data or {}).get('sub_scenario')

    messages = service.get_messages()
    if not messages:
        emit('scoring_complete', {'error': 'No conversation messages to score'})
        return

    emit('scoring_started', {})

    app = current_app._get_current_object()
    threading.Thread(
        target=_do_scoring,
        args=(messages, scenario_type, sub_scenario, db_session_id, session_id, app),
        daemon=True
    ).start()

    # Now safe to remove from active_sessions
    active_sessions.pop(session_id, None)


def _do_scoring(messages, scenario_type, sub_scenario, db_session_id, ws_session_id, app):
    """Run scoring in a background thread to avoid blocking the WebSocket."""
    import json
    with app.app_context():
        try:
            from app.services.scoring_service import ScoringService
            scoring = ScoringService()
            scores = scoring.score_conversation(messages, scenario_type, sub_scenario)

            # Save scores to database if we have a db session
            if db_session_id:
                chat_session = db.session.get(ChatSession, db_session_id)
                if chat_session:
                    chat_session.report = json.dumps(scores)
                    chat_session.ended_at = datetime.now(timezone.utc)
                    db.session.commit()

            socketio.emit('scoring_complete', {'scores': scores},
                          namespace='/conversation', room=ws_session_id)

        except Exception as e:
            app.logger.error(f'Scoring failed: {e}')
            socketio.emit('scoring_complete', {'error': str(e)},
                          namespace='/conversation', room=ws_session_id)


def _cleanup_session(session_id, save_messages=False):
    """Stop the service and optionally save messages to the database."""
    session_data = active_sessions.get(session_id)
    if not session_data:
        return

    service = session_data['service']
    db_session_id = session_data.get('db_session_id')

    # Save messages to database
    if save_messages and db_session_id:
        try:
            messages = service.get_messages()
            if messages:
                for msg in messages:
                    db.session.add(ChatMessage(
                        session_id=db_session_id,
                        role=msg['role'],
                        content=msg['content'],
                    ))
                chat_session = db.session.get(ChatSession, db_session_id)
                if chat_session and not chat_session.ended_at:
                    chat_session.ended_at = datetime.now(timezone.utc)
                db.session.commit()
        except Exception as e:
            current_app.logger.error(f'Failed to save messages: {e}')

    try:
        service.stop()
    except Exception:
        pass
    active_sessions.pop(session_id, None)


def _forward_responses(service, session_id, app):
    """Poll response_queue and emit events to the client. Runs in a plain thread."""
    with app.app_context():
        # Wait for session to start (running=True) or an early error/ready message
        while True:
            if service.running:
                break
            if not service.response_queue.empty():
                break
            import time
            time.sleep(0.1)

        while True:
            try:
                resp = service.response_queue.get(timeout=5.0)
            except Exception:
                if not service.running and service.response_queue.empty():
                    break
                continue

            rtype = resp.get('type')

            if rtype == 'ready':
                socketio.emit('ready', {}, namespace='/conversation', room=session_id)

            elif rtype == 'ai_audio_chunk':
                socketio.emit('ai_audio_chunk', {'audio': resp['audio']},
                              namespace='/conversation', room=session_id)

            elif rtype == 'user_transcript':
                socketio.emit('user_transcript', {'text': resp['text']},
                              namespace='/conversation', room=session_id)

            elif rtype == 'user_final':
                socketio.emit('user_final', {'text': resp['text']},
                              namespace='/conversation', room=session_id)

            elif rtype == 'ai_transcript':
                socketio.emit('ai_transcript', {'text': resp['text']},
                              namespace='/conversation', room=session_id)

            elif rtype == 'ai_speaking_end':
                socketio.emit('ai_speaking_end', {},
                              namespace='/conversation', room=session_id)

            elif rtype == 'error':
                socketio.emit('error', {'message': resp['message']},
                              namespace='/conversation', room=session_id)
                break
