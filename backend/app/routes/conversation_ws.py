"""
WebSocket handler for Free Conversation.
Simple: SocketIO handlers put/get from thread-safe queues.
One listener thread forwards Gemini responses to the client.
"""

from flask_socketio import emit
from flask import current_app, request
from app import socketio
import threading
import base64
from app.services.conversation_service import ConversationService


# Store active sessions (session_id -> service)
active_sessions = {}


@socketio.on('connect', namespace='/conversation')
def handle_connect():
    session_id = request.sid
    current_app.logger.info(f'Client connected to conversation: {session_id}')


@socketio.on('disconnect', namespace='/conversation')
def handle_disconnect():
    session_id = request.sid
    current_app.logger.info(f'Client disconnected from conversation: {session_id}')
    if session_id in active_sessions:
        active_sessions[session_id].stop()
        del active_sessions[session_id]


@socketio.on('start_conversation', namespace='/conversation')
def handle_start_conversation():
    session_id = request.sid
    current_app.logger.info(f'Starting conversation for session: {session_id}')

    try:
        service = ConversationService()
        active_sessions[session_id] = service
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
    service = active_sessions.get(session_id)
    if not service:
        return

    audio_base64 = data.get('audio')
    if audio_base64:
        audio_data = base64.b64decode(audio_base64)
        service.audio_in_queue.put(audio_data)


@socketio.on('end_conversation', namespace='/conversation')
def handle_end_conversation():
    session_id = request.sid
    current_app.logger.info(f'Ending conversation for session: {session_id}')
    if session_id in active_sessions:
        active_sessions[session_id].stop()
        del active_sessions[session_id]


def _forward_responses(service, session_id, app):
    """Poll response_queue and emit events to the client. Runs in a plain thread."""
    with app.app_context():
        # Wait for session to start (running=True) or an early error/ready message
        while True:
            if service.running:
                break
            # Check if there's an early message (error or ready) before running is set
            if not service.response_queue.empty():
                break
            import time
            time.sleep(0.1)

        while True:
            try:
                resp = service.response_queue.get(timeout=5.0)
            except Exception:
                # Keep looping as long as service is running
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
