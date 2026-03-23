from app.models.progress import Progress


def test_listening_catalog_returns_levels_and_supported_scenarios(client, login_user):
    login_user()

    response = client.get('/api/listening/clips')

    assert response.status_code == 200
    data = response.get_json()

    assert data['source_count'] >= 25
    assert len(data['levels']) == 3

    levels = {level['id']: level for level in data['levels']}
    assert set(levels) == {'beginner', 'intermediate', 'advanced'}

    for level in data['levels']:
        assert len(level['scenarios']) == 4

    beginner_scenarios = {scenario['id']: scenario for scenario in levels['beginner']['scenarios']}
    intermediate_scenarios = {
        scenario['id']: scenario for scenario in levels['intermediate']['scenarios']
    }
    advanced_scenarios = {scenario['id']: scenario for scenario in levels['advanced']['scenarios']}

    assert levels['beginner']['clip_count'] == data['source_count']
    assert levels['intermediate']['clip_count'] == data['source_count']

    for scenario_id in ('lecture-clips', 'group-discussion', 'qa-session', 'office-hour'):
        beginner_scenario = beginner_scenarios[scenario_id]
        intermediate_scenario = intermediate_scenarios[scenario_id]

        assert beginner_scenario['is_available'] is True
        assert intermediate_scenario['is_available'] is True
        assert beginner_scenario['clip_count'] == intermediate_scenario['clip_count']
        assert beginner_scenario['clips']
        assert intermediate_scenario['clips']

        for clip in beginner_scenario['clips']:
            assert clip['difficulty_level'] == 'beginner'
            assert clip['scenario_type'] == scenario_id
            assert clip['audio_url'].startswith('/api/listening/audio/')
            assert clip['transcript']
            assert clip['practice_available'] is True

        for clip in intermediate_scenario['clips']:
            assert clip['difficulty_level'] == 'intermediate'
            assert clip['scenario_type'] == scenario_id
            assert clip['audio_url'].startswith('/api/listening/audio/')
            assert clip['transcript']
            assert clip['practice_available'] is True

    assert beginner_scenarios['lecture-clips']['clip_count'] >= 10
    assert beginner_scenarios['group-discussion']['clip_count'] == 5
    assert beginner_scenarios['qa-session']['clip_count'] == 5
    assert beginner_scenarios['office-hour']['clip_count'] == 5

    for scenario in advanced_scenarios.values():
        assert scenario['is_available'] is False
        assert scenario['coming_soon'] is True
        assert scenario['clip_count'] == 0
        assert scenario['clips'] == []


def test_listening_audio_route_streams_mp3_content(client, login_user):
    login_user()

    catalog_response = client.get('/api/listening/clips')
    first_clip = catalog_response.get_json()['levels'][0]['scenarios'][0]['clips'][0]

    response = client.get(f"/api/listening/audio/{first_clip['source_slug']}")

    assert response.status_code == 200
    assert response.mimetype == 'audio/mpeg'
    assert len(response.data) > 0


def test_beginner_practice_route_returns_multiple_choice_questions_only(client, login_user):
    login_user()

    catalog_response = client.get('/api/listening/clips')
    clip = catalog_response.get_json()['levels'][0]['scenarios'][0]['clips'][0]

    response = client.get(
        f"/api/listening/quiz/{clip['difficulty_level']}/{clip['scenario_type']}/{clip['source_slug']}"
    )

    assert response.status_code == 200
    data = response.get_json()

    assert data['level']['id'] == 'beginner'
    assert data['scenario']['id'] == 'lecture-clips'
    assert data['question_count'] >= 1
    assert len(data['questions']) == data['question_count']
    assert all(question['type'] == 'multiple_choice' for question in data['questions'])
    assert all('correct_answer' not in question for question in data['questions'])
    assert all(question['options'] for question in data['questions'])


def test_group_discussion_beginner_practice_returns_multiple_choice_questions_only(client, login_user):
    login_user()

    response = client.get('/api/listening/quiz/beginner/group-discussion/best-way-to-learn-english')

    assert response.status_code == 200
    data = response.get_json()

    assert data['level']['id'] == 'beginner'
    assert data['scenario']['id'] == 'group-discussion'
    assert data['question_count'] >= 1
    assert len(data['questions']) == data['question_count']
    assert all(question['type'] == 'multiple_choice' for question in data['questions'])
    assert all('correct_answer' not in question for question in data['questions'])
    assert all(question['options'] for question in data['questions'])


def test_office_hour_beginner_practice_returns_multiple_choice_questions_only(client, login_user):
    login_user()

    response = client.get('/api/listening/quiz/beginner/office-hour/grades')

    assert response.status_code == 200
    data = response.get_json()

    assert data['level']['id'] == 'beginner'
    assert data['scenario']['id'] == 'office-hour'
    assert data['question_count'] >= 1
    assert len(data['questions']) == data['question_count']
    assert all(question['type'] == 'multiple_choice' for question in data['questions'])
    assert all('correct_answer' not in question for question in data['questions'])
    assert all(question['options'] for question in data['questions'])


def test_intermediate_practice_submission_returns_score_and_results(client, login_user):
    login_user()

    response = client.get('/api/listening/quiz/intermediate/lecture-clips/better-human-trailer')
    assert response.status_code == 200
    quiz = response.get_json()

    answers = {}
    for question in quiz['questions']:
        if question['prompt'] == 'The podcast is hosted by ____.':
            answers[question['id']] = 'Chris Duffy'
        elif question['prompt'] == 'What is the main goal of the podcast?':
            answers[question['id']] = (
                'To give listeners actionable insights on how to be a better human.'
            )
        elif question['prompt'] == 'The show’s title is “How to Be a ____ Human.”':
            answers[question['id']] = 'Worse'

    submit_response = client.post(
        '/api/listening/quiz/intermediate/lecture-clips/better-human-trailer/submit',
        json={'answers': answers},
    )

    assert submit_response.status_code == 200
    result = submit_response.get_json()

    assert result['level']['id'] == 'intermediate'
    assert result['scenario']['id'] == 'lecture-clips'
    assert result['total_count'] == quiz['question_count']
    assert result['correct_count'] == 2
    assert result['score'] == round((2 / quiz['question_count']) * 100, 1)
    assert result['transcript']

    results_by_prompt = {item['prompt']: item for item in result['results']}
    assert results_by_prompt['The podcast is hosted by ____.']['is_correct'] is True
    assert results_by_prompt['What is the main goal of the podcast?']['is_correct'] is True
    assert results_by_prompt['The show’s title is “How to Be a ____ Human.”']['is_correct'] is False
    assert isinstance(result['progress_id'], int) is True

    progress = Progress.query.get(result['progress_id'])
    assert progress is not None
    assert progress.user_id == 1
    assert progress.module == 'listening'
    assert progress.activity_type == 'intermediate:lecture-clips:better-human-trailer'
    assert progress.score == result['score']


def test_office_hour_intermediate_submission_returns_score_and_results(client, login_user):
    login_user()

    response = client.get('/api/listening/quiz/intermediate/office-hour/grades')
    assert response.status_code == 200
    quiz = response.get_json()

    answers = {}
    for question in quiz['questions']:
        if question['prompt'] == 'Nydja says teachers in her old school worked with students according to their _____.':
            answers[question['id']] = 'abilities'
        elif question['prompt'] == 'How does Nydja connect school performance to life after school?':
            answers[question['id']] = (
                'She sees school success as the start of a chain leading to college admission and future employment.'
            )

    submit_response = client.post(
        '/api/listening/quiz/intermediate/office-hour/grades/submit',
        json={'answers': answers},
    )

    assert submit_response.status_code == 200
    result = submit_response.get_json()

    assert result['level']['id'] == 'intermediate'
    assert result['scenario']['id'] == 'office-hour'
    assert result['total_count'] == quiz['question_count']
    assert result['correct_count'] == 2
    assert result['score'] == round((2 / quiz['question_count']) * 100, 1)
    assert result['transcript']

    results_by_prompt = {item['prompt']: item for item in result['results']}
    assert (
        results_by_prompt[
            'Nydja says teachers in her old school worked with students according to their _____.'
        ]['is_correct']
        is True
    )
    assert (
        results_by_prompt['How does Nydja connect school performance to life after school?']['is_correct']
        is True
    )
    assert isinstance(result['progress_id'], int) is True

    progress = Progress.query.get(result['progress_id'])
    assert progress is not None
    assert progress.user_id == 1
    assert progress.module == 'listening'
    assert progress.activity_type == 'intermediate:office-hour:grades'
    assert progress.score == result['score']


def test_qa_session_intermediate_submission_returns_score_and_results(client, login_user):
    login_user()

    response = client.get('/api/listening/quiz/intermediate/qa-session/big-family')
    assert response.status_code == 200
    quiz = response.get_json()

    answers = {}
    for question in quiz['questions']:
        if question['prompt'] == 'Mark says Sorie is from a ________ family.':
            answers[question['id']] = 'big'
        elif question['prompt'] == 'What does Sorie’s childhood story reveal about life with many siblings?':
            answers[question['id']] = 'It reveals that life was noisy, unpredictable, and sometimes wild.'

    submit_response = client.post(
        '/api/listening/quiz/intermediate/qa-session/big-family/submit',
        json={'answers': answers},
    )

    assert submit_response.status_code == 200
    result = submit_response.get_json()

    assert result['level']['id'] == 'intermediate'
    assert result['scenario']['id'] == 'qa-session'
    assert result['total_count'] == quiz['question_count']
    assert result['correct_count'] == 2
    assert result['score'] == round((2 / quiz['question_count']) * 100, 1)
    assert result['transcript']

    results_by_prompt = {item['prompt']: item for item in result['results']}
    assert results_by_prompt['Mark says Sorie is from a ________ family.']['is_correct'] is True
    assert (
        results_by_prompt['What does Sorie’s childhood story reveal about life with many siblings?']['is_correct']
        is True
    )
    assert isinstance(result['progress_id'], int) is True

    progress = Progress.query.get(result['progress_id'])
    assert progress is not None
    assert progress.user_id == 1
    assert progress.module == 'listening'
    assert progress.activity_type == 'intermediate:qa-session:big-family'
    assert progress.score == result['score']


def test_listening_practice_returns_saved_attempt_for_same_user(client, login_user):
    login_user()

    quiz_response = client.get('/api/listening/quiz/beginner/lecture-clips/better-human-trailer')
    assert quiz_response.status_code == 200
    quiz = quiz_response.get_json()

    answers = {}
    for question in quiz['questions']:
        answers[question['id']] = 'A'

    submit_response = client.post(
        '/api/listening/quiz/beginner/lecture-clips/better-human-trailer/submit',
        json={'answers': answers},
    )
    assert submit_response.status_code == 200

    practice_response = client.get('/api/listening/quiz/beginner/lecture-clips/better-human-trailer')
    assert practice_response.status_code == 200
    practice_data = practice_response.get_json()

    assert practice_data['saved_attempt'] is not None
    assert practice_data['saved_attempt']['answers'] == answers
    assert practice_data['saved_attempt']['results']


def test_listening_audio_route_returns_404_for_unknown_clip(client, login_user):
    login_user()

    response = client.get('/api/listening/audio/not-a-real-clip')

    assert response.status_code == 404
    assert response.get_json()['error'] == 'Clip not found'


def test_listening_practice_route_rejects_unsupported_level_and_scenario(client, login_user):
    login_user()

    response = client.get('/api/listening/quiz/advanced/office-hour/grades')

    assert response.status_code == 404
    assert response.get_json()['error'] == 'Practice for this level and scenario is coming soon'


def test_listening_practice_route_returns_404_for_unknown_clip(client, login_user):
    login_user()

    response = client.get('/api/listening/quiz/beginner/lecture-clips/not-a-real-clip')

    assert response.status_code == 404
    assert response.get_json()['error'] == 'Practice material not found'


def test_listening_submission_requires_answers_object(client, login_user):
    login_user()

    response = client.post(
        '/api/listening/quiz/intermediate/lecture-clips/better-human-trailer/submit',
        json={'answers': ['not', 'a', 'dict']},
    )

    assert response.status_code == 400
    assert response.get_json()['error'] == 'Answers must be provided as an object'


def test_listening_submission_rejects_unsupported_level_and_scenario(client, login_user):
    login_user()

    response = client.post(
        '/api/listening/quiz/advanced/lecture-clips/better-human-trailer/submit',
        json={'answers': {}},
    )

    assert response.status_code == 404
    assert response.get_json()['error'] == 'Practice for this level and scenario is coming soon'
