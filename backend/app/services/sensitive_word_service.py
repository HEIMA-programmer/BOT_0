import os
import re
from flask import current_app


class SensitiveWordService:
    _instance = None
    _sensitive_words = set()
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
            # Get the path to the sensitive words file
            file_path = os.path.join(
                current_app.root_path,
                '..',
                'resources',
                'sensitive-words.txt'
            )
            
            current_app.logger.info(f"Loading sensitive words from: {file_path}")
            
            # Read the file and load words into the set
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    word = line.strip()
                    if word:
                        self._sensitive_words.add(word)
            
            current_app.logger.info(f"Loaded {len(self._sensitive_words)} sensitive words")
        except Exception as e:
            current_app.logger.error(f"Failed to load sensitive words: {e}")

    def contains_sensitive_words(self, text):
        """Check if text contains any sensitive words"""
        if not text:
            return False
        
        # Ensure the service is initialized
        if not self._initialized:
            try:
                from flask import current_app
                with current_app.app_context():
                    self.initialize()
            except Exception as e:
                # If we can't initialize, return False to avoid breaking the app
                return False

        if not self._sensitive_words:
            return False

        # For each sensitive word, check if it appears in the text
        for word in self._sensitive_words:
            if word in text:
                return True
        return False

    def get_sensitive_words_count(self):
        """Return the number of loaded sensitive words"""
        return len(self._sensitive_words)


# Create a global instance
敏感词服务 = SensitiveWordService()
