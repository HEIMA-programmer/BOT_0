# Pronunciation Practice Configuration Guide (Google Gemini API)

## Overview

The Pronunciation Practice feature uses Google Gemini API from your existing AI Conversation service to provide AI-powered pronunciation feedback and assessment.

## Required Configuration

You need to configure **Google API** in backend (same as AI Conversation feature).

### Step 1: Get Google API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the API key

### Step 2: Configure Backend Environment Variables

Edit `backend/.env` file and add your Google API key:

```env
# Google API Key (Required for AI Conversation and Pronunciation Practice)
GOOGLE_API_KEY=your-google-api-key-here
```

### Step 3: Restart Backend Server

After updating `.env` file, restart your backend server:

```bash
cd backend
python run.py
```

## Features

### How It Works

1. **Audio Recording**: Browser records audio from microphone
2. **Azure Speech Transcription**: Backend uses Azure Speech Services to transcribe audio
3. **Gemini Feedback**: Google Gemini API analyzes pronunciation and provides detailed feedback
4. **Combined Results**: User receives both transcription accuracy and AI suggestions

### Assessment Scores

The system provides comprehensive pronunciation assessment:

1. **Accuracy Score**: How accurately you pronounced target text (0-100)
2. **Pronunciation Score**: Overall pronunciation quality from Azure Speech (0-100)
3. **Fluency Score**: How smoothly you spoke (0-100)
4. **Completeness Score**: How much of target text you completed (0-100)
5. **AI Feedback**: Detailed suggestions from Gemini for improvement
6. **Strengths**: Positive aspects of your pronunciation
7. **Improvements**: Specific suggestions for getting better

### Score Levels

- **Excellent** (90%+): Native-like pronunciation
- **Good** (80%+): Clear and understandable
- **Pass** (60%+): Acceptable pronunciation
- **Needs Improvement** (<60%): Practice recommended

## Troubleshooting

### "Google API key not configured"
- The backend cannot find your Google API key
- Solution: Add `GOOGLE_API_KEY` to `backend/.env`
- Restart backend server

### "Unable to access microphone"
- Browser microphone permissions are denied
- Solution: Allow microphone access in browser settings
- Check if another app is using the microphone

### "No speech detected"
- The audio recording was too quiet or didn't contain speech
- Solution: Speak clearly and close to the microphone
- Check microphone volume settings

### "AI feedback unavailable"
- Gemini API call failed or timed out
- Solution: Check your Google API key and network connection
- Try again after a few moments

## API Key Security

- Never commit `.env` files to version control
- Use different API keys for development and production
- Rotate API keys regularly
- Monitor API usage to avoid unexpected charges

## Cost Considerations

- **Google Gemini API**: Pay-as-you-go pricing, check current rates
- **Azure Speech Services**: Used for transcription (if configured)
- Monitor usage in Google AI Studio
- Typical usage: 1 API call per pronunciation attempt

## Technical Details

### Data Flow

```
Browser → Backend → Azure Speech (Transcription) → Gemini (Feedback) → Browser
```

### API Integration

The system uses two APIs:

1. **Azure Speech Services**: For accurate speech transcription
2. **Google Gemini 1.5 Flash**: For intelligent pronunciation analysis and feedback

### Response Format

```json
{
  "transcript": "what the user actually said",
  "accuracy": 85,
  "pronunciation": {
    "overall": 88,
    "fluency": 90
  },
  "feedback": "Good pronunciation overall. Focus on the 'th' sound in 'the'.",
  "strengths": [
    "Clear vowel sounds",
    "Good rhythm"
  ],
  "improvements": [
    "Practice the 'th' consonant cluster",
    "Work on intonation for questions"
  ]
}
```

## Support

For issues with Google Gemini API:
- [Google AI Documentation](https://ai.google.dev/gemini-api/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [Pricing](https://ai.google.dev/pricing)

For issues with Azure Speech Services (if used):
- [Azure Speech Documentation](https://docs.microsoft.com/azure/cognitive-services/speech-service/)
- [Azure Portal](https://portal.azure.com/)