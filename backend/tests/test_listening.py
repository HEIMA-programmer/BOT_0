def test_listening_catalog_returns_levels_and_supported_lecture_clips(client, login_user):
    login_user()

    response = client.get('/api/listening/clips')

    assert response.status_code == 200
    data = response.get_json()

    assert data['source_count'] >= 10
    assert len(data['levels']) == 3

    levels = {level['id']: level for level in data['levels']}
    assert set(levels) == {'beginner', 'intermediate', 'advanced'}

    for level in data['levels']:
        assert len(level['scenarios']) == 4

    beginner_lecture = next(
        scenario for scenario in levels['beginner']['scenarios']
        if scenario['id'] == 'lecture-clips'
    )
    intermediate_lecture = next(
        scenario for scenario in levels['intermediate']['scenarios']
        if scenario['id'] == 'lecture-clips'
    )

    assert beginner_lecture['is_available'] is True
    assert intermediate_lecture['is_available'] is True
    assert beginner_lecture['clip_count'] == data['source_count']
    assert intermediate_lecture['clip_count'] == data['source_count']

    for clip in beginner_lecture['clips']:
        assert clip['difficulty_level'] == 'beginner'
        assert clip['scenario_type'] == 'lecture-clips'
        assert clip['audio_url'].startswith('/api/listening/audio/')
        assert clip['transcript']
        assert clip['practice_available'] is True

    for clip in intermediate_lecture['clips']:
        assert clip['difficulty_level'] == 'intermediate'
        assert clip['scenario_type'] == 'lecture-clips'
        assert clip['audio_url'].startswith('/api/listening/audio/')
        assert clip['transcript']
        assert clip['practice_available'] is True

    for level_id in ('beginner', 'intermediate', 'advanced'):
        for scenario in levels[level_id]['scenarios']:
            if level_id in {'beginner', 'intermediate'} and scenario['id'] == 'lecture-clips':
                continue
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
