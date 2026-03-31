import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_socketio import SocketIO
from sqlalchemy import inspect, text

db = SQLAlchemy()
login_manager = LoginManager()
socketio = SocketIO()


def create_app(config_name=None):
    app = Flask(__name__, instance_relative_config=True)

    # Load config
    if config_name == 'testing':
        app.config.from_object('app.config.TestingConfig')
    else:
        app.config.from_object('app.config.DevelopmentConfig')

    # Ensure instance folder exists
    os.makedirs(app.instance_path, exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.session_protection = 'strong'
    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
    CORS(app, supports_credentials=True, origins=cors_origins)
    socketio.init_app(app, cors_allowed_origins=cors_origins)

    @login_manager.unauthorized_handler
    def unauthorized():
        from flask import jsonify
        return jsonify({'error': 'Authentication required'}), 401

    @login_manager.user_loader
    def load_user(user_id):
        from app.models.user import User
        return User.query.get(int(user_id))

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.daily_words import daily_words_bp
    from app.routes.word_bank import word_bank_bp
    from app.routes.daily_learning import daily_learning_bp
    from app.routes.listening import listening_bp
    from app.routes.progress import progress_bp
    from app.routes.forum import forum_bp
    from app.routes.chat_history import chat_history_bp
    from app.routes.room import room_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(daily_words_bp)
    app.register_blueprint(word_bank_bp)
    app.register_blueprint(daily_learning_bp)
    app.register_blueprint(listening_bp)
    app.register_blueprint(progress_bp)
    app.register_blueprint(forum_bp)
    app.register_blueprint(chat_history_bp)
    app.register_blueprint(room_bp)

    # Register SocketIO handlers
    from app.routes import speaking_ws  # noqa: F401
    from app.routes import conversation_ws  # noqa: F401
    from app.routes import room_ws  # noqa: F401

    # Create database tables and auto-seed on first run
    with app.app_context():
        from app.models import (  # noqa: F401
            chat_message,
            chat_session,
            listening_attempt,
            listening_clip,
            progress,
            review_history,
            speaking_session,
            user,
            user_word_progress,
            word,
            word_bank,
            forum_post,
            forum_comment,
            forum_forward,
            room,
            room_record,
        )
        db.create_all()
        _ensure_runtime_schema()
        _seed_words_if_empty(app)
        if app.config.get('DEBUG'):
            _ensure_dev_test_user(app)
            _ensure_dev_admin_user(app)

    return app


def _ensure_runtime_schema():
    """Apply additive schema changes for local SQLite/dev databases."""
    inspector = inspect(db.engine)

    users_columns = {col['name'] for col in inspector.get_columns('users')}
    if 'is_admin' not in users_columns:
        db.session.execute(text('ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0'))

    forum_post_columns = {col['name'] for col in inspector.get_columns('forum_posts')}
    forum_post_alters = {
        'status': "ALTER TABLE forum_posts ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'",
        'is_pinned': 'ALTER TABLE forum_posts ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT 0',
        'rejection_reason': 'ALTER TABLE forum_posts ADD COLUMN rejection_reason VARCHAR(120)',
        'review_note': 'ALTER TABLE forum_posts ADD COLUMN review_note VARCHAR(255)',
        'reviewed_by': 'ALTER TABLE forum_posts ADD COLUMN reviewed_by INTEGER',
        'reviewed_at': 'ALTER TABLE forum_posts ADD COLUMN reviewed_at DATETIME',
        'updated_at': 'ALTER TABLE forum_posts ADD COLUMN updated_at DATETIME',
    }
    for column, ddl in forum_post_alters.items():
        if column not in forum_post_columns:
            db.session.execute(text(ddl))

    db.session.execute(text(
        "UPDATE forum_posts SET status = 'approved' WHERE status IS NULL"
    ))
    db.session.execute(text(
        'UPDATE forum_posts SET is_pinned = 0 WHERE is_pinned IS NULL'
    ))
    db.session.execute(text(
        'UPDATE forum_posts SET updated_at = created_at WHERE updated_at IS NULL'
    ))
    db.session.execute(text(
        'UPDATE users SET is_admin = 0 WHERE is_admin IS NULL'
    ))
    db.session.commit()


def _seed_words_if_empty(app):
    """Auto-seed the words table from AWL.csv on first run."""
    import re
    from app.models.word import Word

    if Word.query.first() is not None:
        return

    # __file__ = backend/app/__init__.py → up 3 levels to project root
    csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        'frontend', 'public', 'AWL', 'AWL.csv'
    )

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        app.logger.warning('AWL.csv not found at %s, skipping seed', csv_path)
        return

    content = content.replace('\ufeff', '')
    for line in content.split('\n'):
        if not line.strip():
            continue
        match = re.match(r'^([^,]+),"?([^"]*)"?$', line)
        if match:
            text, definition = match.groups()
            db.session.add(Word(
                text=text.strip(),
                definition=definition.strip(),
                example_sentence='',
                part_of_speech='',
                difficulty_level='intermediate',
            ))

    db.session.commit()
    app.logger.info('Auto-seeded %d AWL words', Word.query.count())


def _ensure_dev_test_user(app):
    """Create a test user in development mode if it doesn't exist."""
    from app.models.user import User

    if User.query.filter_by(email='test@example.com').first():
        return

    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    app.logger.info('Created dev test user: test@example.com / password123')


def _ensure_dev_admin_user(app):
    """Create a development admin account if it doesn't exist."""
    from app.models.user import User

    admin = User.query.filter_by(email='admin@example.com').first()
    if admin:
        if not admin.is_admin:
            admin.is_admin = True
            db.session.commit()
            app.logger.info('Promoted dev admin user: admin@example.com')
        return

    admin = User(username='adminuser', email='admin@example.com')
    admin.set_password('admin12345')
    admin.is_admin = True
    db.session.add(admin)
    db.session.commit()
    app.logger.info('Created dev admin user: admin@example.com / admin12345')
