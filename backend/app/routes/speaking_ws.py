import base64
import json

from flask_socketio import emit
from flask import current_app
from flask_login import current_user

from app import socketio, db
from app.models.speaking_session import SpeakingSession
from app.services.speaking_service import SpeakingService


@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    current_app.logger.info('Client connected to speaking WebSocket')
    emit('connected', {'status': 'success'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    current_app.logger.info('Client disconnected from speaking WebSocket')


@socketio.on('submit_audio')
def handle_submit_audio(data):
    """
    Handle audio submission from client.

    Expected data format:
    {
        'audio': base64-encoded audio data,
        'topic': str - the speaking topic,
        'mimeType': str - MIME type of the audio (optional),
        'scenario_type': str - optional tag such as 'office_hours', 'custom', etc.
    }
    """
    try:
        current_app.logger.info('Received audio submission')

        # Validate input
        if not data or 'audio' not in data or 'topic' not in data:
            emit('error', {'message': '缺少音频数据或主题'})
            return

        topic = data['topic']
        audio_base64 = data['audio']
        mime_type = data.get('mimeType', 'audio/webm')
        scenario_type = data.get('scenario_type')

        # Decode base64 audio
        try:
            audio_data = base64.b64decode(audio_base64)
        except Exception as e:
            current_app.logger.error(f'Failed to decode audio: {e}')
            emit('error', {'message': '音频数据格式错误'})
            return

        # Notify client that processing has started
        emit('progress', {'stage': 'start', 'message': 'Decoding your voice... 🎵'})

        # Process audio with SpeakingService
        service = SpeakingService()

        # Convert audio format if needed
        if mime_type != 'audio/wav':
            emit('progress', {'stage': 'converting', 'message': 'Converting audio format...'})
            current_app.logger.info(f'Processing audio with Azure Speech SDK (format: {mime_type})')
        else:
            emit('progress', {'stage': 'recognizing', 'message': 'AI is listening carefully... 👂'})
            current_app.logger.info('Processing audio with Azure Speech SDK (format: WAV)')

        # Get pronunciation scores and transcript
        pronunciation_result = service.process_audio(audio_data, topic, mime_type)

        transcript = pronunciation_result['transcript']
        pronunciation_scores = pronunciation_result['pronunciation']

        # Get content scores from Claude
        emit('progress', {'stage': 'scoring', 'message': 'AI is grading your response... ✍️'})
        current_app.logger.info('Getting content scores from Claude API')
        content_scores = service.get_content_scores(transcript, topic)

        # Prepare final result
        result = {
            'transcript': transcript,
            'pronunciation': pronunciation_scores,
            'content': content_scores
        }

        current_app.logger.info('Successfully processed audio')
        emit('result', result)

        # Persist the session history. Wrapped in its own try/except so a DB
        # failure never disturbs the client that just received its feedback.
        try:
            if getattr(current_user, 'is_authenticated', False):
                pron_overall = int(pronunciation_scores.get('overall', 0) or 0)
                cont_overall = int(content_scores.get('overall', 0) or 0)
                overall_score = round((pron_overall + cont_overall) / 2)

                feedback_summary = None
                feedback_block = content_scores.get('feedback') if isinstance(content_scores, dict) else None
                if isinstance(feedback_block, dict):
                    feedback_summary = feedback_block.get('topic') or feedback_block.get('vocabulary')

                session_row = SpeakingSession(
                    user_id=current_user.id,
                    topic=topic,
                    scenario_type=scenario_type,
                    transcript=transcript,
                    pronunciation_json=json.dumps(pronunciation_scores),
                    content_json=json.dumps(content_scores),
                    overall_score=float(overall_score),
                    score=float(overall_score),
                    ai_feedback=feedback_summary,
                )
                db.session.add(session_row)
                db.session.commit()
        except Exception as persist_err:
            current_app.logger.error(f'Failed to persist speaking session: {persist_err}')
            try:
                db.session.rollback()
            except Exception:
                pass

    except ValueError as e:
        # Handle specific errors (e.g., no speech detected)
        current_app.logger.error(f'Validation error: {e}')
        emit('error', {'message': str(e)})

    except Exception as e:
        # Handle unexpected errors
        current_app.logger.error(f'Error processing audio: {e}')
        emit('error', {'message': '处理音频时出错，请重试'})
