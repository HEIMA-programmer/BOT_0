import os
import json
import tempfile
import azure.cognitiveservices.speech as speechsdk
import httpx
from flask import current_app
from pydub import AudioSegment


class SpeakingService:
    def __init__(self):
        self.azure_key = current_app.config.get('AZURE_SPEECH_KEY')
        self.azure_region = current_app.config.get('AZURE_SPEECH_REGION')
        self.deepseek_key = current_app.config.get('DEEPSEEK_API_KEY')
        self.deepseek_url = current_app.config.get('DEEPSEEK_API_URL', 'https://api.deepseek.com')

        if not self.azure_key or not self.deepseek_key:
            raise RuntimeError('Azure Speech or DeepSeek API key not configured')

    def _convert_to_wav(self, audio_data, mime_type='audio/webm'):
        """
        Convert audio data to WAV format (PCM 16kHz 16bit mono).

        Args:
            audio_data: bytes - audio data in any format
            mime_type: str - MIME type of the input audio

        Returns:
            bytes - WAV audio data
        """
        temp_input_path = None
        temp_output_path = None

        try:
            # Save input audio to temp file
            with tempfile.NamedTemporaryFile(suffix=self._get_extension(mime_type), delete=False) as temp_input:
                temp_input.write(audio_data)
                temp_input_path = temp_input.name

            # Load audio with pydub
            audio = AudioSegment.from_file(temp_input_path)

            # Convert to required format: mono, 16kHz, 16bit
            audio = audio.set_channels(1)
            audio = audio.set_frame_rate(16000)
            audio = audio.set_sample_width(2)  # 16bit = 2 bytes

            # Create temp output file path (don't open it yet)
            temp_output_fd, temp_output_path = tempfile.mkstemp(suffix='.wav')
            os.close(temp_output_fd)  # Close the file descriptor immediately

            # Export as WAV (pydub will handle the file)
            audio.export(temp_output_path, format='wav')

            # Read WAV data
            with open(temp_output_path, 'rb') as f:
                wav_data = f.read()

            return wav_data

        finally:
            # Clean up temp files with error handling
            import time
            if temp_input_path and os.path.exists(temp_input_path):
                try:
                    os.unlink(temp_input_path)
                except PermissionError:
                    # File might still be locked, try again after a short delay
                    time.sleep(0.1)
                    try:
                        os.unlink(temp_input_path)
                    except:
                        current_app.logger.warning(f'Could not delete temp input file: {temp_input_path}')

            if temp_output_path and os.path.exists(temp_output_path):
                try:
                    os.unlink(temp_output_path)
                except PermissionError:
                    time.sleep(0.1)
                    try:
                        os.unlink(temp_output_path)
                    except:
                        current_app.logger.warning(f'Could not delete temp output file: {temp_output_path}')

    def _get_extension(self, mime_type):
        """Get file extension from MIME type."""
        mime_map = {
            'audio/wav': '.wav',
            'audio/webm': '.webm',
            'audio/ogg': '.ogg',
            'audio/mp3': '.mp3',
            'audio/mpeg': '.mp3',
            'audio/webm;codecs=opus': '.webm'
        }
        return mime_map.get(mime_type, '.webm')

    def process_audio(self, audio_data, topic, mime_type='audio/webm'):
        """
        Process audio data and return pronunciation scores and transcript.

        Args:
            audio_data: bytes - audio data in any format
            topic: str - The speaking topic
            mime_type: str - MIME type of the audio

        Returns:
            dict with transcript and pronunciation scores
        """
        # Convert to WAV format if needed
        if mime_type != 'audio/wav':
            current_app.logger.info(f'Converting {mime_type} to WAV format')
            audio_data = self._convert_to_wav(audio_data, mime_type)

        # Save audio to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name

        try:
            # Configure Azure Speech
            speech_config = speechsdk.SpeechConfig(
                subscription=self.azure_key,
                region=self.azure_region
            )

            audio_config = speechsdk.audio.AudioConfig(filename=temp_path)

            # Configure Pronunciation Assessment (Unscripted mode)
            pronunciation_config = speechsdk.PronunciationAssessmentConfig(
                reference_text="",
                grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
                granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
                enable_miscue=False
            )
            pronunciation_config.enable_prosody_assessment()

            # Create speech recognizer
            language = 'en-US'
            speech_recognizer = speechsdk.SpeechRecognizer(
                speech_config=speech_config,
                language=language,
                audio_config=audio_config
            )
            pronunciation_config.apply_to(speech_recognizer)

            # Collect results
            pron_results = []
            recognized_text = ""
            done = False

            def stop_cb(evt):
                nonlocal done
                done = True

            def recognized(evt):
                nonlocal pron_results, recognized_text
                if (evt.result.reason == speechsdk.ResultReason.RecognizedSpeech or
                        evt.result.reason == speechsdk.ResultReason.NoMatch):
                    pron_results.append(speechsdk.PronunciationAssessmentResult(evt.result))
                    if evt.result.text.strip():
                        recognized_text += " " + evt.result.text.strip()

            speech_recognizer.recognized.connect(recognized)
            speech_recognizer.session_stopped.connect(stop_cb)
            speech_recognizer.canceled.connect(stop_cb)

            # Start recognition
            speech_recognizer.start_continuous_recognition()

            # Wait for completion (with timeout)
            import time
            timeout = 120  # 2 minutes max
            start_time = time.time()
            while not done and (time.time() - start_time) < timeout:
                time.sleep(0.1)

            speech_recognizer.stop_continuous_recognition()

            # Calculate pronunciation scores
            if not pron_results or not recognized_text.strip():
                raise ValueError("No speech detected in audio")

            total_pron = 0
            total_accuracy = 0
            total_fluency = 0
            total_prosody = 0
            valid_count = 0

            for result in pron_results:
                if result.pronunciation_score is not None:
                    total_pron += result.pronunciation_score
                    total_accuracy += result.accuracy_score if result.accuracy_score else 0
                    total_fluency += result.fluency_score if result.fluency_score else 0
                    total_prosody += result.prosody_score if result.prosody_score else 0
                    valid_count += 1

            if valid_count == 0:
                raise ValueError("No valid pronunciation scores")

            pronunciation_scores = {
                'overall': round(total_pron / valid_count),
                'accuracy': round(total_accuracy / valid_count),
                'fluency': round(total_fluency / valid_count),
                'prosody': round(total_prosody / valid_count)
            }

            # Explicitly release resources
            del speech_recognizer
            del audio_config

            return {
                'transcript': recognized_text.strip(),
                'pronunciation': pronunciation_scores
            }

        finally:
            # Clean up temp file with retry mechanism
            import time
            if os.path.exists(temp_path):
                # Try to delete, with retries for Windows file locking
                for attempt in range(3):
                    try:
                        os.unlink(temp_path)
                        break
                    except PermissionError:
                        if attempt < 2:
                            time.sleep(0.2)  # Wait a bit longer for Azure SDK to release the file
                        else:
                            current_app.logger.warning(f'Could not delete temp file after 3 attempts: {temp_path}')

    def get_content_scores(self, transcript, topic):
        """
        Get content scores from DeepSeek API (OpenAI-compatible).

        Args:
            transcript: str - The recognized text
            topic: str - The speaking topic

        Returns:
            dict with content scores and feedback
        """
        prompt = f"""
You are an academic English speaking assessor. Evaluate the CONTENT of this spoken response.

Topic: "{topic}"
Transcript: "{transcript}"

IMPORTANT CONTEXT: This transcript comes from speech recognition, which may contain minor transcription errors. Focus on the overall communication ability rather than penalizing small recognition mistakes.

Evaluate on three dimensions (0-100 scale). Use 60 as the baseline for acceptable performance.

VOCABULARY: Range and accuracy of word choice
- 90-100: Wide range of precise academic vocabulary
- 75-89: Good vocabulary with occasional imprecision
- 60-74: Adequate vocabulary, simple but mostly correct words (baseline)
- 50-59: Limited vocabulary with some errors
- 0-49: Very limited vocabulary, frequent errors

GRAMMAR: Accuracy and sentence variety
- 90-100: Consistently accurate, varied structures
- 75-89: Mostly accurate with minor errors
- 60-74: Generally understandable despite some errors (baseline)
- 50-59: Frequent errors that sometimes affect understanding
- 0-49: Pervasive errors

TOPIC: Relevance and development
- 90-100: Directly addresses topic with well-developed ideas
- 75-89: Addresses topic with reasonable development
- 60-74: Addresses topic but lacks detail (baseline)
- 50-59: Partially addresses topic
- 0-49: Off topic or too minimal

SCORING GUIDELINES:
- Be lenient and encouraging
- 60-70 is acceptable for simple but correct responses
- Don't over-penalize for speech recognition errors
- Focus on communication effectiveness, not perfection

Return ONLY a JSON object with this exact structure:
{{
  "vocabulary": <integer>,
  "grammar": <integer>,
  "topic": <integer>,
  "feedback": {{
    "vocabulary": "<one specific English sentence about word choices>",
    "grammar": "<one specific English sentence about grammar>",
    "topic": "<one specific English sentence about content>"
  }}
}}
"""

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.deepseek_url}/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.deepseek_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": "You are an expert English language assessor. Always respond with valid JSON only."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0,
                        "response_format": {"type": "json_object"},
                    },
                )
                response.raise_for_status()
                data = response.json()

            raw = data["choices"][0]["message"]["content"].strip()
            raw = raw.replace("```json", "").replace("```", "").strip()

            import re
            raw = re.sub(r'\\(?!["\\/bfnrtu])', '', raw)

            try:
                content_result = json.loads(raw)
            except json.JSONDecodeError as e:
                current_app.logger.error(f'JSON parse error: {e}')
                current_app.logger.error(f'Full response: {raw}')
                raise Exception(f"Invalid JSON from DeepSeek: {e}")

            # Calculate overall score (average)
            overall = round((
                content_result['vocabulary'] +
                content_result['grammar'] +
                content_result['topic']
            ) / 3)

            return {
                'overall': overall,
                'vocabulary': content_result['vocabulary'],
                'grammar': content_result['grammar'],
                'topic': content_result['topic'],
                'feedback': content_result['feedback']
            }

        except Exception as e:
            current_app.logger.error(f"DeepSeek API error: {e}")
            raise
