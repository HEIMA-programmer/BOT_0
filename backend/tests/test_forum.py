from datetime import datetime, timezone

from app import db as _db
from app.models.forum_post import ForumPost


def _login(client, email, password):
    response = client.post(
        '/api/auth/login',
        json={'email': email, 'password': password},
    )
    assert response.status_code == 200


def _create_post(user_id, title, status):
    post = ForumPost(
        user_id=user_id,
        tag='public',
        title=title,
        content=f'{title} content',
        status=status,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    _db.session.add(post)
    _db.session.commit()
    return post


def test_regular_user_only_sees_approved_posts(client, create_user):
    viewer = create_user(username='viewer', email='viewer@example.com')
    author = create_user(username='author', email='author@example.com')
    _create_post(author.id, 'Approved post', ForumPost.STATUS_APPROVED)
    _create_post(author.id, 'Pending post', ForumPost.STATUS_PENDING)
    _create_post(author.id, 'Rejected post', ForumPost.STATUS_REJECTED)

    _login(client, viewer.email, 'password123')
    response = client.get('/api/forum/posts')

    assert response.status_code == 200
    data = response.get_json()
    assert data['total'] == 1
    assert [post['status'] for post in data['posts']] == [ForumPost.STATUS_APPROVED]


def test_admin_can_filter_posts_by_status(client, create_user):
    admin = create_user(username='admin', email='admin@example.com')
    admin.is_admin = True
    _db.session.commit()

    author = create_user(username='author', email='author@example.com')
    _create_post(author.id, 'Approved post', ForumPost.STATUS_APPROVED)
    _create_post(author.id, 'Pending post', ForumPost.STATUS_PENDING)
    _create_post(author.id, 'Rejected post', ForumPost.STATUS_REJECTED)

    _login(client, admin.email, 'password123')

    pending_response = client.get('/api/forum/posts', query_string={'status': ForumPost.STATUS_PENDING})
    assert pending_response.status_code == 200
    pending_data = pending_response.get_json()
    assert pending_data['total'] == 1
    assert pending_data['posts'][0]['status'] == ForumPost.STATUS_PENDING

    all_response = client.get('/api/forum/posts')
    assert all_response.status_code == 200
    all_data = all_response.get_json()
    assert all_data['total'] == 3
