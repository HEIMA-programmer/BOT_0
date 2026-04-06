from datetime import datetime, timezone

from app import db as _db
from app.models.forum_forward import ForumForward
from app.models.forum_post import ForumPost
from app.models.forum_post_pin import ForumPostPin
from app.models.friendship import Friendship


def _login(client, email, password):
    response = client.post(
        '/api/auth/login',
        json={'email': email, 'password': password},
    )
    assert response.status_code == 200


def _create_post(user_id, title, status, zone='public'):
    post = ForumPost(
        user_id=user_id,
        zone=zone,
        tag=zone,
        title=title,
        content=f'{title} content',
        status=status,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    _db.session.add(post)
    _db.session.commit()
    return post


def _create_friendship(user_id, friend_id):
    _db.session.add(Friendship(user_id=user_id, friend_id=friend_id))
    _db.session.commit()


def test_regular_user_only_sees_approved_posts(client, create_user):
    viewer = create_user(username='viewer', email='viewer@example.com')
    author = create_user(username='author', email='author@example.com')
    _create_post(author.id, 'Approved post', ForumPost.STATUS_PUBLISHED)
    _create_post(author.id, 'Pending post', ForumPost.STATUS_UNDER_REVIEW)
    _create_post(author.id, 'Rejected post', ForumPost.STATUS_REJECTED)

    _login(client, viewer.email, 'password123')
    response = client.get('/api/forum/posts')

    assert response.status_code == 200
    data = response.get_json()
    assert data['total'] == 1
    assert [post['status'] for post in data['posts']] == [ForumPost.STATUS_PUBLISHED]


def test_admin_can_filter_posts_by_status(client, create_user):
    admin = create_user(username='admin', email='admin@example.com')
    admin.is_admin = True
    _db.session.commit()

    author = create_user(username='author', email='author@example.com')
    _create_post(author.id, 'Approved post', ForumPost.STATUS_PUBLISHED)
    _create_post(author.id, 'Pending post', ForumPost.STATUS_UNDER_REVIEW)
    _create_post(author.id, 'Rejected post', ForumPost.STATUS_REJECTED)

    _login(client, admin.email, 'password123')

    pending_response = client.get('/api/forum/posts', query_string={'status': ForumPost.STATUS_UNDER_REVIEW})
    assert pending_response.status_code == 200
    pending_data = pending_response.get_json()
    assert pending_data['total'] == 1
    assert pending_data['posts'][0]['status'] == ForumPost.STATUS_UNDER_REVIEW

    all_response = client.get('/api/forum/posts')
    assert all_response.status_code == 200
    all_data = all_response.get_json()
    # Admin default view shows PUBLISHED + UNDER_REVIEW (not REJECTED)
    assert all_data['total'] == 2


def test_posts_can_be_searched_by_title_or_tag(client, create_user):
    viewer = create_user(username='viewer', email='viewer@example.com')
    author = create_user(username='author', email='author@example.com')
    _create_post(author.id, 'Turnitin Guide', ForumPost.STATUS_PUBLISHED, zone='public')
    second = _create_post(author.id, 'Semester Reflection', ForumPost.STATUS_PUBLISHED, zone='public')
    second.tag = 'experience'
    _db.session.commit()

    _login(client, viewer.email, 'password123')

    title_response = client.get('/api/forum/posts', query_string={'search': 'Turnitin'})
    assert title_response.status_code == 200
    assert [post['title'] for post in title_response.get_json()['posts']] == ['Turnitin Guide']

    tag_response = client.get('/api/forum/posts', query_string={'search': 'experience'})
    assert tag_response.status_code == 200
    assert [post['title'] for post in tag_response.get_json()['posts']] == ['Semester Reflection']


def test_admin_all_posts_includes_approved_friend_zone_posts(client, create_user):
    admin = create_user(username='admin', email='admin@example.com')
    admin.is_admin = True
    _db.session.commit()

    author = create_user(username='author', email='author@example.com')
    _create_post(author.id, 'Approved public post', ForumPost.STATUS_PUBLISHED, zone='public')
    _create_post(author.id, 'Approved friend post', ForumPost.STATUS_PUBLISHED, zone='friend')

    _login(client, admin.email, 'password123')
    response = client.get('/api/forum/posts')

    assert response.status_code == 200
    data = response.get_json()
    assert data['total'] == 2
    assert {post['zone'] for post in data['posts']} == {'public', 'friend'}


def test_admin_cannot_pin_friend_zone_posts(client, create_user):
    admin = create_user(username='admin', email='admin@example.com')
    admin.is_admin = True
    _db.session.commit()

    author = create_user(username='author', email='author@example.com')
    friend_post = _create_post(author.id, 'Approved friend post', ForumPost.STATUS_PUBLISHED, zone='friend')

    _login(client, admin.email, 'password123')
    response = client.post(
        f'/api/forum/admin/posts/{friend_post.id}/pin',
        json={'is_pinned': True},
    )

    assert response.status_code == 400
    assert response.get_json()['error'] == 'Only public posts can be pinned'

    refreshed_post = _db.session.get(ForumPost, friend_post.id)
    assert refreshed_post.is_pinned is False


def test_friend_zone_pins_are_user_specific(client, create_user):
    author = create_user(username='author', email='author@example.com')
    viewer_one = create_user(username='viewerone', email='viewer1@example.com')
    viewer_two = create_user(username='viewertwo', email='viewer2@example.com')

    _create_friendship(viewer_one.id, author.id)
    _create_friendship(viewer_two.id, author.id)

    friend_post = _create_post(author.id, 'Friend-only post', ForumPost.STATUS_PUBLISHED, zone='friend')

    _login(client, viewer_one.email, 'password123')
    pin_response = client.post(
        f'/api/forum/admin/posts/{friend_post.id}/pin',
        json={'is_pinned': True},
    )
    assert pin_response.status_code == 200
    assert pin_response.get_json()['is_pinned'] is True

    viewer_one_feed = client.get('/api/forum/posts', query_string={'zone': 'friend'})
    assert viewer_one_feed.status_code == 200
    viewer_one_post = viewer_one_feed.get_json()['posts'][0]
    assert viewer_one_post['id'] == friend_post.id
    assert viewer_one_post['is_pinned'] is True
    assert viewer_one_post['can_pin'] is True

    client.post('/api/auth/logout')
    _login(client, viewer_two.email, 'password123')
    viewer_two_feed = client.get('/api/forum/posts', query_string={'zone': 'friend'})
    assert viewer_two_feed.status_code == 200
    viewer_two_post = viewer_two_feed.get_json()['posts'][0]
    assert viewer_two_post['id'] == friend_post.id
    assert viewer_two_post['is_pinned'] is False
    assert viewer_two_post['can_pin'] is True

    pins = ForumPostPin.query.filter_by(post_id=friend_post.id).all()
    assert len(pins) == 1
    assert pins[0].user_id == viewer_one.id


def test_regular_user_cannot_pin_invisible_friend_zone_post(client, create_user):
    author = create_user(username='author', email='author@example.com')
    outsider = create_user(username='outsider', email='outsider@example.com')
    friend_post = _create_post(author.id, 'Hidden friend post', ForumPost.STATUS_PUBLISHED, zone='friend')

    _login(client, outsider.email, 'password123')
    response = client.post(
        f'/api/forum/admin/posts/{friend_post.id}/pin',
        json={'is_pinned': True},
    )

    assert response.status_code == 403
    assert response.get_json()['error'] == 'Only published friend zone posts visible to you can be pinned'
    assert ForumPostPin.query.filter_by(post_id=friend_post.id).count() == 0


def test_friend_zone_excludes_forwards_from_non_friends(client, create_user):
    owner = create_user(username='owner', email='owner@example.com')
    stranger = create_user(username='stranger', email='stranger@example.com')

    public_post = _create_post(owner.id, 'Owner public post', ForumPost.STATUS_PUBLISHED, zone='public')
    _db.session.add(ForumForward(user_id=stranger.id, original_post_id=public_post.id, zone='friend', comment='sharing this'))
    _db.session.commit()

    _login(client, owner.email, 'password123')
    response = client.get('/api/forum/posts', query_string={'zone': 'friend', 'include_forwards': 'true'})

    assert response.status_code == 200
    data = response.get_json()
    assert data['posts'] == []


def test_forward_can_target_friend_zone_and_is_visible_to_friends(client, create_user):
    author = create_user(username='author', email='author@example.com')
    forwarder = create_user(username='forwarder', email='forwarder@example.com')
    friend = create_user(username='friend', email='friend@example.com')
    stranger = create_user(username='stranger', email='other@example.com')

    _create_friendship(forwarder.id, friend.id)
    _create_friendship(friend.id, forwarder.id)

    public_post = _create_post(author.id, 'Public source post', ForumPost.STATUS_PUBLISHED, zone='public')

    _login(client, forwarder.email, 'password123')
    forward_response = client.post(
        f'/api/forum/posts/{public_post.id}/forward',
        json={'comment': 'share to friends', 'zone': 'friend'},
    )
    assert forward_response.status_code == 201
    assert forward_response.get_json()['zone'] == 'friend'

    client.post('/api/auth/logout')
    _login(client, friend.email, 'password123')
    friend_zone_response = client.get('/api/forum/posts', query_string={'zone': 'friend', 'include_forwards': 'true'})
    assert friend_zone_response.status_code == 200
    friend_items = friend_zone_response.get_json()['posts']
    assert len(friend_items) == 1
    assert friend_items[0]['type'] == 'forward'
    assert friend_items[0]['zone'] == 'friend'
    assert friend_items[0]['original_post_id'] == public_post.id

    client.post('/api/auth/logout')
    _login(client, stranger.email, 'password123')
    stranger_friend_zone_response = client.get('/api/forum/posts', query_string={'zone': 'friend', 'include_forwards': 'true'})
    assert stranger_friend_zone_response.status_code == 200
    assert stranger_friend_zone_response.get_json()['posts'] == []


def test_forward_can_target_public_zone(client, create_user):
    author = create_user(username='author', email='author@example.com')
    forwarder = create_user(username='forwarder', email='forwarder@example.com')
    viewer = create_user(username='viewer', email='viewer@example.com')

    public_post = _create_post(author.id, 'Public source post', ForumPost.STATUS_PUBLISHED, zone='public')

    _login(client, forwarder.email, 'password123')
    forward_response = client.post(
        f'/api/forum/posts/{public_post.id}/forward',
        json={'comment': 'share publicly', 'zone': 'public'},
    )
    assert forward_response.status_code == 201
    assert forward_response.get_json()['zone'] == 'public'

    client.post('/api/auth/logout')
    _login(client, viewer.email, 'password123')
    public_response = client.get('/api/forum/posts', query_string={'zone': 'public', 'include_forwards': 'true'})
    assert public_response.status_code == 200
    items = public_response.get_json()['posts']
    assert any(item['type'] == 'forward' and item['zone'] == 'public' for item in items)
