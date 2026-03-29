"""
Gemini Conversation Service
Based on working demo - single event loop, thread-safe queues for cross-thread communication.
"""

import asyncio
import base64
import queue
import threading
from google import genai
from google.genai import types
import os


MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

SYSTEM_PROMPT = """You are a friendly and helpful English conversation partner.
Your goal is to help the user practice English through natural conversation.

Guidelines:
- Keep your responses concise (1-3 sentences) for natural conversation flow
- Speak naturally and conversationally, not formally
- Ask follow-up questions to keep the conversation going
- If the user makes grammar mistakes, gently correct them in your response
- Be encouraging and supportive
- Adapt to the user's English level
- Respond quickly to maintain conversation flow
- Start by greeting the user warmly and asking how they are doing"""


class ConversationService:
    """
    Runs Gemini Live session in a single background thread with a single event loop.
    All cross-thread communication uses thread-safe queue.Queue.
    """

    def __init__(self, system_prompt=None, voice_name=None, initial_message=None):
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")

        self.client = genai.Client(api_key=api_key)
        self.system_prompt = system_prompt or SYSTEM_PROMPT
        self.voice_name = voice_name or "Puck"
        self.initial_message = initial_message  # text to send first to trigger AI to speak
        self.audio_in_queue = queue.Queue()    # browser audio -> gemini
        self.response_queue = queue.Queue()    # gemini responses -> browser
        self.running = False
        self.ai_is_speaking = False
        self._thread = None
        self.messages = []  # accumulated conversation messages

    def start(self):
        """Start the Gemini session in a background thread."""
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        """Background thread entry - creates one event loop and runs everything in it."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            print('[ConversationService] Starting session loop...')
            loop.run_until_complete(self._session_loop())
        except Exception as e:
            print(f'[ConversationService] Session error: {e}')
            self.response_queue.put({'type': 'error', 'message': str(e)})
        finally:
            print('[ConversationService] Session loop ended')
            loop.close()

    async def _session_loop(self):
        """Main async session - mirrors the working demo structure."""
        config = {
            "response_modalities": ["AUDIO"],
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": self.voice_name
                    }
                }
            },
            "system_instruction": self.system_prompt,
            "input_audio_transcription": {},
            "output_audio_transcription": {},
        }

        try:
            print('[ConversationService] Connecting to Gemini...')
            async with self.client.aio.live.connect(model=MODEL, config=config) as session:
                print('[ConversationService] Connected!')
                self.running = True
                self.response_queue.put({'type': 'ready'})

                # Send initial message to trigger AI to speak first
                if self.initial_message:
                    print(f'[ConversationService] Sending initial message to trigger AI...')
                    await session.send_client_content(
                        turns=[{"role": "user", "parts": [{"text": self.initial_message}]}],
                        turn_complete=True
                    )

                send_task = asyncio.create_task(self._send_audio(session))
                recv_task = asyncio.create_task(self._recv_responses(session))

                try:
                    await asyncio.gather(send_task, recv_task)
                except asyncio.CancelledError:
                    pass

        except Exception as e:
            self.response_queue.put({'type': 'error', 'message': f'Connection failed: {e}'})

    async def _send_audio(self, session):
        """Read from audio_in_queue and send to Gemini. Batch-drain for lower latency."""
        while self.running:
            chunks = []
            try:
                # Drain up to 10 chunks at once to reduce queue buildup
                for _ in range(10):
                    chunks.append(self.audio_in_queue.get_nowait())
            except queue.Empty:
                pass

            if chunks and not self.ai_is_speaking:
                # Concatenate chunks and send as one blob for efficiency
                combined = b''.join(chunks)
                await session.send_realtime_input(
                    audio=types.Blob(data=combined, mime_type="audio/pcm;rate=16000")
                )
            elif not chunks:
                await asyncio.sleep(0.02)

    async def _recv_responses(self, session):
        """Receive from Gemini and put into response_queue. Mirrors demo's receive_audio."""
        import time

        user_transcript = ""
        ai_transcript = ""
        ai_speaking = False
        last_user_transcript_time = 0  # throttle user_transcript events

        while self.running:
            async for response in session.receive():
                if not self.running:
                    break

                # Handle tool calls (must respond or session hangs)
                if response.tool_call:
                    function_responses = []
                    for fc in response.tool_call.function_calls:
                        function_responses.append(types.FunctionResponse(
                            id=fc.id, name=fc.name, response={"result": "ok"}
                        ))
                    await session.send_tool_response(function_responses=function_responses)

                if not response.server_content:
                    continue

                content = response.server_content

                # AI audio chunks
                if content.model_turn and content.model_turn.parts:
                    self.ai_is_speaking = True
                    for part in content.model_turn.parts:
                        if part.inline_data:
                            audio_b64 = base64.b64encode(part.inline_data.data).decode('utf-8')
                            self.response_queue.put({
                                'type': 'ai_audio_chunk',
                                'audio': audio_b64
                            })
                            if not ai_speaking:
                                ai_speaking = True

                # User speech transcription (real-time, throttled)
                if content.input_transcription and content.input_transcription.text:
                    user_transcript += content.input_transcription.text
                    # Throttle: only send every 200ms to avoid flooding
                    now = time.time()
                    if now - last_user_transcript_time > 0.2:
                        # Only send the last 200 chars for display efficiency
                        display_text = user_transcript[-200:] if len(user_transcript) > 200 else user_transcript
                        self.response_queue.put({
                            'type': 'user_transcript',
                            'text': display_text
                        })
                        last_user_transcript_time = now

                # AI speech transcription (stream incrementally for real-time display)
                if content.output_transcription and content.output_transcription.text:
                    ai_transcript += content.output_transcription.text
                    self.response_queue.put({
                        'type': 'ai_transcript',
                        'text': ai_transcript
                    })

                # Turn complete
                if content.turn_complete:
                    if user_transcript:
                        self.response_queue.put({
                            'type': 'user_final',
                            'text': user_transcript
                        })
                        self.messages.append({'role': 'user', 'content': user_transcript})
                        user_transcript = ""
                        last_user_transcript_time = 0

                    if ai_transcript:
                        self.messages.append({'role': 'assistant', 'content': ai_transcript})
                        ai_transcript = ""

                    if ai_speaking:
                        self.response_queue.put({'type': 'ai_speaking_end'})
                        ai_speaking = False

                    self.ai_is_speaking = False

    def get_messages(self):
        """Return accumulated conversation messages."""
        return list(self.messages)

    def stop(self):
        """Signal the session to stop."""
        self.running = False
