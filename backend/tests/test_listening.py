def test_listening_catalog_returns_levels_scenarios_and_clips(client, login_user):
    login_user()

    response = client.get('/api/listening/clips')

    assert response.status_code == 200
    data = response.get_json()

    assert data['source_count'] >= 10
    assert len(data['levels']) == 3

    for level in data['levels']:
        assert level['id'] in {'beginner', 'intermediate', 'advanced'}
        assert len(level['scenarios']) == 4
        for scenario in level['scenarios']:
            assert scenario['clip_count'] >= 1
            assert scenario['clips']
            clip = scenario['clips'][0]
            assert clip['difficulty_level'] == level['id']
            assert clip['scenario_type'] == scenario['id']
            assert clip['audio_url'].startswith('/api/listening/audio/')
            assert clip['transcript']


def test_listening_audio_route_streams_mp3_content(client, login_user):
    login_user()

    catalog_response = client.get('/api/listening/clips')
    first_clip = catalog_response.get_json()['levels'][0]['scenarios'][0]['clips'][0]

    response = client.get(f"/api/listening/audio/{first_clip['source_slug']}")

    assert response.status_code == 200
    assert response.mimetype == 'audio/mpeg'
    assert len(response.data) > 0
