import re

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.user import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
EMAIL_PATTERN = re.compile(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')


def _normalize_email(email):
    return email.strip().lower()


def _validate_registration_input(username, email, password):
    if not username or not email or not password:
        return 'Username, email, and password are required'
    if len(username) < 3 or len(username) > 80:
        return 'Username must be between 3 and 80 characters'
    if len(email) > 120 or not EMAIL_PATTERN.fullmatch(email):
        return 'Please provide a valid email address'
    if len(password) < 8:
        return 'Password must be at least 8 characters'
    return None


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    username = data.get('username', '').strip()
    email = _normalize_email(data.get('email', ''))
    password = data.get('password', '')

    validation_error = _validate_registration_input(username, email, password)
    if validation_error:
        return jsonify({'error': validation_error}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409

    if User.query.filter(db.func.lower(User.email) == email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Username or email already exists'}), 409

    login_user(user)
    return jsonify(user.to_dict()), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = _normalize_email(data.get('email', ''))
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    login_user(user)
    return jsonify(user.to_dict()), 200


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'}), 200


@auth_bp.route('/me', methods=['GET'])
@login_required
def me():
    return jsonify(current_user.to_dict()), 200


SYSTEM_EMAILS = ('test@example.com', 'admin@example.com')


@auth_bp.route('/username', methods=['PATCH'])
@login_required
def update_username():
    if current_user.email in SYSTEM_EMAILS:
        return jsonify({'error': 'System accounts cannot change username'}), 403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    new_username = data.get('username', '').strip()
    if not new_username or len(new_username) < 3 or len(new_username) > 80:
        return jsonify({'error': 'Username must be between 3 and 80 characters'}), 400

    if new_username == current_user.username:
        return jsonify(current_user.to_dict()), 200

    existing = User.query.filter_by(username=new_username).first()
    if existing:
        return jsonify({'error': 'Username already exists'}), 409

    current_user.username = new_username
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Username already exists'}), 409

    return jsonify(current_user.to_dict()), 200
