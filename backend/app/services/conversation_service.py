"""
Gemini Conversation Service
Handles real-time voice conversation with Google Gemini Live API
"""

import asyncio
import base64
from google import genai
from google.genai import types
from flask import current_app
import os


class ConversationService:
    def __init__(self):
        self.api_key = os.getenv('GOOGLE_API_KEY')
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")

        self.model = "gemini-2.5-flash-native-audio-preview-12-2025"
        self.client = genai.Client(api_key=self.api_key)
        self.session = None
        self.running = False
        self.audio_queue = asyncio.Queue()
        self.response_queue = asyncio.Queue()

    async def run_session(self):
        """Main session loop - runs in async with block"""
        try:
            # Test network connectivity first
            current_app.logger.info('Testing network connectivity to Google...')
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get('https://www.google.com')
                    current_app.logger.info(f'Network test successful: {response.status_code}')
            except Exception as e:
                current_app.logger.error(f'Network test failed: {e}')
                raise Exception(f'Cannot reach Google servers. Please check VPN/proxy settings: {e}')

            config = {
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {
                        "prebuilt_voice_config": {
                            "voice_name": "Puck"
                        }
                    }
                },
                "system_instruction": """You are a friendly and helpful English conversation partner.
Your goal is to help the user practice English through natural conversation.

Guidelines:
- Keep your responses concise (1-3 sentences) for natural conversation flow
- Speak naturally and conversationally, not formally
- Ask follow-up questions to keep the conversation going
- If the user makes grammar mistakes, gently correct them in your response
- Be encouraging and supportive
- Adapt to the user's English level
- Respond quickly to maintain conversation flow
- Start by greeting the user warmly and asking how they are doing""",
                "input_audio_transcription": {},
                "output_audio_transcription": {},
            }

            self.running = True
            current_app.logger.info('Starting Gemini Live session...')

            async with self.client.aio.live.connect(model=self.model, config=config) as session:
                self.session = session
                current_app.logger.info('Gemini Live session connected')

                # Debug: print available methods
                current_app.logger.info(f'Session type: {type(session)}')
                current_app.logger.info(f'Session methods: {[m for m in dir(session) if not m.startswith("_")]}')

                # Start response listener
                receive_task = asyncio.create_task(self._receive_responses())

                # Start audio sender
                send_task = asyncio.create_task(self._send_audio_loop())

                # Send initial trigger to get AI greeting
                current_app.logger.info('Sending initial trigger to Gemini...')
                await self.session.send_realtime_input(text="")
                current_app.logger.info('Initial trigger sent')

                # Wait for tasks or stop signal
                try:
                    while self.running:
                        await asyncio.sleep(0.1)
                except asyncio.CancelledError:
                    pass
                finally:
                    receive_task.cancel()
                    send_task.cancel()
                    try:
                        await receive_task
                    except asyncio.CancelledError:
                        pass
                    try:
                        await send_task
                    except asyncio.CancelledError:
                        pass

                current_app.logger.info('Gemini Live session ended')

        except Exception as e:
            current_app.logger.error(f'Failed to start Gemini session: {e}')
            await self.response_queue.put({
                'type': 'error',
                'message': str(e)
            })
            raise

    async def _send_audio_loop(self):
        """Send audio from queue to Gemini"""
        try:
            while self.running:
                try:
                    audio_data = await asyncio.wait_for(self.audio_queue.get(), timeout=0.1)
                    if self.session:
                        current_app.logger.info(f'Sending audio chunk to Gemini: {len(audio_data)} bytes')
                        await self.session.send_realtime_input(
                            audio=types.Blob(data=audio_data, mime_type="audio/pcm;rate=16000")
                        )
                        current_app.logger.info('Audio chunk sent successfully')
                except asyncio.TimeoutError:
                    continue
        except asyncio.CancelledError:
            pass
        except Exception as e:
            current_app.logger.error(f'Error in audio send loop: {e}')

    async def send_audio(self, audio_data):
        """Queue audio data to be sent to Gemini"""
        try:
            await self.audio_queue.put(audio_data)
        except Exception as e:
            current_app.logger.error(f'Failed to queue audio: {e}')
            raise

    async def stop_audio_input(self):
        """Signal that user has stopped speaking"""
        # Gemini will automatically process when audio input stops
        pass

    async def _receive_responses(self):
        """Receive and process responses from Gemini"""
        try:
            user_transcript = ""
            ai_transcript = ""
            ai_speaking = False

            current_app.logger.info('Starting to receive responses from Gemini...')

            # 外层 while：session.receive() 可能在一轮后结束，循环重连
            while self.running:
                current_app.logger.info('Entering receive loop...')
                async for response in self.session.receive():
                    current_app.logger.info(f'Received response from Gemini: {type(response)}')

                    if not self.running:
                        break

                    # 处理工具调用（必须响应，否则 session 会挂起）
                    if response.tool_call:
                        current_app.logger.info('Received tool call, responding...')
                        function_responses = []
                        for fc in response.tool_call.function_calls:
                            function_responses.append(types.FunctionResponse(
                                id=fc.id,
                                name=fc.name,
                                response={"result": "ok"}
                            ))
                        await self.session.send_tool_response(function_responses=function_responses)

                    if not response.server_content:
                        current_app.logger.info('No server_content in response, skipping...')
                        continue

                    content = response.server_content
                    current_app.logger.info(f'Processing server_content: input_transcription={bool(content.input_transcription)}, model_turn={bool(content.model_turn)}, output_transcription={bool(content.output_transcription)}, turn_complete={content.turn_complete}')

                    # 用户语音转写（实时）
                    if content.input_transcription and content.input_transcription.text:
                        user_transcript += content.input_transcription.text
                        current_app.logger.info(f'User transcript: {user_transcript}')
                        await self.response_queue.put({
                            'type': 'user_transcript',
                            'text': user_transcript
                        })

                    # AI 音频（实时发送）
                    if content.model_turn and content.model_turn.parts:
                        for part in content.model_turn.parts:
                            if part.inline_data:
                                # 立即发送音频块
                                audio_base64 = base64.b64encode(part.inline_data.data).decode('utf-8')
                                current_app.logger.info(f'Sending AI audio chunk: {len(audio_base64)} chars')
                                await self.response_queue.put({
                                    'type': 'ai_audio_chunk',
                                    'audio': audio_base64
                                })
                                if not ai_speaking:
                                    ai_speaking = True

                    # AI 语音转写
                    if content.output_transcription and content.output_transcription.text:
                        ai_transcript += content.output_transcription.text
                        current_app.logger.info(f'AI transcript: {ai_transcript}')

                    # Turn complete - 发送最终转写和结束信号
                    if content.turn_complete:
                        current_app.logger.info('Turn complete')
                        # 发送用户最终转写
                        if user_transcript:
                            await self.response_queue.put({
                                'type': 'user_final',
                                'text': user_transcript
                            })
                            user_transcript = ""

                        # 发送 AI 转写和结束信号
                        if ai_transcript:
                            current_app.logger.info(f'Sending AI transcript: {ai_transcript}')
                            await self.response_queue.put({
                                'type': 'ai_transcript',
                                'text': ai_transcript
                            })
                            ai_transcript = ""

                        if ai_speaking:
                            current_app.logger.info('Sending AI speaking end signal')
                            await self.response_queue.put({
                                'type': 'ai_speaking_end'
                            })
                            ai_speaking = False

        except asyncio.CancelledError:
            pass
        except Exception as e:
            current_app.logger.error(f'Error receiving responses: {e}', exc_info=True)
            await self.response_queue.put({
                'type': 'error',
                'message': str(e)
            })

    async def get_response(self):
        """Get next response from queue"""
        try:
            return await asyncio.wait_for(self.response_queue.get(), timeout=30.0)
        except asyncio.TimeoutError:
            return None

    async def close(self):
        """Close the session"""
        self.running = False
        current_app.logger.info('Stopping Gemini Live session...')
