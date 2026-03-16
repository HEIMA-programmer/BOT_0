import sqlite3

from sqlalchemy import event
from sqlalchemy.engine import Engine

from app.models.user import User
from app.models.word import Word
from app.models.word_bank import WordBank
from app.models.listening_clip import ListeningClip
from app.models.speaking_session import SpeakingSession
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.progress import Progress


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
    'SpeakingSession',
    'ChatSession',
    'ChatMessage',
    'Progress',
]
