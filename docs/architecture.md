# Architecture Document

## 1. System Overview

Academic English Practice App is a web application that helps incoming university students transition from everyday English to academic English. The system follows a client-server architecture with AI integration.

## 2. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│  ┌──────────────────────────────────────────────┐   │
│  │         React + Vite + Ant Design             │   │
│  │  ┌────────┐ ┌────────┐ ┌──────────────────┐  │   │
│  │  │ Pages  │ │Comps   │ │ API Module       │  │   │
│  │  │        │ │        │ │ (axios + mock)   │  │   │
│  │  └────────┘ └────────┘ └──────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │ Web Speech API  │  │ MediaRecorder API        │  │
│  │ (TTS + STT)     │  │ (Voice Recording)        │  │
│  └─────────────────┘  └──────────────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │ HTTP / JSON (port 5173 → proxy → 5000)
┌────────────────────────▼────────────────────────────┐
│                  Flask Backend (port 5000)            │
│  ┌──────────────────────────────────────────────┐   │
│  │              Route Handlers (Blueprints)       │   │
│  │  /api/auth/*  /api/daily-words  /api/word-bank│   │
│  │  /api/listening  /api/speaking  /api/chat     │   │
│  └──────────────────┬───────────────────────────┘   │
│  ┌──────────────────▼───────────────────────────┐   │
│  │            Service Layer                      │   │
│  │  AIService (OpenAI)  │  Business Logic        │   │
│  └──────────────────┬───────────────────────────┘   │
│  ┌──────────────────▼───────────────────────────┐   │
│  │         SQLAlchemy ORM + Models               │   │
│  └──────────────────┬───────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                SQLite Database                        │
│  users │ words │ word_bank │ listening_clips │ ...   │
└─────────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              OpenAI Chat API (External)               │
│  Quiz generation │ Speaking feedback │ Conversation  │
└─────────────────────────────────────────────────────┘
```

## 3. Technology Stack

| Layer     | Technology                | Purpose                              |
|-----------|---------------------------|--------------------------------------|
| Frontend  | React 19 + Vite 6        | SPA framework + dev server           |
| UI        | Ant Design 5              | Component library                    |
| Routing   | React Router 7            | Client-side routing                  |
| HTTP      | Axios                     | API requests with mock support       |
| Backend   | Flask 3.1                 | REST API server                      |
| ORM       | SQLAlchemy 3.1            | Database abstraction                 |
| Auth      | Flask-Login               | Session-based authentication         |
| Database  | SQLite                    | File-based relational database       |
| AI        | OpenAI Chat API (gpt-4o-mini) | Quiz, feedback, conversation     |
| Voice     | Web Speech API (browser)  | TTS + speech recognition             |
| CI/CD     | GitHub Actions            | Lint + test on every PR              |
| Deploy    | Render (free tier)        | Auto-deploy on merge to main         |

## 4. Page Routing Plan

| Path           | Page Component | Description                    | Auth Required |
|----------------|---------------|--------------------------------|---------------|
| `/`            | Home          | Landing page with module cards | No            |
| `/login`       | Login         | User login form                | No            |
| `/register`    | Register      | User registration form         | No            |
| `/daily-words` | DailyWords    | Today's vocabulary words       | No            |
| `/word-bank`   | WordBank      | Personal saved words           | Yes           |
| `/listening`   | Listening     | Listening comprehension lab    | No            |
| `/speaking`    | Speaking      | Pronunciation & speaking       | No            |
| `/ai-chat`     | AIChat        | AI conversation practice       | Yes           |
| `/profile`     | Profile       | User profile & progress        | Yes           |

## 5. API Structure

All API endpoints are prefixed with `/api/`.

- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- **Daily Words**: `/api/daily-words`
- **Word Bank**: `/api/word-bank` (GET, POST, DELETE)
- **Listening** (Sprint 2): `/api/listening/clips`, `/api/listening/quiz`
- **Speaking** (Sprint 2-3): `/api/speaking/feedback`
- **AI Chat** (Sprint 3): `/api/chat/sessions`, `/api/chat/message`
- **Progress** (Sprint 4): `/api/progress/dashboard`

Detailed contracts per sprint are in `docs/api-sprint*.md`.

## 6. Database Schema Overview

See `docs/db-schema.md` for full schema. Core tables:

- **users** — registered users
- **words** — academic vocabulary pool
- **word_bank** — user's saved words (many-to-many via junction table)
- **listening_clips** — audio content for listening exercises (Sprint 2)
- **speaking_sessions** — user speaking practice records (Sprint 3)
- **chat_sessions** / **chat_messages** — AI conversation history (Sprint 3)
- **progress** — cross-module progress tracking (Sprint 4)

## 7. Key Design Decisions

1. **Monorepo**: Frontend and backend in one repo for simpler CI/CD and code review.
2. **API Proxy**: Vite dev server proxies `/api` to Flask, avoiding CORS issues in development.
3. **Mock-first frontend**: Frontend uses mock data by default so it can be developed independently of backend.
4. **Session auth**: Flask-Login with cookie sessions — simpler than JWT for this scope.
5. **SQLite**: Zero-config database, sufficient for prototype, migrable to PostgreSQL later.
6. **Browser APIs for voice**: Web Speech API (TTS + STT) and MediaRecorder are free and require no backend for basic voice features.
