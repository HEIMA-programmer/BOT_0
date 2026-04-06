import os
import re
from flask import current_app


class SensitiveWordService:
    _instance = None
    _sensitive_words = set()
    _pattern = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SensitiveWordService, cls).__new__(cls)
        return cls._instance

    def initialize(self):
        if not self._initialized:
            self._load_sensitive_words()
            self._initialized = True

    def _load_sensitive_words(self):
        try:
            file_path = os.path.join(
                current_app.root_path,
                '..',
                'resources',
                'sensitive-words.txt'
            )

            current_app.logger.info(
                f"Loading sensitive words from: {file_path}"
            )

            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    word = line.strip()
                    if word:
                        self._sensitive_words.add(word.lower())

            # Pre-compile a single regex with word boundaries
            if self._sensitive_words:
                escaped = sorted(
                    (re.escape(w) for w in self._sensitive_words),
                    key=len, reverse=True,
                )
                self._pattern = re.compile(
                    r'\b(' + '|'.join(escaped) + r')\b',
                    re.IGNORECASE,
                )

            current_app.logger.info(
                f"Loaded {len(self._sensitive_words)} sensitive words"
            )
        except Exception:
            current_app.logger.error("Failed to load sensitive words")

    def contains_sensitive_words(self, text):
        """Check if text contains any sensitive words"""
        if not text:
            return False

        if not self._initialized:
            try:
                from flask import current_app
                with current_app.app_context():
                    self.initialize()
            except Exception:
                return False

        if not self._pattern:
            return False

        return bool(self._pattern.search(text))

    def get_sensitive_words_count(self):
        """Return the number of loaded sensitive words"""
        return len(self._sensitive_words)


# Create a global instance
sensitive_word_service = SensitiveWordService()
