"""
WebSocket handler for Free Conversation
Manages real-time voice conversation with Gemini Live API
"""

from flask_socketio import emit
from flask import current_app, request
from app import socketio
import asyncio
import threading
import base64
from app.services.conversation_service import ConversationService


# Store active sessions (session_id -> service)
active_sessions = {}


def get_session_id():
    """Get session ID from request"""
    return request.sid


@socketio.on('connect', namespace='/conversation')
def handle_connect():
    """Handle client connection"""
    session_id = get_session_id()
    current_app.logger.info(f'Client connected to conversation: {session_id}')


@socketio.on('disconnect', namespace='/conversation')
def handle_disconnect():
    """Handle client disconnection"""
    session_id = get_session_id()
    current_app.logger.info(f'Client disconnected from conversation: {session_id}')

    # Clean up session
    if session_id in active_sessions:
        service = active_sessions[session_id]
        app = current_app._get_current_object()
        # Close session in background
        threading.Thread(target=_close_session_sync, args=(service, app)).start()
        del active_sessions[session_id]


@socketio.on('start_conversation', namespace='/conversation')
def handle_start_conversation():
    """Start a new conversation session"""
    session_id = get_session_id()
    current_app.logger.info(f'Starting conversation for session: {session_id}')

    try:
        # Create new service
        service = ConversationService()

        # Get Flask app for thread context
        app = current_app._get_current_object()

        # Start session in background thread
        def start_session_thread():
            with app.app_context():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

                try:
                    # Run the main session loop
                    loop.run_until_complete(service.run_session())

                except Exception as e:
                    current_app.logger.error(f'Error in session thread: {e}')
                    socketio.emit('error', {'message': str(e)}, namespace='/conversation', room=session_id)
                finally:
                    loop.close()

        # Store service
        active_sessions[session_id] = service

        # Start background thread
        thread = threading.Thread(target=start_session_thread, daemon=True)
        thread.start()

        # Start response listener in another thread
        def listen_responses_thread():
            with app.app_context():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(_listen_for_responses(service, session_id, app))
                except Exception as e:
                    current_app.logger.error(f'Error in response listener: {e}')
                finally:
                    loop.close()

        threading.Thread(target=listen_responses_thread, daemon=True).start()

    except Exception as e:
        current_app.logger.error(f'Failed to start conversation: {e}')
        emit('error', {'message': f'Failed to start conversation: {str(e)}'})


async def _listen_for_responses(service, session_id, app):
    """Listen for responses from Gemini and send to client"""
    with app.app_context():
        try:
            while True:
                response = await service.get_response()

                if response is None:
                    continue

                response_type = response.get('type')
                current_app.logger.info(f'Forwarding response to client: {response_type}')

                if response_type == 'user_transcript':
                    socketio.emit('user_transcript', {'text': response['text']}, namespace='/conversation', room=session_id)

                elif response_type == 'user_final':
                    socketio.emit('user_final', {'text': response['text']}, namespace='/conversation', room=session_id)

                elif response_type == 'ai_audio_chunk':
                    # 新增：转发音频块
                    socketio.emit('ai_audio_chunk', {'audio': response['audio']}, namespace='/conversation', room=session_id)

                elif response_type == 'ai_transcript':
                    # 新增：转发 AI 转写
                    socketio.emit('ai_transcript', {'text': response['text']}, namespace='/conversation', room=session_id)

                elif response_type == 'ai_response':
                    # 旧的响应格式（兼容）
                    event_name = 'ai_greeting' if not hasattr(service, '_greeted') else 'ai_response'
                    service._greeted = True

                    socketio.emit(event_name, {
                        'text': response['text'],
                        'audio': response['audio']
                    }, namespace='/conversation', room=session_id)

                elif response_type == 'ai_speaking_end':
                    socketio.emit('ai_speaking_end', {}, namespace='/conversation', room=session_id)

                elif response_type == 'error':
                    socketio.emit('error', {'message': response['message']}, namespace='/conversation', room=session_id)
                    break

        except Exception as e:
            current_app.logger.error(f'Error listening for responses: {e}')
            socketio.emit('error', {'message': str(e)}, namespace='/conversation', room=session_id)


@socketio.on('audio_chunk', namespace='/conversation')
def handle_audio_chunk(data):
    """Handle audio chunk from client"""
    session_id = get_session_id()

    if session_id not in active_sessions:
        emit('error', {'message': 'No active session'})
        return

    try:
        service = active_sessions[session_id]
        audio_base64 = data.get('audio')

        if not audio_base64:
            return

        current_app.logger.info(f'Received audio chunk from client: {len(audio_base64)} chars')

        # Decode base64 audio
        audio_data = base64.b64decode(audio_base64)
        current_app.logger.info(f'Decoded audio data: {len(audio_data)} bytes')

        # Get Flask app for thread context
        app = current_app._get_current_object()

        # Queue audio to be sent to Gemini
        def queue_audio_thread():
            with app.app_context():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(service.send_audio(audio_data))
                    current_app.logger.info('Audio queued successfully')
                except Exception as e:
                    current_app.logger.error(f'Error queueing audio: {e}')
                finally:
                    loop.close()

        threading.Thread(target=queue_audio_thread, daemon=True).start()

    except Exception as e:
        current_app.logger.error(f'Error handling audio chunk: {e}')
        emit('error', {'message': str(e)})


@socketio.on('stop_speaking', namespace='/conversation')
def handle_stop_speaking():
    """Handle user stopped speaking"""
    session_id = get_session_id()

    if session_id not in active_sessions:
        emit('error', {'message': 'No active session'})
        return

    try:
        service = active_sessions[session_id]

        # Get Flask app for thread context
        app = current_app._get_current_object()

        # Signal stop in background
        def stop_audio_thread():
            with app.app_context():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(service.stop_audio_input())
                except Exception as e:
                    current_app.logger.error(f'Error stopping audio: {e}')
                finally:
                    loop.close()

        threading.Thread(target=stop_audio_thread, daemon=True).start()

    except Exception as e:
        current_app.logger.error(f'Error handling stop speaking: {e}')
        emit('error', {'message': str(e)})


@socketio.on('end_conversation', namespace='/conversation')
def handle_end_conversation():
    """Handle end conversation request"""
    session_id = get_session_id()
    current_app.logger.info(f'Ending conversation for session: {session_id}')

    if session_id in active_sessions:
        service = active_sessions[session_id]
        app = current_app._get_current_object()
        threading.Thread(target=_close_session_sync, args=(service, app)).start()
        del active_sessions[session_id]


def _close_session_sync(service, app=None):
    """Close session synchronously in background thread"""
    if app:
        with app.app_context():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(service.close())
            except Exception as e:
                current_app.logger.error(f'Error closing session: {e}')
            finally:
                loop.close()
    else:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(service.close())
        except Exception:
            pass  # Ignore errors during cleanup without app context
        finally:
            loop.close()
