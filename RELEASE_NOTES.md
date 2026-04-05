# v1.0.0 - Academic English Practice App

## Overview

First official release of the Academic English Practice App — a full-stack web application designed to help incoming university students transition from everyday English to academic English. The platform provides integrated learning across vocabulary, listening, speaking, and conversation modules with AI-powered feedback and real-time multiplayer features.

Developed over 3 sprints with 206+ merged pull requests by a team of 7 contributors.

## Key Features

### Vocabulary & Daily Learning
- Academic Word List (AWL) with 1000+ curated vocabulary words
- Spaced repetition daily learning system with 4 mastery levels (New → Learning → Familiar → Mastered)
- Personal word bank for saving and managing vocabulary

### Listening Comprehension
- Multi-level listening clips (beginner to advanced)
- 4 scenario types: lectures, group discussions, Q&A sessions, and office hours
- AI-generated comprehension questions (multiple choice, fill-in-the-blank, short answer)
- TED Talk / YouTube video integration for extended listening practice

### Speaking & Pronunciation
- Word-level pronunciation practice with Web Speech API feedback
- Structured speaking exercises with AI-guided scenarios
- Free conversation mode with customizable topics
- Guided conversation scenarios: office hours, seminar discussions
- AI feedback system evaluating fluency, accuracy, and logic (1–10 scale)

### AI-Powered Conversation
- Real-time voice conversations powered by Google Gemini 2.5 Flash
- Multi-turn chat sessions with full conversation history
- Scenario-based prompts for contextual learning

### Multiplayer Room System
- Real-time video/audio communication via Agora RTC
- 3 room types: Game Rooms, Speaking Rooms, Watch Together Rooms
- Context Guesser word game with 10 rounds and progressive difficulty
- Room management: invitations, invite codes, host promotion
- Game record tracking and sharing

### Forum & Community
- Discussion board with admin moderation workflow (pending → approved/rejected)
- Comments, post forwarding, and pin/favorite system
- Major-specific guidance posts (CS, Civil Engineering, Mechanical Engineering, Transportation, Applied Math)
- Public and friend-only zones

### User Management & Progress
- Session-based authentication with email validation
- Friendship system with friend requests
- Cross-module progress dashboard with analytics
- Admin panel for content moderation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 + Ant Design v6 |
| Backend | Python Flask + SQLAlchemy + Flask-SocketIO |
| Database | SQLite |
| AI Services | OpenAI (gpt-4o-mini), Google Gemini 2.5 Flash |
| Real-time | Agora RTC + Socket.IO |
| Voice | Web Speech API (browser-native TTS/STT) |
| Deployment | Docker + Nginx + GitHub Actions CI/CD |

## Getting Started

### Docker Deployment (Recommended)

```bash
docker compose up -d
```

### Local Development

```bash
# Frontend (http://localhost:5173)
cd frontend && npm install && npm run dev

# Backend (http://localhost:5000)
cd backend && python -m venv .venv && pip install -r requirements.txt && python run.py
```

## Environment Variables

Required environment variables (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Quiz generation and speaking feedback |
| `GOOGLE_API_KEY` | Gemini voice conversations |
| `FLASK_SECRET_KEY` | Session encryption |
| `CORS_ORIGINS` | Allowed frontend domains |
| `FLASK_ENV` | Environment mode (development/production) |

## Known Limitations

- Database uses SQLite (file-based); not recommended for high-concurrency production use
- Web Speech API availability varies by browser (best on Chrome; Safari has limited support)
- Agora RTC features require a valid Agora App ID and token
- AI features require active API keys with sufficient quota

## Contributors

- Yanbin Xu ([@HEIMA-programmer](https://github.com/HEIMA-programmer))
- Junfan Zhou ([@ColdFF](https://github.com/ColdFF))
- Yanshuo Liu ([@RainYans](https://github.com/RainYans))
- Weike Jin ([@Lizzy-zhi](https://github.com/Lizzy-zhi))
- Yupei Yang ([@1294201870](https://github.com/1294201870))
- Chenxi Huang ([@qwqsad11](https://github.com/qwqsad11))
- Ruoqi Hu ([@KoCookie](https://github.com/KoCookie))

## License

See [LICENSE](LICENSE) for details.
