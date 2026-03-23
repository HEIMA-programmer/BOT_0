"""
Test Gemini API connection in backend environment
"""

import os
import asyncio
from dotenv import load_dotenv
from google import genai

load_dotenv()

async def test_connection():
    api_key = os.getenv('GOOGLE_API_KEY')
    print(f"API Key: {api_key[:10]}...")

    client = genai.Client(api_key=api_key)
    model = "gemini-2.5-flash-native-audio-preview-12-2025"

    config = {
        "response_modalities": ["AUDIO"],
        "system_instruction": "You are a helpful assistant.",
    }

    print("Attempting to connect to Gemini Live API...")
    print("This may take 10-15 seconds through VPN...")

    try:
        async with client.aio.live.connect(model=model, config=config) as session:
            print("✅ Connection successful!")
            print(f"Session: {session}")
            return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_connection())
    print(f"\nResult: {'SUCCESS' if result else 'FAILED'}")
