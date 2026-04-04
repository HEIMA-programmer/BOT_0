import sqlite3

from sqlalchemy import event
from sqlalchemy.engine import Engine

from app.models.user import User
from app.models.word import Word
from app.models.word_bank import WordBank
from app.models.listening_clip import ListeningClip
from app.models.listening_attempt import ListeningAttempt
from app.models.speaking_session import SpeakingSession
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.progress import Progress
from app.models.review_history import ReviewHistory
from app.models.user_word_progress import UserWordProgress
from app.models.room import Room, RoomMember
from app.models.room_record import RoomRecord
from app.models.friend_request import FriendRequest
from app.models.friendship import Friendship
from app.models.game_record import GameRecord
from app.models.forum_post_pin import ForumPostPin


@event.listens_for(Engine, 'connect')
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.close()

__all__ = [
    'User',
    'Word',
    'WordBank',
    'ListeningClip',
    'ListeningAttempt',
    'SpeakingSession',
    'ChatSession',
    'ChatMessage',
    'Progress',
    'ReviewHistory',
    'UserWordProgress',
    'Room',
    'RoomMember',
    'RoomRecord',
    'FriendRequest',
    'Friendship',
    'GameRecord',
    'ForumPostPin',
]
