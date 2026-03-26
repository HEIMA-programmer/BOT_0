from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.follow_along_record import FollowAlongRecord
from app.services.speaking_service import SpeakingService
import base64

follow_along_bp = Blueprint('follow_along', __name__, url_prefix='/api')


@follow_along_bp.route('/follow-along/word', methods=['POST'])
@login_required
def word_follow_along():
    """
    Handle word follow-along practice with text-based scoring.
    
    Expected data:
    {
        'audio': base64-encoded audio data,
        'word': str - target word to repeat,
        'mimeType': str - MIME type of the audio (optional)
    }
    """
    try:
        data = request.get_json()
        if not data or 'audio' not in data or 'word' not in data:
            return jsonify({'error': 'Missing audio data or word'}), 400

        word = data['word'].strip()
        audio_base64 = data['audio']
        mime_type = data.get('mimeType', 'audio/webm')

        # Decode base64 audio
        try:
            audio_data = base64.b64decode(audio_base64)
        except Exception as e:
            return jsonify({'error': 'Invalid audio data format'}), 400

        # Process audio with SpeakingService for transcription
        service = SpeakingService()
        result = service.assess_follow_along(audio_data, word, mime_type)

        # Calculate accuracy score based on text matching
        user_transcript = result['transcript'].lower().strip()
        target_text = word.lower().strip()
        
        # Simple word-level accuracy calculation
        if user_transcript == target_text:
            accuracy_score = 100
        elif user_transcript in target_text:
            accuracy_score = 80  # Partial match
        else:
            accuracy_score = 50  # No match

        # Save record to database
        record = FollowAlongRecord(
            user_id=current_user.id,
            record_type='word',
            target_text=word,
            user_transcript=result['transcript'],
            accuracy_score=accuracy_score,
            pronunciation_scores=result['pronunciation']
        )
        db.session.add(record)
        db.session.commit()

        return jsonify({
            'transcript': result['transcript'],
            'accuracy': accuracy_score,
            'pronunciation': result['pronunciation'],
            'feedback': f'You said: "{result["transcript"]}"',
            'strengths': ['Clear pronunciation' if accuracy_score >= 80 else 'Keep practicing'],
            'improvements': ['Perfect match!' if accuracy_score == 100 else 'Try to be more accurate'],
            'target_word': word
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        current_app.logger.error(f'Follow-along error: {error_details}')
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500


@follow_along_bp.route('/follow-along/sentence', methods=['POST'])
@login_required
def sentence_follow_along():
    """
    Handle sentence follow-along practice with text-based scoring.
    
    Expected data:
    {
        'audio': base64-encoded audio data,
        'sentence': str - target sentence to repeat,
        'mimeType': str - MIME type of the audio (optional)
    }
    """
    try:
        data = request.get_json()
        if not data or 'audio' not in data or 'sentence' not in data:
            return jsonify({'error': 'Missing audio data or sentence'}), 400

        sentence = data['sentence'].strip()
        audio_base64 = data['audio']
        mime_type = data.get('mimeType', 'audio/webm')

        # Decode base64 audio
        try:
            audio_data = base64.b64decode(audio_base64)
        except Exception as e:
            return jsonify({'error': 'Invalid audio data format'}), 400

        # Process audio with SpeakingService for transcription
        service = SpeakingService()
        result = service.assess_follow_along(audio_data, sentence, mime_type)

        # Calculate accuracy score based on text matching
        user_transcript = result['transcript'].lower().strip()
        target_text = sentence.lower().strip()
        
        # Simple word-level accuracy calculation
        target_words = target_text.split()
        user_words = user_transcript.split()
        
        if len(target_words) == 0:
            accuracy_score = 0
        else:
            # Calculate word match accuracy
            matched_words = 0
            for target_word in target_words:
                for user_word in user_words:
                    if target_word == user_word:
                        matched_words += 1
                        break
            
            accuracy_score = round((matched_words / len(target_words)) * 100)

        # Save record to database
        record = FollowAlongRecord(
            user_id=current_user.id,
            record_type='sentence',
            target_text=sentence,
            user_transcript=result['transcript'],
            accuracy_score=accuracy_score,
            pronunciation_scores=result['pronunciation']
        )
        db.session.add(record)
        db.session.commit()

        return jsonify({
            'transcript': result['transcript'],
            'accuracy': accuracy_score,
            'pronunciation': result['pronunciation'],
            'feedback': f'You said: "{result["transcript"]}"',
            'strengths': ['Clear pronunciation' if accuracy_score >= 80 else 'Keep practicing'],
            'improvements': ['Perfect match!' if accuracy_score == 100 else 'Try to be more accurate'],
            'target_sentence': sentence
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        current_app.logger.error(f'Sentence follow-along error: {error_details}')
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500


@follow_along_bp.route('/follow-along/records', methods=['GET'])
@login_required
def get_follow_along_records():
    """Get user's follow-along practice records."""
    records = FollowAlongRecord.query.filter_by(user_id=current_user.id).order_by(
        FollowAlongRecord.created_at.desc()
    ).limit(50).all()

    return jsonify({'records': [r.to_dict() for r in records]}), 200


@follow_along_bp.route('/follow-along/config-check', methods=['GET'])
@login_required
def check_config():
    """Check if required API keys are configured."""
    from flask import current_app
    
    config_status = {
        'azure_speech_configured': bool(current_app.config.get('AZURE_SPEECH_KEY')),
        'anthropic_configured': bool(current_app.config.get('ANTHROPIC_API_KEY')),
        'azure_region': current_app.config.get('AZURE_SPEECH_REGION', 'eastasia')
    }
    
    return jsonify(config_status), 200


@follow_along_bp.route('/follow-along/stats', methods=['GET'])
@login_required
def get_follow_along_stats():
    """Get user's follow-along practice statistics."""
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import func

    # Overall stats
    total_records = FollowAlongRecord.query.filter_by(user_id=current_user.id).count()
    
    # Stats by type
    word_records = FollowAlongRecord.query.filter_by(
        user_id=current_user.id, record_type='word'
    ).all()
    sentence_records = FollowAlongRecord.query.filter_by(
        user_id=current_user.id, record_type='sentence'
    ).all()

    # Calculate average scores
    avg_word_accuracy = 0
    avg_sentence_accuracy = 0
    
    if word_records:
        avg_word_accuracy = round(sum(r.accuracy_score or 0 for r in word_records) / len(word_records))
    
    if sentence_records:
        avg_sentence_accuracy = round(sum(r.accuracy_score or 0 for r in sentence_records) / len(sentence_records))

    # Today's practice
    today = datetime.now(timezone.utc).date()
    today_records = FollowAlongRecord.query.filter(
        FollowAlongRecord.user_id == current_user.id,
        func.date(FollowAlongRecord.created_at) == today
    ).all()

    # Recent history (last 7 days)
    seven_days_ago = today - timedelta(days=7)
    history = db.session.query(
        func.date(FollowAlongRecord.created_at).label('date'),
        func.count(FollowAlongRecord.id).label('count'),
        func.avg(FollowAlongRecord.accuracy_score).label('avg_score')
    ).filter(
        FollowAlongRecord.user_id == current_user.id,
        func.date(FollowAlongRecord.created_at) >= seven_days_ago
    ).group_by(
        func.date(FollowAlongRecord.created_at)
    ).order_by(
        func.date(FollowAlongRecord.created_at).desc()
    ).all()

    stats = {
        'total_records': total_records,
        'word_practices': len(word_records),
        'sentence_practices': len(sentence_records),
        'avg_word_accuracy': avg_word_accuracy,
        'avg_sentence_accuracy': avg_sentence_accuracy,
        'today_practices': len(today_records),
        'history': [
            {
                'date': str(h.date),
                'count': h.count,
                'avg_score': round(h.avg_score) if h.avg_score else 0
            }
            for h in history
        ]
    }

    return jsonify(stats), 200