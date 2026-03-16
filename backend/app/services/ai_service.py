import os
from openai import OpenAI


class AIService:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        self.client = OpenAI(api_key=api_key) if api_key else None

    def _check_client(self):
        if not self.client:
            raise RuntimeError('OpenAI API key not configured')

    def generate_quiz(self, words, quiz_type='multiple_choice'):
        """Generate vocabulary quiz questions from a list of words."""
        self._check_client()

        word_list = ', '.join([w['text'] for w in words])
        response = self.client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are an academic English tutor. Generate quiz questions '
                        'for vocabulary practice. Return JSON array of questions.'
                    )
                },
                {
                    'role': 'user',
                    'content': (
                        f'Generate 5 {quiz_type} questions for these academic words: '
                        f'{word_list}. Return as JSON array with fields: question, '
                        f'options (array of 4), correct_answer (index 0-3).'
                    )
                }
            ],
            response_format={'type': 'json_object'}
        )
        return response.choices[0].message.content

    def generate_feedback(self, transcript, topic):
        """Generate AI feedback for speaking practice."""
        self._check_client()

        response = self.client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are an academic English speaking coach. Evaluate the '
                        'student\'s speech and provide structured feedback. Return JSON.'
                    )
                },
                {
                    'role': 'user',
                    'content': (
                        f'Topic: {topic}\nStudent transcript: {transcript}\n\n'
                        f'Evaluate and return JSON with: fluency_score (1-10), '
                        f'accuracy_score (1-10), logic_score (1-10), '
                        f'strengths (array), improvements (array), '
                        f'suggested_phrases (array).'
                    )
                }
            ],
            response_format={'type': 'json_object'}
        )
        return response.choices[0].message.content

    def generate_listening_questions(self, transcript):
        """Generate comprehension questions from a listening transcript."""
        self._check_client()

        response = self.client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are an academic English tutor. Generate listening '
                        'comprehension questions. Return JSON.'
                    )
                },
                {
                    'role': 'user',
                    'content': (
                        f'Transcript: {transcript}\n\n'
                        f'Generate 5 comprehension questions. Return JSON array with: '
                        f'question, options (array of 4), correct_answer (index 0-3), '
                        f'explanation.'
                    )
                }
            ],
            response_format={'type': 'json_object'}
        )
        return response.choices[0].message.content
