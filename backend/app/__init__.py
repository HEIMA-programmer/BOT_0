import os
from pathlib import Path
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from flask_socketio import SocketIO
from sqlalchemy import inspect, text

db = SQLAlchemy()
login_manager = LoginManager()
socketio = SocketIO(cors_allowed_origins="*")


def create_app(config_name=None):
    app = Flask(__name__, instance_relative_config=True)

    # Load config
    if config_name == 'testing':
        app.config.from_object('app.config.TestingConfig')
    elif config_name == 'production' or os.getenv('FLASK_ENV') == 'production':
        app.config.from_object('app.config.ProductionConfig')
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
    socketio.init_app(app, cors_allowed_origins="*")

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
    from app.routes.friends import friends_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(daily_words_bp)
    app.register_blueprint(word_bank_bp)
    app.register_blueprint(daily_learning_bp)
    app.register_blueprint(listening_bp)
    app.register_blueprint(progress_bp)
    app.register_blueprint(forum_bp)
    app.register_blueprint(chat_history_bp)
    app.register_blueprint(room_bp)
    app.register_blueprint(friends_bp)

    # Serve frontend production build when dist/ exists
    _dist_dir = Path(__file__).resolve().parent.parent.parent / 'frontend' / 'dist'
    if _dist_dir.is_dir():
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_frontend(path):
            # If the requested file exists in dist/, serve it
            if path and (_dist_dir / path).is_file():
                return send_from_directory(_dist_dir, path)
            # Otherwise serve index.html (SPA client-side routing)
            return send_from_directory(_dist_dir, 'index.html')

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
            forum_post_pin,
            forum_comment,
            forum_forward,
            room,
            room_record,
            friend_request,
            friendship,
            game_record,
        )
        db.create_all()
        _ensure_runtime_schema()
        _seed_words_if_empty(app)
        if app.config.get('DEBUG'):
            _ensure_dev_test_user(app)
            _ensure_dev_admin_user(app)
        _seed_guidance_posts(app)

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

    if 'zone' not in forum_post_columns:
        db.session.execute(text("ALTER TABLE forum_posts ADD COLUMN zone VARCHAR(10) NOT NULL DEFAULT 'public'"))

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
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS forum_post_pins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
            CONSTRAINT uq_forum_post_pins_user_post UNIQUE (user_id, post_id)
        )
    """))
    forum_forward_columns = {col['name'] for col in inspector.get_columns('forum_forwards')}
    if 'zone' not in forum_forward_columns:
        db.session.execute(text("ALTER TABLE forum_forwards ADD COLUMN zone VARCHAR(10) NOT NULL DEFAULT 'public'"))
    db.session.execute(text(
        "UPDATE forum_forwards SET zone = 'public' WHERE zone IS NULL OR zone = ''"
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


def _seed_guidance_posts(app):
    """Create pinned guidance posts for DIICSU majors if they don't exist."""
    from app.models.user import User
    from app.models.forum_post import ForumPost
    from datetime import datetime, timezone

    admin = User.query.filter_by(email='admin@example.com').first()
    if not admin:
        return

    guidance_posts = [
        {
            'title': '[Guide] Computer Science & Technology - Getting Started',
            'content': (
                "Welcome to the Computer Science & Technology program at DIICSU! "
                "Here are essential resources and tips for incoming students:\n\n"
                "**1. Learn Git & GitHub**\n"
                "Version control is fundamental. Start with GitHub's official guide: "
                "[GitHub Quickstart](https://docs.github.com/en/get-started/quickstart)\n\n"
                "**2. Programming Foundations**\n"
                "If you're new to programming, Python is a great starting language. "
                "Try the free CS50 course from Harvard: "
                "[CS50x](https://cs50.harvard.edu/x/)\n\n"
                "**3. Development Environment**\n"
                "Set up VS Code as your code editor: "
                "[Download VS Code](https://code.visualstudio.com/)\n"
                "Learn to use the terminal/command line effectively.\n\n"
                "**4. Academic Writing in CS**\n"
                "Learn LaTeX for writing papers and reports: "
                "[Overleaf Learn](https://www.overleaf.com/learn)\n\n"
                "**5. Key English Terms**\n"
                "Familiarize yourself with CS terminology in English: algorithm, data structure, "
                "compiler, operating system, database, network protocol, API, debugging, etc.\n\n"
                "**6. Online Learning Platforms**\n"
                "- [Coursera](https://www.coursera.org/)\n"
                "- [LeetCode](https://leetcode.com/) for coding practice\n"
                "- [Stack Overflow](https://stackoverflow.com/) for Q&A\n\n"
                "Feel free to ask questions in the forum. Good luck with your studies!"
            ),
            'video_url': 'https://www.youtube.com/watch?v=RGOj5yH7evk',
        },
        {
            'title': '[Guide] Civil Engineering - Getting Started',
            'content': (
                "Welcome to the Civil Engineering program at DIICSU! "
                "Here are essential resources for incoming students:\n\n"
                "**1. CAD Software**\n"
                "AutoCAD is essential for civil engineers. Get the free student version: "
                "[Autodesk Education](https://www.autodesk.com/education/edu-software)\n\n"
                "**2. Understanding Structures**\n"
                "Start learning structural analysis concepts. "
                "MIT OpenCourseWare offers excellent free materials: "
                "[MIT OCW Civil Engineering](https://ocw.mit.edu/courses/civil-and-environmental-engineering/)\n\n"
                "**3. Building Codes & Standards**\n"
                "Familiarize yourself with international building codes and Chinese standards (GB codes). "
                "Understanding these is crucial for your career.\n\n"
                "**4. Key English Terms**\n"
                "Learn essential CE vocabulary: reinforced concrete, structural analysis, "
                "load-bearing, foundation, beam, column, stress, strain, geotechnical, etc.\n\n"
                "**5. Field Work Preparation**\n"
                "Civil engineering involves site visits. Learn about safety protocols "
                "and how to read construction drawings.\n\n"
                "**6. Useful Resources**\n"
                "- [ASCE](https://www.asce.org/) (American Society of Civil Engineers)\n"
                "- [Engineering Toolbox](https://www.engineeringtoolbox.com/)\n\n"
                "Welcome aboard and enjoy your engineering journey!"
            ),
            'video_url': 'https://www.youtube.com/watch?v=F8aJqYVDiAs',
        },
        {
            'title': '[Guide] Mechanical Design, Manufacturing & Automation - Getting Started',
            'content': (
                "Welcome to the Mechanical Design, Manufacturing & Automation program at DIICSU! "
                "Here are key resources for incoming students:\n\n"
                "**1. CAD/CAM Software**\n"
                "Learn SolidWorks or CATIA for 3D modeling. Free student licenses available: "
                "[SolidWorks Student](https://www.solidworks.com/product/students)\n\n"
                "**2. Manufacturing Processes**\n"
                "Understand fundamental manufacturing methods: CNC machining, 3D printing, "
                "casting, welding, and injection molding.\n\n"
                "**3. MATLAB & Simulation**\n"
                "MATLAB is widely used for engineering calculations: "
                "[MATLAB Student](https://www.mathworks.com/academia/students.html)\n\n"
                "**4. Key English Terms**\n"
                "Essential ME vocabulary: tolerance, gear, bearing, hydraulic, pneumatic, "
                "CNC (Computer Numerical Control), thermodynamics, kinematics, mechanism, etc.\n\n"
                "**5. Hands-on Skills**\n"
                "Take advantage of lab sessions. Learn to use measuring tools (calipers, micrometers) "
                "and understand technical drawing standards.\n\n"
                "**6. Useful Resources**\n"
                "- [ASME](https://www.asme.org/) (American Society of Mechanical Engineers)\n"
                "- [GrabCAD](https://grabcad.com/) for 3D models\n"
                "- [MIT OCW Mechanical Engineering](https://ocw.mit.edu/courses/mechanical-engineering/)\n\n"
                "Best of luck in your mechanical engineering journey!"
            ),
            'video_url': 'https://www.youtube.com/watch?v=mKsyRJxNepg',
        },
        {
            'title': '[Guide] Transportation Engineering - Getting Started',
            'content': (
                "Welcome to the Transportation Engineering program at DIICSU! "
                "Here are essential resources for incoming students:\n\n"
                "**1. Transportation Planning Basics**\n"
                "Learn about urban planning, traffic flow theory, and transportation network design. "
                "Start with fundamentals of traffic engineering.\n\n"
                "**2. Software Tools**\n"
                "- VISSIM for traffic simulation\n"
                "- TransCAD for transportation planning\n"
                "- AutoCAD for road design\n"
                "- Python/R for data analysis in transportation\n\n"
                "**3. Key English Terms**\n"
                "Essential TE vocabulary: intersection, signal timing, level of service (LOS), "
                "traffic flow, capacity, roundabout, highway, pavement, logistics, etc.\n\n"
                "**4. Industry Knowledge**\n"
                "Stay updated on intelligent transportation systems (ITS), autonomous vehicles, "
                "and smart city initiatives - these are the future of the field.\n\n"
                "**5. Research & Journals**\n"
                "- [Transportation Research Board (TRB)](https://www.trb.org/)\n"
                "- Journal of Transport Geography\n"
                "- IEEE Transactions on Intelligent Transportation Systems\n\n"
                "**6. Useful Resources**\n"
                "- Google Maps traffic data for real-world analysis\n"
                "- [OpenStreetMap](https://www.openstreetmap.org/) for geographic data\n\n"
                "Welcome to the world of transportation engineering!"
            ),
            'video_url': 'https://www.youtube.com/watch?v=BNHR6IQJGZs',
        },
        {
            'title': '[Guide] Applied Mathematics - Getting Started',
            'content': (
                "Welcome to the Applied Mathematics program at DIICSU! "
                "Here are essential resources for incoming students:\n\n"
                "**1. Mathematical Software**\n"
                "- [MATLAB Student](https://www.mathworks.com/academia/students.html)\n"
                "- Python with NumPy/SciPy for scientific computing\n"
                "- LaTeX for mathematical typesetting: [Overleaf](https://www.overleaf.com/)\n\n"
                "**2. Core Subjects Preview**\n"
                "Brush up on calculus, linear algebra, and probability theory before classes start. "
                "Khan Academy offers excellent free resources: "
                "[Khan Academy Math](https://www.khanacademy.org/math)\n\n"
                "**3. Key English Terms**\n"
                "Essential math vocabulary: theorem, proof, differential equation, matrix, "
                "eigenvalue, convergence, optimization, stochastic, topology, etc.\n\n"
                "**4. Programming for Mathematicians**\n"
                "Python is essential for applied math. Learn NumPy, SciPy, and matplotlib: "
                "[NumPy Learn](https://numpy.org/learn/)\n\n"
                "**5. Academic Resources**\n"
                "- [arXiv](https://arxiv.org/) for preprints\n"
                "- [MIT OCW Mathematics](https://ocw.mit.edu/courses/mathematics/)\n"
                "- [3Blue1Brown](https://www.3blue1brown.com/) for visual math\n\n"
                "**6. Career Paths**\n"
                "Applied math opens doors to data science, quantitative finance, "
                "operations research, and academic research. Start exploring these areas early.\n\n"
                "Enjoy your mathematical journey!"
            ),
            'video_url': 'https://www.youtube.com/watch?v=WUvTyaaNkzM',
        },
    ]

    now = datetime.now(timezone.utc)
    created_count = 0

    for post_data in guidance_posts:
        existing = ForumPost.query.filter_by(title=post_data['title']).first()
        if existing:
            continue

        post = ForumPost(
            user_id=admin.id,
            zone='public',
            tag='public',
            title=post_data['title'],
            content=post_data['content'],
            video_url=post_data.get('video_url'),
            status=ForumPost.STATUS_APPROVED,
            is_pinned=True,
            reviewed_by=admin.id,
            reviewed_at=now,
            created_at=now,
            updated_at=now,
        )
        db.session.add(post)
        created_count += 1

    if created_count > 0:
        db.session.commit()
        app.logger.info('Seeded %d guidance posts for DIICSU majors', created_count)
