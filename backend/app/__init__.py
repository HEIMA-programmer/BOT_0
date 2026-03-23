import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_socketio import SocketIO

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

    app.register_blueprint(auth_bp)
    app.register_blueprint(daily_words_bp)
    app.register_blueprint(word_bank_bp)
    app.register_blueprint(daily_learning_bp)
    app.register_blueprint(listening_bp)
    app.register_blueprint(progress_bp)
    app.register_blueprint(forum_bp)

    # Register SocketIO handlers
    from app.routes import speaking_ws  # noqa: F401
    from app.routes import conversation_ws  # noqa: F401

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
        )
        db.create_all()
        _seed_words_if_empty(app)
        if app.config.get('DEBUG'):
            _ensure_dev_test_user(app)

    return app


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
