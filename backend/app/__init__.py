import os
import shutil
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

    # Initialize sensitive word service
    with app.app_context():
        from app.services import sensitive_word_service
        sensitive_word_service.initialize()
        count = sensitive_word_service.get_sensitive_words_count()
        app.logger.info(f"Sensitive word service initialized with {count} words")

    # Validate production config
    if (not app.debug
            and not app.config.get('TESTING')
            and app.config['SECRET_KEY'] == 'dev-secret-key-change-in-production'):
        raise ValueError(
            'FLASK_SECRET_KEY must be set to a secure random value in production. '
            'Do not use the default dev key.'
        )

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
        _ensure_dev_admin_user(app)
        if app.config.get('DEBUG'):
            _ensure_dev_test_user(app)
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
        'status': "ALTER TABLE forum_posts ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'UNDER_REVIEW'",
        'is_pinned': 'ALTER TABLE forum_posts ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT 0',
        'rejection_reason': 'ALTER TABLE forum_posts ADD COLUMN rejection_reason VARCHAR(120)',
        'review_note': 'ALTER TABLE forum_posts ADD COLUMN review_note VARCHAR(255)',
        'reviewed_by': 'ALTER TABLE forum_posts ADD COLUMN reviewed_by INTEGER',
        'reviewed_at': 'ALTER TABLE forum_posts ADD COLUMN reviewed_at DATETIME',
        'updated_at': 'ALTER TABLE forum_posts ADD COLUMN updated_at DATETIME',
        'images': 'ALTER TABLE forum_posts ADD COLUMN images TEXT',
    }
    for column, ddl in forum_post_alters.items():
        if column not in forum_post_columns:
            db.session.execute(text(ddl))

    if 'zone' not in forum_post_columns:
        db.session.execute(text("ALTER TABLE forum_posts ADD COLUMN zone VARCHAR(10) NOT NULL DEFAULT 'public'"))

    db.session.execute(text(
        "UPDATE forum_posts SET status = 'PUBLISHED'"
        " WHERE status IS NULL OR status = 'approved'"
    ))
    db.session.execute(text(
        "UPDATE forum_posts SET status = 'UNDER_REVIEW'"
        " WHERE status = 'pending'"
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
    """Create the system admin account if it doesn't exist.

    The admin password is read from the ADMIN_PASSWORD config value
    (sourced from the ADMIN_PASSWORD environment variable).  In
    production the env var must be set to a secure value; in
    development it falls back to 'admin12345'.
    """
    from app.models.user import User

    admin_password = app.config.get('ADMIN_PASSWORD', 'admin12345')

    if not app.debug and admin_password == 'admin12345':
        app.logger.warning(
            'ADMIN_PASSWORD is using the default dev value in a non-debug '
            'environment. Set the ADMIN_PASSWORD env var to a secure value.'
        )

    admin = User.query.filter_by(email='admin@example.com').first()
    if admin:
        if not admin.is_admin:
            admin.is_admin = True
            db.session.commit()
            app.logger.info('Promoted admin user: admin@example.com')
        return

    admin = User(username='adminuser', email='admin@example.com')
    admin.set_password(admin_password)
    admin.is_admin = True
    db.session.add(admin)
    db.session.commit()
    app.logger.info('Created admin user: admin@example.com')


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
        {
            'title': 'Treasure Hunt 🍫🗺️',
            'content': (
                "**The Most Fun We've Had in English Class — Treasure Hunt!**\n\n"
                "Last week our English for Academic Skills class did something completely different "
                "— a Treasure Hunt across the new campus, and it was SO much fun! 🎉\n\n"
                "Here's how it worked: each group had 10 minutes to hide a small bag of chocolates "
                "somewhere on campus 🍬, then rush back to the classroom and write a set of directions "
                "clear enough for a completely different group to follow — no maps, no photos, just your words. 📝\n\n"
                "The hiding part was already chaotic 😂 Everyone sprinting off in different directions, "
                "arguing about whether a spot was \"too obvious\" or \"too impossible to find\", and then "
                "panicking because 10 minutes goes faster than you think ⏱️\n\n"
                "The writing part is where it got genuinely challenging 💪 As students in a Sino-British "
                "joint programme, being able to express yourself precisely in English is something we work "
                "on from day one — and this activity really puts that to the test. You have to think about "
                "landmarks, distances, directional language (\"turn left at...\", \"walk past...\", "
                "\"it's tucked behind the...\"), and make sure every sentence is completely unambiguous. "
                "One vague line and the other team is wandering around the wrong building entirely 😅\n\n"
                "The searching part was the most fun 🏃 Armed with nothing but a paragraph of English "
                "directions, each group set off across campus trying to decode each other's clues. "
                "Some descriptions were impressively clear. Others... were creative interpretations "
                "of the English language 😂\n\n"
                "The first group to find the hidden bag won ALL the chocolates 🏆🍫 — and trust me, "
                "that made everyone write their directions very carefully.\n\n"
                "It's one of those activities where you don't realise how much English you're practising "
                "until afterwards — descriptive writing, spatial language, clarity and precision, "
                "all wrapped up in a genuinely fun competition 🌟\n\n"
                "10/10 would hide chocolates again 😄\n\n"
                "#DIICSU #TreasureHunt"
            ),
            'tag': 'academic_culture',
            'images': [
                {'url': '/api/forum/uploads/hunt1.jpg', 'name': 'hunt1.jpg'},
                {'url': '/api/forum/uploads/hunt2.jpg', 'name': 'hunt2.jpg'},
            ],
        },
        {
            'title': 'English Corner 🗣️',
            'content': (
                "**English Corner — Is It Worth Going? (Spoiler: Yes 🙋)**\n\n"
                "Every week the college runs an English Corner session, usually on the 5th floor "
                "of the Foreign Languages building 📬 Keep an eye on your email for the weekly topic and time!\n\n"
                "At DIICSU, we're preparing for an international academic environment from the very "
                "beginning — and English Corner is honestly one of the best low-pressure ways to build "
                "that confidence 😌 No grades, no judgment, just real conversation with teachers and classmates.\n\n"
                "Topics cover everything from campus life to current events — basically anything that "
                "gets people actually speaking 🔥\n\n"
                "If you're nervous about English in class, start here. "
                "Just showing up consistently makes a real difference 💪\n\n"
                "See you there! 👋\n\n"
                "#EnglishCorner #SpeakingPractice #DIICSU"
            ),
            'tag': 'experience',
            'images': [
                {'url': '/api/forum/uploads/english_corner.png', 'name': 'english_corner.png'},
            ],
        },
        {
            'title': 'Summer School 🇬🇧✈️',
            'content': (
                "**Two Weeks at Our Partner University — Everything You Need to Know**\n\n"
                "This summer, a group of us packed our bags and flew to Dundee 🧳✈️ Not just any "
                "university — THE University of Dundee, the institution whose name is literally on our degree.\n\n"
                "And honestly? It hit different walking onto that campus knowing this is where some of "
                "us will continue our studies 🎓\n\n"
                "**What the programme looks like:**\n"
                "The Summer School lasts around two weeks, with classes and academic activities at the "
                "University of Dundee during the week. But it's not all studying — we also got to travel "
                "to other parts of the UK, including London 🎡🌧️ (yes, it rained. A lot. Welcome to Britain 😂)\n\n"
                "**What you actually gain:**\n\n"
                "🗣️ Full immersion, 24/7. Every conversation, every meal, every journey is in English. "
                "You'll be surprised how quickly your brain switches gears when there's no Chinese to fall back on.\n\n"
                "🏫 You experience the actual campus. Libraries, lecture halls, student facilities — "
                "you get a real preview of what studying there full-time would look like. "
                "It makes the idea of going to Dundee feel concrete rather than abstract.\n\n"
                "🌍 Cultural exposure you can't get in a classroom. Navigating public transport, "
                "understanding British social norms, adjusting to a completely different pace of life "
                "— these are things you can only learn by being there.\n\n"
                "🤝 You meet people. Other international students, local students, professors — "
                "the connections you make in two weeks can be surprisingly meaningful.\n\n"
                "**Is it worth it?**\n"
                "As a DIICSU student, the pathway to Dundee is one of the biggest advantages of our "
                "programme 💪 The Summer School is essentially a preview of that future. If you're "
                "considering continuing your degree in the UK, going gives you a massive head start "
                "— you'll already know the campus, the city, and what to expect from British academic culture.\n\n"
                "And even if you're not planning to go to Dundee long-term, two weeks in the UK will do "
                "more for your English and your confidence than a whole semester of classroom study 🌟\n\n"
                "Applications usually open before the end of the academic year — keep an eye on "
                "announcements and don't miss it!"
            ),
            'tag': 'experience',
            'images': [
                {'url': '/api/forum/uploads/IMG_1004.jpg', 'name': 'IMG_1004.jpg'},
                {'url': '/api/forum/uploads/IMG_1170.jpg', 'name': 'IMG_1170.jpg'},
                {'url': '/api/forum/uploads/IMG_1176.jpg', 'name': 'IMG_1176.jpg'},
                {'url': '/api/forum/uploads/IMG_1264.jpg', 'name': 'IMG_1264.jpg'},
                {'url': '/api/forum/uploads/IMG_1350.jpg', 'name': 'IMG_1350.jpg'},
                {'url': '/api/forum/uploads/IMG_1587.jpg', 'name': 'IMG_1587.jpg'},
                {'url': '/api/forum/uploads/IMG_1605.jpg', 'name': 'IMG_1605.jpg'},
                {'url': '/api/forum/uploads/IMG_2317.jpg', 'name': 'IMG_2317.jpg'},
                {'url': '/api/forum/uploads/IMG_2442.jpg', 'name': 'IMG_2442.jpg'},
            ],
        },
        {
            'title': 'Academic English 📚',
            'content': (
                "**One Year In — What Academic English Actually Taught Me ✨**\n\n"
                "Okay real talk 👇\n\n"
                "When I started at DIICSU, I thought \"academic English\" just meant writing essays "
                "with fancier vocabulary. Maybe some extra grammar practice. A box to tick before the "
                "real subjects started.\n\n"
                "A year later, I can confidently say: I completely missed the point 😂\n\n"
                "**What it actually covers:**\n\n"
                "The English for Academic Skills course touches on everything — writing, reading, "
                "listening, and speaking, but not in the way you'd expect from a typical English class. "
                "It's not about grammar rules. It's about how to function in an academic environment "
                "where English is the working language.\n\n"
                "✍️ **Writing** — How to structure an argument. How to write a proper academic report. "
                "How to reference sources correctly (yes, referencing is a whole skill on its own 😅). "
                "How to describe data, processes, and findings clearly and precisely.\n\n"
                "👂 **Listening** — Following lectures delivered by foreign professors with different "
                "accents. Picking out key information in real time. This one is harder than it sounds, "
                "especially in first year.\n\n"
                "📖 **Reading** — Processing dense academic texts efficiently. Understanding assignment "
                "briefs, rubrics, and feedback written entirely in English.\n\n"
                "🗣️ **Speaking** — The final speaking exam is an individual Presentation in front of "
                "your class, followed by Q&A from your classmates and teacher. No notes to hide behind. "
                "Eye contact, body language, and the ability to think on your feet all count.\n\n"
                "**Why it matters more at DIICSU than anywhere else:**\n\n"
                "At a regular university, English is one subject among many 🤷 At DIICSU, English is "
                "the medium for ALL your subjects. Your Calculus exam is in English. Your Engineering "
                "project report is in English. Your group demo is delivered in English. Every assignment "
                "brief, every professor's feedback, every rubric — English.\n\n"
                "**Practical tips:**\n\n"
                "📌 For Speaking — prepare thoroughly and practise out loud, not just in your head. "
                "The teacher pays attention to delivery: smile, make eye contact, don't just read off your slides.\n\n"
                "📌 For Writing — pay close attention to how references are formatted. "
                "It sounds like a small detail but it affects your grade more than you'd think.\n\n"
                "📌 For general improvement — check the Extra Materials on myDundee. "
                "There's a solid bank of practice exercises across all four skills.\n\n"
                "📌 Go to English Corner. Seriously. It's low pressure, it's free, "
                "and consistent speaking practice compounds over time 🗣️\n\n"
                "The final grade is just Pass or Fail — but don't let that fool you into coasting. "
                "The skills you build here follow you through every year of this programme and beyond 🌟\n\n"
                "#AcademicEnglish #StudyTips #DIICSU"
            ),
            'tag': 'skills',
            'images': [
                {'url': '/api/forum/uploads/english_class.jpg', 'name': 'english_class.jpg'},
            ],
        },
        {
            'title': "What's It Actually Like Studying in a Sino-British Joint Programme? 🌏",
            'content': (
                "People always ask me — what's different about DIICSU compared to a regular Chinese "
                "university? Here's my honest answer, one year in 👇\n\n"
                "**From day one, everything is in English 📚**\n\n"
                "Not just English class. Your maths. Your engineering projects. Your group presentations. "
                "Every assignment brief, every professor's feedback, every exam paper — English. "
                "The first week is genuinely overwhelming 😅 You're sitting in a lecture thinking "
                "\"I understood every individual word but somehow missed the whole point.\" "
                "That feeling fades, but it takes time.\n\n"
                "**You have both Chinese and foreign professors 👨‍🏫👩‍🏫**\n\n"
                "The difference in teaching style is real. Chinese teachers tend to be more structured, "
                "guiding you step by step through the material. Foreign professors often throw a problem "
                "at you and expect you to figure it out, ask questions, and defend your thinking. "
                "Neither is better — but switching between the two in the same week takes some getting used to 😂\n\n"
                "**The first time you use Turnitin is terrifying 😬**\n\n"
                "Academic integrity is taken very seriously here in a way that's genuinely different "
                "from most Chinese high schools. Turnitin checks your submission for plagiarism, and "
                "the rules around referencing and originality are strict. Nobody tells you how stressful "
                "submitting your first assignment feels until you're staring at that similarity percentage 😅 "
                "Learn how referencing works early — it will save you a lot of anxiety.\n\n"
                "**Peer review is a thing 🤝**\n\n"
                "In project courses, your teammates evaluate your individual contribution — and you "
                "evaluate theirs. The scores are hidden from each other and they actually affect your "
                "final grade. It sounds uncomfortable, and honestly it is at first. But it teaches you "
                "to show up, contribute, and not coast on your group's effort.\n\n"
                "**There's a real pathway to the UK 🇬🇧**\n\n"
                "This isn't just a marketing line on a brochure. The programme is genuinely designed "
                "to prepare you for studying at the University of Dundee. The academic standards, "
                "the English requirements, the teaching style — all of it is building towards that. "
                "Whether or not you end up going, that context shapes everything about how the programme runs.\n\n"
                "Is it harder than a regular programme? Sometimes, yes! Is it worth it? Absolutely 💪\n\n"
                "#DIICSU #SinoBritish #JointProgramme"
            ),
            'tag': 'academic_culture',
        },
        {
            'title': "Having Foreign Professors — What Nobody Tells You 👨‍🏫",
            'content': (
                "One of the most unique parts of DIICSU is having foreign professors teach your core "
                "subjects 🌍 Here's what I wish someone had told me before my first class 👇\n\n"
                "**The accent situation is real 😅**\n\n"
                "British, American, Australian, Scottish — you'll encounter different accents across "
                "different modules, sometimes within the same week. My first lecture, I understood maybe "
                "60% of what was said. By the end of semester, the same professor felt completely natural. "
                "Your ears do adapt, but those first few weeks can be humbling 😂\n\n"
                "Pro tip: preview the lecture notes beforehand. When you already know roughly what's "
                "being discussed, you can fill in the gaps even if you miss a few words. "
                "It makes a huge difference 💡\n\n"
                "**They will ask you questions. Out loud. In front of everyone. 😬**\n\n"
                "Foreign professors often use a much more interactive teaching style than what most of "
                "us were used to in high school. They'll stop mid-lecture, look around the room, and "
                "ask someone directly. The first time it happened to me I completely froze — not because "
                "I didn't know the answer, but because I wasn't prepared to answer in English on the spot 😂\n\n"
                "The solution? Sit somewhere visible and mentally prepare a few sentences before class. "
                "Once you've answered once or twice, the fear completely disappears 💪\n\n"
                "**Feedback is direct and specific 📝**\n\n"
                "Foreign professors tend to give very detailed written feedback on assignments — what "
                "worked, what didn't, and exactly why. At first it can feel harsh compared to what "
                "you're used to. But it's genuinely useful. Read every comment carefully, especially "
                "in first year when you're still figuring out what academic work at this level looks like.\n\n"
                "**The learning curve is steep but short 📈**\n\n"
                "Almost everyone struggles in the first month. Almost everyone finds their footing by "
                "the end of semester one. The adjustment is real, but so is the growth — and by the time "
                "you're done with first year, the idea of studying full-time in an English-speaking "
                "environment feels a lot less scary 🌟\n\n"
                "#DIICSU #ForeignProfessors #StudyTips"
            ),
            'tag': 'experience',
            'images': [
                {
                    'url': '/api/forum/uploads/english_class_foreign_professor.jpg',
                    'name': 'english_class_foreign_professor.jpg',
                },
            ],
        },
        {
            'title': "Why English Skills Matter More Here Than You Think 📝",
            'content': (
                "At a regular Chinese university, you can get by with limited English 🤷 "
                "At DIICSU, that's genuinely not an option.\n\n"
                "Here's why 👇\n\n"
                "📋 **Every exam is in English.** Even subjects like Calculus — if you don't know "
                "the English mathematical vocabulary, you might fail a problem you actually know how to solve.\n\n"
                "🤝 **Group projects require English communication.** You'll work with classmates from "
                "different backgrounds, and your reports, presentations and demos all need to be in English.\n\n"
                "✈️ **You might continue your degree in the UK.** If you go to Dundee, you'll be in a "
                "fully English-speaking academic environment from day one. "
                "The foundation you build here matters.\n\n"
                "The good news? The programme is designed to build these skills gradually — "
                "English for Academic Skills, English Corner, project courses with dedicated English "
                "components. Use every opportunity 💡\n\n"
                "Start early, practise consistently, and by the time you need it most, "
                "it'll be second nature 🌟\n\n"
                "#DIICSU #AcademicEnglish #StudyTips"
            ),
            'tag': 'skills',
        },
    ]

    # Copy seed images into the uploads directory so they're available after a fresh deploy
    seed_img_dir = os.path.join(os.path.dirname(__file__), 'seed_images')
    upload_dir = os.path.join(app.instance_path, 'uploads', 'forum')
    os.makedirs(upload_dir, exist_ok=True)
    if os.path.isdir(seed_img_dir):
        for fname in os.listdir(seed_img_dir):
            dst = os.path.join(upload_dir, fname)
            if not os.path.exists(dst):
                shutil.copy2(os.path.join(seed_img_dir, fname), dst)

    now = datetime.now(timezone.utc)
    created_count = 0

    for post_data in guidance_posts:
        existing = ForumPost.query.filter_by(title=post_data['title']).first()
        if existing:
            continue

        try:
            post = ForumPost(
                user_id=admin.id,
                zone='public',
                tag=post_data.get('tag', 'public'),
                title=post_data['title'],
                content=post_data['content'],
                video_url=post_data.get('video_url'),
                images=post_data.get('images') or None,
                status=ForumPost.STATUS_PUBLISHED,
                is_pinned=True,
                reviewed_by=admin.id,
                reviewed_at=now,
                created_at=now,
                updated_at=now,
            )
            db.session.add(post)
            db.session.commit()
            created_count += 1
        except Exception as e:
            db.session.rollback()
            app.logger.error('Failed to seed post %r: %s', post_data['title'], e)

    if created_count > 0:
        app.logger.info('Seeded %d guidance posts for DIICSU majors', created_count)
