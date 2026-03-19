from app import db
from app.models.progress import Progress
from app.models.speaking_session import SpeakingSession
from app.models.user_word_progress import UserWordProgress


def test_track_progress_time_creates_study_time_record(client, login_user):
    login_user()

    response = client.post(
        '/api/progress/track-time',
        json={
            'module': 'vocab',
            'activity_type': 'study_time:daily-words',
            'time_spent': 12,
        },
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data['module'] == 'vocab'
    assert data['activity_type'] == 'study_time:daily-words'
    assert data['time_spent'] == 12


def test_progress_dashboard_returns_real_user_metrics(client, login_user, create_word):
    login_user()

    learned_word = create_word(text='analyze')
    pending_word = create_word(text='compile')

    db.session.add(UserWordProgress(user_id=1, word_id=learned_word.id, status='mastered'))
    db.session.add(UserWordProgress(user_id=1, word_id=pending_word.id, status='pending'))
    db.session.add(Progress(
        user_id=1,
        module='listening',
        activity_type='beginner:lecture-clips:campus-welcome',
        score=100,
        time_spent=15,
    ))
    db.session.add(Progress(
        user_id=1,
        module='listening',
        activity_type='beginner:lecture-clips:campus-welcome',
        score=80,
        time_spent=6,
    ))
    db.session.add(Progress(
        user_id=1,
        module='listening',
        activity_type='intermediate:lecture-clips:research-methods',
        score=90,
        time_spent=9,
    ))
    db.session.add(Progress(
        user_id=1,
        module='listening',
        activity_type='study_time:listening',
        score=None,
        time_spent=8,
    ))
    db.session.add(Progress(
        user_id=1,
        module='chat',
        activity_type='study_time:ai-chat',
        score=None,
        time_spent=20,
    ))
    db.session.add(SpeakingSession(user_id=1, topic='orientation'))
    db.session.commit()

    response = client.get('/api/progress/dashboard')

    assert response.status_code == 200
    assert response.get_json() == {
        'words_learned': 1,
        'listening_done': 2,
        'speaking_sessions': 1,
        'total_time_minutes': 58,
    }
