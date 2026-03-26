"""
Test configuration loading to ensure .env file is correctly loaded.
"""
import os
import sys

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.config import BaseConfig

def test_config():
    print("Testing configuration loading...")
    print(f"Backend directory: {backend_dir}")
    print(f"Current working directory: {os.getcwd()}")
    
    print(f"\n--- Configuration Values ---")
    print(f"OPENAI_API_KEY: {'✓ Set' if BaseConfig.OPENAI_API_KEY else '✗ Not set'}")
    print(f"AZURE_SPEECH_KEY: {'✓ Set' if BaseConfig.AZURE_SPEECH_KEY else '✗ Not set'}")
    print(f"AZURE_SPEECH_REGION: {BaseConfig.AZURE_SPEECH_REGION}")
    print(f"ANTHROPIC_API_KEY: {'✓ Set' if BaseConfig.ANTHROPIC_API_KEY else '✗ Not set'}")
    print(f"GOOGLE_API_KEY: {'✓ Set' if BaseConfig.GOOGLE_API_KEY else '✗ Not set'}")
    
    print(f"\n--- Configuration for Pronunciation Practice ---")
    
    # Check if required APIs are configured
    if not BaseConfig.GOOGLE_API_KEY:
        print("⚠️  WARNING: GOOGLE_API_KEY not set!")
        print("   Pronunciation practice will use fallback scores.")
    else:
        print("✅ GOOGLE_API_KEY is configured for pronunciation feedback")
    
    if not BaseConfig.AZURE_SPEECH_KEY:
        print("⚠️  WARNING: AZURE_SPEECH_KEY not set!")
        print("   Speech transcription will fail.")
    else:
        print("✅ AZURE_SPEECH_KEY is configured for speech transcription")

if __name__ == '__main__':
    test_config()